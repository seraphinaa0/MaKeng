"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyAudioOutput, preferredMicrophone } from "./audio-preferences";

export default function SystemSettings() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [permission, setPermission] = useState("Chưa kiểm tra");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    setSupported("setSinkId" in HTMLMediaElement.prototype);
    try {
      setInput(localStorage.getItem("makeng-audio-input") ?? "");
      setOutput(localStorage.getItem("makeng-audio-output") ?? "");
    } catch {
      setStatus("Không đọc được cấu hình thiết bị đã lưu.");
    }
    let query: PermissionStatus | undefined;
    const refresh = () => {
      if (mounted.current && query)
        setPermission(
          query.state === "granted"
            ? "Đã cho phép"
            : query.state === "denied"
              ? "Đã chặn"
              : "Sẽ hỏi khi bạn bật microphone",
        );
    };
    void navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((value) => {
        if (!mounted.current) return;
        query = value;
        refresh();
        query.addEventListener("change", refresh);
      })
      .catch(() => {
        if (mounted.current)
          setPermission("Xem quyền microphone trong cài đặt trình duyệt");
      });
    const list = () => {
      void navigator.mediaDevices
        ?.enumerateDevices()
        .then((value) => {
          if (mounted.current) setDevices(value);
        })
        .catch(() => {
          if (mounted.current) setStatus("Chưa đọc được thiết bị âm thanh.");
        });
    };
    list();
    navigator.mediaDevices?.addEventListener("devicechange", list);
    return () => {
      mounted.current = false;
      query?.removeEventListener("change", refresh);
      navigator.mediaDevices?.removeEventListener("devicechange", list);
    };
  }, []);
  async function discover() {
    setBusy(true);
    setStatus("");
    let stream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Trình duyệt không hỗ trợ microphone.");
      stream = await navigator.mediaDevices.getUserMedia({
        audio: preferredMicrophone(),
        video: false,
      });
      // Discovery never records or retains microphone audio.
      stream.getTracks().forEach((track) => track.stop());
      if (!mounted.current) return;
      setPermission("Đã cho phép");
      setDevices(await navigator.mediaDevices.enumerateDevices());
      setStatus("Đã nhận diện thiết bị. Microphone đã tắt, không ghi âm.");
    } catch (error) {
      if (mounted.current)
        setStatus(
          error instanceof DOMException && error.name === "OverconstrainedError"
            ? "Microphone đã chọn không còn khả dụng. Chọn Mặc định hệ thống hoặc thiết bị khác rồi thử lại."
            : error instanceof Error
              ? error.message ||
                "Không truy cập được microphone. Kiểm tra quyền và thiết bị rồi thử lại."
              : "Không truy cập được microphone.",
        );
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      if (mounted.current) setBusy(false);
    }
  }
  function save(kind: "input" | "output", value: string) {
    (kind === "input" ? setInput : setOutput)(value);
    try {
      localStorage.setItem(`makeng-audio-${kind}`, value);
      setStatus("Đã lưu. Áp dụng cho lần ghi âm/phát audio tiếp theo.");
    } catch {
      setStatus(
        "Không lưu được lựa chọn thiết bị; đang dùng cấu hình hệ thống.",
      );
    }
  }
  const missingInput =
    input && !devices.some((device) => device.deviceId === input);
  const missingOutput =
    output && !devices.some((device) => device.deviceId === output);
  return (
    <main id="main" className="system-settings">
      <div className="settings-heading">
        <span className="settings-emblem">⚙</span>
        <div>
          <h1>Settings</h1>
          <p>
            Cấu hình thiết bị và dữ liệu. Cá nhân hóa giao diện trong avatar.
          </p>
        </div>
      </div>
      <section className="card settings-section">
        <h2>Âm thanh & quyền</h2>
        <p>
          Microphone: <strong>{permission}</strong>
        </p>
        <p>
          Chỉ yêu cầu quyền khi bạn bấm bên dưới. Không ghi hoặc gửi audio trong
          bước nhận diện.
        </p>
        <button onClick={() => void discover()} disabled={busy}>
          {busy ? "Đang nhận diện…" : "Cho phép & nhận diện thiết bị"}
        </button>
        <div className="personal-grid">
          <label>
            Đầu vào · microphone
            <select
              aria-label="Đầu vào · microphone"
              value={input}
              onChange={(e) => save("input", e.target.value)}
            >
              <option value="">Mặc định hệ thống</option>
              {missingInput && (
                <option value={input}>
                  Thiết bị đã lưu không còn khả dụng
                </option>
              )}
              {devices
                .filter((d) => d.kind === "audioinput" && d.deviceId)
                .map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Đầu ra · loa / tai nghe
            <select
              aria-label="Đầu ra · loa / tai nghe"
              disabled={!supported}
              value={output}
              onChange={(e) => save("output", e.target.value)}
            >
              <option value="">Mặc định hệ thống</option>
              {missingOutput && (
                <option value={output}>
                  Thiết bị đã lưu không còn khả dụng
                </option>
              )}
              {devices
                .filter((d) => d.kind === "audiooutput" && d.deviceId)
                .map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Loa ${i + 1}`}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {!supported && (
          <p>Trình duyệt này dùng đầu ra âm thanh mặc định của hệ điều hành.</p>
        )}
        <p>
          Áp dụng cho audio Listening và nghe lại Speaking. Giọng đọc TTS dùng
          đầu ra hệ thống. Đổi thiết bị không thay đổi bản ghi đang chạy.
        </p>
        <audio
          controls
          aria-label="Thử đầu ra âm thanh"
          src="/audio/voa-welcome.mp3"
          preload="none"
          onPlay={(e) => {
            void applyAudioOutput(e.currentTarget).catch((error: unknown) =>
              setStatus(
                error instanceof Error ? error.message : "Chưa đổi được loa.",
              ),
            );
          }}
        />
        <p role="status">{status}</p>
        <p>
          Nếu quyền bị chặn, mở cài đặt quyền của trang trong trình duyệt; web
          không thể tự cấp hoặc thu hồi quyền.
        </p>
      </section>
      <section className="card settings-section">
        <h2>Sao lưu & công cụ</h2>
        <p>
          Dữ liệu học nằm trên trình duyệt này. Xuất bản sao trước khi đổi máy
          hoặc xóa dữ liệu trình duyệt.
        </p>
        <div className="settings-links">
          <Link href="/backup">Sao lưu & khôi phục</Link>
          <Link href="/sources">Nguồn & giấy phép</Link>
          <Link href="/create">Soạn và duyệt đề</Link>
        </div>
      </section>
      <section className="card settings-section" id="data-info">
        <h2>Cấu hình local & quyền riêng tư</h2>
        <p>
          Không gửi bài viết, audio hoặc transcript tới AI. Writing Task 2 dùng
          điểm minh họa; Task 1 và Speaking chưa chấm band. Không đồng bộ thiết
          bị.
        </p>
        <p>
          Không cần API key cho bản trình duyệt. Không có tài khoản hoặc backend
          AI thật được cấu hình ở đây.
        </p>
      </section>
    </main>
  );
}
