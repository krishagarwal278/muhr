"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiErrorMessage } from "@/lib/api/response";
import { vaultUploadFromApiJson } from "@/lib/api/vaultPayload";
import {
  extensionForAudioMime,
  isAllowedVaultAudioMime,
  mimeTypeFromFileName,
  normalizeAudioMimeType,
  preferredVoiceRecorderMimeType,
  VOICE_SAMPLE_UPLOAD_ACCEPT,
} from "@/lib/vault/audioMime";
import {
  formatDurationMs,
  getAudioDurationMs,
  MAX_VOICE_SAMPLE_MS,
  MIN_VOICE_SAMPLE_MS,
  validateVoiceSampleDurationMs,
  VOICE_SAMPLE_LENGTH_LABEL,
  voiceSampleLengthRangeCompact,
} from "@/lib/vault/audioDuration";
import { encryptFileWithVaultPassword } from "@/lib/vault/crypto";
import { VOICE_SAMPLE_SCRIPT, voiceScriptDurationMs } from "@/lib/vault/voiceScript";
import {
  classifyMicrophoneError,
  microphoneErrorMessage,
} from "@/lib/vault/microphoneAccess";
import { MicrophoneAccessPanel } from "@/components/vault/MicrophoneAccessPanel";
import { ScriptScrollToolbar } from "@/components/vault/ScriptScrollToolbar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Icon } from "@/components/ui/icon";
import { outlineButtonVariants, solidButtonVariants } from "@/components/ui/button-recipes";
import { cx } from "@/lib/cx";

type InputMode = "record" | "upload";
type Phase = "setup" | "recording" | "review" | "uploading" | "done";

const SCROLL_DURATION_MS = voiceScriptDurationMs(125);
async function queryMicrophonePermission(): Promise<PermissionState | "unsupported"> {
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state;
  } catch {
    return "unsupported";
  }
}

