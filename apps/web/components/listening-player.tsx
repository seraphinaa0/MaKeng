"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  saveListening,
  type StoredListening,
} from "../../../packages/demo/listening-store";
import { listeningResult } from "../../../packages/domain/listening";
import { applyAudioOutput } from "./audio-preferences";

export default function ListeningPlayer({
  lesson,
  attemptId,
  onSaved,
  onBack,
}: {
  lesson: StoredListening;
  attemptId: string;
  onSaved: (lesson: StoredListening) => void;
  onBack: () => void;
}) {
  const initial = lesson.attempts.find((a) => a.id === attemptId)!;
  const [attempt, setAttempt] = useState(initial);
  const [answers, setAnswers] = useState(initial.answers);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState("");
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const audio = useRef<HTMLAudioElement>(null);
  const blob = useRef(lesson.blob).current;
  const clipEnd = useRef<number | null>(null);
  const revision = useRef(initial.revision);
  const latest = useRef(answers);
  const saved = useRef(JSON.stringify(initial.answers));
  const queue = useRef(Promise.resolve(true));
  const stopped = useRef(false);
  const submitting = useRef(false);
  const submitted = attempt.status === "submitted";
  const dirty = JSON.stringify(answers) !== saved.current;
  useEffect(() => {
    const object = URL.createObjectURL(blob);
    setUrl(object);
    return () => URL.revokeObjectURL(object);
  }, [blob]);
  const persist = useCallback(
    (submit = false) => {
      queue.current = queue.current.then(async (success) => {
        if (!success || stopped.current) return false;
        const snapshot = latest.current;
        if (!submit && JSON.stringify(snapshot) === saved.current) return true;
        setStatus("Đang lưu…");
        try {
          const next = await saveListening(
            lesson.id,
            attemptId,
            revision.current,
            snapshot,
            submit,
          );
          const nextAttempt = next.attempts.find((a) => a.id === attemptId)!;
          revision.current = nextAttempt.revision;
          saved.current = JSON.stringify(nextAttempt.answers);
          setAttempt(nextAttempt);
          onSaved(next);
          setStatus("Đã lưu trong trình duyệt");
          return true;
        } catch (e) {
          stopped.current = true;
          setStatus("Chưa lưu");
          setError(e instanceof Error ? e.message : "Không lưu được bài.");
          return false;
        }
      });
      return queue.current;
    },
    [attemptId, lesson.id, onSaved],
  );
  useEffect(() => {
    if (submitted || !dirty || stopped.current || submitting.current) return;
    const timer = setTimeout(() => {
      void persist();
    }, 500);
    return () => clearTimeout(timer);
  }, [answers, dirty, persist, submitted]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: MouseEvent) => {
      if (
        (e.target as Element).closest("a[href]") &&
        !confirm("Câu trả lời chưa lưu. Rời bài nghe?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  async function playCue(id: string) {
    const cue = lesson.content.transcript.cues.find((c) => c.id === id);
    if (!cue || !audio.current) return;
    clipEnd.current = cue.end;
    audio.current.currentTime = cue.start;
    try {
      await audio.current.play();
    } catch {
      setError("Không phát được audio. Hãy bấm Play trên trình phát.");
    }
  }
  const result = submitted ? listeningResult(lesson.content, attempt) : null;
  return (
    <section className="card listening-player" aria-labelledby="lesson-title">
      <button
        onClick={() => {
          if (!dirty || confirm("Câu trả lời chưa lưu. Về thư viện?")) onBack();
        }}
      >
        ← Thư viện Listening
      </button>
      <p className="eyebrow">
        {lesson.content.set.publication === "preview"
          ? "Audio gốc tổng hợp · Bài mẫu preview"
          : "Audio riêng tư · Đã tự kiểm duyệt"}
      </p>
      <h2 id="lesson-title">{lesson.content.set.title}</h2>
      <p className="muted">
        Hạn lưu: {new Date(lesson.expiresAt).toLocaleString("vi-VN")} · Kết quả
        là số câu đúng, không quy đổi band IELTS.
      </p>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              if (
                !dirty ||
                confirm("Tải lại sẽ bỏ câu trả lời chưa lưu. Tiếp tục?")
              )
                location.reload();
            }}
          >
            Tải lại
          </button>
        </div>
      )}
      <div className="listening-audio">
        <audio
          aria-label="Audio bài nghe"
          ref={audio}
          src={url || undefined}
          controls
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(event) => {
            void applyAudioOutput(event.currentTarget).catch((error: unknown) =>
              setError(
                error instanceof Error
                  ? error.message
                  : "Không đổi được đầu ra âm thanh.",
              ),
            );
            setDuration(
              Number.isFinite(audio.current?.duration)
                ? audio.current!.duration
                : 0,
            );
          }}
          onTimeUpdate={() => {
            const time = audio.current?.currentTime ?? 0;
            setElapsed(time);
            setActive(
              lesson.content.transcript.cues.find(
                (c) => c.start <= time && c.end > time,
              )?.id ?? "",
            );
            if (clipEnd.current !== null && time >= clipEnd.current) {
              audio.current?.pause();
              clipEnd.current = null;
            }
          }}
          onSeeking={() => {
            if (
              audio.current &&
              clipEnd.current !== null &&
              audio.current.currentTime > clipEnd.current
            )
              clipEnd.current = null;
          }}
          onError={() => {
            if (url)
              setError(
                "Không phát được audio. Hãy kiểm tra codec hoặc xuất file để thử lại.",
              );
          }}
        />
        <div className="lumen-audio-progress">
          <span className="audio-section">Listening practice</span>
          <input
            type="range"
            aria-label="Vị trí audio"
            min={0}
            max={duration || 1}
            step={0.1}
            value={Math.min(elapsed, duration || 1)}
            disabled={!duration}
            onChange={(e) => {
              if (audio.current) {
                clipEnd.current = null;
                audio.current.currentTime = Number(e.target.value);
                setElapsed(Number(e.target.value));
              }
            }}
          />
          <span>
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :
            {Math.floor(elapsed % 60)
              .toString()
              .padStart(2, "0")}{" "}
            /{" "}
            {Math.floor(duration / 60)
              .toString()
              .padStart(2, "0")}
            :
            {Math.floor(duration % 60)
              .toString()
              .padStart(2, "0")}
          </span>
        </div>
        <div className="lumen-audio-buttons">
          {[0.75, 1, 1.25].map((speed) => (
            <button
              key={speed}
              aria-pressed={rate === speed}
              onClick={() => {
                setRate(speed);
                if (audio.current) audio.current.playbackRate = speed;
              }}
            >
              {speed}×
            </button>
          ))}
          <button
            className="primary audio-orb"
            aria-label={playing ? "Pause audio" : "Play audio"}
            onClick={async () => {
              if (!audio.current) return;
              clipEnd.current = null;
              if (playing) audio.current.pause();
              else {
                try {
                  await audio.current.play();
                } catch {
                  setError("Không phát được audio. Hãy thử lại.");
                }
              }
            }}
          >
            {playing ? "Ⅱ" : "▶"}
          </button>
          <button
            aria-label="Replay audio"
            onClick={() => {
              if (audio.current) {
                clipEnd.current = null;
                audio.current.currentTime = 0;
                setElapsed(0);
              }
            }}
          >
            ↻
          </button>
          <span className="audio-transcript-note">
            Transcript after submission
          </span>
        </div>
        <label>
          Tốc độ nghe
          <select
            value={rate}
            onChange={(e) => {
              setRate(Number(e.target.value));
              if (audio.current)
                audio.current.playbackRate = Number(e.target.value);
            }}
          >
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
          </select>
        </label>
        <nav className="actions" aria-label="Các đoạn audio">
          {lesson.content.transcript.cues.map((c, i) => (
            <button
              key={c.id}
              aria-current={active === c.id ? "true" : undefined}
              onClick={() => void playCue(c.id)}
            >
              Đoạn {i + 1}
            </button>
          ))}
        </nav>
      </div>
      <div
        className={`listening-practice-grid ${submitted ? "" : "listening-unsubmitted"}`}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitted || busy || stopped.current) return;
            const blanks = lesson.content.set.questions.filter(
              (q) => !latest.current[q.id]?.trim(),
            ).length;
            if (blanks && !confirm(`Còn ${blanks} câu trống. Nộp bài?`)) return;
            submitting.current = true;
            setBusy(true);
            await persist(true);
            setBusy(false);
            submitting.current = false;
          }}
        >
          <h3>Câu hỏi</h3>
          <p>Nghe và điền từ. Transcript và đáp án mở sau khi nộp bài.</p>
          {lesson.content.set.questions.map((q, i) => (
            <label className="listening-question" key={q.id}>
              {i + 1}. {q.prompt}
              <span className="muted">
                Tối đa {q.type === "completion" ? q.maxWords : 1} từ.
              </span>
              <input
                aria-label={`Câu ${i + 1}: điền từ Listening`}
                value={answers[q.id] ?? ""}
                maxLength={200}
                disabled={submitted || busy || !!error}
                onChange={(e) => {
                  const next = { ...latest.current, [q.id]: e.target.value };
                  latest.current = next;
                  setAnswers(next);
                  setStatus("Chưa lưu");
                }}
              />
            </label>
          ))}
          {!submitted && (
            <div className="actions">
              <button
                type="button"
                disabled={busy || !!error}
                onClick={() => void persist()}
              >
                Lưu câu trả lời
              </button>
              <button className="primary" disabled={busy || !!error}>
                {busy ? "Đang nộp…" : "Nộp bài Listening"}
              </button>
            </div>
          )}
          <p role="status">
            {status ||
              (submitted
                ? "Đã nộp · câu trả lời được giữ nguyên"
                : "Tự lưu sau khi nhập câu trả lời")}
          </p>
          {result && (
            <section aria-label="Kết quả Listening">
              <h3>
                {result.score}/{result.total} câu đúng
              </h3>
              {result.questions.map((r, i) => (
                <article className="listening-review" key={r.questionId}>
                  <h4>
                    Câu {i + 1} · {r.correct ? "Đúng" : "Chưa đúng"}
                  </h4>
                  <p>
                    Bạn trả lời: {r.answer || "(Bỏ trống)"} · Đáp án:{" "}
                    <strong>{r.solution.answers.join(" / ")}</strong>
                  </p>
                  <blockquote>{r.solution.evidence.quote}</blockquote>
                  <p>{r.solution.explanation}</p>
                  <button
                    onClick={() => void playCue(r.solution.evidence.blockId)}
                    type="button"
                  >
                    Nghe dẫn chứng câu {i + 1}
                  </button>
                </article>
              ))}
            </section>
          )}
        </form>
        {submitted && (
          <section aria-labelledby="transcript-title">
            <h3 id="transcript-title">Transcript theo thời gian</h3>
            {lesson.content.transcript.cues.map((c) => (
              <article
                key={c.id}
                className={`transcript-cue ${active === c.id ? "cue-active" : ""}`}
              >
                <button onClick={() => void playCue(c.id)}>
                  {c.start.toFixed(1)}–{c.end.toFixed(1)}s
                </button>
                <p>{c.text}</p>
              </article>
            ))}
          </section>
        )}
      </div>
    </section>
  );
}
