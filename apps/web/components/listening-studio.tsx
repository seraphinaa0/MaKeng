"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserDemo } from "./mode";
import ListeningIntake from "./listening-intake";
import ListeningPlayer from "./listening-player";
import ListeningRestore from "./listening-restore";
import { useAudioExpiry } from "./use-audio-expiry";
import {
  LISTENING_CHANNEL,
  addListening,
  deleteListening,
  inspectAudio,
  listListening,
  retainListening,
  startListening,
  type StoredListening,
} from "../../../packages/demo/listening-store";
import { sampleListening } from "../../../packages/content/listening";
import { listeningResult } from "../../../packages/domain/listening";
import { exportListeningBackup } from "../../../packages/domain/listening-backup";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function ListeningStudio() {
  const [lessons, setLessons] = useState<StoredListening[]>([]);
  const [selection, setSelection] = useState<{
    lesson: StoredListening;
    attemptId: string;
  } | null>(null);
  const selected = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [importing, setImporting] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const next = await listListening();
      setLessons(next);
      setStorageReady(true);
      if (selected.current && !next.some((l) => l.id === selected.current)) {
        selected.current = null;
        setSelection(null);
        setError(
          "Bài nghe đã bị xóa hoặc hết hạn. Audio, transcript và lượt luyện đã được dọn khỏi thư viện.",
        );
      }
    } catch (e) {
      setStorageReady(false);
      setError(
        e instanceof Error ? e.message : "Không đọc được thư viện Listening.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!browserDemo) {
      setLoading(false);
      return;
    }
    void refresh();
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(LISTENING_CHANNEL)
        : null;
    if (channel)
      channel.onmessage = () => {
        void refresh();
      };
    const focus = () => {
      void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      channel?.close();
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  const expire = useCallback(() => {
    selected.current = null;
    setSelection(null);
    setNotice(
      "Bài nghe đã hết hạn. Player và bản nháp đã đóng; đang dọn dữ liệu đã lưu.",
    );
    void refresh();
  }, [refresh]);
  useAudioExpiry(selection?.lesson.expiresAt, expire);
  const saved = useCallback((lesson: StoredListening) => {
    setLessons((items) => items.map((l) => (l.id === lesson.id ? lesson : l)));
    setSelection((current) =>
      current?.lesson.id === lesson.id ? { ...current, lesson } : current,
    );
  }, []);
  async function practice(lesson: StoredListening, attemptId?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = attemptId ? lesson : await startListening(lesson.id);
      const id =
        attemptId ?? next.attempts.find((a) => a.status === "in_progress")!.id;
      setLessons((items) => items.map((l) => (l.id === next.id ? next : l)));
      selected.current = next.id;
      setSelection({ lesson: next, attemptId: id });
      setImporting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không bắt đầu được bài.");
    } finally {
      setBusy(false);
    }
  }
  if (!browserDemo)
    return (
      <main id="main" className="listening-page">
        <h1>Listening</h1>
        <p>
          Slice Listening hiện hỗ trợ bản demo lưu trên thiết bị. Backend
          audio/STT chưa được triển khai.
        </p>
      </main>
    );
  return (
    <main id="main" className="listening-page">
      <h1>Listening</h1>
      <p>
        Nghe, làm bài và nghe lại đoạn chứa đáp án. Bài luyện ngắn độc lập, chưa
        phải đề IELTS đầy đủ.
      </p>
      <div className="notice">
        <strong>Audio riêng tư trên thiết bị.</strong> Hạn mặc định 7 ngày; có
        thể chọn 1/7/30 ngày. Bài hết hạn được xóa cùng transcript và lượt luyện
        khi mở lại Listening. Trình duyệt đóng thì không có tác vụ xóa nền. Bản
        tải về do bạn quản lý.
      </div>
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button
            onClick={() => {
              setError("");
              void refresh();
            }}
          >
            Tải lại thư viện
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {selection ? (
        <ListeningPlayer
          key={`${selection.lesson.id}:${selection.attemptId}`}
          lesson={selection.lesson}
          attemptId={selection.attemptId}
          onSaved={saved}
          onBack={() => {
            selected.current = null;
            setSelection(null);
            void refresh();
          }}
        />
      ) : (
        <>
          <section className="card listening-start">
            <div>
              <p className="eyebrow">BẮT ĐẦU VỚI BÀI NGẮN</p>
              <h2>A community garden tour</h2>
              <p>
                Audio gốc tổng hợp, khoảng 20 giây · 3 câu điền từ · Transcript
                mở sau khi nộp.
              </p>
              <p className="muted">
                Bài mẫu preview để thử luồng. Audio riêng cần transcript WebVTT,
                demo chưa có nhận dạng giọng nói thật.
              </p>
            </div>
            <div className="actions">
              <button
                className="primary"
                disabled={busy || loading || !storageReady}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const existing = lessons.find(
                      (l) =>
                        l.content.audio.name === "garden-tour.wav" &&
                        l.content.transcript.mode === "fixture",
                    );
                    const lesson =
                      existing ??
                      (await (async () => {
                        const response = await fetch("/audio/garden-tour.wav");
                        if (!response.ok)
                          throw new Error("Không tải được audio mẫu.");
                        const blob = new Blob([await response.arrayBuffer()], {
                          type: "audio/wav",
                        });
                        const audio = await inspectAudio(
                          blob,
                          "garden-tour.wav",
                        );
                        return addListening(
                          await sampleListening(audio),
                          blob,
                          7,
                        );
                      })());
                    await refresh();
                    await practice(lesson);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Không tạo được bài mẫu.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Đang chuẩn bị…" : "Dùng bài nghe mẫu"}
              </button>
              <button
                disabled={busy || loading || !storageReady}
                onClick={() => setImporting((v) => !v)}
              >
                {importing ? "Đóng nhập audio" : "Nhập audio của bạn"}
              </button>
            </div>
          </section>
          {importing && (
            <ListeningIntake
              onCreated={(lesson) => {
                setImporting(false);
                void refresh();
                void practice(lesson);
              }}
            />
          )}
          {!loading && storageReady && (
            <ListeningRestore
              busy={busy}
              setBusy={(value) => {
                setBusy(value);
                if (value) {
                  setNotice("");
                  setError("");
                }
              }}
              onRestored={(lesson) => {
                setNotice(
                  `Đã khôi phục ${lesson.content.set.title} cùng ${lesson.attempts.length} lượt luyện. Bản khôi phục lưu riêng với hạn mới.`,
                );
                setError("");
                void refresh();
              }}
            />
          )}
          <section aria-labelledby="listening-library">
            <h2 id="listening-library">Thư viện & lịch sử Listening</h2>
            {loading ? (
              <p role="status">Đang đọc dữ liệu trên thiết bị…</p>
            ) : !storageReady ? (
              <p>
                Chưa đọc được dữ liệu Listening. Thử tải lại thư viện hoặc kiểm
                tra quyền lưu trên thiết bị.
              </p>
            ) : lessons.length === 0 ? (
              <p>
                Chưa có bài nghe trên thiết bị. Thử bài mẫu hoặc nhập audio của
                bạn.
              </p>
            ) : (
              lessons.map((lesson) => (
                <article
                  className="card listening-library-card"
                  key={lesson.id}
                >
                  <h3>{lesson.content.set.title}</h3>
                  <p>
                    {lesson.content.set.questions.length} câu ·{" "}
                    {lesson.content.audio.duration.toFixed(1)} giây ·{" "}
                    {lesson.content.set.publication === "preview"
                      ? "Preview gốc"
                      : "Riêng tư · tự kiểm duyệt"}
                  </p>
                  <p className="muted">
                    Xóa sau:{" "}
                    {new Date(lesson.expiresAt).toLocaleString("vi-VN")}
                  </p>
                  <label>
                    Hạn lưu từ hôm nay
                    <select
                      aria-label={`Hạn lưu ${lesson.content.set.title}`}
                      value={lesson.retentionDays}
                      disabled={busy}
                      onChange={async (e) => {
                        setBusy(true);
                        setError("");
                        try {
                          saved(
                            await retainListening(
                              lesson.id,
                              Number(e.target.value) as 1 | 7 | 30,
                            ),
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Không đổi được hạn lưu.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <option value="1">1 ngày</option>
                      <option value="7">7 ngày</option>
                      <option value="30">30 ngày</option>
                    </select>
                  </label>
                  <div className="actions">
                    <button
                      disabled={busy}
                      className="primary"
                      onClick={() => void practice(lesson)}
                    >
                      {lesson.attempts.some((a) => a.status === "in_progress")
                        ? "Tiếp tục bài nghe"
                        : "Luyện bài nghe"}
                    </button>
                    <button
                      onClick={() => {
                        setError("");
                        try {
                          download(
                            new Blob([exportListeningBackup(lesson)], {
                              type: "application/json",
                            }),
                            `listening-${lesson.id}.json`,
                          );
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Không xuất được bản sao lưu.",
                          );
                        }
                      }}
                    >
                      Xuất bài & lịch sử JSON
                    </button>
                    <button
                      onClick={() =>
                        download(lesson.blob, lesson.content.audio.name)
                      }
                    >
                      Tải audio
                    </button>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (
                          !confirm(
                            "Xóa audio, transcript và tất cả lượt luyện của bài này? Không thể hoàn tác; bản tải về không bị xóa.",
                          )
                        )
                          return;
                        setBusy(true);
                        setError("");
                        try {
                          await deleteListening(lesson.id);
                          await refresh();
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Không xóa được audio.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Xóa bài nghe
                    </button>
                  </div>
                  {lesson.attempts.length > 0 && (
                    <details>
                      <summary>{lesson.attempts.length} lượt luyện</summary>
                      {[...lesson.attempts].reverse().map((a) => (
                        <div className="history-item" key={a.id}>
                          <span>
                            {new Date(a.createdAt).toLocaleString("vi-VN")} ·{" "}
                            {a.status === "submitted"
                              ? `Kết quả: ${listeningResult(lesson.content, a).score}/${lesson.content.set.questions.length}`
                              : "Đang làm"}
                          </span>
                          <button
                            disabled={busy}
                            onClick={() => void practice(lesson, a.id)}
                          >
                            {a.status === "submitted"
                              ? "Xem lại bài nghe"
                              : "Tiếp tục lượt này"}
                          </button>
                        </div>
                      ))}
                    </details>
                  )}
                </article>
              ))
            )}
          </section>
          <p className="muted">
            JSON sao lưu ở mục Tạo đề chỉ chứa Writing/Reading. Listening có bản
            JSON và file audio riêng ở từng bài; dùng cả hai file để khôi phục
            tại mục phía trên. Kết quả Listening chưa gộp vào Tiến độ Reading.
          </p>
        </>
      )}
    </main>
  );
}
