import { z } from "zod";
import { prepareSpeakingRestore } from "../domain/speaking-backup";
import {
  speakingSessionSchema,
  type SpeakingSession,
  type SpeakingResponse,
} from "../schemas/speaking";
import {
  newSpeaking,
  changeSpeaking,
  removeSpeakingAudio,
} from "../domain/speaking";

export const SPEAKING_DB = "makeng-speaking-v1";
export const SPEAKING_CHANNEL = "makeng-speaking-changes";
export const SPEAKING_TAB = crypto.randomUUID();
export interface StoredSpeaking extends SpeakingSession {
  blobs: Record<string, Blob>;
  backupKey?: string;
}
function checked(value: unknown): StoredSpeaking {
  const raw = z
    .object({
      blobs: z.record(z.string(), z.instanceof(Blob)),
      backupKey: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .passthrough()
    .parse(value);
  const { blobs, backupKey, ...metadata } = raw;
  const session = speakingSessionSchema.parse(metadata);
  if (
    Object.keys(blobs).some((id) => !session.responses[id]?.recording) ||
    Object.entries(session.responses).some(
      ([id, r]) =>
        r.recording &&
        (!blobs[id] ||
          blobs[id].size !== r.recording.size ||
          blobs[id].type !== r.recording.type),
    )
  )
    throw new Error("Audio Speaking bị hỏng. Không ghi đè dữ liệu.");
  return { ...session, blobs, ...(backupKey ? { backupKey } : {}) };
}
function notify() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(SPEAKING_CHANNEL);
  channel.postMessage({ source: SPEAKING_TAB });
  channel.close();
}
function open(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!globalThis.indexedDB)
      return reject(new Error("Cần IndexedDB để lưu Speaking trên thiết bị."));
    const request = indexedDB.open(SPEAKING_DB, 1);
    let blocked = false;
    request.onupgradeneeded = () =>
      request.result.createObjectStore("sessions", { keyPath: "id" });
    request.onblocked = () => {
      blocked = true;
      reject(new Error("Đóng tab Speaking cũ và thử lại; bộ nhớ bị khóa."));
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transaction<T>(
  action: (
    store: IDBObjectStore,
    done: (value: T) => void,
    fail: (error: unknown) => void,
  ) => void,
): Promise<T> {
  let connection: IDBDatabase | undefined;
  try {
    const db = await open();
    connection = db;
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("sessions", "readwrite");
      let result: T;
      let failure: unknown;
      const fail = (error: unknown) => {
        failure = error;
        tx.abort();
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () =>
        reject(failure ?? tx.error ?? new Error("Không thể lưu Speaking."));
      try {
        action(
          tx.objectStore("sessions"),
          (value) => {
            result = value;
          },
          fail,
        );
      } catch (error) {
        fail(error);
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        "Dữ liệu Speaking không hợp lệ. Không tự ghi đè; hãy sao lưu dữ liệu trang web.",
      );
    if (error instanceof DOMException)
      throw new Error(
        error.name === "QuotaExceededError"
          ? "Bộ nhớ đầy. Xuất và xóa phiên cũ trước khi lưu."
          : "Không truy cập được bộ nhớ Speaking; kiểm tra quyền lưu dữ liệu của trình duyệt.",
      );
    throw error;
  } finally {
    connection?.close();
  }
}
function readAll(
  store: IDBObjectStore,
  fail: (error: unknown) => void,
  next: (sessions: StoredSpeaking[]) => void,
) {
  const request = store.getAll();
  request.onsuccess = () => {
    try {
      next((request.result as unknown[]).map(checked));
    } catch (error) {
      fail(error);
    }
  };
}
export async function listSpeaking() {
  let purged = false;
  const sessions = await transaction<StoredSpeaking[]>((store, done, fail) =>
    readAll(store, fail, (values) => {
      for (const session of values)
        if (Date.parse(session.expiresAt) <= Date.now()) {
          store.delete(session.id);
          purged = true;
        }
      done(
        values
          .filter((s) => Date.parse(s.expiresAt) > Date.now())
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    }),
  );
  if (purged) notify();
  return sessions;
}
function capacity(sessions: StoredSpeaking[]) {
  if (
    sessions.length > 20 ||
    sessions.reduce(
      (sum, s) => sum + Object.values(s.blobs).reduce((n, b) => n + b.size, 0),
      0,
    ) >
      100 * 1024 * 1024
  )
    throw new Error(
      "Giới hạn 20 phiên / 100 MiB audio. Xuất và xóa phiên cũ trước.",
    );
}
export async function addSpeaking(
  days: 1 | 7 | 30,
  consent: boolean,
  set?: StoredSpeaking["set"],
) {
  const session = checked({
    ...newSpeaking(
      crypto.randomUUID(),
      new Date().toISOString(),
      days,
      consent,
      set,
    ),
    blobs: {},
  });
  const result = await transaction<StoredSpeaking>((store, done, fail) =>
    readAll(store, fail, (values) => {
      const active = values.filter((s) => Date.parse(s.expiresAt) > Date.now());
      capacity([...active, session]);
      values
        .filter((s) => Date.parse(s.expiresAt) <= Date.now())
        .forEach((s) => store.delete(s.id));
      store.add(session);
      done(session);
    }),
  );
  notify();
  return result;
}
async function mutate(
  id: string,
  change: (session: StoredSpeaking) => StoredSpeaking,
) {
  // A single readwrite transaction serializes tabs, including delete/clear, even without Web Locks.
  const result = await transaction<StoredSpeaking>((store, done, fail) =>
    readAll(store, fail, (values) => {
      const session = values.find((s) => s.id === id);
      if (!session)
        throw new Error(
          "Phiên đã bị xóa. Không thể lưu lại bản ghi; tải lại lịch sử.",
        );
      if (Date.parse(session.expiresAt) <= Date.now())
        throw new Error("Phiên đã hết hạn. Quay lại lịch sử để dọn dữ liệu.");
      const next = checked(change(session));
      capacity(
        values
          .filter((s) => s.id !== id && Date.parse(s.expiresAt) > Date.now())
          .concat(next),
      );
      store.put(next);
      done(next);
    }),
  );
  notify();
  return result;
}
export function saveSpeaking(
  id: string,
  revision: number,
  questionId: string,
  response: SpeakingResponse,
  blob: Blob | null,
  complete = false,
) {
  return mutate(id, (session) => {
    const { blobs: storedBlobs, backupKey, ...metadata } = session;
    const next = changeSpeaking(
      metadata,
      revision,
      questionId,
      response,
      complete,
      new Date().toISOString(),
    );
    const blobs = { ...storedBlobs };
    if (blob) blobs[questionId] = blob;
    else delete blobs[questionId];
    return { ...next, blobs, ...(backupKey ? { backupKey } : {}) };
  });
}
export function deleteSpeakingAudio(
  id: string,
  revision: number,
  questionId: string,
) {
  return mutate(id, (session) => {
    const { blobs: storedBlobs, backupKey, ...metadata } = session;
    const blobs = { ...storedBlobs };
    delete blobs[questionId];
    return {
      ...removeSpeakingAudio(metadata, revision, questionId),
      blobs,
      ...(backupKey ? { backupKey } : {}),
    };
  });
}
export async function deleteSpeaking(id: string) {
  await transaction<void>((store, done) => {
    store.delete(id);
    done();
  });
  notify();
}
export async function clearSpeaking() {
  await transaction<void>((store, done) => {
    store.clear();
    done();
  });
  notify();
}

export async function restoreSpeaking(
  text: string,
  days: 1 | 7 | 30,
  consent: boolean,
) {
  if (!navigator.locks)
    throw new Error("Khôi phục cần trình duyệt hỗ trợ Web Locks.");
  const { DEMO_KEY } = await import("./store");
  return navigator.locks.request(DEMO_KEY, async () => {
    const restored = checked(await prepareSpeakingRestore(text, days, consent));
    const result = await transaction<StoredSpeaking>((store, done, fail) =>
      readAll(store, fail, (values) => {
        const active = values.filter(
          (s) => Date.parse(s.expiresAt) > Date.now(),
        );
        if (active.some((s) => s.backupKey === restored.backupKey))
          throw new Error(
            "Bản sao lưu Speaking này đã được khôi phục; không thêm bản trùng.",
          );
        capacity([...active, restored]);
        values
          .filter((s) => Date.parse(s.expiresAt) <= Date.now())
          .forEach((s) => store.delete(s.id));
        store.add(restored);
        done(restored);
      }),
    );
    notify();
    return result;
  });
}
