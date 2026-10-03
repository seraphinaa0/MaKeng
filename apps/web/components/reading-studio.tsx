"use client";
import { useEffect, useRef, useState } from "react";
import type {
  PublicReadingSet,
  ReadingAttempt,
  ReadingSummary,
} from "../../../packages/schemas/reading";
import { api } from "./api";
import ReadingPlayer from "./reading-player";

export default function ReadingStudio() {
  const [sessionId, setSessionId] = useState("");
  const [sets, setSets] = useState<PublicReadingSet[]>([]);
  const [history, setHistory] = useState<ReadingSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [attempt, setAttempt] = useState<ReadingAttempt | null>(null);
  const [view, setView] = useState<"library" | "history">("library");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const sessionRequest = useRef<Promise<{ sessionId: string }> | null>(null);
  async function loadHistory() {
    const result = await api<{
      items: ReadingSummary[];
      nextOffset: number | null;
    }>("reading/attempts");
    setHistory(result.items);
    setNextOffset(result.nextOffset);
  }
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const session = await (sessionRequest.current ??= api<{
          sessionId: string;
        }>("session"));
        const catalog = await api<PublicReadingSet[]>("reading/sets");
        if (!active) return;
        setSessionId(session.sessionId);
        setSets(catalog);
        await loadHistory();
        const id = new URLSearchParams(location.search).get("attempt");
        if (id) {
          try {
            const item = await api<ReadingAttempt>(`reading/attempts/${id}`);
            if (active) setAttempt(item);
          } catch {
            if (active) setError("Không tìm thấy bài làm trong phiên này.");
          }
        }
        if (active) setReady(true);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error ? err.message : "Không tải được Reading.",
          );
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);
  function select(item: ReadingAttempt) {
    setAttempt(item);
    window.history.replaceState(null, "", `/reading?attempt=${item.id}`);
  }
  async function start(setId: string) {
    setBusy(true);
    setError("");
    try {
      select(
        await api<ReadingAttempt>("reading/attempts", {
          method: "POST",
          body: JSON.stringify({ setId }),
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở được bài.");
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    setBusy(true);
    setError("");
    try {
      select(await api<ReadingAttempt>(`reading/attempts/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được bài làm.");
    } finally {
      setBusy(false);
    }
  }
  function navigate(view: "library" | "history") {
    setView(view);
    setAttempt(null);
    setError("");
    window.history.replaceState(null, "", "/reading");
    void loadHistory().catch(() => setError("Không tải được lịch sử."));
  }
  return (
    <main id="main" className="reading-page">
      <div className="page-heading">
        <h1>Reading</h1>
        <p>Đọc bài, trả lời câu hỏi và xem giải thích sau khi nộp.</p>
      </div>
      <div className="toolbar">
        <button
          aria-pressed={!attempt && view === "library"}
          onClick={() => navigate("library")}
        >
          Chọn bài đọc
        </button>
        <button
          aria-pressed={!attempt && view === "history"}
          onClick={() => navigate("history")}
        >
          Lịch sử Reading
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => location.reload()}>Tải lại</button>
        </div>
      )}
      {!ready ? (
        <p role="status">Đang tải…</p>
      ) : attempt ? (
        <ReadingPlayer
          key={`${attempt.id}:${attempt.status}:${attempt.revision}`}
          initial={attempt}
          sessionId={sessionId}
          onSubmitted={select}
          onReload={() => open(attempt.id)}
        />
      ) : view === "history" ? (
        <>
          <h2>Bài đang làm và đã nộp</h2>
          {!history.length && (
            <p className="empty">
              Bạn chưa làm bài Reading nào. Chọn một bài để bắt đầu.
            </p>
          )}
          {history.map((item) => (
            <article key={item.id} className="history-item">
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.status === "submitted"
                    ? `Kết quả: ${item.score}/${item.total} câu đúng`
                    : "Đang làm"}{" "}
                  · {new Date(item.createdAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <button disabled={busy} onClick={() => open(item.id)}>
                {item.status === "submitted" ? "Xem kết quả" : "Tiếp tục"}
              </button>
            </article>
          ))}
          {nextOffset !== null && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const page = await api<{
                    items: ReadingSummary[];
                    nextOffset: number | null;
                  }>(`reading/attempts?offset=${nextOffset}`);
                  setHistory((current) => [...current, ...page.items]);
                  setNextOffset(page.nextOffset);
                } catch {
                  setError("Không tải được trang tiếp theo.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Xem thêm
            </button>
          )}
        </>
      ) : (
        <>
          <p className="notice">
            5 bài luyện ngắn tự tạo · Nội dung thử nghiệm, chưa được giáo viên
            duyệt. Không phải đề IELTS chính thức.
          </p>
          <div className="library">
            {sets.map((set) => (
              <article className="card library-card" key={set.id}>
                <div>
                  <h2>{set.title}</h2>
                  <p>
                    {set.questions.length} câu · {set.minutes} phút gợi ý
                  </p>
                  <small>
                    Trắc nghiệm · True / False / Not Given · Điền từ
                  </small>
                </div>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => start(set.id)}
                >
                  Làm bài
                </button>
              </article>
            ))}
          </div>
          <p className="muted">
            Câu trả lời được lưu theo phiên trình duyệt này. Mở lại một bài để
            tiếp tục phần chưa nộp.
          </p>
        </>
      )}
      <footer>
        MaKeng · Bài luyện độc lập, không quy đổi bài ngắn thành band IELTS.
      </footer>
    </main>
  );
}
