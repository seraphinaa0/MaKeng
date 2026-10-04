"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ReadingAttempt,
  Solution,
  AttemptInput,
} from "../../../packages/schemas/reading";
import { saveAttemptSchema } from "../../../packages/schemas/reading";
import { typeLabels } from "../../../packages/domain/reading";
import { api, ApiError } from "./api";
import { browserDemo } from "./mode";

type Edits = Pick<AttemptInput, "answers" | "flagged">;
export default function ReadingPlayer({
  initial,
  sessionId,
  onSubmitted,
  onReload,
}: {
  initial: ReadingAttempt;
  sessionId: string;
  onSubmitted: (item: ReadingAttempt) => void;
  onReload: () => Promise<void>;
}) {
  const [edits, setEdits] = useState<Edits>({
    answers: initial.answers,
    flagged: initial.flagged,
  });
  const current = useRef(edits);
  const revision = useRef(initial.revision);
  const savedSignature = useRef(JSON.stringify(edits));
  const inflight = useRef<Promise<void> | null>(null);
  const conflicted = useRef(false);
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState("Đã lưu");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [recovered, setRecovered] = useState<Edits | null>(null);
  const [panel, setPanel] = useState<"passage" | "questions">("passage");
  const [highlight, setHighlight] = useState<Solution["evidence"] | null>(null);
  const cacheKey = `makeng-reading-${sessionId}-${initial.id}`;
  const submitted = initial.status === "submitted";
  const answered = initial.content.questions.filter((q) =>
    edits.answers[q.id]?.trim(),
  ).length;
  const total = initial.content.questions.length;

  const cache = useCallback(
    (value: Edits) => {
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ ...value, revision: revision.current }),
        );
      } catch {
        setError(
          "Không lưu được bản nháp. Giữ trang mở và sao chép câu trả lời trước khi rời trang.",
        );
      }
    },
    [cacheKey],
  );
  useEffect(() => {
    if (!submitted) {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const parsed = saveAttemptSchema.safeParse(JSON.parse(raw));
          if (parsed.success) {
            const value = {
              answers: parsed.data.answers,
              flagged: parsed.data.flagged,
            };
            if (JSON.stringify(value) !== savedSignature.current) {
              if (parsed.data.revision === initial.revision) {
                current.current = value;
                setEdits(value);
                setSaveState("Đã khôi phục bản nháp trên thiết bị");
              } else setRecovered(value);
            }
          }
        }
      } catch {
        setError("Không đọc được bản nháp; đang dùng bản lưu gần nhất.");
      }
    }
    setReady(true);
  }, [cacheKey, initial.revision, submitted]);

  const save = useCallback(async () => {
    if (submitted) return;
    if (conflicted.current) throw new Error("Hãy tải bản đã lưu ở tab khác.");
    if (inflight.current) return inflight.current;
    const operation = (async () => {
      while (savedSignature.current !== JSON.stringify(current.current)) {
        const snapshot = structuredClone(current.current);
        setSaveState("Đang lưu…");
        const result = await api<ReadingAttempt>(
          `reading/attempts/${initial.id}/answers`,
          {
            method: "POST",
            body: JSON.stringify({ ...snapshot, revision: revision.current }),
          },
        );
        revision.current = result.revision;
        savedSignature.current = JSON.stringify(snapshot);
        cache(current.current);
      }
      setSaveState(
        browserDemo ? "Đã lưu trong trình duyệt" : "Đã lưu trên máy chủ",
      );
      setError("");
    })();
    inflight.current = operation;
    try {
      await operation;
    } catch (err) {
      if (
        err instanceof ApiError &&
        ["REVISION_CONFLICT", "ALREADY_SUBMITTED"].includes(err.code)
      )
        conflicted.current = true;
      setSaveState(
        browserDemo ? "Chưa lưu trong trình duyệt" : "Chưa lưu trên máy chủ",
      );
      setError(
        err instanceof Error
          ? err.message
          : "Mất kết nối. Bản nháp vẫn ở thiết bị; hãy thử lưu lại.",
      );
      throw err;
    } finally {
      inflight.current = null;
    }
  }, [cache, initial.id, submitted]);

  useEffect(() => {
    if (!ready || submitted || recovered) return;
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [edits, ready, submitted, recovered, save]);

  function update(value: Edits) {
    current.current = value;
    setEdits(value);
    cache(value);
    setSaveState("Đã lưu nháp trên thiết bị");
    setConfirm(false);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await save();
      const item = await api<ReadingAttempt>(
        `reading/attempts/${initial.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ revision: revision.current }),
        },
      );
      try {
        localStorage.removeItem(cacheKey);
      } catch {
        /* Optional device cache. */
      }
      onSubmitted(item);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Chưa nộp được bài. Câu trả lời vẫn được giữ.",
      );
    } finally {
      setBusy(false);
    }
  }
  function showEvidence(evidence: Solution["evidence"]) {
    setHighlight(evidence);
    setPanel("passage");
    requestAnimationFrame(() => {
      const node = document.getElementById(`passage-${evidence.blockId}`);
      node?.scrollIntoView({ block: "center" });
      node?.focus({ preventScroll: true });
    });
  }
  if (!ready) return <p role="status">Đang mở bài…</p>;
  return (
    <section>
      <div className="section-heading">
        <h2>{initial.content.title}</h2>
        <span className="muted">
          {submitted ? "Đã nộp" : `${answered}/${total} câu đã trả lời`}
        </span>
      </div>
      {recovered && (
        <div className="notice">
          <p>Có bản nháp chưa đồng bộ từ phiên cũ. Bạn muốn dùng bản nào?</p>
          <div className="actions">
            <button
              onClick={() => {
                update(recovered);
                setRecovered(null);
              }}
            >
              Dùng bản nháp trên thiết bị
            </button>
            <button
              onClick={() => {
                cache(current.current);
                setRecovered(null);
              }}
            >
              {browserDemo ? "Giữ bản đã lưu" : "Giữ bản trên máy chủ"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <div className="actions">
            {conflicted.current ? (
              <button
                disabled={busy}
                onClick={async () => {
                  try {
                    localStorage.removeItem(cacheKey);
                  } catch {
                    /* Optional cache. */
                  }
                  await onReload();
                }}
              >
                Tải bản đã lưu
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => {
                  void save().catch(() => {});
                }}
              >
                Thử lưu lại
              </button>
            )}
          </div>
        </div>
      )}
      {initial.result && (
        <section className="result-summary" aria-label="Kết quả Reading">
          <h2>
            {initial.result.score}/{initial.result.total} câu đúng
          </h2>
          <p>Điểm bài luyện, không phải band IELTS.</p>
          <ul>
            {initial.result.byType.map((item) => (
              <li key={item.type}>
                {typeLabels[item.type]}: {item.correct}/{item.total} đúng ·{" "}
                {item.total - item.correct} câu cần xem lại
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mobile-reading-tabs" aria-label="Phần Reading">
        <button
          aria-pressed={panel === "passage"}
          onClick={() => setPanel("passage")}
        >
          Bài đọc
        </button>
        <button
          aria-pressed={panel === "questions"}
          onClick={() => setPanel("questions")}
        >
          Câu hỏi
        </button>
      </div>
      <div className="question-nav" aria-label="Đi đến câu hỏi">
        {initial.content.questions.map((q, i) => (
          <button
            key={q.id}
            aria-label={`Câu ${i + 1}${edits.answers[q.id] ? ", đã trả lời" : ", chưa trả lời"}${edits.flagged.includes(q.id) ? ", xem lại" : ""}`}
            className={edits.answers[q.id] ? "answered" : ""}
            onClick={() => {
              setPanel("questions");
              requestAnimationFrame(() =>
                document.getElementById(`question-${q.id}`)?.focus(),
              );
            }}
          >
            {i + 1}
            {edits.flagged.includes(q.id)
              ? " ★"
              : edits.answers[q.id]
                ? " ✓"
                : ""}
          </button>
        ))}
      </div>
      <div className="reading-layout" data-panel={panel}>
        <section className="card passage-pane" aria-label="Bài đọc">
          <h3>Bài đọc</h3>
          {initial.content.paragraphs.map((p, i) => (
            <p key={p.id} id={`passage-${p.id}`} tabIndex={-1} lang="en">
              <strong>{String.fromCharCode(65 + i)}. </strong>
              {highlight?.blockId === p.id ? (
                <>
                  {p.text.slice(0, highlight.start)}
                  <mark>{p.text.slice(highlight.start, highlight.end)}</mark>
                  {p.text.slice(highlight.end)}
                </>
              ) : (
                p.text
              )}
            </p>
          ))}
          <small>
            Nội dung mẫu gốc của MaKeng · v{initial.content.version} · chưa được
            giáo viên duyệt.
          </small>
        </section>
        <section className="card questions-pane" aria-label="Câu hỏi">
          <h3>Câu hỏi</h3>
          {initial.content.questions.map((q, i) => {
            const review = initial.result?.questions.find(
              (result) => result.questionId === q.id,
            );
            return (
              <fieldset
                id={`question-${q.id}`}
                tabIndex={-1}
                key={q.id}
                disabled={
                  submitted || busy || !!recovered || conflicted.current
                }
                className="question"
              >
                <legend>
                  {i + 1}. {q.prompt}
                </legend>
                <p className="muted">
                  {q.type === "completion"
                    ? `Dùng tối đa ${q.maxWords} từ trong bài đọc.`
                    : q.type === "tfng"
                      ? "TRUE: đúng · FALSE: trái với bài · NOT GIVEN: không có thông tin."
                      : "Chọn một đáp án."}
                </p>
                {q.type === "completion" ? (
                  <>
                    <label className="sr-only" htmlFor={`answer-${q.id}`}>
                      Câu {i + 1}: điền từ
                    </label>
                    <input
                      id={`answer-${q.id}`}
                      maxLength={200}
                      value={edits.answers[q.id] || ""}
                      onChange={(e) =>
                        update({
                          ...current.current,
                          answers: {
                            ...current.current.answers,
                            [q.id]: e.target.value,
                          },
                        })
                      }
                    />
                  </>
                ) : (
                  <div className="options">
                    {(q.type === "mcq"
                      ? q.options
                      : ["TRUE", "FALSE", "NOT GIVEN"].map((id) => ({
                          id,
                          text: id,
                        }))
                    ).map((option) => (
                      <label key={option.id}>
                        <input
                          type="radio"
                          name={q.id}
                          value={option.id}
                          checked={edits.answers[q.id] === option.id}
                          onChange={() =>
                            update({
                              ...current.current,
                              answers: {
                                ...current.current.answers,
                                [q.id]: option.id,
                              },
                            })
                          }
                        />
                        <span>
                          {q.type === "mcq" ? `${option.id}. ` : ""}
                          {option.text}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {!submitted && (
                  <label className="flag">
                    <input
                      type="checkbox"
                      checked={edits.flagged.includes(q.id)}
                      onChange={(e) =>
                        update({
                          ...current.current,
                          flagged: e.target.checked
                            ? [...current.current.flagged, q.id]
                            : current.current.flagged.filter(
                                (id) => id !== q.id,
                              ),
                        })
                      }
                    />
                    Đánh dấu xem lại
                  </label>
                )}
                {review && (
                  <div
                    className={`answer-review ${review.correct ? "correct" : "incorrect"}`}
                  >
                    <strong>
                      {review.correct
                        ? "Đúng"
                        : review.answer
                          ? "Chưa đúng"
                          : "Chưa trả lời"}{" "}
                      · Đáp án: {review.solution.answers.join(" / ")}
                    </strong>
                    <p>{review.solution.explanation}</p>
                    <blockquote>{review.solution.evidence.quote}</blockquote>
                  </div>
                )}
                {review && (
                  <p className="muted">
                    Đoạn dẫn chứng:{" "}
                    {review.solution.evidence.blockId.toUpperCase()}
                  </p>
                )}
              </fieldset>
            );
          })}
          {initial.result && (
            <div className="evidence-links">
              <h3>Tìm dẫn chứng trong bài</h3>
              {initial.result.questions.map((result, i) => (
                <button
                  key={result.questionId}
                  onClick={() => showEvidence(result.solution.evidence)}
                >
                  Dẫn chứng câu {i + 1}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      {!submitted && (
        <div className="reading-submit">
          <span role="status">{saveState}</span>
          <button
            disabled={busy || !!recovered || conflicted.current}
            onClick={() => {
              void save().catch(() => {});
            }}
          >
            Lưu câu trả lời
          </button>
          <button
            className="primary"
            disabled={busy || !!recovered || conflicted.current}
            onClick={() => {
              if (answered < total) setConfirm(true);
              else void submit();
            }}
          >
            {busy ? "Đang nộp…" : "Nộp bài"}
          </button>
        </div>
      )}
      {confirm && (
        <div className="notice" role="alert">
          <p>
            Còn {total - answered} câu chưa trả lời. Các câu này sẽ được tính là
            sai.
          </p>
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => {
                void submit();
              }}
            >
              Vẫn nộp bài
            </button>
            <button disabled={busy} onClick={() => setConfirm(false)}>
              Tiếp tục làm
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
