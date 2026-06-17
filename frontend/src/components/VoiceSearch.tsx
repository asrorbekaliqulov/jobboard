/**
 * Voice Search Button - Uses Web Speech API (SpeechRecognition)
 * Mikrofon tugmasi - ovozni matnga aylantirib qidiruv maydoniga yozadi
 */
import React, { useState, useRef, useCallback } from "react";

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
}

export const VoiceSearchButton: React.FC<VoiceSearchButtonProps> = ({ onResult }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Brauzeringiz ovozli qidiruvni qo'llab-quvvatlamaydi");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "uz-UZ"; // O'zbek tili
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        onResult(transcript.trim());
      }
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
        isListening
          ? "bg-red-500 text-white animate-pulse shadow-md shadow-red-200"
          : "bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-500"
      }`}
      title={isListening ? "To'xtatish" : "Ovozli qidiruv"}
    >
      <i className={`fa-solid ${isListening ? "fa-stop" : "fa-microphone"} text-xs`} />
    </button>
  );
};
