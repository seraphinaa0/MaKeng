"use client";
import { useState, useEffect } from "react";
import { ManualTranscriptAdapter } from "../../../packages/ai/listening";
import { buildListening } from "../../../packages/domain/listening";
import {
  addListening,
  inspectAudio,
  type StoredListening,
} from "../../../packages/demo/listening-store";
import type {
  ListeningContent,
  Transcript,
} from "../../../packages/schemas/listening";

export default function ListeningIntake({
  onCreated,
}: {
  onCreated: (lesson: StoredListening) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [vtt, setVtt] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!file && !vtt) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const navigate = (e: MouseEvent) => {
      if (
        (e.target as Element).closest("a[href]") &&
        !confirm("Audio và transcript đang soạn chưa lưu. Rời trang?")
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
  }, [file, vtt]);
  const [checked, setChecked] = useState<{
    audio: ListeningContent["audio"];
    transcript: Transcript;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<
    Array<{ cueId: string; prompt: string; answer: string; maxWords: number }>
  >([]);
  return (
    <section className="card listening-intake" aria-labelledby="import-title">
      <h2 id="import-title">Audio của bạn</h2>
      <p>
        Chỉ lưu trên thiết bị. Demo không gửi audio hoặc transcript tới STT/AI.
        Cần audio bạn có quyền sử dụng và transcript WebVTT tự chuẩn bị.
      </p>
      <p className="muted">
        WAV, MP3, Ogg, WebM, MP4 audio · tối đa 20 MiB / 30 phút. Timestamp phải
        theo thứ tự, không chồng lấn. Transcript chỉ hỗ trợ văn bản thuần.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <label>
        File audio
        <input
          key={fileInputKey}
          type="file"
          accept="audio/wav,audio/x-wav,audio/mpeg,audio/ogg,audio/webm,audio/mp4"
          disabled={busy}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setChecked(null);
          }}
        />
      </label>
      {previewUrl && (
        <audio
          controls
          src={previewUrl}
          preload="metadata"
          aria-label="Nghe kiểm tra audio riêng"
        />
      )}
      <label>
        Transcript WebVTT
        <textarea
          value={vtt}
          maxLength={100000}
          rows={7}
          disabled={busy}
          placeholder={
            "WEBVTT\n\n00:00.500 --> 00:05.000\nYour original transcript here."
          }
          onChange={(e) => {
            setVtt(e.target.value);
            setChecked(null);
          }}
        />
      </label>
      <details>
        <summary>Ví dụ định dạng transcript</summary>
        <pre>
          {
            "WEBVTT\n\ncue-1\n00:00.500 --> 00:05.000\nOur tour takes place on Tuesday."
          }
        </pre>
        <p>
          Mỗi cue cách nhau một dòng trống. Dùng mốc thời gian chính xác theo
          audio của bạn.
        </p>
      </details>
      <button
        type="button"
        disabled={busy || !file || !vtt.trim()}
        onClick={async () => {
          if (!file) return;
          setBusy(true);
          setError("");
          try {
            const audio = await inspectAudio(file, file.name);
            const transcript = await new ManualTranscriptAdapter().transcribe(
              { ...audio, vtt },
              new AbortController().signal,
            );
            setChecked({ audio, transcript });
            setQuestions([
              {
                cueId: transcript.cues[0].id,
                prompt: "",
                answer: "",
                maxWords: 1,
              },
            ]);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Không đọc được audio/transcript.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Đang kiểm tra…" : "Kiểm tra audio & transcript"}
      </button>
      {checked && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file) return;
            const data = new FormData(e.currentTarget);
            setBusy(true);
            setError("");
            try {
              const content = buildListening(
                checked.audio,
                checked.transcript,
                {
                  title: data.get("title"),
                  author: data.get("author"),
                  reviewer: data.get("reviewer"),
                  rightsConfirmed: data.get("rights") === "on",
                  reviewConfirmed: data.get("review") === "on",
                  questions,
                },
              );
              const lesson = await addListening(
                content,
                file,
                Number(data.get("retention")) as 1 | 7 | 30,
              );
              setFile(null);
              setFileInputKey((n) => n + 1);
              setVtt("");
              setChecked(null);
              onCreated(lesson);
            } catch (err) {
              setError(
                err instanceof Error ? err.message : "Không lưu được bài.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <p role="status">
            Đã kiểm tra: {checked.audio.duration.toFixed(1)} giây ·{" "}
            {checked.transcript.cues.length} cue. Chưa lưu file.
          </p>
          <label>
            Tiêu đề bài nghe
            <input name="title" required maxLength={150} disabled={busy} />
          </label>
          <label>
            Tác giả audio và transcript
            <input name="author" required maxLength={100} disabled={busy} />
          </label>
          <details open>
            <summary>Transcript để soạn và kiểm duyệt</summary>
            {checked.transcript.cues.map((c) => (
              <p key={c.id}>
                <strong>
                  {c.start.toFixed(1)}–{c.end.toFixed(1)}s:
                </strong>{" "}
                {c.text}
              </p>
            ))}
          </details>
          {questions.map((q, i) => (
            <fieldset key={i} disabled={busy}>
              <legend>Câu điền từ {i + 1}</legend>
              <label>
                Đoạn dẫn chứng
                <select
                  value={q.cueId}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item, n) =>
                        n === i ? { ...item, cueId: e.target.value } : item,
                      ),
                    )
                  }
                >
                  {checked.transcript.cues.map((c, n) => (
                    <option key={c.id} value={c.id}>
                      Đoạn {n + 1} ({c.start.toFixed(1)}–{c.end.toFixed(1)}s)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Câu hỏi có chỗ trống ___
                <input
                  required
                  value={q.prompt}
                  maxLength={500}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item, n) =>
                        n === i ? { ...item, prompt: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Đáp án nguyên văn trong cue
                <input
                  required
                  value={q.answer}
                  maxLength={100}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item, n) =>
                        n === i ? { ...item, answer: e.target.value } : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Giới hạn từ
                <select
                  value={q.maxWords}
                  onChange={(e) =>
                    setQuestions((items) =>
                      items.map((item, n) =>
                        n === i
                          ? { ...item, maxWords: Number(e.target.value) }
                          : item,
                      ),
                    )
                  }
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} từ
                    </option>
                  ))}
                </select>
              </label>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setQuestions((items) => items.filter((_, n) => n !== i))
                  }
                >
                  Xóa câu {i + 1}
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={busy || questions.length >= 30}
            onClick={() =>
              setQuestions((items) => [
                ...items,
                {
                  cueId: checked.transcript.cues[0].id,
                  prompt: "",
                  answer: "",
                  maxWords: 1,
                },
              ])
            }
          >
            Thêm câu
          </button>
          <label className="consent">
            <input name="rights" type="checkbox" required disabled={busy} /> Tôi
            có quyền sử dụng audio và transcript; đồng ý lưu riêng trên thiết bị
            này.
          </label>
          <label>
            Người kiểm duyệt
            <input name="reviewer" required maxLength={100} disabled={busy} />
          </label>
          <label className="consent">
            <input name="review" type="checkbox" required disabled={busy} /> Tôi
            đã nghe và kiểm tra transcript, timestamp, câu hỏi, đáp án trước khi
            tạo bài.
          </label>
          <label>
            Hạn lưu audio
            <select name="retention" defaultValue="7" disabled={busy}>
              <option value="1">1 ngày</option>
              <option value="7">7 ngày</option>
              <option value="30">30 ngày</option>
            </select>
          </label>
          <button className="primary" disabled={busy}>
            Lưu bài nghe riêng tư
          </button>
        </form>
      )}
    </section>
  );
}
