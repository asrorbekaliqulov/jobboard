/**
 * Voice Search Button
 * Strategy:
 * 1. Web Speech API with interim results (real-time text as you speak) - Chrome
 * 2. Fallback: MediaRecorder → backend gpt-4o-mini-transcribe - Telegram WebApp
 */
import React, { useState, useRef, useCallback } from "react";
import { mainApi } from "../services/api.ts";

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void; // Real-time partial text
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({ onResult, onInterim }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Try Web Speech API first (gives real-time interim results)
  const tryWebSpeechAPI = useCallback((): boolean => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "uz-UZ";
      recognition.interimResults = true; // Real-time partial results
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += transcript;
          else interim += transcript;
        }
        // Show real-time interim text in search field
        if (interim && onInterim) onInterim(interim);
        if (final.trim()) {
          onResult(final.trim());
          setIsListening(false);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        startMediaRecorder(); // Fallback
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch {
      return false;
    }
  }, [onResult, onInterim]);

  // Fallback: MediaRecorder → backend gpt-4o-mini-transcribe
  const startMediaRecorder = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setIsListening(false);
        setIsProcessing(true);
        if (onInterim) onInterim("🎤 Eshitganim matnga aylantirilmoqda...");

        try {
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("file", audioBlob, "voice.webm");

          const token = localStorage.getItem("auth_token");
          const res = await fetch(`${mainApi}/api/v1/ai/voice-transcribe`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.text?.trim()) {
              onResult(data.text.trim());
            }
          }
        } catch (e) {
          console.error("Voice transcription failed:", e);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
      if (onInterim) onInterim("🎤 Tinglayapman... gapiring");

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (e) {
      console.error("MediaRecorder failed:", e);
      setIsListening(false);
      alert("Mikrofonga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.");
    }
  }, [onResult, onInterim]);

  const startListening = useCallback(() => {
    if (!tryWebSpeechAPI()) {
      startMediaRecorder();
    }
  }, [tryWebSpeechAPI, startMediaRecorder]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setIsListening(false);
  }, []);

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={isProcessing}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
        isProcessing
          ? "bg-amber-100 text-amber-600"
          : isListening
            ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-200"
            : "bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-500"
      }`}
      title={isProcessing ? "Tahlil qilinmoqda..." : isListening ? "To'xtatish" : "Ovozli qidiruv"}
    >
      <i className={`fa-solid ${
        isProcessing ? "fa-spinner fa-spin" : isListening ? "fa-stop" : "fa-microphone"
      } text-xs`} />
    </button>
  );
};
