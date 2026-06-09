"use client";

import QRCode from "react-qr-code";

interface MuhrPassQrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Scannable QR for a Muhr pass URL — rendered locally (no third-party image API). */
export function MuhrPassQrCode({ value, size = 76, className }: MuhrPassQrCodeProps) {
  if (!value.trim()) return null;

  const qrSize = Math.max(size - 12, 48);

  return (
    <div
      className={className}
      style={{ background: "#ffffff", lineHeight: 0, padding: 6, width: size, height: size }}
      aria-hidden
    >
      <QRCode value={value} size={qrSize} bgColor="#ffffff" fgColor="#000000" />
    </div>
  );
}
