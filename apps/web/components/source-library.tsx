"use client";
import Link from "next/link";
import { useState } from "react";
import { openContentPack } from "../../../packages/content/open-content";

export default function SourceLibrary() {
  const [skill, setSkill] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [audioErrors, setAudioErrors] = useState<Record<string, boolean>>({});
  const items = openContentPack.items.filter(
    (item) => skill === "all" || item.skill === skill,
  );

  function exportPack() {
    setError("");
    setMessage("");
    let url: string | undefined;
    try {
      url = URL.createObjectURL(
        new Blob([JSON.stringify(openContentPack, null, 2)], {
          type: "application/json",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "makeng-open-content-starter-v1.json";
      link.click();
      setMessage(
        "Đã yêu cầu tải gói văn bản và thông tin giấy phép. Audio tải riêng ở thẻ Listening.",
      );
    } catch {
      setError(
        "Không tạo được file tải. Bạn vẫn có thể đọc nội dung và giấy phép bên dưới; hãy thử lại.",
      );
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
    }
  }

  return (
    <main id="main" className="hub-page source-library">
      <div className="page-heading">
        <p className="hub-kicker">OPEN CONTENT · STARTER PACK V1</p>
        <h1>Tài liệu nguồn</h1>
        <p>
          Đọc và nghe từ nguồn có quyền tái sử dụng, với credit và điều kiện rõ
          ràng.
        </p>
      </div>
      <div className="hub-callout">
        <h2>Nguồn mở, không phải đề thi đã duyệt.</h2>
        <p>{openContentPack.notice}</p>
        <p>
          Đã kiểm tra nguồn ngày {openContentPack.checkedAt}. Gói này không tự
          đưa tài liệu vào các bài Reading/Listening có điểm.
        </p>
      </div>
      <div className="source-tools">
        <label>
          Lọc kỹ năng
          <select
            value={skill}
            onChange={(event) => setSkill(event.target.value)}
          >
            <option value="all">Tất cả tài liệu</option>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
          </select>
        </label>
        <button className="primary" onClick={exportPack}>
          Tải gói văn bản + giấy phép
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <p className="muted">
        {items.length} tài liệu · Audio local, không tự phát · Không tải
        ảnh/video/logo của nguồn
      </p>
      <div className="source-items">
        {items.map((item) => (
          <article className="card source-item" key={item.id}>
            <p className="hub-kicker">
              {item.skill} · {item.provider}
            </p>
            <h2>{item.title}</h2>
            <p className="muted">{item.author}</p>
            {item.audio && (
              <>
                <audio
                  controls
                  preload="none"
                  src={item.audio.path}
                  aria-label={`Nghe ${item.title}`}
                  onError={() =>
                    setAudioErrors((previous) => ({
                      ...previous,
                      [item.id]: true,
                    }))
                  }
                />
                {audioErrors[item.id] && (
                  <p role="alert" className="error">
                    Không mở được audio local. Thử tải file bên dưới hoặc tải
                    lại trang.
                  </p>
                )}
                <p>
                  <a href={item.audio.path} download>
                    Tải audio MP3
                  </a>{" "}
                  · {Math.ceil(item.audio.bytes / 1024)} KB
                </p>
                <p className="muted">
                  Transcript hội thoại không có timestamp; chưa dùng để chấm
                  bài.
                </p>
              </>
            )}
            <div className="source-text" lang="en">
              {item.text.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <details className="source-rights">
              <summary>Nguồn & giấy phép · {item.license}</summary>
              <p>{item.attribution}</p>
              <p>
                <strong>Thay đổi:</strong> {item.changes}
              </p>
              <p>
                <strong>Điều kiện:</strong> {item.conditions}
              </p>
              <p>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Nguồn gốc ↗
                </a>
                {" · "}
                <a href={item.licenseUrl} target="_blank" rel="noreferrer">
                  Giấy phép / điều khoản ↗
                </a>
                {item.historyUrl && (
                  <>
                    {" · "}
                    <a href={item.historyUrl} target="_blank" rel="noreferrer">
                      Lịch sử tác giả ↗
                    </a>
                  </>
                )}
              </p>
            </details>
          </article>
        ))}
      </div>
      <section aria-labelledby="pending-sources">
        <h2 id="pending-sources">Nguồn chưa nhập</h2>
        {openContentPack.pending.map((item) => (
          <div className="hub-callout" key={item.provider}>
            <h3>{item.provider}</h3>
            <p>{item.reason}</p>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">
              Xem nguồn và điều kiện ↗
            </a>
          </div>
        ))}
      </section>
      <div className="hub-callout">
        <h2>Speaking & Writing: đề gốc MaKeng</h2>
        <p>
          Đã thêm chủ đề Environment/Travel cho Speaking, Digital
          inclusion/Repair culture cho Task 2 và hai bảng dữ liệu giả lập cho
          Task 1. Nội dung preview, không sao chép đề IELTS chính thức.
        </p>
        <p>
          <Link href="/speaking">Mở Speaking →</Link>
          {" · "}
          <Link href="/writing">Mở Writing →</Link>
        </p>
      </div>
    </main>
  );
}
