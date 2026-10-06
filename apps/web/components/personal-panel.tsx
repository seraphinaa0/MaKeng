"use client";
import { useEffect, useState } from "react";
import { usePersonal } from "./workspace-preferences";

export default function PersonalPanel() {
  const { personal, update, error } = usePersonal();
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + remaining * 1000;
    const tick = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(next);
      if (!next) setRunning(false);
    }, 250);
    return () => clearInterval(tick);
    // The deadline must not reset on each tick.
  }, [running]);
  return (
    <div className="personal-controls">
      <label>
        Tên hiển thị
        <input
          maxLength={40}
          value={personal.name}
          onChange={(e) => update({ name: e.target.value })}
        />
      </label>
      <fieldset className="avatar-options">
        <legend>Avatar</legend>
        {["A", "🌿", "🦊", "🐼", "🚀"].map((avatar) => (
          <button
            key={avatar}
            type="button"
            aria-label={`Avatar ${avatar}`}
            aria-pressed={personal.avatar === avatar}
            onClick={() => update({ avatar })}
          >
            {avatar}
          </button>
        ))}
      </fieldset>
      <div className="personal-grid">
        <label>
          Chuyển trang
          <select
            aria-label="Chuyển trang"
            value={personal.motion}
            onChange={(e) =>
              update({ motion: e.target.value as typeof personal.motion })
            }
          >
            <option value="cinematic">Cinematic · blur & stretch</option>
            <option value="slide">Slide · cuộn dọc</option>
            <option value="fade">Fade · hòa tan</option>
            <option value="off">Tắt chuyển động</option>
          </select>
        </label>
        <label>
          Tốc độ
          <select
            aria-label="Tốc độ"
            value={personal.duration}
            onChange={(e) => update({ duration: Number(e.target.value) })}
          >
            <option value={300}>Nhanh</option>
            <option value={460}>Mượt</option>
            <option value={650}>Chậm</option>
          </select>
        </label>
      </div>
      <label className="motion-switch">
        <input
          type="checkbox"
          checked={personal.fancy}
          onChange={(e) => update({ fancy: e.target.checked })}
        />
        Dải sáng & icon hoạt hình
      </label>
      <section className="pomodoro" aria-label="Pomodoro">
        <div>
          <strong>Pomodoro</strong>
          <small>Đồng hồ cá nhân, không tính điểm</small>
        </div>
        <output aria-label="Thời gian Pomodoro">
          {Math.floor(remaining / 60)
            .toString()
            .padStart(2, "0")}
          :{(remaining % 60).toString().padStart(2, "0")}
        </output>
        <label>
          Phút
          <input
            type="number"
            min={1}
            max={90}
            disabled={running}
            value={minutes}
            onChange={(e) => {
              const next = Math.max(
                1,
                Math.min(90, Number(e.target.value) || 1),
              );
              setMinutes(next);
              setRemaining(next * 60);
            }}
          />
        </label>
        <button disabled={!remaining} onClick={() => setRunning(!running)}>
          {running ? "Tạm dừng" : "Bắt đầu"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setRemaining(minutes * 60);
          }}
        >
          Đặt lại
        </button>
        {remaining === 0 && (
          <p role="status">Hết phiên tập trung. Nghỉ một chút nhé.</p>
        )}
      </section>
      <p className="preference-note">
        Tên, avatar và giao diện chỉ lưu trên trình duyệt này. Pomodoro vẫn chạy
        khi đóng bảng; tải lại trang sẽ đặt lại.
      </p>
      {error && (
        <p role="status" className="error">
          {error}
        </p>
      )}
    </div>
  );
}
