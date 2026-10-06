"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useQuestionSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const stop = useCallback(() => {
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const synth = window.speechSynthesis;
    const refresh = () =>
      setVoices(
        synth
          .getVoices()
          .filter(
            (voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang),
          ),
      );
    refresh();
    synth.addEventListener("voiceschanged", refresh);
    const hidden = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", stop);
    return () => {
      stop();
      synth.removeEventListener("voiceschanged", refresh);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", stop);
    };
  }, [stop]);
  function read(text: string) {
    stop();
    setError("");
    const voice =
      voices.find((item) => item.voiceURI === voiceURI) ?? voices[0];
    if (!voice) {
      setError(
        "Chưa có giọng tiếng Anh trên thiết bị. Bạn vẫn có thể hiện câu hỏi để luyện.",
      );
      return;
    }
    const speech = new SpeechSynthesisUtterance(text);
    speech.onend = () => {
      if (utterance.current === speech) {
        setSpeaking(false);
        utterance.current = null;
      }
    };
    speech.onerror = () => {
      if (utterance.current === speech) {
        setSpeaking(false);
        setError("Không đọc được câu hỏi. Thử lại hoặc chọn giọng khác.");
        utterance.current = null;
      }
    };
    utterance.current = speech;
    try {
      speech.voice = voice;
      speech.lang = voice.lang;
      speech.rate = rate;
      window.speechSynthesis.speak(speech);
      setSpeaking(true);
    } catch {
      stop();
      setError("Giọng đọc chưa hoạt động. Hãy hiện câu hỏi để tiếp tục.");
    }
  }
  return {
    voices,
    voiceURI,
    setVoiceURI,
    rate,
    setRate,
    speaking,
    error,
    read,
    stop,
  };
}
