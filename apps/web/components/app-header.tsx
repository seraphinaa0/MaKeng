"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import LumenIcon from "./lumen-icon";
import MaKengLogo from "./makeng-logo";
import PersonalPanel from "./personal-panel";
import { MotionLink, usePersonal } from "./workspace-preferences";
const sections = [
  {
    href: "/",
    label: "Home",
    sub: "Trang chủ",
    icon: "M3 11l9-8 9 8M5 10v11h14V10M9 21v-7h6v7",
  },
  {
    href: "/practice",
    label: "Practice",
    sub: "Thư viện luyện tập",
    icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  },
  {
    href: "/reading",
    label: "Reading",
    sub: "Luyện đọc",
    icon: "M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3V4",
  },
  {
    href: "/listening",
    label: "Listening",
    sub: "Luyện nghe",
    icon: "M4 14v-3a8 8 0 0 1 16 0v3M4 13H2v7h5v-7H4m16 0h2v7h-5v-7h3",
  },
  {
    href: "/speaking",
    label: "Speaking",
    sub: "Luyện nói",
    icon: "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0V4m-4 7v1a7 7 0 0 0 14 0v-1M12 19v3m-4 0h8",
  },
  {
    href: "/writing",
    label: "Writing",
    sub: "Luyện viết",
    icon: "M4 20h4L20 8l-4-4L4 16v4M14 6l4 4",
  },
  {
    href: "/progress",
    label: "Tiến độ",
    sub: "Ôn lỗi & theo dõi",
    icon: "M4 20V10m8 10V4m8 16v-7M2 22h20",
  },
  {
    href: "/create",
    label: "Tạo đề",
    sub: "Soạn & tự duyệt",
    icon: "M4 3h12l4 4v14H4V3m4 8h8m-8 4h8m-8-8h3",
  },
  {
    href: "/sources",
    label: "Tài liệu nguồn",
    sub: "Nguồn & giấy phép",
    icon: "M4 3h12l4 4v14H4V3m4 8h8m-8 4h8m-8-8h3",
  },
  {
    href: "/backup",
    label: "Sao lưu",
    sub: "Dữ liệu của bạn",
    icon: "M4 4h16v16H4V4m4 0v6h8V4M8 20v-6h8v6",
  },
];
type Theme = "system" | "light" | "dark" | "ambient";
export default function AppHeader() {
  const path = usePathname();
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [themeError, setThemeError] = useState("");
  const { personal } = usePersonal();
  const rail = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const profile = useRef<HTMLButtonElement>(null);
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  function toggleMenu(event: React.MouseEvent<HTMLButtonElement>) {
    menuTrigger.current = event.currentTarget;
    setMenu(!menu);
  }
  const [pill, setPill] = useState({ y: 0, height: 40, visible: false });
  useLayoutEffect(() => {
    const nav = rail.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      setPill(
        active
          ? { y: active.offsetTop, height: active.offsetHeight, visible: true }
          : { y: 0, height: 40, visible: false },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [path]);
  const section = sections.find((item) => item.href === path) ?? sections[0];
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuTrigger.current?.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[aria-controls="lumen-settings"]')
      )
        return;
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !profile.current?.contains(event.target)
      )
        setMenu(false);
    };
    panel.current?.querySelector<HTMLElement>("button, input, select")?.focus();
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", outside);
    };
  }, [menu]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("makeng-ui-theme");
      if (
        saved === "dark" ||
        saved === "light" ||
        saved === "system" ||
        saved === "ambient"
      )
        setTheme(saved);
    } catch {
      /* System theme remains available without storage. */
    }
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === "system" ? (query.matches ? "dark" : "light") : theme;
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [theme]);
  function chooseTheme(value: Theme) {
    setTheme(value);
    try {
      localStorage.setItem("makeng-ui-theme", value);
      setThemeError("");
    } catch {
      setThemeError(
        "Đã đổi giao diện; không lưu được lựa chọn cho lần mở sau.",
      );
    }
  }
  function navLink(item: (typeof sections)[number], mobile = false) {
    const active =
      path === item.href ||
      (!mobile &&
        item.href === "/practice" &&
        ["/create", "/sources", "/backup"].includes(path)) ||
      (mobile &&
        item.href === "/practice" &&
        !["/", "/progress"].includes(path));
    return (
      <MotionLink
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        onClick={() => setMenu(false)}
      >
        {item.href === "/reading" ||
        item.href === "/listening" ||
        item.href === "/speaking" ||
        item.href === "/writing" ? (
          <LumenIcon
            name={
              item.href === "/reading"
                ? "book"
                : item.href === "/listening"
                  ? "headphones"
                  : item.href === "/speaking"
                    ? "mic"
                    : "pen"
            }
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={item.icon} />
          </svg>
        )}
        <span>
          {item.label}
          {!mobile && <small className="nav-translation">{item.sub}</small>}
        </span>
      </MotionLink>
    );
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="app-header lumen-header" data-focus={focused}>
        <Link className="brand" href="/">
          <span className="lumen-logo">
            <MaKengLogo />
          </span>
          <span>
            MaKeng<small>Your IELTS workspace</small>
          </span>
        </Link>
        <div className="lumen-top-actions">
          <div
            className="header-theme"
            role="group"
            aria-label="Giao diện nhanh"
          >
            <button
              aria-pressed={theme === "light"}
              onClick={() => chooseTheme("light")}
            >
              Sáng
            </button>
            <button
              aria-pressed={theme === "dark"}
              onClick={() => chooseTheme("dark")}
            >
              Tối
            </button>
          </div>
          <MotionLink
            className="icon-button"
            aria-label="Thông tin dữ liệu"
            href="/settings#data-info"
          >
            <LumenIcon name="bell" />
          </MotionLink>
          <button
            className="profile-button"
            aria-label="Profile"
            aria-expanded={menu}
            aria-controls="lumen-settings"
            ref={profile}
            onClick={toggleMenu}
          >
            {personal.avatar === "A"
              ? personal.name.trim().slice(0, 1).toUpperCase() || "A"
              : personal.avatar}
          </button>
        </div>
      </header>
      <aside className="lumen-sidebar" aria-label="MaKeng workspace">
        <nav aria-label="Điều hướng chính" ref={rail} className="motion-rail">
          <span
            className="rail-pill"
            aria-hidden="true"
            style={{
              transform: `translateY(${pill.y}px)`,
              height: pill.height,
              opacity: pill.visible ? 1 : 0,
            }}
          />
          {navLink(sections[0])}
          {navLink(sections[1])}
          {sections.slice(2, 6).map((item) => navLink(item))}
          <button disabled title="Vocabulary chưa có trong bản local">
            <LumenIcon name="book" />
            <span>
              Vocabulary<small>Coming soon</small>
            </span>
          </button>
          <MotionLink
            href="/progress"
            aria-label="Tiến độ"
            aria-current={path === "/progress" ? "page" : undefined}
          >
            <LumenIcon name="chart" />
            <span>Progress</span>
          </MotionLink>
          <button disabled title="Chưa kết nối AI provider">
            <LumenIcon name="tutor" />
            <span>
              AI Tutor<small>Not connected</small>
            </span>
          </button>
        </nav>
        <MotionLink
          className="lumen-settings-link"
          href="/settings"
          aria-current={path === "/settings" ? "page" : undefined}
        >
          <LumenIcon name="settings" />
          Settings
        </MotionLink>
        <div className="lumen-pro">
          <span className="pro-symbol">
            <LumenIcon name="sparkle" />
          </span>
          <h3>Upgrade to Pro</h3>
          <p>
            AI feedback and more practice.
            <br />
            Not available in this local build.
          </p>
          <button disabled>Coming soon</button>
        </div>
      </aside>
      <div className="practice-bar">
        <Link href="/practice" aria-label="Back to practice">
          <LumenIcon name="back" />
        </Link>
        <strong>
          {section.href === "/" ? "Writing" : section.label} Practice
        </strong>
        <span>Learning mode</span>
        <MotionLink href="/settings" aria-label="System settings">
          <LumenIcon name="settings" />
        </MotionLink>
        <button
          onClick={toggleMenu}
          aria-label="Practice settings"
          aria-controls="lumen-settings"
          aria-expanded={menu}
        >
          <LumenIcon name="tutor" />
        </button>
      </div>
      <div
        hidden={!menu}
        className="lumen-settings-panel"
        id="lumen-settings"
        role="dialog"
        aria-modal="false"
        aria-label="Profile"
        ref={panel}
      >
        <div className="section-heading">
          <h2>Your space</h2>
          <button
            onClick={() => {
              setMenu(false);
              menuTrigger.current?.focus();
            }}
            aria-label="Close profile"
          >
            ×
          </button>
        </div>
        <label className="theme-control">
          Appearance
          <select
            aria-label="Giao diện"
            value={theme}
            onChange={(e) => chooseTheme(e.target.value as Theme)}
          >
            <option value="system">Theo hệ thống</option>
            <option value="light">Sáng</option>
            <option value="dark">Tối</option>
            <option value="ambient">Ambient · lavender</option>
          </select>
        </label>
        <PersonalPanel />
        <button
          className="focus-toggle"
          aria-pressed={focused}
          onClick={() => setFocused(!focused)}
        >
          {focused ? "Thoát tập trung" : "Tập trung"}
        </button>
        <nav aria-label="Kỹ năng">
          {sections.slice(2, 6).map((item) => navLink(item))}
        </nav>
        <MotionLink href="/settings" onClick={() => setMenu(false)}>
          Cấu hình, quyền & sao lưu
        </MotionLink>
        {themeError && (
          <p role="status" className="error">
            {themeError}
          </p>
        )}
      </div>
      <nav className="hub-mobile-nav" aria-label="Điều hướng nhanh">
        {navLink(sections[0], true)}
        {navLink(sections[1], true)}
        <button disabled aria-label="Vocabulary">
          <LumenIcon name="book" />
          <span>Vocabulary</span>
        </button>
        <MotionLink
          href="/progress"
          aria-label="Tiến độ"
          aria-current={path === "/progress" ? "page" : undefined}
        >
          <LumenIcon name="chart" />
          <span>Progress</span>
        </MotionLink>
        <button
          aria-label="Profile"
          aria-controls="lumen-settings"
          aria-expanded={menu}
          onClick={toggleMenu}
        >
          <LumenIcon name="tutor" />
          <span>Profile</span>
        </button>
      </nav>
    </>
  );
}
