"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type Personal = {
  name: string;
  avatar: string;
  motion: "cinematic" | "slide" | "fade" | "off";
  duration: number;
  fancy: boolean;
};
const defaults: Personal = {
  name: "Alex",
  avatar: "A",
  motion: "cinematic",
  duration: 460,
  fancy: true,
};
const Context = createContext({
  personal: defaults,
  update: (patch: Partial<Personal>) => {
    void patch;
  },
  error: "",
  navigate: (href: string) => {
    void href;
  },
});
export const usePersonal = () => useContext(Context);
export default function WorkspacePreferences({
  children,
}: {
  children: ReactNode;
}) {
  const [personal, setPersonal] = useState(defaults);
  const [error, setError] = useState("");
  const router = useRouter();
  const path = usePathname();
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animation = useRef<Animation | null>(null);
  useEffect(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem("makeng-personal-v1") ?? "null",
      );
      if (value && typeof value === "object") {
        const p = value as Partial<Personal>;
        setPersonal({
          name:
            typeof p.name === "string" ? p.name.slice(0, 40) : defaults.name,
          avatar: ["A", "🌿", "🦊", "🐼", "🚀"].includes(p.avatar ?? "")
            ? p.avatar!
            : defaults.avatar,
          motion: ["cinematic", "slide", "fade", "off"].includes(p.motion ?? "")
            ? p.motion!
            : defaults.motion,
          duration: [300, 460, 650].includes(p.duration ?? 0)
            ? p.duration!
            : defaults.duration,
          fancy: typeof p.fancy === "boolean" ? p.fancy : true,
        });
      }
    } catch {
      setError("Không đọc được tùy chọn cá nhân; đang dùng mặc định.");
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
      animation.current?.cancel();
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.motion = personal.motion;
    document.documentElement.dataset.fancy = String(personal.fancy);
    document.documentElement.style.setProperty(
      "--scene-duration",
      `${personal.duration}ms`,
    );
  }, [personal]);
  useEffect(() => {
    pending.current = false;
    animation.current?.cancel();
    const main = document.querySelector("main");
    if (
      !main ||
      personal.motion === "off" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const cinematic = personal.motion === "cinematic";
    animation.current = main.animate(
      [
        {
          opacity: 0,
          transform:
            personal.motion === "fade"
              ? "none"
              : `translateY(38px) scale(${cinematic ? "0.97, 1.025" : "1"})`,
          filter: cinematic ? "blur(9px)" : "none",
        },
        { opacity: 1, transform: "none", filter: "none" },
      ],
      { duration: personal.duration, easing: "cubic-bezier(.16,1,.3,1)" },
    );
    return () => animation.current?.cancel();
  }, [path, personal.motion, personal.duration]);
  function update(patch: Partial<Personal>) {
    const next = { ...personal, ...patch };
    setPersonal(next);
    try {
      localStorage.setItem("makeng-personal-v1", JSON.stringify(next));
      setError("");
    } catch {
      setError("Đã áp dụng; không lưu được tùy chọn cho lần mở sau.");
    }
  }
  function navigate(href: string) {
    if (pending.current) return;
    if (
      new URL(href, location.href).pathname === path ||
      personal.motion === "off" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      router.push(href);
      return;
    }
    pending.current = true;
    animation.current?.cancel();
    const cinematic = personal.motion === "cinematic";
    animation.current =
      document.querySelector("main")?.animate(
        [
          { opacity: 1, transform: "none", filter: "none" },
          {
            opacity: 0,
            transform:
              personal.motion === "fade"
                ? "none"
                : `translateY(-26px) scale(${cinematic ? "1.015, 0.975" : "1"})`,
            filter: cinematic ? "blur(7px)" : "none",
          },
        ],
        {
          duration: Math.min(personal.duration * 0.45, 240),
          easing: "ease-in",
          fill: "forwards",
        },
      ) ?? null;
    timer.current = setTimeout(
      () => {
        pending.current = false;
        router.push(href);
      },
      Math.min(personal.duration * 0.45, 240),
    );
  }
  return (
    <Context.Provider value={{ personal, update, error, navigate }}>
      {children}
    </Context.Provider>
  );
}
export function MotionLink(props: ComponentProps<typeof Link>) {
  const { navigate } = usePersonal();
  return (
    <Link
      {...props}
      onNavigate={(event) => {
        props.onNavigate?.(event);
        if (props.onNavigate || typeof props.href !== "string") return;
        event.preventDefault();
        navigate(props.href);
      }}
    />
  );
}
