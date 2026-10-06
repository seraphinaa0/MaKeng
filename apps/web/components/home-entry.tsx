"use client";
import { useEffect, useState } from "react";
import WritingStudio from "./writing-studio";
import HomeHub from "./home-hub";

export default function HomeEntry() {
  const [legacy, setLegacy] = useState<boolean | null>(null);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setLegacy(query.has("practice") || query.has("submission"));
  }, []);
  if (legacy === null)
    return (
      <main id="main">
        <p role="status">Đang mở không gian học…</p>
      </main>
    );
  return legacy ? <WritingStudio /> : <HomeHub />;
}
