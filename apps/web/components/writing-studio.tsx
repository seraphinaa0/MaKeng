"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prompts, wordCount } from "../../../packages/domain/writing";
import type { Submission } from "../../../packages/schemas/writing";
import Feedback from "./feedback";
import { api } from "./api";
import { browserDemo } from "./mode";
import {
  isTaskOne,
  taskOnePrompts,
} from "../../../packages/content/writing-task-one";
import { randomItem } from "../../../packages/domain/catalog";

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
    id ? `/writing?submission=${encodeURIComponent(id)}` : "/writing",
  );
}

export default function WritingStudio() {
  const [sessionId, setSessionId] = useState("");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"write" | "history">("write");
  const [prompt, setPrompt] = useState(prompts[0].text);
  const [practicing, setPracticing] = useState(false);
  const [category, setCategory] = useState<"task2" | "task1">("task2");
  const [search, setSearch] = useState("");
  const [essay, setEssay] = useState("");
  const [draftAppearance, setDraftAppearance] = useState({
    bold: false,
    italic: false,
    underline: false,
  });
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
  const taskOne = isTaskOne(prompt);
  const target = taskOne ? 150 : 250;
  const catalog = (category === "task1" ? taskOnePrompts : prompts).filter(
    (item) =>
      `${item.title} ${item.topic} ${item.text}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const dataPrompt = taskOnePrompts.find((item) => item.text === prompt);
  function beginPrompt(text: string) {
    if (
      essay.trim() &&
      text !== prompt &&
      !confirm("Đổi đề sẽ bỏ bản nháp hiện tại. Bạn muốn tiếp tục?")
    )
      return;
    if (text !== prompt) setEssay("");
    setPrompt(text);
    setPracticing(true);
    setSelected(null);
    setConsent(false);
    window.history.replaceState(null, "", "/writing?practice=1");
  }

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
        setPracticing(
          new URLSearchParams(window.location.search).has("practice"),
        );
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
        window.location.assign("/writing");
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
    setPracticing(false);
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
    <main
      id="main"
      className="writing-page"
      data-practice={practicing && tab === "write" && !selected}
    >
      <div className="page-heading">
        <div>
          <h1 ref={titleRef} tabIndex={-1}>
            Writing · Luyện viết
          </h1>
          <p>Chọn một đề trong thư viện, rồi mở không gian viết riêng.</p>
        </div>
      </div>
      {(!practicing || tab !== "write" || selected) && (
        <div className="toolbar" aria-label="Writing">
          <button
            aria-pressed={tab === "write" && !selected}
            onClick={newEssay}
          >
            Thư viện đề viết
          </button>
          <button
            aria-pressed={tab === "history"}
            onClick={() => {
              setTab("history");
              void loadHistory().catch(() =>
                setError("Chưa tải được lịch sử."),
              );
            }}
          >
            Lịch sử bài viết
          </button>
        </div>
      )}
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
                  <span className="status">
                    {isTaskOne(item.prompt)
                      ? "Task 1 · Đã lưu bài"
                      : statusText[item.status]}
                  </span>
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
              {isTaskOne(selected.prompt)
                ? "Task 1 · Đã lưu bài, chưa chấm điểm"
                : statusText[selected.status]}
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
            <p className="essay-copy" lang="en">
              {selected.prompt}
            </p>
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
          {isTaskOne(selected.prompt) ? (
            <TaskOneChecklist />
          ) : (
            <Feedback item={selected} />
          )}
        </>
      ) : !practicing ? (
        <section aria-label="Thư viện đề Writing">
          <div className="catalog-hero">
            <div>
              <p className="eyebrow">CHỌN ĐỀ → VIẾT BÀI → XEM LẠI</p>
              <h2>Hôm nay bạn muốn viết gì?</h2>
              <p>
                Task 1 mô tả dữ liệu. Task 2 phát triển quan điểm và lập luận.
              </p>
            </div>
            <span className="catalog-emblem" aria-hidden="true">
              Aa<span>WRITE YOUR IDEAS</span>
            </span>
          </div>
          <div className="catalog-controls">
            <div className="toolbar" aria-label="Loại bài viết">
              <button
                aria-pressed={category === "task2"}
                onClick={() => setCategory("task2")}
              >
                Task 2 · Bài luận
              </button>
              {browserDemo && (
                <button
                  aria-pressed={category === "task1"}
                  onClick={() => setCategory("task1")}
                >
                  Task 1 · Mô tả dữ liệu
                </button>
              )}
            </div>
            <label>
              Tìm chủ đề
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Giáo dục, giao thông, work…"
              />
            </label>
            <button
              className="primary"
              disabled={!catalog.length}
              onClick={() => {
                const item = randomItem(catalog);
                if (item) beginPrompt(item.text);
              }}
            >
              Chọn đề ngẫu nhiên
            </button>
          </div>
          <p className="muted">
            {catalog.length} đề phù hợp ·{" "}
            {category === "task1"
              ? "20 phút gợi ý · 150+ từ · tự kiểm tra"
              : "40 phút gợi ý · 250+ từ · phản hồi mẫu, chưa chấm AI"}
          </p>
          <div className="catalog-grid">
            {catalog.map((item, index) => (
              <article className="catalog-card" key={item.id}>
                <div className="catalog-card-top">
                  <span className="catalog-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="status">
                    {category === "task1" ? "TASK 1" : "TASK 2"}
                  </span>
                </div>
                <small>{item.topic}</small>
                <h3>{item.title}</h3>
                <p>
                  {
                    item.text
                      .replace(/^\[Academic Task 1\]\n/, "")
                      .split("\n")[0]
                  }
                </p>
                <button onClick={() => beginPrompt(item.text)}>
                  Mở đề & bắt đầu viết →
                </button>
              </article>
            ))}
          </div>
          {!catalog.length && (
            <p className="empty">Không có đề phù hợp. Thử từ khóa khác.</p>
          )}
          <div className="catalog-footer">
            <div>
              <h3>Đã có đề riêng hoặc bản nháp?</h3>
              <p>Tiếp tục bài đang viết mà không cần chọn lại đề.</p>
            </div>
            <div className="actions">
              <button onClick={() => beginPrompt(prompt)}>
                Tiếp tục bản nháp
              </button>
              <button onClick={() => beginPrompt("")}>
                Nhập đề Task 2 riêng
              </button>
            </div>
          </div>
        </section>
      ) : (
        <form onSubmit={submit}>
          <section className="card writing-form writing-workspace">
            <div className="section-heading">
              <h2>
                {taskOne ? "Task 1 · Mô tả dữ liệu" : "Task 2 · Bài luận"}
              </h2>
              <button type="button" onClick={newEssay}>
                ← Đổi đề trong thư viện
              </button>
            </div>
            <div className="writing-question-pane">
              <h3 className="lumen-task-label">
                {taskOne ? "Task 1" : "Task 2"}
              </h3>
              <p className="hub-kicker">QUESTION · ĐỀ BÀI</p>
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
                readOnly={taskOne}
              />
              {dataPrompt && (
                <div className="task-data">
                  <table>
                    <caption>Số liệu tự tạo · MaKeng · v1</caption>
                    <thead>
                      <tr>
                        {dataPrompt.columns.map((column) => (
                          <th key={column} scope="col">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataPrompt.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, index) =>
                            index === 0 ? (
                              <th key={index} scope="row">
                                {cell}
                              </th>
                            ) : (
                              <td key={index}>{cell}</td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="writing-editor-pane">
              <div
                className="editor-toolbar"
                role="toolbar"
                aria-label="Draft appearance (whole text)"
              >
                <button
                  type="button"
                  aria-label="Bold whole draft"
                  aria-pressed={draftAppearance.bold}
                  onClick={() =>
                    setDraftAppearance((value) => ({
                      ...value,
                      bold: !value.bold,
                    }))
                  }
                >
                  <b>B</b>
                </button>
                <button
                  type="button"
                  aria-label="Italic whole draft"
                  aria-pressed={draftAppearance.italic}
                  onClick={() =>
                    setDraftAppearance((value) => ({
                      ...value,
                      italic: !value.italic,
                    }))
                  }
                >
                  <i>I</i>
                </button>
                <button
                  type="button"
                  aria-label="Underline whole draft"
                  aria-pressed={draftAppearance.underline}
                  onClick={() =>
                    setDraftAppearance((value) => ({
                      ...value,
                      underline: !value.underline,
                    }))
                  }
                >
                  <u>U</u>
                </button>
                <span>Plain-text draft</span>
              </div>
              <div className="writing-cue">
                <h2>Bài viết của bạn</h2>
                <span>
                  {taskOne
                    ? "Mở bài → Tổng quan → So sánh số liệu nổi bật"
                    : "Bắt đầu với một ý. Phát triển từng đoạn."}
                </span>
              </div>
              <label htmlFor="essay" className="sr-only">
                Bài viết bằng tiếng Anh
              </label>
              <textarea
                id="essay"
                className="essay-input"
                style={{
                  fontWeight: draftAppearance.bold ? 700 : 400,
                  fontStyle: draftAppearance.italic ? "italic" : "normal",
                  textDecoration: draftAppearance.underline
                    ? "underline"
                    : "none",
                }}
                value={essay}
                onChange={(event) => setEssay(event.target.value)}
                placeholder="Start writing your essay here…"
                required
                minLength={30}
                maxLength={20000}
                lang="en"
                spellCheck
              />
              <progress
                className="word-progress"
                value={Math.min(count, target)}
                max={target}
                aria-label={`Số từ so với mục tiêu gợi ý ${target} từ`}
              />
              <div className="row muted">
                <span>
                  {count} từ · mục tiêu {target}+
                </span>
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
                  type="button"
                  onClick={() => {
                    setTab("history");
                    void loadHistory().catch(() =>
                      setError("Chưa tải được lịch sử."),
                    );
                  }}
                >
                  Lịch sử bài viết
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem(
                        `makeng-draft-${sessionId}`,
                        JSON.stringify({ prompt, essay }),
                      );
                      setSaved("Đã lưu nháp trên thiết bị");
                    } catch {
                      setSaved(
                        "Không lưu được nháp. Hãy sao chép bài trước khi rời trang.",
                      );
                    }
                  }}
                >
                  Save draft
                </button>
                <button
                  className="primary"
                  aria-label={
                    busy
                      ? "Đang lưu…"
                      : taskOne
                        ? "Lưu bài Task 1 & tự kiểm tra"
                        : "Lưu & xem phản hồi mẫu"
                  }
                  disabled={
                    busy ||
                    !consent ||
                    essay.trim().length < 30 ||
                    prompt.trim().length < 20
                  }
                >
                  {busy ? "Saving…" : "Submit"}
                </button>
                <small>Không gửi bài đến AI bên ngoài.</small>
              </div>
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

function TaskOneChecklist() {
  return (
    <section className="card">
      <h2>Tự kiểm tra bài Task 1</h2>
      <p>Đã lưu bài. Chưa có chấm AI hoặc band cho Task 1.</p>
      <ul>
        <li>Có đoạn tổng quan nêu xu hướng hoặc khác biệt lớn nhất?</li>
        <li>Đã chọn các số liệu nổi bật và so sánh thay vì liệt kê tất cả?</li>
        <li>Số liệu, đơn vị và mốc thời gian có chính xác?</li>
        <li>Không thêm ý kiến cá nhân hoặc nguyên nhân không có trong đề?</li>
      </ul>
    </section>
  );
}
