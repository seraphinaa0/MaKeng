"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SPEAKING_AUDIO_LIMIT } from "../../../packages/schemas/speaking";
import { preferredMicrophone } from "./audio-preferences";

export function useSpeakingRecorder(limitSeconds: number) {
  const [phase, setPhase] = useState<
    "idle" | "requesting" | "recording" | "stopping"
  >("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [value, setValue] = useState<{
    blob: Blob;
    durationSeconds: number;
  } | null>(null);
  const generation = useRef(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedAt = useRef<number | null>(null);
  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") {
      stoppedAt.current ??= performance.now();
      setPhase("stopping");
      recorder.current.stop();
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  const discard = useCallback(() => {
    generation.current++;
    stoppedAt.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => {
    const visibility = () => {
      if (!document.hidden) return;
      if (recorder.current) stop();
      else {
        discard();
        setPhase("idle");
      }
    };
    const hide = () => {
      discard();
      setPhase("idle");
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", hide);
    return () => {
      discard();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", hide);
    };
  }, [discard, stop]);
  async function begin() {
    discard();
    const token = generation.current;
    setError("");
    setValue(null);
    setSeconds(0);
    setPhase("requesting");
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Ghi âm cần HTTPS và trình duyệt hỗ trợ microphone/MediaRecorder. Bạn vẫn có thể nhập transcript.",
        );
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mimeType)
        throw new Error(
          "Trình duyệt chưa hỗ trợ định dạng ghi âm. Hãy thử Chrome, Edge hoặc Safari mới.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        audio: preferredMicrophone(),
        video: false,
      });
      if (token !== generation.current || document.hidden) {
        media.getTracks().forEach((t) => t.stop());
        if (token === generation.current) setPhase("idle");
        return;
      }
      stream.current = media;
      const capture = new MediaRecorder(media, { mimeType });
      recorder.current = capture;
      const chunks: Blob[] = [];
      let size = 0;
      let failed = false;
      const started = performance.now();
      const finish = stop;
      capture.ondataavailable = (event) => {
        if (token !== generation.current || failed) return;
        size += event.data.size;
        if (size > SPEAKING_AUDIO_LIMIT) {
          failed = true;
          setError("Bản ghi vượt 20 MiB; hãy ghi lại đoạn ngắn hơn.");
          finish();
          return;
        }
        if (event.data.size) chunks.push(event.data);
      };
      capture.onerror = () => {
        if (token !== generation.current) return;
        failed = true;
        setError("Microphone gặp lỗi; hãy kiểm tra thiết bị rồi thử lại.");
        finish();
      };
      capture.onstop = () => {
        media.getTracks().forEach((t) => t.stop());
        if (token !== generation.current) return;
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        recorder.current = null;
        stream.current = null;
        setPhase("idle");
        const durationSeconds = Math.min(
          limitSeconds,
          ((stoppedAt.current ?? performance.now()) - started) / 1000,
        );
        if (failed) return;
        if (durationSeconds < 0.5 || !size) {
          setError(
            "Bản ghi quá ngắn hoặc không có audio. Ghi ít nhất một giây rồi thử lại.",
          );
          return;
        }
        setValue({
          blob: new Blob(chunks, { type: capture.mimeType }),
          durationSeconds,
        });
      };
      capture.start(500);
      setPhase("recording");
      timer.current = setInterval(() => {
        const elapsed = (performance.now() - started) / 1000;
        setSeconds(Math.min(limitSeconds, Math.floor(elapsed)));
        if (elapsed >= limitSeconds) finish();
      }, 200);
    } catch (cause) {
      if (token !== generation.current) return;
      discard();
      setPhase("idle");
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Quyền microphone bị từ chối. Cho phép microphone trong cài đặt trang web rồi thử lại, hoặc nhập transcript."
          : cause instanceof DOMException && cause.name === "NotFoundError"
            ? "Không tìm thấy microphone. Kết nối thiết bị hoặc nhập transcript."
            : cause instanceof DOMException &&
                cause.name === "OverconstrainedError"
              ? "Microphone đã chọn không còn khả dụng. Mở Settings, chọn lại thiết bị hoặc Mặc định hệ thống rồi thử lại."
              : cause instanceof Error
                ? cause.message ||
                  "Không thể ghi âm. Kiểm tra microphone trong Settings rồi thử lại."
                : "Không thể ghi âm.",
      );
    }
  }
  function cancel() {
    discard();
    setPhase("idle");
    setValue(null);
    setError("");
  }
  return { phase, seconds, error, value, begin, stop, cancel };
}
