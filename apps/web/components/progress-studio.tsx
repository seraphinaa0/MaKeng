"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { browserDemo } from "./mode";
import {
  errorLabels,
  type Progress,
  type Recommendation,
  type ReviewFeedback,
} from "../../../packages/domain/learning";
import { typeLabels } from "../../../packages/domain/reading";
import type { Period } from "../../../packages/schemas/learning";
import type {
  ReadingAttempt,
  Question,
} from "../../../packages/schemas/reading";
import MistakePractice from "./mistake-practice";

export default function ProgressStudio() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<Progress | null>(null);
  const [view, setView] = useState<"overview" | "mistakes">("overview");
  const [type, setType] = useState<Question["type"] | "all">("all");
  const [queue, setQueue] = useState<"pending" | "reviewed">("pending");
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("review") !== "1") return;
    setView("mistakes");
    const selectedType = query.get("type");
    if (
      selectedType === "mcq" ||
      selectedType === "tfng" ||
      selectedType === "completion"
    )
      setType(selectedType);
  }, []);
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const value = await api<Progress>(`learning/progress?period=${period}`);
      if (id === request.current) {
        setData(value);
        setError("");
      }
    } catch (err) {
      if (id === request.current) {
        setData(null);
        setError(
          err instanceof Error ? err.message : "Không tải được tiến độ.",
        );
      }
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [period]);
  useEffect(() => {
    if (!browserDemo) return;
    void reload();
    const focus = () => void reload();
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith("makeng-browser-demo-"))
        void reload();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("storage", storage);
    return () => {
      request.current++;
      window.removeEventListener("focus", focus);
      window.removeEventListener("storage", storage);
    };
  }, [reload]);
  async function act(
    payload: Record<string, unknown>,
  ): Promise<ReviewFeedback | null> {
    if (!data) return null;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ feedback: ReviewFeedback | null }>(
        `learning/actions?period=${period}`,
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            revision: data.learning.revision,
          }),
        },
      );
      await reload();
      return result.feedback;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được thay đổi.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function follow(item: Recommendation) {
    if (item.kind === "resume") {
      router.push(`/reading?attempt=${encodeURIComponent(item.attemptId!)}`);
      return;
    }
    if (item.kind === "review") {
      setType(item.type!);
      setQueue("pending");
      setSelected(null);
      setView("mistakes");
      setLimit(10);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const attempt = await api<ReadingAttempt>("reading/attempts", {
        method: "POST",
        body: JSON.stringify({ setId: item.setId }),
      });
      router.push(`/reading?attempt=${attempt.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không mở được bài luyện.");
    } finally {
      setBusy(false);
    }
  }
  const queueItems =
    data?.mistakes.filter(
      (m) =>
        m.reviewed === (queue === "reviewed") &&
        (type === "all" || m.question.type === type),
    ) ?? [];
  const item = data?.mistakes.find((m) => m.key === selected);
  const disabled = busy || loading;
  if (!browserDemo)
    return (
      <main id="main" className="progress-page">
        <h1>Tiến độ</h1>
        <p>
          Phase 4 hiện dùng dữ liệu demo trình duyệt. Bật
          NEXT_PUBLIC_MAKENG_DEMO=true để thử; thống kê SQLite chưa được tích
          hợp.
        </p>
      </main>
    );
  return (
    <main id="main" className="progress-page">
      <div className="page-heading">
        <h1>Your progress</h1>
      </div>
      <div className="toolbar">
        <button
          aria-pressed={view === "overview"}
          onClick={() => setView("overview")}
        >
          Tổng quan
        </button>
        <button
          aria-pressed={view === "mistakes"}
          onClick={() => setView("mistakes")}
        >
          Ôn câu sai{data ? ` (${data.pendingCount})` : ""}
        </button>
        <label>
          Khoảng thời gian
          <select
            value={period}
            disabled={busy}
            onChange={(e) => {
              setPeriod(e.target.value as Period);
              setSelected(null);
              setLimit(10);
            }}
          >
            <option value="all">Toàn bộ</option>
            <option value="7">7 ngày gần đây</option>
            <option value="30">30 ngày gần đây</option>
          </select>
        </label>
        <button disabled={disabled} onClick={() => void reload()}>
          Cập nhật
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          <button disabled={busy || loading} onClick={() => void reload()}>
            Tải lại tiến độ
          </button>
        </div>
      )}
      {loading && <p role="status">Đang cập nhật tiến độ…</p>}
      {data && (
        <>
          {view === "overview" ? (
            <>
              <section
                className="lumen-progress-chart"
                aria-label="Reading accuracy over recent submitted attempts"
              >
                <div className="section-heading">
                  <h2>Reading accuracy</h2>
                  <small>Practice accuracy · not IELTS band</small>
                </div>
                {data.recent.length ? (
                  <>
                    <svg
                      viewBox="0 0 600 220"
                      role="img"
                      aria-label="Tỷ lệ đúng của các bài Reading đã nộp"
                    >
                      {[0, 25, 50, 75, 100].map((value) => (
                        <g key={value}>
                          <line
                            x1="42"
                            y1={185 - value * 1.5}
                            x2="578"
                            y2={185 - value * 1.5}
                            stroke="var(--border)"
                          />
                          <text
                            x="7"
                            y={189 - value * 1.5}
                            fill="var(--muted)"
                            fontSize="10"
                          >
                            {value}%
                          </text>
                        </g>
                      ))}
                      <polyline
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth="2"
                        points={[...data.recent]
                          .reverse()
                          .map(
                            (item, index) =>
                              `${42 + index * (536 / Math.max(data.recent.length - 1, 1))},${185 - (item.score / item.total) * 150}`,
                          )
                          .join(" ")}
                      />
                      {[...data.recent].reverse().map((item, index) => (
                        <g key={item.id}>
                          <circle
                            cx={
                              42 +
                              index *
                                (536 / Math.max(data.recent.length - 1, 1))
                            }
                            cy={185 - (item.score / item.total) * 150}
                            r="4"
                            fill="var(--surface)"
                            stroke="var(--primary)"
                          >
                            <title>
                              {item.title}: {item.score}/{item.total}
                            </title>
                          </circle>
                          <text
                            x={
                              42 +
                              index *
                                (536 / Math.max(data.recent.length - 1, 1))
                            }
                            y="212"
                            textAnchor="middle"
                            fill="var(--muted)"
                            fontSize="10"
                          >
                            {new Date(item.at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </>
                ) : (
                  <div className="chart-empty">
                    <span>—</span>
                    <p>
                      Complete a Reading session to start your progress chart.
                    </p>
                  </div>
                )}
              </section>
              <section
                className="progress-stats"
                aria-label="Thống kê hoạt động"
              >
                <article className="card">
                  <span>Reading đã nộp</span>
                  <strong>{data.readingCount}</strong>
                  <small>{data.activeCount} bài đang làm (mọi thời điểm)</small>
                </article>
                <article className="card">
                  <span>Câu Reading đúng</span>
                  <strong>
                    {data.correct}/{data.total}
                  </strong>
                  <small>
                    {data.total
                      ? `${Math.round((data.correct / data.total) * 100)}% trong bài luyện`
                      : "Chưa có bài đã nộp"}
                  </small>
                </article>
                <article className="card">
                  <span>Writing đã lưu</span>
                  <strong>{data.writingCount}</strong>
                  <small>
                    {data.wordsWritten} từ đã viết · Không tính band mock
                  </small>
                </article>
                <article className="card">
                  <span>Câu sai chưa ôn</span>
                  <strong>{data.pendingCount}</strong>
                  <small>Trong khoảng đã chọn</small>
                </article>
              </section>
              {!data.readingCount && (
                <p className="notice">
                  Chưa có bài Reading đã nộp trong khoảng này.{" "}
                  <Link href="/reading">Chọn bài để bắt đầu</Link>; bài đang làm
                  chưa được tính điểm.
                </p>
              )}
              <section className="card" aria-labelledby="next-step">
                <h2 id="next-step">Bước luyện tiếp theo</h2>
                <div className="toolbar">
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={
                        pendingEnabled ?? data.learning.recommendationsEnabled
                      }
                      disabled={disabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setPendingEnabled(enabled);
                        void act({ action: "preferences", enabled }).finally(
                          () => setPendingEnabled(null),
                        );
                      }}
                    />
                    Bật gợi ý luyện tập
                  </label>
                  {data.learning.dismissed.length > 0 && (
                    <button
                      disabled={disabled}
                      onClick={() => void act({ action: "restore" })}
                    >
                      Khôi phục gợi ý đã bỏ qua
                    </button>
                  )}
                </div>
                {!data.learning.recommendationsEnabled ? (
                  <p>Gợi ý đã tắt. Bạn vẫn có thể tự chọn bài và ôn lỗi.</p>
                ) : !data.recommendations.length ? (
                  <p>
                    Không còn gợi ý phù hợp. Bạn có thể khôi phục gợi ý đã bỏ
                    qua hoặc chọn bài trong Reading.
                  </p>
                ) : (
                  <div className="recommendation-grid">
                    {data.recommendations.map((rec) => (
                      <article className="recommendation" key={rec.id}>
                        <h3>{rec.title}</h3>
                        <p>{rec.reason}</p>
                        {rec.preview && (
                          <small>
                            Bài mẫu thử nghiệm, chưa được giáo viên duyệt.
                          </small>
                        )}
                        <div className="actions">
                          <button
                            className="primary"
                            disabled={disabled}
                            onClick={() => void follow(rec)}
                          >
                            {rec.kind === "review"
                              ? "Ôn các câu này"
                              : rec.kind === "resume"
                                ? "Tiếp tục bài"
                                : "Luyện bài này"}
                          </button>
                          <button
                            disabled={disabled}
                            onClick={() =>
                              void act({ action: "dismiss", id: rec.id })
                            }
                          >
                            Bỏ qua
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
              <section className="card" aria-labelledby="type-progress">
                <h2 id="type-progress">Reading theo dạng câu hỏi</h2>
                <p className="muted">
                  Tỷ lệ đúng là số câu đúng / tổng câu đã nộp, gồm cả lần làm
                  lại. Các bài khác độ khó; số liệu này không phải band IELTS
                  hay kết luận năng lực.
                </p>
                <div className="type-progress-grid">
                  {data.byType.map((group) => (
                    <article key={group.type} className="type-progress">
                      <h3>{typeLabels[group.type]}</h3>
                      <p>
                        {group.correct}/{group.total} câu đúng ·{" "}
                        {group.attempts} lượt bài
                      </p>
                      <meter
                        min={0}
                        max={Math.max(group.total, 1)}
                        value={group.correct}
                        aria-label={`Tỷ lệ đúng ${typeLabels[group.type]}`}
                      >
                        {group.correct}/{group.total}
                      </meter>
                      {group.trend ? (
                        <p className="muted">
                          3 lượt gần nhất: {group.trend.recent.correct}/
                          {group.trend.recent.total}; 3 lượt trước:{" "}
                          {group.trend.previous.correct}/
                          {group.trend.previous.total}. Chênh lệch{" "}
                          {group.trend.delta > 0 ? "+" : ""}
                          {group.trend.delta} điểm phần trăm.
                        </p>
                      ) : (
                        <p className="muted">
                          Cần 6 bài đã nộp có dạng này trong khoảng đã chọn để
                          so sánh hai nhóm 3 lượt.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
                <p className="muted">
                  Writing: chưa có xu hướng theo tiêu chí vì điểm và nhận xét
                  hiện là mẫu minh họa.
                </p>
              </section>
              <section className="card">
                <h2>Lỗi quan sát được</h2>
                <p className="muted">
                  Phân loại từ câu trả lời, không suy đoán nguyên nhân như thiếu
                  từ vựng hoặc ngữ pháp.
                </p>
                <ul className="error-counts">
                  {data.errors.map((row) => (
                    <li key={row.kind}>
                      {errorLabels[row.kind]} <strong>{row.count}</strong>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card">
                <h2>Bài Reading gần đây</h2>
                {!data.recent.length ? (
                  <p>Chưa có kết quả trong khoảng đã chọn.</p>
                ) : (
                  data.recent.map((row) => (
                    <article className="history-item" key={row.id}>
                      <div>
                        <h3>{row.title}</h3>
                        <p>
                          {row.score}/{row.total} đúng · v{row.version} ·{" "}
                          {new Date(row.at).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <Link href={`/reading?attempt=${row.id}`}>Xem bài</Link>
                    </article>
                  ))
                )}
              </section>
            </>
          ) : (
            <>
              <h2>Ôn câu sai</h2>
              <p>
                Mỗi câu sai thuộc một lần làm bài cụ thể. Trả lời đúng khi ôn sẽ
                đưa câu đó sang Đã ôn; điểm bài gốc giữ nguyên.
              </p>
              <div className="toolbar">
                <label>
                  Trạng thái ôn
                  <select
                    value={queue}
                    onChange={(e) => {
                      setQueue(e.target.value as "pending" | "reviewed");
                      setSelected(null);
                      setLimit(10);
                    }}
                  >
                    <option value="pending">Chưa ôn</option>
                    <option value="reviewed">Đã ôn</option>
                  </select>
                </label>
                <label>
                  Dạng câu hỏi
                  <select
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as typeof type);
                      setSelected(null);
                      setLimit(10);
                    }}
                  >
                    <option value="all">Tất cả dạng</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p role="status">
                {queueItems.length} câu trong danh sách{" "}
                {queue === "pending" ? "chưa ôn" : "đã ôn"}.
              </p>
              {item && (
                <MistakePractice
                  key={item.key}
                  item={item}
                  busy={disabled}
                  answer={(value) =>
                    act({ action: "answer", key: item.key, answer: value })
                  }
                  reopen={async () => {
                    await act({ action: "reopen", key: item.key });
                  }}
                />
              )}
              {!queueItems.length && (
                <p className="empty">
                  Không có câu phù hợp bộ lọc. Thử đổi khoảng thời gian hoặc
                  dạng câu hỏi.
                </p>
              )}
              {queueItems.slice(0, limit).map((mistake) => (
                <article className="history-item" key={mistake.key}>
                  <div>
                    <h3>
                      {mistake.title} · {typeLabels[mistake.question.type]}
                    </h3>
                    <p>
                      {errorLabels[mistake.kind]} ·{" "}
                      {new Date(mistake.at).toLocaleDateString("vi-VN")}
                    </p>
                    <p lang="en">{mistake.question.prompt}</p>
                  </div>
                  <button
                    disabled={disabled}
                    onClick={() => {
                      setSelected(mistake.key);
                      requestAnimationFrame(() =>
                        document
                          .querySelector(".mistake-practice")
                          ?.scrollIntoView({ block: "start" }),
                      );
                    }}
                  >
                    {queue === "reviewed" ? "Xem câu đã ôn" : "Ôn câu này"}
                  </button>
                </article>
              ))}
              {limit < queueItems.length && (
                <button onClick={() => setLimit((n) => n + 10)}>
                  Xem thêm câu sai
                </button>
              )}
            </>
          )}
          <footer>
            Chỉ dùng dữ liệu trên trình duyệt này.{" "}
            <Link href="/create">Xuất hoặc xóa dữ liệu demo</Link>. Không đồng
            bộ giữa thiết bị.
          </footer>
        </>
      )}
    </main>
  );
}
