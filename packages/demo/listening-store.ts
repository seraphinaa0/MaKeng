import { z } from "zod";
import {
  listeningLessonSchema,
  listeningContentSchema,
  AUDIO_LIMIT,
  type ListeningContent,
  type ListeningLesson,
} from "../schemas/listening";
import { changeListeningAttempt } from "../domain/listening";
import {
  parseListeningBackup,
  prepareListeningRestore,
  listeningSnapshotKey,
} from "../domain/listening-backup";

export const LISTENING_DB = "makeng-listening-v1";
export const LISTENING_CHANNEL = "makeng-listening-changes";
const LOCK = "makeng-listening";
export interface StoredListening extends ListeningLesson {
  blob: Blob;
}
function checked(value: unknown): StoredListening {
  const object = value as Record<string, unknown>;
  const { blob, ...metadata } = object;
  const lesson = listeningLessonSchema.parse(metadata);
  if (
    !(blob instanceof Blob) ||
    blob.size !== lesson.content.audio.size ||
    blob.type !== lesson.content.audio.type
  )
    throw new Error(
      "Audio lưu trên thiết bị bị hỏng. Không tự ghi đè dữ liệu.",
    );
  return { ...lesson, blob };
}
export function expired(expiresAt: string, now = Date.now()) {
  return Date.parse(expiresAt) <= now;
}
function notify() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(LISTENING_CHANNEL);
  channel.postMessage("changed");
  channel.close();
}
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB)
      return reject(
        new Error("Trình duyệt không hỗ trợ IndexedDB để lưu audio."),
      );
    const request = indexedDB.open(LISTENING_DB, 1);
    let blocked = false;
    request.onupgradeneeded = () =>
      request.result.createObjectStore("lessons", { keyPath: "id" });
    request.onblocked = () => {
      blocked = true;
      reject(
        new Error("Đóng tab Listening cũ rồi thử lại; bộ nhớ đang bị khóa."),
      );
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
  operation: (
    store: IDBObjectStore,
    done: (result: T) => void,
    fail: (error: unknown) => void,
  ) => void,
): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("lessons", "readwrite");
    let result: T;
    let failure: unknown;
    const fail = (error: unknown) => {
      failure = error;
      tx.abort();
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(failure ?? tx.error ?? new Error("Không thể lưu audio."));
    };
    try {
      operation(
        tx.objectStore("lessons"),
        (value) => {
          result = value;
        },
        fail,
      );
    } catch (error) {
      fail(error);
    }
  });
}
async function locked<T>(
  action: () => Promise<T>,
  announce = true,
): Promise<T> {
  if (!navigator.locks)
    throw new Error("Listening cần HTTPS và trình duyệt hỗ trợ Web Locks.");
  try {
    const result = await navigator.locks.request(LOCK, action);
    if (announce) notify();
    return result;
  } catch (error) {
    if (error instanceof z.ZodError)
      throw new Error(
        "Dữ liệu Listening không hợp lệ: " +
          error.issues.map((i) => i.message).join("; "),
      );
    if (error instanceof DOMException)
      throw new Error(
        error.name === "QuotaExceededError"
          ? "Bộ nhớ đầy. Xuất và xóa bài nghe cũ trước khi lưu."
          : "Không truy cập được bộ nhớ audio. Kiểm tra quyền lưu dữ liệu của trình duyệt.",
      );
    throw error;
  }
}
export async function listListening(): Promise<StoredListening[]> {
  let purged = false;
  const lessons = await locked(
    () =>
      transaction<StoredListening[]>((store, done, fail) => {
        const request = store.getAll();
        request.onsuccess = () => {
          try {
            const values = (request.result as unknown[]).map(checked);
            for (const lesson of values)
              if (expired(lesson.expiresAt)) {
                store.delete(lesson.id);
                purged = true;
              }
            done(
              values
                .filter((l) => !expired(l.expiresAt))
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            );
          } catch (error) {
            fail(error);
          }
        };
      }),
    false,
  );
  if (purged) notify();
  return lessons;
}
export async function addListening(
  content: ListeningContent,
  blob: Blob,
  retentionDays: 1 | 7 | 30,
): Promise<StoredListening> {
  listeningContentSchema.parse(content);
  const now = new Date();
  const lesson = checked({
    id: crypto.randomUUID(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + retentionDays * 86400000).toISOString(),
    retentionDays,
    consent: "local-only-owned-audio",
    content,
    attempts: [],
    blob,
  });
  return insertListening(lesson);
}
function insertListening(
  lesson: StoredListening,
  rejectDuplicate = false,
): Promise<StoredListening> {
  return locked(() => insertListeningUnlocked(lesson, rejectDuplicate));
}
function insertListeningUnlocked(
  lesson: StoredListening,
  rejectDuplicate = false,
): Promise<StoredListening> {
  const snapshot = rejectDuplicate ? listeningSnapshotKey(lesson) : null;
  return transaction<StoredListening>((store, done, fail) => {
    const request = store.getAll();
    request.onsuccess = () => {
      try {
        const values = (request.result as unknown[]).map(checked);
        const active = values.filter((l) => !expired(l.expiresAt));
        if (
          snapshot !== null &&
          active.some((l) => listeningSnapshotKey(l) === snapshot)
        )
          throw new Error(
            "Bài và lịch sử này đã có trong thư viện. Không tạo thêm bản trùng hoặc ghi đè dữ liệu.",
          );
        if (
          active.length >= 10 ||
          active.reduce((sum, l) => sum + l.blob.size, 0) + lesson.blob.size >
            5 * AUDIO_LIMIT
        )
          throw new Error(
            "Tối đa 10 bài và 100 MiB audio. Xuất và xóa bài cũ trước.",
          );
        values
          .filter((l) => expired(l.expiresAt))
          .forEach((l) => store.delete(l.id));
        store.add(lesson);
        done(lesson);
      } catch (error) {
        fail(error);
      }
    };
  });
}
export async function restoreListening(
  text: string,
  file: Blob,
  options: unknown,
) {
  const backup = parseListeningBackup(text);
  if (file.size !== backup.content.audio.size || file.size > AUDIO_LIMIT)
    throw new Error("Kích thước audio không khớp bản sao lưu.");
  // Decode the exact bytes using the validated original MIME, even if the OS
  // has lost its file association. SHA-256, not the filename, binds the pair.
  const blob = new Blob([file], { type: backup.content.audio.type });
  // Keep the lock from validation through commit so global deletion waits for
  // the in-flight restore, then removes it instead of allowing resurrection.
  return locked(async () => {
    const measured = await inspectAudio(blob, backup.content.audio.name);
    const lesson = checked({
      ...prepareListeningRestore(backup, measured, options),
      blob,
    });
    return insertListeningUnlocked(lesson, true);
  });
}
async function mutate(
  id: string,
  change: (lesson: StoredListening) => StoredListening,
) {
  return locked(() =>
    transaction<StoredListening>((store, done, fail) => {
      const request = store.get(id);
      request.onsuccess = () => {
        try {
          if (!request.result)
            throw new Error("Bài nghe đã bị xóa ở tab khác. Tải lại thư viện.");
          const lesson = checked(request.result);
          if (expired(lesson.expiresAt))
            throw new Error(
              "Bài nghe đã hết hạn. Quay về thư viện để dọn dữ liệu.",
            );
          const next = checked(change(lesson));
          store.put(next);
          done(next);
        } catch (error) {
          fail(error);
        }
      };
    }),
  );
}
export function startListening(id: string) {
  return mutate(id, (l) => {
    if (l.attempts.some((a) => a.status === "in_progress")) return l;
    if (l.attempts.length >= 200)
      throw new Error("Bài đã đủ 200 lượt. Xuất và tạo bài mới.");
    return {
      ...l,
      attempts: [
        ...l.attempts,
        {
          id: crypto.randomUUID(),
          revision: 0,
          status: "in_progress",
          createdAt: new Date().toISOString(),
          submittedAt: null,
          answers: {},
        },
      ],
    };
  });
}
export function saveListening(
  id: string,
  attemptId: string,
  revision: number,
  answers: Record<string, string>,
  submit = false,
) {
  return mutate(id, (l) => {
    if (!l.attempts.some((a) => a.id === attemptId))
      throw new Error("Lượt luyện đã bị xóa.");
    return {
      ...l,
      attempts: l.attempts.map((a) =>
        a.id === attemptId
          ? changeListeningAttempt(l.content, a, revision, answers, submit)
          : a,
      ),
    };
  });
}
export function deleteListening(id: string) {
  return locked(() =>
    transaction<void>((store, done) => {
      store.delete(id);
      done();
    }),
  );
}
export function clearListening() {
  return locked(() =>
    transaction<void>((store, done) => {
      store.clear();
      done();
    }),
  );
}
export function retainListening(id: string, retentionDays: 1 | 7 | 30) {
  return mutate(id, (l) => ({
    ...l,
    retentionDays,
    expiresAt: new Date(Date.now() + retentionDays * 86400000).toISOString(),
  }));
}

