"use client";
import { useEffect, useState } from "react";
import { usePersonal } from "./workspace-preferences";
const hints = [
  "Luyện Reading 20 phút về climate change…",
  "Tôi muốn luyện Speaking Part 2 hôm nay…",
  "Mở Listening để luyện nghe số và ngày tháng…",
  "Luyện Writing Task 1 với bảng số liệu…",
];
export default function LauncherHints({ empty }: { empty: boolean }) {
  const [index, setIndex] = useState(0);
  const { personal } = usePersonal();
  useEffect(() => {
    if (!empty || personal.motion === "off") return;
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (timer) clearInterval(timer);
      if (!query.matches && !document.hidden)
        timer = setInterval(
          () => setIndex((value) => (value + 1) % hints.length),
          2000,
        );
    };
    sync();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      if (timer) clearInterval(timer);
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [empty, personal.motion]);
  return empty ? (
    <span className="launcher-hints" aria-hidden="true">
      <span key={index} className="hint-line">
        {hints[index]}
      </span>
    </span>
  ) : null;
}
