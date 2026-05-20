/** Character sheet palette — hex/rgb only (safe for canvas export). */
export const sheetTheme = {
  canvas: "#0a0a12",
  elevated: "#12121f",
  panel: "#1a1a2e",
  panelLight: "#252542",
  border: "rgba(147, 130, 255, 0.25)",
  borderStrong: "rgba(167, 139, 250, 0.45)",
  text: "#f8fafc",
  textMuted: "#c4b5fd",
  textDim: "#94a3b8",
  accent: "#a78bfa",
  accentBlue: "#60a5fa",
  accentMuted: "rgba(96, 165, 250, 0.12)",
  purpleGlow: "rgba(139, 92, 246, 0.35)",
  blueGlow: "rgba(59, 130, 246, 0.25)",
  success: "#34d399",
  successBg: "rgba(52, 211, 153, 0.15)",
  progress: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #60a5fa 100%)",
  progressTrack: "rgba(255, 255, 255, 0.08)",
  gradientBg: "linear-gradient(145deg, #0f0f1a 0%, #1e1b4b 45%, #0f172a 100%)",
} as const;

export const EXPORT_WIDTH = 1200;
export const EXPORT_HEIGHT = 1040;
