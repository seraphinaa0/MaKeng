"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "./api";
import { browserDemo } from "./mode";
import {
  DEMO_BACKUP_LIMIT,
  parseDemoBackup,
} from "../../../packages/demo/store";
import {
  exportSpeakingBackup,
  parseSpeakingBackup,
  SPEAKING_BACKUP_LIMIT,
} from "../../../packages/domain/speaking-backup";
import {
  listSpeaking,
  restoreSpeaking,
  type StoredSpeaking,
} from "../../../packages/demo/speaking-store";
import {
  listListening,
  type StoredListening,
} from "../../../packages/demo/listening-store";
import { exportListeningBackup } from "../../../packages/domain/listening-backup";
import ListeningRestore from "./listening-restore";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function json(text: string, filename: string) {
  download(new Blob([text], { type: "application/json" }), filename);
}
function message(error: unknown) {
  return error instanceof Error &&
    error.name !== "ZodError" &&
    error.name !== "SyntaxError"
    ? error.message
    : "File sao lưu không hợp lệ hoặc không đúng định dạng. Dữ liệu hiện có được giữ nguyên.";
}
export default function BackupStudio() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [speaking, setSpeaking] = useState<StoredSpeaking[]>([]);
  const [listening, setListening] = useState<StoredListening[]>([]);
  const [storeErrors, setStoreErrors] = useState<string[]>([]);
  const [demoFile, setDemoFile] = useState<{
    text: string;
    summary: string;
  } | null>(null);
  const [speakingFile, setSpeakingFile] = useState<{
    text: string;
    summary: string;
  } | null>(null);
  const [demoConsent, setDemoConsent] = useState(false);
  const [speakingConsent, setSpeakingConsent] = useState(false);
  const [demoInputVersion, setDemoInputVersion] = useState(0);
  const [speakingInputVersion, setSpeakingInputVersion] = useState(0);
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([listSpeaking(), listListening()]);
    const errors: string[] = [];
    if (results[0].status === "fulfilled") setSpeaking(results[0].value);
    else errors.push(`Speaking: ${message(results[0].reason)}`);
    if (results[1].status === "fulfilled") setListening(results[1].value);
    else errors.push(`Listening: ${message(results[1].reason)}`);
    setStoreErrors(errors);
  }, []);
  useEffect(() => {
    if (browserDemo) void refresh();
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function choose(file: File | undefined, kind: "demo" | "speaking") {
    if (kind === "demo") {
      setDemoFile(null);
      setDemoConsent(false);
    } else {
      setSpeakingFile(null);
      setSpeakingConsent(false);
    }
    if (!file) return;
    await run(async () => {
      if (
        file.size >
        (kind === "demo" ? DEMO_BACKUP_LIMIT : SPEAKING_BACKUP_LIMIT)
      )
        throw new Error(`File tối đa ${kind === "demo" ? 10 : 140} MiB.`);
      const text = await file.text();
      if (kind === "demo") {
        const data = parseDemoBackup(text);
        setDemoFile({
          text,
          summary: `${data.writing.length} bài Writing · ${data.attempts.length} lượt Reading · ${data.drafts.length} bản nháp · ${data.published.length} phiên bản phát hành`,
        });
      } else {
        const data = parseSpeakingBackup(text);
        setSpeakingFile({
          text,
          summary: `${data.session.set.title} · ${Object.keys(data.session.responses).length} câu trả lời · ${Object.keys(data.audio).length} audio · ${data.session.status === "completed" ? "Đã hoàn tất" : "Đang luyện"}`,
        });
      }
    });
  }
  return (
    <main id="main" className="backup-page">
      <div className="page-heading">
        <h1>Sao lưu & khôi phục</h1>
        <p>
          Giữ một bản lịch sử học trên máy, để có thể bắt đầu lại ở trình duyệt
          khác.
        </p>
      </div>
      {!browserDemo ? (
        <p className="notice">
          Trang này dành cho chế độ lưu trên trình duyệt. Database SQLite cần
          được sao lưu riêng.
        </p>
      ) : (
        <>
          <p className="notice">
            Sao lưu theo từng nhóm bên dưới. File chứa dữ liệu đã lưu, không
            chứa bản nháp chưa lưu hoặc audio đã hết hạn. File tải xuống do bạn
            quản lý; không tự hết hạn hoặc bị xóa cùng dữ liệu trong app.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="result-summary" role="status">
              {success}
            </p>
          )}
          {storeErrors.map((text) => (
            <p className="error" role="alert" key={text}>
              {text}
            </p>
          ))}
          <section className="card" aria-labelledby="backup-text">
            <div className="section-heading">
              <h2 id="backup-text">Writing, Reading & Tiến độ</h2>
              <span className="status">JSON · tối đa 10 MiB</span>
            </div>
            <p>
              Bao gồm bài đã nộp, lượt Reading dang dở, nguồn tạo đề, nội dung
              đã tự duyệt và trạng thái ôn lỗi. Khôi phục thêm dữ liệu; bản có
              cùng mã được giữ nguyên trên thiết bị.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const data = await api<unknown>("demo/export");
                  const text = JSON.stringify(data, null, 2);
                  parseDemoBackup(text);
                  json(text, "makeng-demo-backup.json");
                  setSuccess(
                    "Đã xuất Writing/Reading/Tạo đề/Tiến độ. Giữ file ở thư mục sao lưu của bạn.",
                  );
                })
              }
            >
              Xuất bản sao Writing/Reading
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!demoFile || !demoConsent) return;
                void run(async () => {
                  const result = await api<{
                    writing: number;
                    reading: number;
                    drafts: number;
                    published: number;
                    skipped: number;
                  }>("demo/restore", {
                    method: "POST",
                    body: JSON.stringify({
                      text: demoFile.text,
                      consent: true,
                    }),
                  });
                  setSuccess(
                    `Đã khôi phục ${result.writing} bài Writing, ${result.reading} lượt Reading, ${result.drafts} bản nháp và ${result.published} phiên bản. Giữ nguyên ${result.skipped} mục đã có.`,
                  );
                  setDemoFile(null);
                  setDemoConsent(false);
                  setDemoInputVersion((n) => n + 1);
                });
              }}
            >
              <label>
                JSON Writing/Reading
                <input
                  key={demoInputVersion}
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  onChange={(e) => void choose(e.target.files?.[0], "demo")}
                />
              </label>
              {demoFile && (
                <p className="notice" aria-label="Bản sao Writing/Reading">
                  {demoFile.summary}
                </p>
              )}
              <label className="consent">
                <input
                  type="checkbox"
                  checked={demoConsent}
                  disabled={busy || !demoFile}
                  onChange={(e) => setDemoConsent(e.target.checked)}
                />{" "}
                Tôi đồng ý thêm dữ liệu sao lưu vào trình duyệt này.
              </label>
              <button
                className="primary"
                disabled={busy || !demoFile || !demoConsent}
              >
                Khôi phục Writing/Reading
              </button>
            </form>
          </section>
          <section className="card" aria-labelledby="backup-speaking">
            <div className="section-heading">
              <h2 id="backup-speaking">Speaking</h2>
              <span className="status">
                Một JSON gồm audio · tối đa 140 MiB
              </span>
            </div>
            <p>
              Mỗi phiên có một bản sao đầy đủ gồm đề, transcript, checklist và
              audio đã lưu. JSON chỉ chứa metadata xuất từ phiên bản cũ chưa
              dùng được ở đây.
            </p>
            {!speaking.length && (
              <p className="muted">
                Chưa có phiên Speaking đã lưu.{" "}
                <Link href="/speaking">Đến Speaking</Link>
              </p>
            )}
            {speaking.map((session) => (
              <div className="history-item" key={session.id}>
                <div>
                  <h3>{session.set.title}</h3>
                  <small>
                    {new Date(session.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {Object.keys(session.blobs).length} audio
                  </small>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      const current = (await listSpeaking()).find(
                        (s) => s.id === session.id,
                      );
                      if (!current)
                        throw new Error(
                          "Phiên đã bị xóa hoặc hết hạn. Cập nhật danh sách.",
                        );
                      json(
                        await exportSpeakingBackup(current, current.blobs),
                        `speaking-backup-${current.id}.json`,
                      );
                      setSuccess("Đã xuất Speaking gồm audio đã lưu.");
                    })
                  }
                >
                  Xuất phiên Speaking
                </button>
              </div>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!speakingFile || !speakingConsent) return;
                void run(async () => {
                  await restoreSpeaking(
                    speakingFile.text,
                    days,
                    speakingConsent,
                  );
                  await refresh();
                  setSuccess(
                    "Đã khôi phục Speaking với hạn lưu mới. Mở Speaking để tiếp tục hoặc xem lại phiên.",
                  );
                  setSpeakingFile(null);
                  setSpeakingConsent(false);
                  setSpeakingInputVersion((n) => n + 1);
                });
              }}
            >
              <label>
                JSON Speaking gồm audio
                <input
                  key={speakingInputVersion}
                  type="file"
                  accept=".json,application/json"
                  disabled={busy}
                  onChange={(e) => void choose(e.target.files?.[0], "speaking")}
                />
              </label>
              {speakingFile && (
                <p className="notice" aria-label="Bản sao Speaking">
                  {speakingFile.summary}
                </p>
              )}
              <label>
                Hạn lưu Speaking sau khôi phục
                <select
                  value={days}
                  disabled={busy}
                  onChange={(e) =>
                    setDays(Number(e.target.value) as 1 | 7 | 30)
                  }
                >
                  <option value={1}>1 ngày</option>
                  <option value={7}>7 ngày</option>
                  <option value={30}>30 ngày</option>
                </select>
              </label>
              <label className="consent">
                <input
                  type="checkbox"
                  disabled={busy || !speakingFile}
                  checked={speakingConsent}
                  onChange={(e) => setSpeakingConsent(e.target.checked)}
                />{" "}
                Tôi đồng ý lưu transcript, tự review và audio trên thiết bị với
                hạn lưu mới.
              </label>
              <button
                className="primary"
                disabled={busy || !speakingFile || !speakingConsent}
              >
                Khôi phục Speaking
              </button>
            </form>
          </section>
          <section
            className="card listening-page backup-listening"
            aria-labelledby="backup-listening"
          >
            <div className="section-heading">
              <h2 id="backup-listening">Listening</h2>
              <span className="status">JSON + file audio riêng</span>
            </div>
            <p>
              Tải cả hai file của từng bài. Khi nhập lại, checksum kiểm tra đúng
              audio đi kèm JSON.
            </p>
            {!listening.length && (
              <p className="muted">
                Chưa có bài Listening đã lưu.{" "}
                <Link href="/listening">Đến Listening</Link>
              </p>
            )}
            {listening.map((lesson) => (
              <div className="history-item" key={lesson.id}>
                <div>
                  <h3>{lesson.content.set.title}</h3>
                  <small>{lesson.attempts.length} lượt luyện</small>
                </div>
                <div className="actions">
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const current = (await listListening()).find(
                          (l) => l.id === lesson.id,
                        );
                        if (!current)
                          throw new Error(
                            "Bài đã bị xóa hoặc hết hạn. Cập nhật danh sách.",
                          );
                        json(
                          exportListeningBackup(current),
                          `listening-${current.id}.json`,
                        );
                        setSuccess(
                          "Đã xuất JSON Listening. Tải audio đi kèm để có thể khôi phục.",
                        );
                      })
                    }
                  >
                    Xuất JSON Listening
                  </button>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const current = (await listListening()).find(
                          (l) => l.id === lesson.id,
                        );
                        if (!current)
                          throw new Error(
                            "Bài đã bị xóa hoặc hết hạn. Cập nhật danh sách.",
                          );
                        download(current.blob, current.content.audio.name);
                        setSuccess(
                          "Đã tải audio Listening. Giữ cùng JSON của bài.",
                        );
                      })
                    }
                  >
                    Tải audio Listening
                  </button>
                </div>
              </div>
            ))}
            <ListeningRestore
              busy={busy}
              setBusy={setBusy}
              onRestored={() => {
                setSuccess("Đã khôi phục Listening. Mở Listening để tiếp tục.");
                void refresh();
              }}
            />
          </section>
          <button disabled={busy} onClick={() => void run(refresh)}>
            Cập nhật danh sách sao lưu
          </button>
          {busy && (
            <p role="status">
              Đang kiểm tra dữ liệu… Giữ trang mở cho tới khi hoàn tất.
            </p>
          )}
        </>
      )}
    </main>
  );
}
