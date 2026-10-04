"use client";
import { useState } from "react";
import Link from "next/link";
import type {
  Mistake,
  ReviewFeedback,
} from "../../../packages/domain/learning";
import { errorLabels } from "../../../packages/domain/learning";
import { typeLabels } from "../../../packages/domain/reading";

export default function MistakePractice({
  item,
  busy,
  answer,
  reopen,
}: {
  item: Mistake;
  busy: boolean;
  answer: (value: string) => Promise<ReviewFeedback | null>;
  reopen: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [feedback, setFeedback] = useState<ReviewFeedback | null>(null);
  const question = item.question;
  const options =
    question.type === "mcq"
      ? question.options
      : question.type === "tfng"
        ? ["TRUE", "FALSE", "NOT GIVEN"].map((id) => ({ id, text: id }))
        : [];
  return (
    <section className="card mistake-practice" aria-label="Ôn câu sai">
      <h3>
        {item.title} · {typeLabels[question.type]}
      </h3>
      <p className="muted">
        Phiên bản {item.version} · {errorLabels[item.kind]} · Đã thử lại{" "}
        {item.tries} lần
      </p>
      <p>
        Trả lời lại để ôn. Kết quả này không sửa điểm bài đã nộp và không chứng
        minh bạn đã thành thạo dạng câu hỏi.
      </p>
      <details>
        <summary>Đọc lại đoạn văn</summary>
        {item.paragraphs.map((p) => (
          <p key={p.id} lang="en">
            {p.text}
          </p>
        ))}
      </details>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setFeedback(null);
          setFeedback(await answer(value));
        }}
      >
        <fieldset disabled={busy || item.reviewed}>
          <legend lang="en">{question.prompt}</legend>
          {question.type === "completion" ? (
            <label>
              Câu trả lời ôn tập (tối đa {question.maxWords} từ)
              <input
                maxLength={200}
                required
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setFeedback(null);
                }}
              />
            </label>
          ) : (
            options.map((option) => (
              <label className="review-option" key={option.id}>
                <input
                  type="radio"
                  name={`retry-${item.key}`}
                  value={option.id}
                  checked={value === option.id}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setFeedback(null);
                  }}
                  required
                />
                <span>
                  {question.type === "mcq" ? `${option.id}. ` : ""}
                  {option.text}
                </span>
              </label>
            ))
          )}
          <button className="primary" disabled={!value.trim()}>
            Kiểm tra câu trả lời
          </button>
        </fieldset>
      </form>
      {feedback && (
        <div className="notice" role="status">
          <strong>
            {feedback.correct
              ? "Đúng — đã chuyển sang mục Đã ôn."
              : "Chưa đúng — câu này vẫn ở mục Chưa ôn."}
          </strong>
          <p>Đáp án: {feedback.solution.answers.join(" / ")}</p>
          <p>{feedback.solution.explanation}</p>
          <blockquote lang="en">{feedback.solution.evidence.quote}</blockquote>
        </div>
      )}
      <p>
        Câu trả lời trong bài gốc:{" "}
        <strong>{item.originalAnswer.trim() || "(bỏ trống)"}</strong>
      </p>
      <div className="actions">
        <Link href={`/reading?attempt=${encodeURIComponent(item.attemptId)}`}>
          Xem bài gốc và dẫn chứng
        </Link>
        {item.reviewed && (
          <button
            disabled={busy}
            onClick={async () => {
              await reopen();
              setFeedback(null);
              setValue("");
            }}
          >
            Đưa lại vào hàng đợi
          </button>
        )}
      </div>
    </section>
  );
}
