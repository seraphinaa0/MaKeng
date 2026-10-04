"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prompts, wordCount } from "../../../packages/domain/writing";
import type { Submission } from "../../../packages/schemas/writing";
import Feedback from "./feedback";
import { api } from "./api";
import { browserDemo } from "./mode";

const statusText = {
  queued: "Đang chờ chấm",
  processing: "Đang xử lý",
  retrying: "Đang thử lại",
  completed: "Đã có phản hồi mẫu",
  failed: "Chưa chấm được",
};
type HistoryPage = { items: Submission[]; nextOffset: number | null };
function rememberSelection(id: string | null) {
  window.history.replaceState(
    null,
    "",
    id ? `/?submission=${encodeURIComponent(id)}` : "/",
  );
}

export default function WritingStudio() {
  const [sessionId, setSessionId] = useState("");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"write" | "history">("write");
  const [prompt, setPrompt] = useState(prompts[0].text);
  const [essay, setEssay] = useState("");
  const [consent, setConsent] = useState(false);
  const [saved, setSaved] = useState("Đang mở bản nháp…");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Submission[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<Submission | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<"all" | string | null>(
    null,
  );
  const [pollingError, setPollingError] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const sessionRequest = useRef<Promise<{ sessionId: string }> | null>(null);
  const count = wordCount(essay);

  const loadHistory = useCallback(async () => {
    const result = await api<HistoryPage>("writing/submissions");
    setItems(result.items);
    setNextOffset(result.nextOffset);
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const session = await (sessionRequest.current ??= api<{
          sessionId: string;
        }>("session"));
        if (!active) return;
        setSessionId(session.sessionId);
        try {
          const raw = localStorage.getItem(`makeng-draft-${session.sessionId}`);
          if (raw) {
            const draft: unknown = JSON.parse(raw);
            if (
              draft &&
              typeof draft === "object" &&
              "prompt" in draft &&
              "essay" in draft &&
              typeof draft.prompt === "string" &&
              typeof draft.essay === "string"
            ) {
              setPrompt(draft.prompt);
              setEssay(draft.essay);
            }
          }
          setSaved("Bản nháp lưu trên thiết bị này");
        } catch {
          setSaved("Trình duyệt không cho phép lưu nháp");
        }
        await loadHistory();
        const id = new URLSearchParams(window.location.search).get(
          "submission",
        );
        if (id) {
          try {
            const item = await api<Submission>(`writing/submissions/${id}`);
            if (active) setSelected(item);
          } catch {
            if (active) {
              setError("Không tìm thấy bài viết trong phiên này.");
              rememberSelection(null);
            }
          }
        }
        if (active) setReady(true);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : "Không thể mở không gian viết.",
          );
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [loadHistory]);

  useEffect(() => {
    if (!ready) return;
    setSaved("Đang lưu nháp…");
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(
          `makeng-draft-${sessionId}`,
          JSON.stringify({ prompt, essay }),
        );
        setSaved("Đã lưu nháp trên thiết bị");
      } catch {
        setSaved("Không lưu được nháp. Hãy sao chép bài trước khi rời trang.");
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [prompt, essay, ready, sessionId]);

  const pendingId =
    selected && ["queued", "processing", "retrying"].includes(selected.status)
      ? selected.id
      : null;
  useEffect(() => {
    if (!pendingId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const poll = async () => {
      try {
        const item = await api<Submission>(`jobs/${pendingId}`);
        if (stopped) return;
        failures = 0;
        setPollingError("");
        setSelected(item);
        if (item.status === "completed" || item.status === "failed") {
          await loadHistory();
          return;
        }
      } catch {
        if (!stopped) {
          failures++;
          setPollingError(
            "Chưa cập nhật được trạng thái. Bài đã lưu; đang kết nối lại…",
          );
        }
      }
      if (!stopped)
        timer = setTimeout(poll, Math.min(1000 * 2 ** failures, 10000));
    };
    timer = setTimeout(poll, 800);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [pendingId, loadHistory]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const input = { prompt, essay, consent };
    try {
      let key = crypto.randomUUID();
      const serialized = JSON.stringify(input);
      // Preserve retry identity across network failures and page reloads.
      try {
        const old = JSON.parse(
          sessionStorage.getItem(`makeng-pending-${sessionId}`) || "null",
        );
        if (old?.input === serialized && typeof old.key === "string")
          key = old.key;
        sessionStorage.setItem(
          `makeng-pending-${sessionId}`,
          JSON.stringify({ key, input: serialized }),
        );
      } catch {
        /* Submission remains usable when browser storage is disabled. */
      }
      const item = await api<Submission>("writing/submissions", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: serialized,
      });
      setSelected(item);
      rememberSelection(item.id);
      setEssay("");
      setConsent(false);
      try {
        sessionStorage.removeItem(`makeng-pending-${sessionId}`);
      } catch {
        /* Optional browser cache. */
      }
      await loadHistory();
      titleRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được bài.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirmDelete) return;
    setBusy(true);
    setError("");
    try {
      if (confirmDelete === "all") {
        await api("session", { method: "DELETE" });
        try {
          localStorage.removeItem(`makeng-draft-${sessionId}`);
          sessionStorage.removeItem(`makeng-pending-${sessionId}`);
          for (const key of Object.keys(localStorage)) {
            if (key.startsWith(`makeng-reading-${sessionId}-`))
              localStorage.removeItem(key);
          }
        } catch {
          /* Browser may disable storage. */
        }
        window.location.assign("/");
        return;
      }
      await api(`writing/submissions/${confirmDelete}`, { method: "DELETE" });
      if (selected?.id === confirmDelete) {
        setSelected(null);
        rememberSelection(null);
      }
      setConfirmDelete(null);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được bài.");
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setSelected(
        await api<Submission>(`writing/submissions/${selected.id}/retry`, {
          method: "POST",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể thử lại.");
    } finally {
      setBusy(false);
    }
  }
  function openItem(item: Submission) {
    setSelected(item);
    setTab("write");
    rememberSelection(item.id);
    setError("");
  }
  function newEssay() {
    setSelected(null);
    setTab("write");
    rememberSelection(null);
    setError("");
  }
  function download(item: Submission) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(item, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `makeng-${item.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main id="main" className="writing-page">
      <div className="page-heading">
        <div>
          <h1 ref={titleRef} tabIndex={-1}>
            Writing Task 2
          </h1>
          <p>Chọn đề, viết bài và xem phản hồi. Hiện dùng phản hồi mẫu.</p>
        </div>
      </div>
      <div className="toolbar" aria-label="Writing">
        <button aria-pressed={tab === "write" && !selected} onClick={newEssay}>
          Viết bài
        </button>
        <button
          aria-pressed={tab === "history"}
          onClick={() => {
            setTab("history");
            void loadHistory().catch(() => setError("Chưa tải được lịch sử."));
          }}
        >
          Lịch sử bài viết
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          {!ready && (
            <button onClick={() => window.location.reload()}>Tải lại</button>
          )}
        </div>
      )}
      {!ready ? (
        !error && <p role="status">Đang tải…</p>
      ) : tab === "history" ? (
        <>
          <div className="section-heading">
            <h2>Bài đã lưu</h2>
            <button
              className="text-button danger"
              onClick={() => setConfirmDelete("all")}
            >
              Xóa dữ liệu phiên này
            </button>
          </div>
          {!items.length ? (
            <div className="empty">
              <h3>Trang đầu tiên đang chờ bạn.</h3>
              <button className="primary" onClick={newEssay}>
                Bắt đầu viết
              </button>
            </div>
          ) : (
            items.map((item) => (
              <article className="history-item" key={item.id}>
                <div>
                  <small>
                    {new Date(item.createdAt).toLocaleString("vi-VN")} ·{" "}
                    {wordCount(item.essay)} từ
                  </small>
                  <h3>{item.prompt}</h3>
                  <span className="status">{statusText[item.status]}</span>
                </div>
                <div className="actions">
                  <button onClick={() => openItem(item)}>Xem bài</button>
                  <button
                    className="text-button danger"
                    aria-label={`Xóa bài ${item.id}`}
                    onClick={() => setConfirmDelete(item.id)}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))
          )}
          {nextOffset !== null && (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await api<HistoryPage>(
                    `writing/submissions?offset=${nextOffset}`,
                  );
                  setItems((current) => [...current, ...result.items]);
                  setNextOffset(result.nextOffset);
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
      ) : selected ? (
        <>
          <div className="toolbar">
            <span className="status" role="status">
              {statusText[selected.status]}
            </span>
            <button onClick={() => download(selected)}>Tải bản lưu</button>
            <button
              className="text-button danger"
              onClick={() => setConfirmDelete(selected.id)}
            >
              Xóa bài
            </button>
          </div>
          <section className="card">
            <h2>Đề bài</h2>
            <p>{selected.prompt}</p>
            <h2>Bản đã nộp</h2>
            <p className="essay-copy">{selected.essay}</p>
          </section>
          {pendingId && (
            <p className="notice" role="status">
              Bài đã lưu. Đang chuẩn bị phản hồi mẫu; bạn có thể xem lại trong
              lịch sử.
            </p>
          )}
          {pollingError && <p role="status">{pollingError}</p>}
          {selected.status === "failed" && (
            <div className="error">
              Chưa tạo được phản hồi. Bài vẫn được lưu.{" "}
              {selected.attempts < 3 && (
                <button disabled={busy} onClick={retry}>
                  Thử chấm lại
                </button>
              )}
            </div>
          )}
          <Feedback item={selected} />
        </>
      ) : (
        <form onSubmit={submit}>
          <section className="card writing-form">
            <label htmlFor="topic">1. Chọn đề</label>
            <select
              id="topic"
              value={prompts.find((p) => p.text === prompt)?.id || "custom"}
              onChange={(event) =>
                setPrompt(
                  prompts.find((p) => p.id === event.target.value)?.text || "",
                )
              }
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
              <option value="custom">Nhập đề riêng</option>
            </select>
            <label htmlFor="prompt" className="sr-only">
              Đề bài
            </label>
            <textarea
              id="prompt"
              className="prompt-input"
              rows={3}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
              minLength={20}
              maxLength={3000}
            />
            <h2>Bài viết của bạn</h2>
            <label htmlFor="essay" className="sr-only">
              Bài viết bằng tiếng Anh
            </label>
            <textarea
              id="essay"
              className="essay-input"
              value={essay}
              onChange={(event) => setEssay(event.target.value)}
              placeholder="Viết bài bằng tiếng Anh tại đây…"
              required
              minLength={30}
              maxLength={20000}
              lang="en"
              spellCheck
            />
            <div className="row muted">
              <span>{count} từ · mục tiêu 250+</span>
              <span role="status">{saved}</span>
            </div>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
              />
              Đồng ý lưu bài{" "}
              {browserDemo ? "trong trình duyệt này" : "trên máy chủ local"}.
              Bạn có thể xóa bài trong lịch sử.
            </label>
            <div className="submit-row">
              <button
                className="primary"
                disabled={
                  busy ||
                  !consent ||
                  essay.trim().length < 30 ||
                  prompt.trim().length < 20
                }
              >
                {busy ? "Đang lưu…" : "Lưu & xem phản hồi mẫu"}
              </button>
              <small>Không gửi bài đến AI bên ngoài.</small>
            </div>
          </section>
        </form>
      )}
      {confirmDelete && (
        <section
          className="delete-confirm"
          role="alert"
          aria-label="Xác nhận xóa"
        >
          <h3>
            {confirmDelete === "all"
              ? "Xóa toàn bộ dữ liệu phiên này?"
              : "Xóa bài viết này?"}
          </h3>
          <p>
            {confirmDelete === "all"
              ? browserDemo
                ? "Toàn bộ Writing, Reading, Listening và Speaking (audio, transcript và lượt luyện), nguồn, bản nháp tạo đề và bài đã phát hành trên thiết bị này sẽ bị xóa. Hãy xuất dữ liệu tại mục Tạo đề và xuất Listening/Speaking riêng trước; không thể hoàn tác. Nếu bộ nhớ gặp lỗi, thao tác có thể chỉ xóa một phần; hãy thử lại."
                : "Bài Writing, bài Reading, phản hồi và phiên sẽ bị xóa. Không thể hoàn tác."
              : "Bài viết và phản hồi sẽ bị xóa. Không thể hoàn tác."}
          </p>
          <div className="actions">
            <button className="danger-button" disabled={busy} onClick={remove}>
              Xác nhận xóa
            </button>
            <button disabled={busy} onClick={() => setConfirmDelete(null)}>
              Giữ lại
            </button>
          </div>
        </section>
      )}
      <footer>
        MaKeng · Bài luyện độc lập, không phải kết quả IELTS chính thức.
      </footer>
    </main>
  );
}