export function VoiceSampleRecorder({
  onRegisterBackGuard,
}: {
  /** When set, call returns true if navigation was intercepted (recording in progress). */
  onRegisterBackGuard?: (guard: (() => boolean) | null) => void;
}) {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>("record");
  const [phase, setPhase] = useState<Phase>("setup");
  const [vaultPassword, setVaultPassword] = useState("");
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [micPending, setMicPending] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [filePickError, setFilePickError] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMime, setRecordedMime] = useState("audio/webm");
  const [sampleSource, setSampleSource] = useState<"record" | "upload">("record");
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [discardSampleDialogOpen, setDiscardSampleDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const programmaticScrollRef = useRef(false);
  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const discardOnStopRef = useRef(false);
  const elapsedBeforePauseRef = useRef(0);
  const timerStartedAtRef = useRef(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMicReady(false);
  }, []);

  const scrollScriptToTop = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    programmaticScrollRef.current = true;
    container.scrollTop = 0;
    requestAnimationFrame(() => {
      programmaticScrollRef.current = false;
    });
  }, []);

  const applyAutoScrollForElapsed = useCallback(
    (ms: number) => {
      const container = scrollRef.current;
      const content = scriptRef.current;
      if (!container || !content) return;
      const maxScroll = Math.max(0, content.scrollHeight - container.clientHeight);
      const progress = Math.min(1, ms / SCROLL_DURATION_MS);
      programmaticScrollRef.current = true;
      container.scrollTop = progress * maxScroll;
      requestAnimationFrame(() => {
        programmaticScrollRef.current = false;
      });
    },
    []
  );

  const handleScriptScroll = useCallback(() => {
    if (programmaticScrollRef.current || phase !== "recording" || autoScrollPaused) return;
    setAutoScrollPaused(true);
  }, [autoScrollPaused, phase]);

  const requestMic = useCallback(async (): Promise<boolean> => {
    setMicError(null);
    setMicPending(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicError("Microphone recording is not supported in this browser.");
        return false;
      }
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setMicReady(true);
      setMicError(null);
      return true;
    } catch (e) {
      setMicError(microphoneErrorMessage(classifyMicrophoneError(e)));
      return false;
    } finally {
      setMicPending(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (inputMode !== "record") {
      stopStream();
      return;
    }

    let cancelled = false;
    let status: PermissionStatus | null = null;

    void (async () => {
      const state = await queryMicrophonePermission();
      if (cancelled) return;
      if (state === "granted") {
        await requestMic();
      }
    })();

    void navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        status = result;
        result.onchange = () => {
          if (result.state === "granted") void requestMic();
        };
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, [inputMode, requestMic, stopStream]);

  useEffect(() => {
    if (phase !== "recording" || autoScrollPaused) return;
    applyAutoScrollForElapsed(elapsedMs);
  }, [applyAutoScrollForElapsed, autoScrollPaused, elapsedMs, phase]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [stopStream]);

  const startRecording = useCallback(async () => {
    setUploadError("");
    if (!micReady || !streamRef.current) {
      const ok = await requestMic();
      if (!ok || !streamRef.current) return;
    }

    const mime = preferredVoiceRecorderMimeType();
    if (!mime) {
      setMicError(
        "Recording isn't supported in this browser. Switch to Upload your own and add an MP3 or M4A file."
      );
      return;
    }

    chunksRef.current = [];
    setElapsedMs(0);
    setSampleSource("record");

    const recorder = new MediaRecorder(streamRef.current, { mimeType: mime });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      if (discardOnStopRef.current) {
        discardOnStopRef.current = false;
        chunksRef.current = [];
        recorderRef.current = null;
        return;
      }
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime });
      const baseMime = (blob.type || mime).split(";")[0]?.trim() || "audio/mp4";
      setRecordedMime(baseMime);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setRecordedBlob(blob);
      setPhase("review");
      recorderRef.current = null;
    };

    setAutoScrollPaused(false);
    setPhase("recording");
    scrollScriptToTop();
    requestAnimationFrame(() => {
      scrollScriptToTop();
      applyAutoScrollForElapsed(0);
    });

    recorder.start(250);

    timerStartedAtRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - timerStartedAtRef.current);
    }, 200);
  }, [applyAutoScrollForElapsed, micReady, requestMic, scrollScriptToTop]);

  const clearRecordingTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (phase !== "recording") return;
    clearRecordingTimer();
    elapsedBeforePauseRef.current = elapsedMs;
    const rec = recorderRef.current;
    if (rec?.state === "recording" && typeof rec.pause === "function") {
      try {
        rec.pause();
      } catch {
        // continue — timer and scroll are still paused
      }
    }
    setAutoScrollPaused(true);
  }, [clearRecordingTimer, elapsedMs, phase]);

  const resumeRecording = useCallback(() => {
    if (phase !== "recording") return;
    const rec = recorderRef.current;
    if (rec?.state === "paused" && typeof rec.resume === "function") {
      try {
        rec.resume();
      } catch {
        // continue
      }
    }
    timerStartedAtRef.current = Date.now() - elapsedBeforePauseRef.current;
    clearRecordingTimer();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - timerStartedAtRef.current);
    }, 200);
    setAutoScrollPaused(false);
  }, [clearRecordingTimer, phase]);

  const cancelActiveRecording = useCallback(() => {
    discardOnStopRef.current = true;
    clearRecordingTimer();
    chunksRef.current = [];
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        discardOnStopRef.current = false;
        recorderRef.current = null;
      }
    } else {
      discardOnStopRef.current = false;
      recorderRef.current = null;
    }
    setElapsedMs(0);
    setAutoScrollPaused(false);
    scrollScriptToTop();
    setPhase("setup");
  }, [clearRecordingTimer, scrollScriptToTop]);

  const tryLeaveWhileRecording = useCallback(() => {
    if (phase !== "recording") return false;
    if (leaveDialogOpen) return true;
    pauseRecording();
    setLeaveDialogOpen(true);
    return true;
  }, [leaveDialogOpen, pauseRecording, phase]);

  useEffect(() => {
    onRegisterBackGuard?.(tryLeaveWhileRecording);
    return () => onRegisterBackGuard?.(null);
  }, [onRegisterBackGuard, tryLeaveWhileRecording]);

  useEffect(() => {
    if (phase !== "recording") return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  useEffect(() => {
    if (phase !== "recording") return;
    const url = window.location.href;
    window.history.pushState({ voiceRecordingGuard: true }, "", url);
    const onPopState = () => {
      window.history.pushState({ voiceRecordingGuard: true }, "", url);
      tryLeaveWhileRecording();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [phase, tryLeaveWhileRecording]);

  const stopRecording = useCallback(() => {
    clearRecordingTimer();
    setElapsedMs((ms) => Math.min(ms, MAX_VOICE_SAMPLE_MS));
    const rec = recorderRef.current;
    if (rec?.state === "recording" || rec?.state === "paused") {
      rec.stop();
    }
  }, [clearRecordingTimer]);

  useEffect(() => {
    if (phase !== "recording" || elapsedMs < MAX_VOICE_SAMPLE_MS) return;
    stopRecording();
  }, [elapsedMs, phase, stopRecording]);

  const discardSample = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setRecordedBlob(null);
    setUploadFileName(null);
    setElapsedMs(0);
    setFilePickError("");
    setUploadError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    scrollScriptToTop();
    setAutoScrollPaused(false);
    setPhase("setup");
  }, [scrollScriptToTop]);

  const handleRecordAgain = useCallback(() => {
    discardSample();
    if (inputMode === "record") {
      void requestMic();
    } else {
      fileInputRef.current?.click();
    }
  }, [discardSample, inputMode, requestMic]);

  const confirmDiscardSample = useCallback(() => {
    setDiscardSampleDialogOpen(false);
    discardSample();
    if (inputMode === "record") void requestMic();
  }, [discardSample, inputMode, requestMic]);

  const handleFilePick = useCallback(async (file: File) => {
    setFilePickError("");
    setUploadError("");
    const mime =
      normalizeAudioMimeType(file.type) || mimeTypeFromFileName(file.name);
    if (!mime || !isAllowedVaultAudioMime(mime)) {
      setFilePickError("Use an MP3 or M4A file.");
      return;
    }

    let durationMs: number;
    try {
      durationMs = await getAudioDurationMs(file);
    } catch {
      setFilePickError("We couldn't read this file. Try a different MP3 or M4A.");
      return;
    }

    const durationError = validateVoiceSampleDurationMs(durationMs);
    if (durationError) {
      setFilePickError(durationError);
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setRecordedBlob(file);
    setRecordedMime(mime);
    setUploadFileName(file.name);
    setElapsedMs(durationMs);
    setSampleSource("upload");
    setPhase("review");
  }, []);

  const uploadSample = useCallback(async () => {
    if (!recordedBlob) return;
    const pwd = vaultPassword.trim();
    if (pwd.length < 8) {
      setUploadError("Enter your Vault password (at least 8 characters) before saving.");
      return;
    }

    const durationError = validateVoiceSampleDurationMs(elapsedMs);
    if (durationError) {
      setUploadError(durationError);
      return;
    }

    setUploadError("");
    setPhase("uploading");

    const ext = extensionForAudioMime(recordedMime);
    const file =
      recordedBlob instanceof File
        ? recordedBlob
        : new File([recordedBlob], uploadFileName ?? `voice-sample-${Date.now()}.${ext}`, {
            type: recordedMime,
          });

    try {
      const encrypted = await encryptFileWithVaultPassword(file, pwd);
      const formData = new FormData();
      formData.append("file", encrypted.encryptedFile);
      formData.append("asset_type", "voice_sample");
      formData.append("encryption_version", String(encrypted.meta.encryption_version));
      formData.append("encryption_alg", encrypted.meta.encryption_alg);
      formData.append("encryption_iv", encrypted.meta.encryption_iv_b64);
      formData.append("wrapped_data_key", encrypted.meta.wrapped_data_key_b64);
      formData.append("wrapped_key_iv", encrypted.meta.wrapped_key_iv_b64);
      formData.append("wrapped_key_salt", encrypted.meta.wrapped_key_salt_b64);
      formData.append("original_file_name", encrypted.meta.original_file_name);
      formData.append("original_mime_type", encrypted.meta.original_mime_type);

      const res = await fetch("/api/vault/upload", { method: "POST", body: formData });
      const json = await res.json().catch(() => null);
      const upload = vaultUploadFromApiJson(json);

      if (res.ok && upload?.asset?.id) {
        setPhase("done");
        stopStream();
        return;
      }
      const errMsg = apiErrorMessage(json, upload?.message ?? "Upload failed");
      console.error("[voice sample upload]", res.status, errMsg, json);
      setUploadError(errMsg);
      setPhase("review");
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
      setPhase("review");
    }
  }, [elapsedMs, recordedBlob, recordedMime, stopStream, uploadFileName, vaultPassword]);

  const switchMode = (mode: InputMode) => {
    if (phase === "recording" || phase === "uploading") return;
    if (phase === "review") discardSample();
    setInputMode(mode);
    setMicError("");
    setFilePickError("");
  };

  const belowMinWhileRecording =
    phase === "recording" && elapsedMs > 0 && elapsedMs < MIN_VOICE_SAMPLE_MS;
  const durationInvalid = phase === "review" && validateVoiceSampleDurationMs(elapsedMs) != null;
  const passwordOk = vaultPassword.trim().length >= 8;
  const showScript = inputMode === "record" && phase !== "done";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 rounded-xl border border-black/10 bg-white/80 p-1">
        <button
          type="button"
          onClick={() => switchMode("record")}
          disabled={phase === "recording" || phase === "uploading"}
          className={cx(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            inputMode === "record" ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-black/5"
          )}
        >
          Record with script
        </button>
        <button
          type="button"
          onClick={() => switchMode("upload")}
          disabled={phase === "recording" || phase === "uploading"}
          className={cx(
            "rounded-lg px-4 py-2 text-sm font-medium transition",
            inputMode === "upload" ? "bg-neutral-950 text-white" : "text-neutral-700 hover:bg-black/5"
          )}
        >
          Upload your own
        </button>
      </div>

      {showScript && (
        <div
          className={cx(
            "relative overflow-hidden rounded-xl border bg-neutral-950 text-neutral-100",
            phase === "recording" ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : "border-black/15"
          )}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-neutral-950 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-neutral-950 to-transparent" />
          <div
            ref={scrollRef}
            onScroll={handleScriptScroll}
            className={cx(
              "max-h-[min(52vh,420px)] overflow-y-auto scroll-auto px-6 py-10 text-lg leading-relaxed md:text-xl md:leading-loose",
              phase === "recording" && "pb-16"
            )}
          >
            <div ref={scriptRef}>
              <p className="whitespace-pre-wrap">{VOICE_SAMPLE_SCRIPT}</p>
            </div>
          </div>
          {phase === "recording" && (
            <ScriptScrollToolbar
              autoScrollPaused={autoScrollPaused}
              onToggleAutoscroll={() => setAutoScrollPaused((p) => !p)}
              onScrollToTop={() => {
                setAutoScrollPaused(true);
                scrollScriptToTop();
              }}
              showStop
              onStop={stopRecording}
              recordingLabel={formatDurationMs(elapsedMs)}
            />
          )}
        </div>
      )}

      {phase === "setup" && inputMode === "record" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Read the script at a natural pace as it scrolls. Audio stays on your device until you save — then
            it&apos;s encrypted in your Vault ({VOICE_SAMPLE_LENGTH_LABEL}).
          </p>
          <VaultPasswordField value={vaultPassword} onChange={setVaultPassword} />
          <MicrophoneAccessPanel
            ready={micReady}
            pending={micPending}
            error={micError}
            onRequestAccess={() => void requestMic()}
          />
          <button
            type="button"
            onClick={() => void startRecording()}
            disabled={!passwordOk || micPending}
            className={solidButtonVariants()}
          >
            {micPending ? "Waiting for microphone…" : "Start recording"}
          </button>
        </div>
      )}

      {phase === "setup" && inputMode === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Upload a clip you&apos;ve already recorded ({VOICE_SAMPLE_LENGTH_LABEL}, MP3 or M4A). We encrypt
            it before it leaves your device.
          </p>
          <VaultPasswordField value={vaultPassword} onChange={setVaultPassword} />
          <div className="rounded-xl border-2 border-dashed border-black/15 bg-white/60 p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={VOICE_SAMPLE_UPLOAD_ACCEPT}
              className="hidden"
              id="voice-file-upload"
              disabled={!passwordOk}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFilePick(file);
              }}
            />
            <label
              htmlFor="voice-file-upload"
              className={cx(!passwordOk ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.03]">
                <svg className="h-6 w-6 text-neutral-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-sm text-neutral-800">
                <span className="font-medium text-neutral-950 underline">Choose audio file</span>
              </p>
              <p className="mt-1 text-xs text-neutral-600">{VOICE_SAMPLE_LENGTH_LABEL}</p>
            </label>
          </div>
          {filePickError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{filePickError}</p>
          ) : null}
        </div>
      )}

      {phase === "recording" && elapsedMs > 0 ? (
        <p className="text-center text-sm text-neutral-600">
          {belowMinWhileRecording ? (
            <>
              About {formatDurationMs(Math.max(0, MIN_VOICE_SAMPLE_MS - elapsedMs))} until the{" "}
              {formatDurationMs(MIN_VOICE_SAMPLE_MS)} minimum · Stop anytime to preview · Must be{" "}
              {voiceSampleLengthRangeCompact()} to save
            </>
          ) : elapsedMs < MAX_VOICE_SAMPLE_MS ? (
            <>
              Auto-stops at {formatDurationMs(MAX_VOICE_SAMPLE_MS)} ·{" "}
              {formatDurationMs(MAX_VOICE_SAMPLE_MS - elapsedMs)} left
            </>
          ) : (
            <>Stopping at {formatDurationMs(MAX_VOICE_SAMPLE_MS)}…</>
          )}
        </p>
      ) : null}

      {phase === "review" && previewUrl && (
        <div className="space-y-4">
          {durationInvalid && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {validateVoiceSampleDurationMs(elapsedMs)} Re-record or upload a clip that is{" "}
              {VOICE_SAMPLE_LENGTH_LABEL}.
            </p>
          )}
          <p className="text-sm text-neutral-600">
            Length: {formatDurationMs(elapsedMs)}
            {uploadFileName ? ` · ${uploadFileName}` : null}
          </p>
          <audio src={previewUrl} controls className="w-full" />
          {uploadError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">{uploadError}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void uploadSample()}
              disabled={durationInvalid || !passwordOk}
              className={solidButtonVariants()}
            >
              Save to Vault
            </button>
            <button
              type="button"
              title={sampleSource === "upload" ? "Choose a different file" : "Record again"}
              aria-label={sampleSource === "upload" ? "Choose a different file" : "Record again"}
              onClick={handleRecordAgain}
              className={cx(outlineButtonVariants(), "h-10 w-10 shrink-0 p-0")}
            >
              <Icon name="refresh" size="md" />
            </button>
            <button
              type="button"
              title="Remove recording"
              aria-label="Remove recording"
              onClick={() => setDiscardSampleDialogOpen(true)}
              className={cx(
                outlineButtonVariants(),
                "h-10 w-10 shrink-0 p-0 text-neutral-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              )}
            >
              <Icon name="trash" size="md" />
            </button>
          </div>
        </div>
      )}

      {phase === "uploading" && (
        <div className="flex items-center gap-3 text-sm text-neutral-700">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
          Saving to your Vault…
        </div>
      )}

      <ConfirmDialog
        open={discardSampleDialogOpen}
        onClose={() => setDiscardSampleDialogOpen(false)}
        title="Remove this recording?"
        description="Your current clip will be deleted. You can record or upload a new one."
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={confirmDiscardSample}
      />

      <ConfirmDialog
        open={leaveDialogOpen}
        onClose={() => {
          setLeaveDialogOpen(false);
          resumeRecording();
        }}
        title="Leave without saving?"
        description="Your in-progress recording will be discarded and you'll return to the Vault."
        confirmLabel="Leave"
        cancelLabel="Keep recording"
        destructive
        onConfirm={() => {
          setLeaveDialogOpen(false);
          cancelActiveRecording();
          router.push("/vault");
        }}
      />

      {phase === "done" && (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-6 text-center">
          <p className="font-medium text-emerald-950">Saved to your Vault</p>
          <p className="text-sm text-emerald-900/80">
            Encrypted and ready — licensees only get access when you approve a deal.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/vault" className={solidButtonVariants()}>
              Back to Vault
            </Link>
            <button
              type="button"
              onClick={() => {
                discardSample();
                if (inputMode === "record") void requestMic();
              }}
              className={outlineButtonVariants()}
            >
              Add another
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function VaultPasswordField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4">
      <label className="block text-sm font-semibold text-neutral-800">Vault password</label>
      <p className="mt-1 text-xs leading-relaxed text-neutral-700">
        Used once to encrypt this sample before upload. Store it safely — Muhr can&apos;t reset lost passwords.
      </p>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        className="mt-3 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-500/70 focus:border-black/15 focus:outline-none"
      />
    </div>
  );
}
