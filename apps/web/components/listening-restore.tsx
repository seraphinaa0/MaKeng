"use client";
import { useState } from "react";
import {
  BACKUP_LIMIT,
  parseListeningBackup,
} from "../../../packages/domain/listening-backup";
import {
  restoreListening,
  type StoredListening,
} from "../../../packages/demo/listening-store";
import type { ListeningLesson } from "../../../packages/schemas/listening";

export default function ListeningRestore({
  busy,
  setBusy,
  onRestored,
}: {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  onRestored: (lesson: StoredListening) => void;
}) {
  const [backup, setBackup] = useState<{
    text: string;
    lesson: ListeningLesson;
  } | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [reset, setReset] = useState(0);
  return (
    <details className="card listening-intake listening-restore">
      <summary>Khôi phục bản sao lưu Listening</summary>
      <p>
        Chọn JSON và file audio đã xuất cùng bài. File chỉ được kiểm tra trên
        thiết bị, không gửi tới máy chủ hoặc STT. Khôi phục tạo bản riêng, giữ
        lịch sử và không gộp/ghi đè bài hiện có.
      </p>
      <p className="muted">
        JSON tối đa 10 MiB, audio tối đa 20 MiB. Cần đúng audio gốc; tên file có
        thể khác. Bản JSON cũ từ Listening vẫn dùng được.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <form
        key={reset}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!backup || !audio || busy) return;
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setError("");
          try {
            const lesson = await restoreListening(backup.text, audio, {
              consent: data.get("consent") === "on",
              retentionDays: Number(data.get("retention")),
            });
            setBackup(null);
            setAudio(null);
            setReset((n) => n + 1);
            onRestored(lesson);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Không khôi phục được bài nghe.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          File JSON sao lưu
          <input
            type="file"
            accept=".json,application/json"
            disabled={busy}
            required
            onChange={async (e) => {
              setBackup(null);
              setError("");
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                if (file.size > BACKUP_LIMIT)
                  throw new Error("JSON sao lưu tối đa 10 MiB.");
                const text = await file.text();
                setBackup({ text, lesson: parseListeningBackup(text) });
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : "Không đọc được bản sao lưu.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {backup && (
          <div className="notice" aria-label="Nội dung bản sao lưu">
            <strong>{backup.lesson.content.set.title}</strong>
            <p>
              {backup.lesson.content.set.questions.length} câu ·{" "}
              {backup.lesson.content.audio.duration.toFixed(1)} giây ·{" "}
              {
                backup.lesson.attempts.filter((a) => a.status === "submitted")
                  .length
              }{" "}
              lượt đã nộp ·{" "}
              {
                backup.lesson.attempts.filter((a) => a.status === "in_progress")
                  .length
              }{" "}
              lượt đang làm.
            </p>
            <p>
              Audio đi kèm: {backup.lesson.content.audio.name}. Giữ nguyên nguồn
              và người kiểm duyệt trong bản sao lưu; đây không phải xác nhận của
              giáo viên.
            </p>
          </div>
        )}
        <label>
          File audio đi kèm
          <input
            type="file"
            accept=".wav,.mp3,.ogg,.webm,.m4a,.mp4,audio/*"
            disabled={busy}
            required
            onChange={(e) => {
              setAudio(e.target.files?.[0] ?? null);
              setError("");
            }}
          />
        </label>
        <label>
          Hạn lưu sau khôi phục
          <select name="retention" defaultValue="7" disabled={busy}>
            <option value="1">1 ngày</option>
            <option value="7">7 ngày</option>
            <option value="30">30 ngày</option>
          </select>
        </label>
        <label className="consent">
          <input name="consent" type="checkbox" required disabled={busy} /> Tôi
          có quyền dùng nội dung này và đồng ý lưu bản khôi phục, audio và lịch
          sử trên thiết bị với hạn lưu mới.
        </label>
        <button className="primary" disabled={busy || !backup || !audio}>
          {busy ? "Đang kiểm tra/khôi phục…" : "Khôi phục bài nghe"}
        </button>
      </form>
    </details>
  );
}
