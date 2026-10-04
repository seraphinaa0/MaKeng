"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { browserDemo } from "./mode";
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
          <Link
            href="/create"
            aria-current={path === "/create" ? "page" : undefined}
          >
            Tạo đề
          </Link>
        </nav>
        <span className="preview-label">Bản thử nghiệm</span>
      </header>
      {browserDemo && (
        <p className="demo-banner">
          Demo trên thiết bị · Không gửi bài viết/nguồn tới AI hoặc máy chủ. Dữ
          liệu chỉ lưu trong trình duyệt, không đồng bộ và có thể mất khi xóa dữ
          liệu trang web. Điểm Writing là minh họa.
        </p>
      )}
    </>
  );
}
