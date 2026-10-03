import type { Metadata } from "next";
import "./globals.css";
import AppHeader from "../components/app-header";
export const metadata: Metadata = {
  title: "MaKeng · Writing studio",
  description: "Không gian luyện viết IELTS với phản hồi có dẫn chứng.",
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
