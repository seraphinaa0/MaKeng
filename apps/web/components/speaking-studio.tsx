"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { browserDemo } from "./mode";
import { useSpeakingRecorder } from "./use-speaking-recorder";
import { applyAudioOutput } from "./audio-preferences";
import { useAudioExpiry } from "./use-audio-expiry";
import { blankResponse } from "../../../packages/domain/speaking";
import {
  SPEAKING_CHANNEL,
  SPEAKING_TAB,
  addSpeaking,
  listSpeaking,
  saveSpeaking,
  deleteSpeaking,
  deleteSpeakingAudio,
  type StoredSpeaking,
} from "../../../packages/demo/speaking-store";
import type { SpeakingQuestion } from "../../../packages/schemas/speaking";
import { speakingCatalog } from "../../../packages/content/speaking";
import { randomItem } from "../../../packages/domain/catalog";
import { useQuestionSpeech } from "./use-question-speech";

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Không xử lý được yêu cầu. Bản nháp chưa lưu vẫn được giữ.";
}
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function SpeakingStudio() {
  const [sessions, setSessions] = useState<StoredSpeaking[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consent, setConsent] = useState(false);
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const [chosen, setChosen] = useState(speakingCatalog[0]);
  const [configure, setConfigure] = useState(false);
  const [catalogTab, setCatalogTab] = useState<"library" | "history">(
    "library",
  );
  const alive = useRef(false);
  const loadSequence = useRef(0);
  const lastSeen = useRef(new Map<string, number>());
  const openedInitial = useRef(false);
  const reload = useCallback(async (external = false) => {
    const sequence = ++loadSequence.current;
    try {
      const values = await listSpeaking();
      if (!alive.current || sequence !== loadSequence.current) return;
      const changed =
        values.length !== lastSeen.current.size ||
        values.some(
          (value) => lastSeen.current.get(value.id) !== value.revision,
        );
      lastSeen.current = new Map(
        values.map((value) => [value.id, value.revision]),
      );
      if (!openedInitial.current) {
        openedInitial.current = true;
        const id = new URLSearchParams(window.location.search).get("session");
        if (id && values.some((value) => value.id === id)) setSelected(id);
        else if (id)
          setNotice(
            "Lượt luyện đã hết hạn hoặc không còn trên thiết bị. Hãy chọn bộ đề mới.",
          );
      }
      if (changed)
        setSessions((previous) =>
          values.map(
            (value) =>
              previous.find(
                (existing) =>
                  existing.id === value.id &&
                  existing.revision === value.revision,
              ) ?? value,
          ),
        );
      setReady(true);
      setError("");
      if (external && changed)
        setNotice(
          "Đã kiểm tra thay đổi/hạn lưu. Phiên bị xóa sẽ đóng; bản nháp của phiên thay đổi ở tab khác sẽ được bỏ để tránh ghi đè.",
        );
    } catch (cause) {
      if (alive.current && sequence === loadSequence.current) {
        setError(message(cause));
        setReady(false);
      }
    }
  }, []);
  useEffect(() => {
    if (!browserDemo) return;
    alive.current = true;
    void reload();
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(SPEAKING_CHANNEL);
    const refresh = () => void reload(true);
    if (channel)
      channel.onmessage = (event) => {
        if (event.data?.source !== SPEAKING_TAB) refresh();
      };
    window.addEventListener("focus", refresh);
    return () => {
      alive.current = false;
      loadSequence.current++;
      channel?.close();
      window.removeEventListener("focus", refresh);
    };
  }, [reload]);
  const session = sessions.find((s) => s.id === selected);
  const expire = useCallback(() => {
    setSelected(null);
    setNotice(
      "Phiên đã hết hạn. Microphone và bản nháp đã đóng; đang dọn dữ liệu đã lưu.",
    );
    void reload(true);
  }, [reload]);
  useAudioExpiry(session?.expiresAt, expire);
  if (!browserDemo)
    return (
      <main id="main">
        <h1>Speaking</h1>
        <p>
          Speaking hiện có trong demo lưu trên trình duyệt. Backend và chấm AI
          chưa được tích hợp.
        </p>
      </main>
    );
  async function create() {
    setBusy(true);
    setError("");
    try {
      const added = await addSpeaking(days, consent, chosen);
      await reload();
      setSelected(added.id);
      setNotice("");
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  function updated(next: StoredSpeaking) {
    loadSequence.current++;
    lastSeen.current.set(next.id, next.revision);
    setSessions((previous) =>
      previous.map((s) => (s.id === next.id ? next : s)),
    );
  }
  return (
    <main id="main" className="speaking-page" data-practice={Boolean(session)}>
      <div className="page-heading">
        <h1>Speaking · Luyện nói</h1>
        <p>Luyện nói, nghe lại và chọn một mục tiêu cho lần sau.</p>
      </div>
      <p className="notice">
        Đề gốc thử nghiệm · Part 1/2/3 rút gọn, không phải bài thi đầy đủ. Bản
        chép lời nhập tay; tự đánh giá bằng danh sách kiểm tra, không có chấm AI
        hoặc band IELTS.
      </p>
      {error && (
        <div className="error" role="alert">
          {error} <button onClick={() => void reload()}>Thử tải lại</button>
        </div>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {session ? (
        <SpeakingSession
          key={session.id}
          session={session}
          updated={updated}
          close={() => {
            setSelected(null);
            setCatalogTab("history");
            setConfigure(false);
          }}
        />
      ) : (
        <>
          <div className="toolbar">
            <button
              aria-pressed={catalogTab === "library"}
              onClick={() => setCatalogTab("library")}
            >
              Thư viện đề nói
            </button>
            <button
              aria-pressed={catalogTab === "history"}
              onClick={() => setCatalogTab("history")}
            >
              Lịch sử Speaking
            </button>
          </div>
          {catalogTab === "library" && !configure && (
            <section aria-label="Thư viện đề Speaking">
              <div className="catalog-hero">
                <div>
                  <p className="eyebrow">
                    CHỌN CHỦ ĐỀ → NGHE CÂU HỎI → TRẢ LỜI
                  </p>
                  <h2>Bắt đầu một cuộc trò chuyện.</h2>
                  <p>
                    Ba bộ đề gốc. Mỗi bộ có 5 câu từ chuyện gần gũi đến thảo
                    luận sâu.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setChosen(randomItem(speakingCatalog)!);
                      setConfigure(true);
                    }}
                  >
                    Chọn đề ngẫu nhiên
                  </button>
                </div>
                <span className="catalog-emblem" aria-hidden="true">
                  “”<span>SPEAK YOUR MIND</span>
                </span>
              </div>
              <div className="catalog-grid">
                {speakingCatalog.map((set, index) => (
                  <article className="catalog-card" key={set.id}>
                    <div className="catalog-card-top">
                      <span className="catalog-index">0{index + 1}</span>
                      <span className="status">PART 1 · 2 · 3</span>
                    </div>
                    <h3>{set.title}</h3>
                    <p>
                      {
                        [
                          "Học tập, thói quen và kỹ năng thực tế.",
                          "Nơi sống, con người và cộng đồng.",
                          "Công nghệ, thiết bị và quản lý thời gian.",
                        ][index]
                      }
                    </p>
                    <small>5 câu · Có giọng đọc & chế độ che câu hỏi</small>
                    <button
                      onClick={() => {
                        setChosen(set);
                        setConfigure(true);
                      }}
                    >
                      Chọn bộ đề này →
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
          {catalogTab === "library" && configure && (
            <section className="card">
              <h2>Bắt đầu lượt luyện</h2>
              <p>{chosen.title} · 5 câu · Part 1/2/3</p>
              <button onClick={() => setConfigure(false)}>
                ← Chọn bộ đề khác
              </button>
              <p className="muted">
                Ghi âm chỉ khi bấm Ghi âm; chưa lưu cho đến khi bấm Lưu câu trả
                lời. Không gửi audio/transcript tới máy chủ. Rời tab sẽ dừng
                microphone. Có thể luyện chỉ bằng transcript.
              </p>
              <label>
                Hạn lưu
                <select
                  value={days}
                  onChange={(e) =>
                    setDays(
                      e.target.value === "1"
                        ? 1
                        : e.target.value === "30"
                          ? 30
                          : 7,
                    )
                  }
                >
                  {[1, 7, 30].map((d) => (
                    <option key={d} value={d}>
                      {d} ngày
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                Tự dọn khi mở lại, lấy nét tab hoặc hết hạn khi đang mở. Không
                chạy xóa nền lúc trình duyệt đã đóng.
              </p>
              <label className="consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                Tôi đồng ý lưu audio, transcript và tự review trên thiết bị này;
                tôi có thể xóa bất cứ lúc nào.
              </label>
              <button
                className="primary"
                disabled={!consent || !ready || busy}
                onClick={() => void create()}
              >
                Bắt đầu Speaking
              </button>
            </section>
          )}
          {catalogTab === "history" && (
            <section aria-label="Lịch sử Speaking">
              <h2>Lịch sử Speaking</h2>
              {!ready ? (
                error ? (
                  <p>Chưa đọc được lịch sử. Thử tải lại ở trên.</p>
                ) : (
                  <p role="status">Đang tải...</p>
                )
              ) : ready && sessions.length === 0 ? (
                <p className="empty">
                  Chưa có lượt luyện. Tạo lượt đầu tiên ở trên.
                </p>
              ) : (
                sessions.map((s) => (
                  <article key={s.id} className="history-item">
                    <div>
                      <h3>{s.set.title}</h3>
                      <p>
                        {s.status === "completed"
                          ? "Đã hoàn tất"
                          : "Đang luyện"}{" "}
                        · {Object.keys(s.responses).length}/5 câu đã lưu
                      </p>
                      <p className="muted">
                        {new Date(s.createdAt).toLocaleString("vi-VN")} · Xóa
                        sau {new Date(s.expiresAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        disabled={busy}
                        onClick={() => {
                          setSelected(s.id);
                          setNotice("");
                        }}
                      >
                        {s.status === "completed"
                          ? "Xem lượt luyện"
                          : "Tiếp tục luyện"}
                      </button>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={async () => {
                          if (
                            !confirm(
                              "Xóa phiên Speaking, audio và transcript? Không thể hoàn tác.",
                            )
                          )
                            return;
                          setBusy(true);
                          try {
                            await deleteSpeaking(s.id);
                            await reload();
                          } catch (cause) {
                            setError(message(cause));
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Xóa phiên
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
        </>
      )}
      <footer>
        Speaking lưu riêng trên thiết bị · Xuất JSON và audio trước khi xóa dữ
        liệu trang web. Bản demo không đồng bộ giữa thiết bị.
      </footer>
    </main>
  );
}

function SpeakingSession({
  session,
  updated,
  close,
}: {
  session: StoredSpeaking;
  updated: (next: StoredSpeaking) => void;
  close: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [dirty, setDirty] = useState(false);
  const question = session.set.questions[index];
  function leave(action: () => void) {
    if (
      !dirty ||
      confirm(
        "Bản nháp/audio chưa lưu sẽ bị bỏ và microphone sẽ dừng. Tiếp tục?",
      )
    )
      action();
  }
  const { blobs, ...metadata } = session;
  return (
    <>
      <div className="toolbar">
        <button onClick={() => leave(close)}>Về lịch sử</button>
        <button
          onClick={() =>
            download(
              new Blob(
                [
                  JSON.stringify(
                    {
                      kind: "makeng-speaking-export",
                      schemaVersion: 1,
                      session: metadata,
                    },
                    null,
                    2,
                  ),
                ],
                { type: "application/json" },
              ),
              `speaking-${session.id}.json`,
            )
          }
        >
          Xuất JSON đã lưu
        </button>
      </div>
      <p className="muted">
        JSON chứa đề, transcript và checklist đã lưu, không chứa audio (
        {Object.keys(blobs).length} bản ghi); tải từng audio bên dưới. Chưa hỗ
        trợ khôi phục định dạng JSON cũ này. Để có bản sao gồm audio có thể khôi
        phục, mở <a href="/backup">Sao lưu</a>.
      </p>
      {session.status === "completed" && (
        <p className="result-summary" role="status">
          Đã hoàn tất. Transcript và checklist đã khóa; bạn vẫn có thể xóa
          audio. Tạo lượt mới để luyện lại.
        </p>
      )}
      <nav className="question-nav" aria-label="Câu Speaking">
        {session.set.questions.map((q, n) => (
          <button
            key={q.id}
            aria-pressed={index === n}
            onClick={() =>
              leave(() => {
                setDirty(false);
                setIndex(n);
              })
            }
          >
            Part {q.part} · Câu {n + 1}
            {session.responses[q.id] ? " ✓" : ""}
          </button>
        ))}
      </nav>
      <SpeakingAnswer
        key={`${question.id}-${session.revision}`}
        session={session}
        question={question}
        updated={updated}
        onDirty={setDirty}
        hidden={hidden}
        onHidden={setHidden}
      />
    </>
  );
}

function SpeakingAnswer({
  session,
  question,
  updated,
  onDirty,
  hidden,
  onHidden,
}: {
  session: StoredSpeaking;
  question: SpeakingQuestion;
  updated: (next: StoredSpeaking) => void;
  onDirty: (dirty: boolean) => void;
  hidden: boolean;
  onHidden: (hidden: boolean) => void;
}) {
  const saved = session.responses[question.id] ?? blankResponse();
  const [response, setResponse] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [prep, setPrep] = useState<number | null>(null);
  const [prepEnd, setPrepEnd] = useState<number | null>(null);
  const recorder = useSpeakingRecorder(question.limitSeconds);
  const speech = useQuestionSpeech();
  const blob = recorder.value?.blob ?? session.blobs[question.id] ?? null;
  const [url, setUrl] = useState("");
  const player = useRef<HTMLAudioElement>(null);
  const editable = session.status === "in_progress";
  const capturing = recorder.phase !== "idle";
  const dirty =
    capturing ||
    recorder.value !== null ||
    JSON.stringify(response) !== JSON.stringify(saved);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  useEffect(() => {
    if (!blob) return;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    const audio = player.current;
    return () => {
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);
  useEffect(() => {
    if (!prepEnd) return;
    const tick = () =>
      setPrep(Math.max(0, Math.ceil((prepEnd - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [prepEnd]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      if (
        (event.target as Element).closest("a[href]") &&
        !confirm(
          "Bỏ bản nháp/audio chưa lưu và dừng microphone để chuyển trang?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  async function save(complete = false) {
    const current = {
      ...response,
      recording: recorder.value
        ? {
            type: recorder.value.blob.type,
            size: recorder.value.blob.size,
            durationSeconds: recorder.value.durationSeconds,
          }
        : saved.recording,
    };
    const answered = { ...session.responses, [question.id]: current };
    const missing = session.set.questions.filter(
      (q) => !answered[q.id]?.recording && !answered[q.id]?.transcript.trim(),
    ).length;
    if (
      complete &&
      !confirm(
        `Hoàn tất và khóa transcript/checklist của phiên? ${missing} câu chưa có audio hoặc transcript. Bạn vẫn có thể xóa audio.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      updated(
        await saveSpeaking(
          session.id,
          session.revision,
          question.id,
          current,
          blob,
          complete,
        ),
      );
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="speaking-grid">
      <div className="card speaking-prompt">
        <p className="muted">
          Part {question.part} · {session.set.title}
        </p>
        {hidden ? (
          <div className="hidden-question">
            <span aria-hidden="true">◎</span>
            <h2>Câu hỏi đang được che</h2>
            <p>
              Nghe để hiểu, rồi trả lời theo ý của bạn. Bấm Hiện câu hỏi nếu
              cần.
            </p>
          </div>
        ) : (
          <h2 lang="en">{question.prompt}</h2>
        )}
        {!hidden && question.bullets.length > 0 && (
          <ul>
            {question.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        <div className="speech-controls">
          <button aria-pressed={hidden} onClick={() => onHidden(!hidden)}>
            {hidden ? "Hiện câu hỏi" : "Che câu hỏi"}
          </button>
          <button
            disabled={capturing || busy || !speech.voices.length}
            onClick={() =>
              speech.read([question.prompt, ...question.bullets].join(". "))
            }
          >
            Nghe câu hỏi
          </button>
          {speech.speaking && <button onClick={speech.stop}>Dừng đọc</button>}
          <details className="voice-settings">
            <summary>Voice settings</summary>
            <label>
              Giọng đọc tiếng Anh
              <select
                disabled={capturing || !speech.voices.length}
                value={speech.voiceURI || speech.voices[0]?.voiceURI || ""}
                onChange={(e) => {
                  speech.stop();
                  speech.setVoiceURI(e.target.value);
                }}
              >
                {!speech.voices.length && (
                  <option value="">Chưa có giọng trên thiết bị</option>
                )}
                {speech.voices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    {voice.name} · {voice.lang}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tốc độ đọc
              <select
                value={speech.rate}
                disabled={capturing}
                onChange={(e) => {
                  speech.stop();
                  speech.setRate(Number(e.target.value));
                }}
              >
                <option value="0.8">Chậm · 0.8×</option>
                <option value="1">Bình thường · 1×</option>
                <option value="1.2">Nhanh · 1.2×</option>
              </select>
            </label>
          </details>
        </div>
        <p className="muted">
          {speech.voices.length
            ? "Giọng đọc trên thiết bị · Không dùng dịch vụ TTS bên ngoài."
            : "Chưa tìm thấy giọng tiếng Anh local. Cài giọng English trong cài đặt Speech của hệ điều hành hoặc dùng trình duyệt hỗ trợ; bạn vẫn có thể luyện bằng chữ."}
        </p>
        {speech.error && (
          <p role="alert" className="error">
            {speech.error}
          </p>
        )}
        <p className="muted">
          {question.part === 2
            ? "Chuẩn bị 1 phút, nói tối đa 2 phút."
            : "Trả lời bằng tiếng Anh, thêm lý do và ví dụ. Giới hạn ghi âm 3 phút/câu."}
        </p>
        {editable && question.part === 2 && (
          <div className="notice">
            <button
              disabled={capturing || busy}
              onClick={() => {
                setPrep(60);
                setPrepEnd(Date.now() + 60000);
              }}
            >
              Chuẩn bị 60 giây
            </button>
            {prep !== null && (
              <p role="timer">
                {prep > 0
                  ? `Chuẩn bị: ${prep}s`
                  : "Hết giờ chuẩn bị. Bấm Ghi âm khi sẵn sàng."}
              </p>
            )}
          </div>
        )}
        {editable && (
          <div
            className="actions recording-actions"
            data-recording={recorder.phase === "recording"}
          >
            <button
              className="primary record-orb"
              disabled={busy || capturing || (prep !== null && prep > 0)}
              onClick={() => {
                if (
                  recorder.value &&
                  !confirm("Bỏ bản ghi chưa lưu để ghi lại?")
                )
                  return;
                player.current?.pause();
                speech.stop();
                void recorder.begin();
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0ZM5 11v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8" />
              </svg>
              <span>Ghi âm</span>
            </button>
            {recorder.phase === "recording" && (
              <button onClick={recorder.stop}>Dừng ghi âm</button>
            )}
            {capturing && <button onClick={recorder.cancel}>Hủy ghi âm</button>}
          </div>
        )}
        <p role="status">
          {recorder.phase === "requesting"
            ? "Đang chờ quyền microphone..."
            : recorder.phase === "recording"
              ? `Đang ghi âm · ${recorder.seconds}s / ${question.limitSeconds}s`
              : recorder.phase === "stopping"
                ? "Đang hoàn tất audio..."
                : recorder.value
                  ? "Bản ghi mới trong bộ nhớ — bấm Lưu câu trả lời để giữ."
                  : "Microphone đang tắt."}
        </p>
        {recorder.error && (
          <p className="error" role="alert">
            {recorder.error}
          </p>
        )}
        {blob && (
          <div className="listening-audio">
            <audio
              onLoadedMetadata={(event) => {
                void applyAudioOutput(event.currentTarget).catch(
                  (error: unknown) =>
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Không đổi được đầu ra âm thanh.",
                    ),
                );
              }}
              ref={player}
              aria-label="Nghe lại câu trả lời"
              controls
              src={url || undefined}
            />
            <p className="muted">
              {Math.round(
                recorder.value?.durationSeconds ??
                  saved.recording?.durationSeconds ??
                  0,
              )}{" "}
              giây ghi âm (ước tính thời gian thu, không đo tốc độ nói).
            </p>
            <div className="actions">
              <button
                onClick={() =>
                  download(
                    blob,
                    `${question.id}.${blob.type.startsWith("audio/mp4") ? "m4a" : blob.type.startsWith("audio/ogg") ? "ogg" : "webm"}`,
                  )
                }
              >
                Tải audio
              </button>
              {recorder.value && (
                <button disabled={capturing} onClick={recorder.cancel}>
                  Bỏ bản ghi mới
                </button>
              )}
              {saved.recording && (
                <button
                  className="danger"
                  disabled={busy || capturing}
                  onClick={async () => {
                    if (
                      !confirm(
                        "Xóa audio đã lưu của câu này? Bản nháp hiện tại sẽ bị bỏ; transcript đã lưu vẫn giữ.",
                      )
                    )
                      return;
                    setBusy(true);
                    try {
                      updated(
                        await deleteSpeakingAudio(
                          session.id,
                          session.revision,
                          question.id,
                        ),
                      );
                    } catch (cause) {
                      setError(message(cause));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Xóa audio đã lưu
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="card">
        <h2>Nghe lại & tự đánh giá</h2>
        <p className="muted">
          Nhập những gì bạn đã nói; chưa có nhận dạng giọng nói. Danh sách bên
          dưới chỉ ghi lại việc bạn đã tự kiểm tra, không xác nhận chất lượng
          câu trả lời.
        </p>
        <label>
          Transcript nhập tay
          <small className="muted"> · Bản chép lại những gì bạn đã nói</small>
          <textarea
            rows={7}
            maxLength={12000}
            value={response.transcript}
            disabled={!editable || busy}
            onChange={(e) =>
              setResponse({ ...response, transcript: e.target.value })
            }
          />
        </label>
        <p className="muted">
          {response.transcript.trim().split(/\s+/).filter(Boolean).length} từ
          nhập tay · Không tính WPM hoặc suy ra phát âm từ transcript.
        </p>
        <fieldset disabled={!editable || busy}>
          <legend>Tôi đã tự kiểm tra</legend>
          {(
            [
              [
                "fluency",
                "Mạch nói: tôi có giải thích ý và tránh ngắt quãng quá lâu?",
              ],
              [
                "vocabulary",
                "Từ vựng: tôi có lặp từ và có cách diễn đạt cụ thể hơn?",
              ],
              ["grammar", "Ngữ pháp: tôi có thể tìm và sửa một câu chưa rõ?"],
              [
                "intelligibility",
                "Độ dễ hiểu: nghe audio, các từ chính có nghe rõ không? Không chấm accent.",
              ],
            ] as const
          ).map(([key, label]) => (
            <label className="consent" key={key}>
              <input
                type="checkbox"
                checked={response.review[key]}
                onChange={(e) =>
                  setResponse({
                    ...response,
                    review: { ...response.review, [key]: e.target.checked },
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <label>
          Dẫn chứng & mục tiêu lần sau
          <textarea
            rows={3}
            maxLength={2000}
            value={response.notes}
            disabled={!editable || busy}
            onChange={(e) =>
              setResponse({ ...response, notes: e.target.value })
            }
            placeholder="Trích một câu đã nói; ghi một điều muốn sửa hoặc thử ở lần luyện sau."
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {editable && (
          <div className="actions">
            <button
              className="primary"
              disabled={busy || capturing}
              onClick={() => void save()}
            >
              Lưu câu trả lời
            </button>
            <button
              disabled={busy || capturing}
              onClick={() => void save(true)}
            >
              Hoàn tất phiên
            </button>
          </div>
        )}
        <p className="muted">
          {dirty
            ? "Có thay đổi chưa lưu. Rời câu/trang sẽ cần xác nhận bỏ bản nháp."
            : "Dữ liệu đã lưu trên thiết bị; không có tự lưu."}
        </p>
      </div>
    </section>
  );
}
