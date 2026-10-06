"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { browserDemo } from "./mode";
import SkillLinks from "./skill-links";
import LumenIcon from "./lumen-icon";
import LauncherHints from "./launcher-hints";
import { usePersonal } from "./workspace-preferences";
import type { Progress } from "../../../packages/domain/learning";
import type { ReadingSummary } from "../../../packages/schemas/reading";
import type { ReadingAttempt } from "../../../packages/schemas/reading";
import { listSpeaking } from "../../../packages/demo/speaking-store";
import { listListening } from "../../../packages/demo/listening-store";
import { wordCount } from "../../../packages/domain/writing";

type ContinueCard = {
  id: string;
  skill: string;
  title: string;
  href: string;
  detail: string;
};
type HubData = {
  progress: Progress | null;
  speakingCount: number | null;
  listeningCount: number | null;
  cards: ContinueCard[];
  errors: string[];
};

export default function HomeHub() {
  const { personal } = usePersonal();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  const [launchText, setLaunchText] = useState("");
  const [launchError, setLaunchError] = useState("");
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    const cards: ContinueCard[] = [];
    const errors: string[] = [];
    let progress: Progress | null = null;
    let speakingCount: number | null = null;
    let listeningCount: number | null = null;
    const recordError = (source: string) =>
      errors.push(
        `Chưa đọc được ${source}. Dữ liệu không được tính là 0; thử tải lại.`,
      );
    await Promise.all([
      (async () => {
        try {
          if (browserDemo)
            progress = await api<Progress>("learning/progress?period=all");
          const history = await api<{ items: ReadingSummary[] }>(
            "reading/attempts",
          );
          for (const item of history.items
            .filter((item) => item.status === "in_progress")
            .slice(0, 2))
            cards.push({
              id: item.id,
              skill: "Reading",
              title: item.title,
              href: `/reading?attempt=${encodeURIComponent(item.id)}`,
              detail: `${item.total} câu · Bài chưa nộp`,
            });
          const session = await api<{ sessionId: string }>("session");
          const draft: unknown = JSON.parse(
            localStorage.getItem(`makeng-draft-${session.sessionId}`) ?? "null",
          );
          if (
            draft &&
            typeof draft === "object" &&
            "essay" in draft &&
            typeof draft.essay === "string" &&
            draft.essay.trim()
          )
            cards.push({
              id: "writing-draft",
              skill: "Writing",
              title: "Bản nháp đang viết",
              href: "/writing?practice=1",
              detail: `${wordCount(draft.essay)} từ đã viết · Tiếp tục ý của bạn`,
            });
        } catch {
          recordError("Writing/Reading");
        }
      })(),
      (async () => {
        if (!browserDemo) return;
        try {
          const sessions = await listSpeaking();
          speakingCount = sessions.filter(
            (item) => item.status === "completed",
          ).length;
          const session = sessions.find(
            (item) => item.status === "in_progress",
          );
          if (session)
            cards.push({
              id: session.id,
              skill: "Speaking",
              title: session.set.title,
              href: `/speaking?session=${encodeURIComponent(session.id)}`,
              detail: `${Object.keys(session.responses).length}/5 câu đã lưu · Tự đánh giá`,
            });
        } catch {
          recordError("Speaking");
        }
      })(),
      (async () => {
        if (!browserDemo) return;
        try {
          const lessons = await listListening();
          listeningCount = lessons.reduce(
            (sum, item) =>
              sum +
              item.attempts.filter((attempt) => attempt.status === "submitted")
                .length,
            0,
          );
          for (const lesson of lessons) {
            const attempt = lesson.attempts.find(
              (item) => item.status === "in_progress",
            );
            if (!attempt) continue;
            const answered = lesson.content.set.questions.filter((question) =>
              attempt.answers[question.id]?.trim(),
            ).length;
            cards.push({
              id: lesson.id,
              skill: "Listening",
              title: lesson.content.set.title,
              href: `/listening?lesson=${encodeURIComponent(lesson.id)}&attempt=${encodeURIComponent(attempt.id)}`,
              detail: `${answered}/${lesson.content.set.questions.length} câu đã trả lời · Chưa nộp`,
            });
            break;
          }
        } catch {
          recordError("Listening");
        }
      })(),
    ]);
    const order = ["Writing", "Reading", "Listening", "Speaking"];
    cards.sort((a, b) => order.indexOf(a.skill) - order.indexOf(b.skill));
    if (request !== generation.current) return;
    setData({
      progress,
      speakingCount,
      listeningCount,
      cards: cards.slice(0, 4),
      errors,
    });
    setLoading(false);
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  const suggestion =
    data?.progress?.recommendations.find((item) => item.kind === "review") ??
    data?.progress?.recommendations[0];
  const next = data?.cards[0];
  const nextHref =
    next?.href ??
    (suggestion?.kind === "resume"
      ? `/reading?attempt=${encodeURIComponent(suggestion.attemptId!)}`
      : suggestion?.kind === "review"
        ? `/progress?review=1&type=${suggestion.type}`
        : suggestion
          ? "/progress"
          : "/practice");
  async function startSuggested() {
    if (!suggestion?.setId || opening) return;
    setOpening(true);
    setOpenError("");
    try {
      const attempt = await api<ReadingAttempt>("reading/attempts", {
        method: "POST",
        body: JSON.stringify({ setId: suggestion.setId }),
      });
      router.push(`/reading?attempt=${encodeURIComponent(attempt.id)}`);
    } catch (error) {
      setOpenError(
        error instanceof Error
          ? error.message
          : "Chưa mở được bài luyện. Hãy thử lại.",
      );
    } finally {
      setOpening(false);
    }
  }
  return (
    <main id="main" className="lumen-home">
      <section className="lumen-hero">
        <p className="lumen-greeting">
          Good afternoon, {personal.name.trim() || "Alex"}{" "}
          <span aria-hidden="true">👋</span>
        </p>
        <h1>
          <span className="desktop-headline">
            What do you want to practise today?
          </span>
          <span className="mobile-headline">
            Good afternoon,
            <br />
            {personal.name.trim() || "Alex"} <span aria-hidden="true">👋</span>
          </span>
        </h1>
        <p className="mobile-workspace-caption">Your IELTS workspace</p>
        <form
          className="lumen-launcher"
          onSubmit={(event) => {
            event.preventDefault();
            const value = launchText
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d");
            const matches = [
              { pattern: /\b(reading|doc)\b/, href: "/reading" },
              { pattern: /\b(listening|nghe)\b/, href: "/listening" },
              { pattern: /\b(speaking|noi)\b/, href: "/speaking" },
              { pattern: /\b(writing|viet)\b/, href: "/writing" },
            ].filter((item) => item.pattern.test(value));
            if (matches.length !== 1) {
              setLaunchError(
                "Hãy nhập một kỹ năng: Reading, Listening, Speaking hoặc Writing.",
              );
              return;
            }
            setLaunchError("");
            router.push(matches[0].href);
          }}
        >
          <label className="sr-only" htmlFor="lumen-launch">
            Kỹ năng muốn luyện
          </label>
          <input
            id="lumen-launch"
            value={launchText}
            onChange={(e) => {
              setLaunchText(e.target.value);
              setLaunchError("");
            }}
            aria-invalid={Boolean(launchError)}
            aria-describedby="lumen-launch-help"
          />
          <LauncherHints empty={!launchText} />
          <button className="primary" aria-label="Mở thư viện kỹ năng">
            <LumenIcon name="arrow" />
          </button>
        </form>
        <span className="sr-only" id="lumen-launch-help">
          Opens an existing skill library; does not generate a lesson.
        </span>
        {launchError && (
          <p className="error" role="alert">
            {launchError}
          </p>
        )}
        <SkillLinks compact />
      </section>
      {data?.errors.map((error) => (
        <div className="error" role="alert" key={error}>
          {error}
          <button onClick={() => void reload()} disabled={loading}>
            Tải lại
          </button>
        </div>
      ))}
      <div className="lumen-home-columns">
        <section className="lumen-continuation">
          <div className="section-heading">
            <h2>Continue your learning</h2>
            <Link href="/practice" aria-label="Thư viện luyện tập →">
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>
          {loading ? (
            <div className="lumen-continue-card" role="status">
              Loading your saved practice…
            </div>
          ) : next ? (
            <Link
              href={next.href}
              className="lumen-continue-card"
              aria-label={next.skill + " · ĐANG HỌC · " + next.title}
            >
              <div className="continue-copy">
                <small>
                  <span className="mini-icon">
                    <LumenIcon
                      name={
                        next.skill === "Listening"
                          ? "headphones"
                          : next.skill === "Speaking"
                            ? "mic"
                            : next.skill === "Writing"
                              ? "pen"
                              : "book"
                      }
                      size={16}
                    />
                  </span>
                  {next.skill}
                  <span className="continue-status">In progress</span>
                </small>
                <h3>{next.title}</h3>
                <p>{next.detail}</p>
                <span className="continue-cta">
                  Continue <LumenIcon name="arrow" size={15} />
                </span>
              </div>
              <div className="lumen-lesson-art" aria-hidden="true">
                <svg viewBox="0 0 100 120" fill="none">
                  <path d="M10 110V42l40-23 40 23v68Z" fill="#d2d2de" />
                  <path d="M9 42 50 10l42 32Z" fill="#596276" />
                  <path d="M45 110V84h12v26" fill="#697485" />
                  {[0, 1, 2, 3].map((row) =>
                    [0, 1, 2, 3].map((col) => (
                      <path
                        key={row + "-" + col}
                        d={`M${19 + col * 18} ${48 + row * 13}h8v8h-8Z`}
                        fill="#7d8eab"
                      />
                    )),
                  )}
                  <path
                    d="M0 108c18-21 30-8 40 12H0ZM70 120c0-25 25-33 30-8v8Z"
                    fill="#7d9a88"
                  />
                </svg>
              </div>
            </Link>
          ) : (
            <div className="lumen-continue-card">
              <div
                className="lumen-lesson-art starter-art"
                aria-hidden="true"
              />
              <span className="mini-icon">
                <LumenIcon name="book" />
              </span>
              <h3>No unfinished sessions yet</h3>
              <p>
                Your saved practice will appear here. Start with a skill above.
              </p>
              <Link className="continue-cta desktop-start" href="/practice">
                Start practising <LumenIcon name="arrow" size={15} />
              </Link>
              {suggestion?.kind === "practice" ? (
                <button
                  className="continue-cta mobile-suggested"
                  disabled={opening}
                  onClick={() => void startSuggested()}
                  aria-label="Luyện bài được gợi ý"
                >
                  Start practising <LumenIcon name="arrow" size={15} />
                </button>
              ) : (
                <Link
                  className="continue-cta mobile-suggested"
                  href="/practice"
                >
                  Start practising →
                </Link>
              )}
            </div>
          )}
          {data &&
            data.cards.slice(1).map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="lumen-resume-row"
                aria-label={card.skill + " · ĐANG HỌC · " + card.title}
              >
                <span>
                  {card.skill} · {card.title}
                </span>
                <LumenIcon name="arrow" size={16} />
              </Link>
            ))}
        </section>
        <aside className="lumen-focus">
          <h2>Today's focus</h2>
          <p>Based on your recent performance</p>
          <div className="lumen-focus-row">
            <span className="focus-icon mint">
              <LumenIcon name="book" size={17} />
            </span>
            <div>
              <strong>{suggestion?.title ?? "Reading practice"}</strong>
              <small>
                {suggestion?.reason ?? "Build your first learning baseline"}
              </small>
            </div>
            {!next && suggestion?.kind === "practice" ? (
              <button
                className="focus-arrow"
                disabled={opening}
                onClick={() => void startSuggested()}
                aria-label="Luyện bài được gợi ý"
              >
                <LumenIcon name="arrow" size={17} />
              </button>
            ) : (
              <Link href={nextHref} aria-label="Chọn bước luyện tiếp theo">
                <LumenIcon name="arrow" size={17} />
              </Link>
            )}
          </div>
          <Link className="lumen-focus-row" href="/sources">
            <span className="focus-icon amber">
              <LumenIcon name="sparkle" size={17} />
            </span>
            <div>
              <strong>Academic reading & listening</strong>
              <small>Explore open learning resources</small>
            </div>
            <LumenIcon name="arrow" size={17} />
          </Link>
          <Link className="lumen-focus-row" href="/speaking">
            <span className="focus-icon mint">
              <LumenIcon name="mic" size={17} />
            </span>
            <div>
              <strong>Speaking Part 2</strong>
              <small>Practise a new topic</small>
            </div>
            <LumenIcon name="arrow" size={17} />
          </Link>
          {openError && (
            <p className="error" role="alert">
              {openError}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
