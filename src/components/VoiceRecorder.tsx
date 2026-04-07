"use client";
import { useState, useCallback, useRef, useEffect } from "react";

type SR = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type SREvent = { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; [j: number]: { transcript: string } } } };
type SRErrorEvent = { error: string };
type SRCtor = new () => SR;

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  maxRecords?: number;
}

export default function VoiceRecorder({ onTranscript, disabled = false, maxRecords = 2 }: Props) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [recordCount, setRecordCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);
  const [textMode, setTextMode] = useState(false);
  const [textInput, setTextInput] = useState("");
  const recRef = useRef<SR | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    if (!("SpeechRecognition" in w) && !("webkitSpeechRecognition" in w)) setSupported(false);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startRecording = useCallback(() => {
    if (disabled || state === "recording") return;
    const w = window as unknown as Record<string, unknown>;
    const SRApi = (w["SpeechRecognition"] as SRCtor | undefined) || (w["webkitSpeechRecognition"] as SRCtor | undefined);
    if (!SRApi) { setSupported(false); setTextMode(true); return; }

    const rec = new SRApi();
    rec.lang = "en-IN"; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = "";

    rec.onstart = () => {
      setState("recording"); setTranscript(""); setInterim(""); setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    };
    rec.onresult = (ev: SREvent) => {
      let intr = "", fin = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) fin += r[0].transcript + " "; else intr += r[0].transcript;
      }
      if (fin) finalText += fin;
      setInterim(intr);
      if (finalText) setTranscript(finalText.trim());
    };
    rec.onerror = (ev: SRErrorEvent) => {
      console.error("SR error:", ev.error); clearTimer(); setState("done");
      if (finalText) { setTranscript(finalText.trim()); onTranscript(finalText.trim()); }
    };
    rec.onend = () => {
      clearTimer(); setState("done");
      const t = finalText.trim();
      if (t) { setTranscript(t); onTranscript(t); }
    };
    recRef.current = rec;
    setRecordCount((c) => c + 1);
    rec.start();
  }, [disabled, state, clearTimer, onTranscript]);

  const stopRecording = useCallback(() => { recRef.current?.stop(); clearTimer(); }, [clearTimer]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim()) return;
    setTranscript(textInput.trim()); onTranscript(textInput.trim()); setState("done");
  }, [textInput, onTranscript]);

  const canReRecord = recordCount < maxRecords && state === "done";
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const elapsedColor = elapsed < 30 ? "text-amber-400" : elapsed <= 75 ? "text-green-400" : "text-red-400";

  if (!supported || textMode) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Text mode</span>
          {supported && (
            <button onClick={() => setTextMode(false)} className="text-xs text-blue-600 font-semibold underline">
              Switch to voice
            </button>
          )}
        </div>
        <textarea
          value={textInput} onChange={(e) => setTextInput(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          placeholder="Type your answer here…" disabled={disabled} rows={5}
          className="w-full border-2 border-slate-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors font-medium"
        />
        <button
          onClick={handleTextSubmit} disabled={disabled || !textInput.trim()}
          className="px-6 py-3 gradient-navy text-white rounded-xl text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-all"
        >
          Submit Answer →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setTextMode(true)} className="text-xs text-slate-400 underline hover:text-slate-600">
          Use text input instead
        </button>
      </div>

      {/* Big mic button */}
      <div className="flex flex-col items-center gap-5">
        {state === "idle" || canReRecord ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={startRecording} disabled={disabled}
              className="w-24 h-24 rounded-full gradient-orange text-white flex flex-col items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-40 active:scale-95"
            >
              <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                <path d="M5.5 10a1 1 0 0 1 2 0 4.5 4.5 0 0 0 9 0 1 1 0 1 1 2 0 6.5 6.5 0 0 1-6 6.47V19h2a1 1 0 1 1 0 2h-6a1 1 0 1 1 0-2h2v-2.53A6.5 6.5 0 0 1 5.5 10z"/>
              </svg>
              <span className="text-xs font-bold mt-1">{state === "done" ? "Re-record" : "Tap to record"}</span>
            </button>
            {state === "idle" && (
              <p className="text-xs text-slate-400 font-medium text-center">
                Press the button and speak your answer
              </p>
            )}
            {state === "done" && canReRecord && (
              <p className="text-xs text-amber-600 font-semibold text-center">
                {maxRecords - recordCount} re-record remaining
              </p>
            )}
          </div>
        ) : state === "recording" ? (
          <button
            onClick={stopRecording}
            className="w-24 h-24 rounded-full bg-red-600 text-white flex flex-col items-center justify-center shadow-xl animate-pulse-ring hover:bg-red-700 transition-all"
          >
            <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
            <span className="text-xs font-bold mt-1">Stop</span>
          </button>
        ) : null}

        {/* Timer */}
        {state === "recording" && (
          <div className="flex items-center gap-3 bg-slate-900 rounded-full px-5 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"/>
            <span className={`font-mono font-black text-lg ${elapsedColor}`}>{fmtTime(elapsed)}</span>
            <span className="text-slate-400 text-xs font-medium">Target 30–75 s</span>
          </div>
        )}

        {state === "done" && recordCount >= maxRecords && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 font-semibold text-center">
            Re-record limit reached — please submit your answer below
          </div>
        )}
      </div>

      {/* Transcript */}
      {(state === "recording" || state === "done") && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 min-h-[90px]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {state === "recording" ? "Live transcript" : "Edit your answer"}
            </span>
            {state === "recording" && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            )}
          </div>
          {state === "recording" ? (
            <p className="text-sm text-slate-800 leading-relaxed font-medium">
              {transcript}
              {interim && <span className="text-slate-400 italic"> {interim}</span>}
              {!transcript && !interim && (
                <span className="text-slate-300 italic">Listening for your voice…</span>
              )}
            </p>
          ) : (
            <textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); onTranscript(e.target.value); }}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              rows={5}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 leading-relaxed font-medium resize-y focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Your transcript appears here. You can edit it before submitting."
            />
          )}
        </div>
      )}
    </div>
  );
}
