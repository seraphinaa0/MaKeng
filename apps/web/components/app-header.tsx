"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function AppHeader() {
  const path = usePathname();
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="app-header">
        <Link className="brand" href="/">
          MaKeng
        </Link>
        <nav aria-label="Kỹ năng">
          <Link href="/" aria-current={path === "/" ? "page" : undefined}>
            Writing
          </Link>
          <Link
            href="/reading"
            aria-current={path.startsWith("/reading") ? "page" : undefined}
          >
            Reading
          </Link>
        </nav>
        <span className="preview-label">Bản thử nghiệm</span>
      </header>
    </>
  );
}