export async function inspectAudio(
  blob: Blob,
  name: string,
): Promise<ListeningContent["audio"]> {
  // Reject before decoding/hashing large inputs. Browser decoding establishes format support.
  if (
    !blob.size ||
    blob.size > AUDIO_LIMIT ||
    ![
      "audio/wav",
      "audio/x-wav",
      "audio/mpeg",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
    ].includes(blob.type)
  )
    throw new Error("Chọn WAV, MP3, Ogg, WebM hoặc MP4 audio, tối đa 20 MiB.");
  const url = URL.createObjectURL(blob);
  let duration: number;
  try {
    duration = await new Promise<number>((resolve, reject) => {
      const audio = new Audio();
      const timer = setTimeout(
        () => finish(new Error("Không đọc được độ dài audio sau 15 giây.")),
        15000,
      );
      function finish(error?: Error) {
        clearTimeout(timer);
        audio.onloadedmetadata = audio.onerror = null;
        if (error) reject(error);
        else resolve(audio.duration);
        audio.removeAttribute("src");
        audio.load();
      }
      audio.onloadedmetadata = () => finish();
      audio.onerror = () =>
        finish(
          new Error(
            "Trình duyệt không giải mã được audio này. Hãy đổi sang WAV hoặc MP3.",
          ),
        );
      audio.preload = "metadata";
      audio.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  const sha256 = Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const { audioSchema } = await import("../schemas/listening");
  return audioSchema.parse({
    name,
    type: blob.type,
    size: blob.size,
    duration,
    sha256,
  });
}
