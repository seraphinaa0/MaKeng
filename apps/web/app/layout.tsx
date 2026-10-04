import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "../components/app-header";
export const metadata: Metadata = {
  title: "MaKeng · Luyện IELTS",
  description:
    "Luyện Writing, Reading, tạo bài tập và theo dõi tiến độ luyện tập.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
