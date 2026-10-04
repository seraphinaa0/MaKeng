"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { type ReadingDraft } from "../../../packages/schemas/authoring";
import { type ReadingSet } from "../../../packages/schemas/reading";
import { qualityIssues } from "../../../packages/domain/authoring";
import { typeLabels } from "../../../packages/domain/reading";
import { api } from "./api";
import { browserDemo } from "./mode";

const labels = {
  needs_review: "Chờ duyệt",
  approved: "Đã duyệt, chưa phát hành",
  rejected: "Cần sửa lại",
  published: "Đã phát hành trên thiết bị",
};
const auditLabels = {
  generated: "Tạo mẫu",
  saved: "Lưu sửa đổi",
  regenerated: "Tạo lại mẫu",
  approved: "Duyệt",
  rejected: "Từ chối",
  published: "Phát hành",
  revised: "Tạo phiên bản mới",
};
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
export default function AuthoringStudio() {
  const [drafts, setDrafts] = useState<ReadingDraft[]>([]);
  const [selected, setSelected] = useState<ReadingDraft | null>(null);
  const [editing, setEditing] = useState<ReadingSet | null>(null);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [rights, setRights] = useState(false);
  const [reviewer, setReviewer] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState("");
  async function refresh() {
    const result = await api<ReadingDraft[]>("authoring/drafts");
    setDrafts(result);
    return result;
  }
  useEffect(() => {
    if (!browserDemo) return;
    let active = true;
    api<ReadingDraft[]>("authoring/drafts")
      .then((items) => {
        if (active) {
          setDrafts(items);
          setReady(true);
        }
      })
      .catch((err) => {
        if (active)
          setError(
            err instanceof Error ? err.message : "Không tải được bản nháp.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || text.trim()) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const guardLink = (event: MouseEvent) => {
      if (
        !(dirty || text.trim()) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        link instanceof HTMLAnchorElement &&
        link.target !== "_blank" &&
        !link.hasAttribute("download") &&
        new URL(link.href).pathname !== location.pathname &&
        !window.confirm("Rời trang và bỏ nội dung chưa lưu?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", guard);
    document.addEventListener("click", guardLink, true);
    return () => {
      window.removeEventListener("beforeunload", guard);
      document.removeEventListener("click", guardLink, true);
    };
  }, [dirty, text]);
  function choose(draft: ReadingDraft | null) {
    if (dirty && !window.confirm("Bỏ các sửa đổi chưa lưu?")) return;
    setSelected(draft);
    setEditing(draft ? structuredClone(draft.set) : null);
    setDirty(false);
    setConfirmed(false);
    setReason("");
    setError("");
    setNotice("");
  }
  function edit(fn: (set: ReadingSet) => void) {
    if (!editing) return;
    const next = structuredClone(editing);
    fn(next);
    setEditing(next);
    setDirty(true);
    setConfirmed(false);
    setNotice("");
  }
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không xử lý được yêu cầu; nội dung nhập vẫn được giữ.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function action(action: string, extra: Record<string, unknown> = {}) {
    if (!selected) return;
    await run(async () => {
      const draft = await api<ReadingDraft>(`authoring/drafts/${selected.id}`, {
        method: "POST",
        body: JSON.stringify({ action, revision: selected.revision, ...extra }),
      });
      setSelected(draft);
      setEditing(structuredClone(draft.set));
      setDirty(false);
      setConfirmed(false);
      await refresh();
      setNotice(
        action === "publish"
          ? "Đã thêm vào thư viện Reading trên thiết bị này."
          : "Đã lưu thay đổi trong trình duyệt.",
      );
    });
  }
  const issues = editing ? qualityIssues(editing) : [];
  if (!browserDemo)
    return (
      <main id="main">
        <h1>Tạo đề</h1>
        <p>
          Phase 3 hiện là demo trình duyệt. Chạy web với
          NEXT_PUBLIC_MAKENG_DEMO=true để thử; API local vẫn hỗ trợ Phase 1–2.
        </p>
      </main>
    );
  return (
    <main id="main" className="authoring-page">
      <div className="page-heading">
        <h1>Tạo đề Reading</h1>
        <p>Nhập nguồn → tạo nháp → kiểm tra → duyệt → luyện tập.</p>
      </div>
      <p className="notice">
        Tạo mẫu bằng quy tắc, chưa dùng AI. Câu hỏi đơn giản để thử quy trình;
        hãy kiểm tra ý nghĩa, độ khó và lựa chọn gây nhiễu. “Phát hành” chỉ thêm
        bài vào thư viện của trình duyệt này.
      </p>
      <div className="toolbar">
        <button onClick={() => choose(null)} disabled={busy}>
          Nguồn mới
        </button>
        <Link href="/reading">Mở thư viện Reading</Link>
        <button
          disabled={busy || !ready}
          onClick={() =>
            void run(async () =>
              download(await api("demo/export"), "makeng-demo-backup.json"),
            )
          }
        >
          Xuất dữ liệu demo
        </button>
        <button
          disabled={busy}
          onClick={() => {
            if (
              window.confirm(
                "Xóa toàn bộ Writing, Reading, Listening, Speaking (audio và transcript) và bản nháp tạo đề trên trình duyệt này? Hãy xuất bản sao trước. Nếu bộ nhớ gặp lỗi có thể chỉ xóa một phần; hãy thử lại.",
              )
            )
              void run(async () => {
                const session = await api<{ sessionId: string }>("session");
                await api("session", { method: "DELETE" });
                localStorage.removeItem(`makeng-draft-${session.sessionId}`);
                sessionStorage.removeItem(
                  `makeng-pending-${session.sessionId}`,
                );
                for (const key of Object.keys(localStorage))
                  if (key.startsWith(`makeng-reading-${session.sessionId}-`))
                    localStorage.removeItem(key);
                setSelected(null);
                setEditing(null);
                setDirty(false);
                setText("");
                setTitle("");
                setAuthor("");
                setRights(false);
                setDrafts([]);
                setReady(true);
                setNotice("Đã xóa dữ liệu demo.");
              });
          }}
        >
          Xóa dữ liệu demo
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                if (
                  dirty &&
                  !window.confirm("Tải bản đã lưu và bỏ sửa đổi chưa lưu?")
                )
                  return;
                const items = await refresh();
                setReady(true);
                if (selected) {
                  const item = items.find((d) => d.id === selected.id) ?? null;
                  setSelected(item);
                  setEditing(item ? structuredClone(item.set) : null);
                  setDirty(false);
                }
              })
            }
          >
            Tải bản đã lưu
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {!ready && !error && <p role="status">Đang tải bản nháp…</p>}
      {ready && (
        <>
          <details
            className="card draft-list"
            open={!selected && drafts.length > 0}
          >
            <summary>Bản nháp và bài đã phát hành ({drafts.length})</summary>
            {!drafts.length && (
              <p className="muted">
                Chưa có bản nháp. Dán văn bản gốc bên dưới để bắt đầu.
              </p>
            )}
            {drafts.map((d) => (
              <div className="history-item" key={d.id}>
                <div>
                  <strong>{d.set.title}</strong>
                  <p>
                    {labels[d.status]} · v{d.set.version}
                  </p>
                </div>
                <button disabled={busy} onClick={() => choose(d)}>
                  Mở bản nháp
                </button>
              </div>
            ))}
          </details>
          {!selected ? (
            <form
              className="card source-form"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const draft = await api<ReadingDraft>("authoring/drafts", {
                    method: "POST",
                    body: JSON.stringify({
                      title,
                      author,
                      text,
                      rightsConfirmed: rights,
                    }),
                  });
                  setSelected(draft);
                  setEditing(structuredClone(draft.set));
                  setText("");
                  setTitle("");
                  setRights(false);
                  await refresh();
                });
              }}
            >
              <h2>1. Văn bản nguồn</h2>
              <label>
                Tiêu đề
                <input
                  required
                  minLength={3}
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                Tác giả nguồn
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </label>
              <label>
                Văn bản tiếng Anh
                <textarea
                  required
                  minLength={100}
                  maxLength={15000}
                  rows={10}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <p className="muted">
                100–15.000 ký tự. Dùng dòng trống để chia đoạn. Không nhập đề
                Cambridge, nguồn không có quyền tái sử dụng hoặc dữ liệu nhạy
                cảm.
              </p>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={rights}
                  onChange={(e) => setRights(e.target.checked)}
                  required
                />
                Tôi là tác giả và sở hữu quyền sử dụng văn bản gốc này.
              </label>
              <p className="muted">
                Nguồn chỉ được lưu khi tạo nháp thành công. Sao chép văn bản
                trước khi rời trang.
              </p>
              <button className="primary" disabled={busy || !rights}>
                {busy ? "Đang tạo và kiểm tra…" : "Tạo 3 câu hỏi mẫu"}
              </button>
            </form>
          ) : (
            editing && (
              <>
                <div className="toolbar">
                  <h2>{editing.title}</h2>
                  <span>
                    {labels[selected.status]} · v{editing.version} · Tạo{" "}
                    {selected.generations}/3
                  </span>
                  <span role="status">
                    {dirty ? "Có sửa đổi chưa lưu" : "Đã lưu"}
                  </span>
                </div>
                <div className="authoring-grid">
                  <section className="card source-preview">
                    <h2>Nguồn đã chuẩn hóa</h2>
                    <p className="muted">
                      Tác giả: {selected.source.author} · Nội dung gốc do người
                      dùng sở hữu
                    </p>
                    {editing.paragraphs.map((p) => (
                      <div key={p.id}>
                        <strong>{p.id}</strong>
                        <p>{p.text}</p>
                      </div>
                    ))}
                  </section>
                  <section className="review-editor">
                    <h2>2. Kiểm tra câu hỏi</h2>
                    {editing.questions.map((q, index) => {
                      const solution = editing.solutions[q.id];
                      return (
                        <fieldset
                          className="card"
                          key={q.id}
                          disabled={busy || selected.status === "published"}
                        >
                          <legend>
                            Câu {index + 1} · {typeLabels[q.type]}
                          </legend>
                          <label>
                            Câu hỏi {index + 1}
                            <textarea
                              rows={3}
                              value={q.prompt}
                              onChange={(e) =>
                                edit((s) => {
                                  s.questions[index].prompt = e.target.value;
                                })
                              }
                            />
                          </label>
                          {q.type === "mcq" &&
                            q.options.map((option, n) => (
                              <label key={option.id}>
                                Lựa chọn {option.id}
                                <input
                                  value={option.text}
                                  onChange={(e) =>
                                    edit((s) => {
                                      const question = s.questions[index];
                                      if (question.type === "mcq")
                                        question.options[n].text =
                                          e.target.value;
                                    })
                                  }
                                />
                              </label>
                            ))}
                          {q.type === "completion" && (
                            <label>
                              Giới hạn số từ
                              <select
                                value={q.maxWords}
                                onChange={(e) =>
                                  edit((s) => {
                                    const question = s.questions[index];
                                    if (question.type === "completion")
                                      question.maxWords = Number(
                                        e.target.value,
                                      );
                                  })
                                }
                              >
                                {[1, 2, 3].map((n) => (
                                  <option key={n}>{n}</option>
                                ))}
                              </select>
                            </label>
                          )}
                          <label>
                            Đáp án {index + 1}
                            {q.type === "completion" ? (
                              <input
                                value={solution.answers.join(" | ")}
                                onChange={(e) =>
                                  edit((s) => {
                                    s.solutions[q.id].answers = e.target.value
                                      .split("|")
                                      .map((a) => a.trim());
                                  })
                                }
                              />
                            ) : (
                              <select
                                value={solution.answers[0]}
                                onChange={(e) =>
                                  edit((s) => {
                                    s.solutions[q.id].answers = [
                                      e.target.value,
                                    ];
                                  })
                                }
                              >
                                {(q.type === "mcq"
                                  ? q.options.map((o) => o.id)
                                  : ["TRUE", "FALSE", "NOT GIVEN"]
                                ).map((a) => (
                                  <option key={a}>{a}</option>
                                ))}
                              </select>
                            )}
                          </label>
                          {q.type === "completion" && (
                            <small>
                              Dùng dấu | để thêm đáp án tương đương.
                            </small>
                          )}
                          <label>
                            Giải thích {index + 1}
                            <textarea
                              rows={3}
                              value={solution.explanation}
                              onChange={(e) =>
                                edit((s) => {
                                  s.solutions[q.id].explanation =
                                    e.target.value;
                                })
                              }
                            />
                          </label>
                          <label>
                            Đoạn dẫn chứng {index + 1}
                            <select
                              value={solution.evidence.blockId}
                              onChange={(e) =>
                                edit((s) => {
                                  const ev = s.solutions[q.id].evidence;
                                  ev.blockId = e.target.value;
                                  ev.start = s.paragraphs
                                    .find((p) => p.id === ev.blockId)!
                                    .text.indexOf(ev.quote);
                                  ev.end = ev.start + ev.quote.length;
                                })
                              }
                            >
                              {editing.paragraphs.map((p) => (
                                <option key={p.id}>{p.id}</option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Trích dẫn chính xác {index + 1}
                            <textarea
                              rows={3}
                              value={solution.evidence.quote}
                              onChange={(e) =>
                                edit((s) => {
                                  const ev = s.solutions[q.id].evidence;
                                  ev.quote = e.target.value;
                                  ev.start = s.paragraphs
                                    .find((p) => p.id === ev.blockId)!
                                    .text.indexOf(ev.quote);
                                  ev.end = ev.start + ev.quote.length;
                                })
                              }
                            />
                          </label>
                        </fieldset>
                      );
                    })}
                  </section>
                </div>
                <section className="card review-actions">
                  <h2>3. Duyệt và phát hành</h2>
                  {issues.length ? (
                    <div className="error" role="alert">
                      <strong>Cần sửa trước khi duyệt:</strong>
                      <ul>
                        {issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>
                      Kiểm tra cấu trúc đạt: đáp án, lựa chọn và vị trí dẫn
                      chứng. Chưa kiểm chứng ý nghĩa hay độ khó bằng AI/giáo
                      viên.
                    </p>
                  )}
                  {selected.status !== "published" ? (
                    <>
                      <div className="actions">
                        <button
                          disabled={busy || !dirty || issues.length > 0}
                          onClick={() => void action("save", { set: editing })}
                        >
                          Lưu sửa đổi
                        </button>
                        <button
                          disabled={busy || selected.generations >= 3}
                          onClick={() => {
                            if (
                              window.confirm(
                                "Tạo lại sẽ thay câu hỏi và bỏ các sửa đổi, kể cả sửa đổi đã lưu. Tiếp tục?",
                              )
                            )
                              void action("regenerate");
                          }}
                        >
                          Tạo lại mẫu
                        </button>
                      </div>
                      <label>
                        Tên người tự duyệt
                        <input
                          maxLength={100}
                          value={reviewer}
                          onChange={(e) => setReviewer(e.target.value)}
                        />
                      </label>
                      <label className="consent">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={(e) => setConfirmed(e.target.checked)}
                        />
                        Tôi đã kiểm tra quyền sử dụng, từng đáp án, dẫn chứng, ý
                        nghĩa và lựa chọn gây nhiễu.
                      </label>
                      <div className="actions">
                        <button
                          disabled={
                            busy ||
                            dirty ||
                            issues.length > 0 ||
                            !confirmed ||
                            reviewer.trim().length < 2 ||
                            selected.status !== "needs_review"
                          }
                          onClick={() =>
                            void action("approve", { reviewer, confirmed })
                          }
                        >
                          Duyệt bản nháp
                        </button>
                        <button
                          className="primary"
                          disabled={
                            busy || dirty || selected.status !== "approved"
                          }
                          onClick={() => void action("publish")}
                        >
                          Phát hành trên thiết bị
                        </button>
                      </div>
                      <label>
                        Lý do từ chối
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                      <button
                        disabled={
                          busy ||
                          dirty ||
                          reason.trim().length < 5 ||
                          selected.status !== "needs_review"
                        }
                        onClick={() => void action("reject", { reason })}
                      >
                        Từ chối và ghi lý do
                      </button>
                    </>
                  ) : (
                    <div className="actions">
                      <Link href="/reading">Luyện bài vừa tạo</Link>
                      <button
                        disabled={busy}
                        onClick={() => void action("revise")}
                      >
                        Tạo phiên bản mới
                      </button>
                    </div>
                  )}
                  <button
                    disabled={busy}
                    onClick={() =>
                      download(
                        { ...selected, unsavedEdits: editing },
                        "makeng-reading-draft.json",
                      )
                    }
                  >
                    Tải bản nháp JSON
                  </button>
                </section>
                <details className="card">
                  <summary>Nhật ký thay đổi ({selected.audit.length})</summary>
                  <ol>
                    {selected.audit.map((entry, i) => (
                      <li key={i}>
                        {auditLabels[entry.action]} ·{" "}
                        {new Date(entry.at).toLocaleString("vi-VN")}{" "}
                        {entry.note && `· ${entry.note}`}
                      </li>
                    ))}
                  </ol>
                </details>
              </>
            )
          )}
        </>
      )}
    </main>
  );
}
