import type { CharacterSheetGenerateResponse } from "./types";
import { EXPORT_HEIGHT, EXPORT_WIDTH, sheetTheme as t } from "./theme";

const STAT_LABELS: { key: keyof CharacterSheetGenerateResponse["stats"]; label: string }[] = [
  { key: "height", label: "Height" },
  { key: "weight", label: "Weight" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hips", label: "Hips" },
  { key: "shoeSize", label: "Shoe" },
];

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image`));
    img.src = url;
  });
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const tr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (ir > tr) {
    sw = sh * tr;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = sw / tr;
    sy = (img.naturalHeight - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Fixed-size character sheet render — preserves photo aspect ratios. */
export async function renderCharacterSheetToCanvas(
  data: CharacterSheetGenerateResponse,
  aiImageUrl?: string
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const grad = ctx.createLinearGradient(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  grad.addColorStop(0, "#0f0f1a");
  grad.addColorStop(0.45, "#1e1b4b");
  grad.addColorStop(1, "#0f172a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  const pad = 40;
  const innerW = EXPORT_WIDTH - pad * 2;

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, pad, pad, innerW, EXPORT_HEIGHT - pad * 2, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(167, 139, 250, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  let y = pad + 28;
  ctx.fillStyle = t.textMuted;
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillText("CHARACTER SHEET", pad + 24, y);
  y += 28;
  ctx.fillStyle = t.text;
  ctx.font = "bold 32px system-ui, sans-serif";
  ctx.fillText(data.displayName, pad + 24, y);
  y += 22;
  ctx.fillStyle = t.textDim;
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("Brand licensing reference · Muhr Vault", pad + 24, y);

  const badgeX = EXPORT_WIDTH - pad - 100;
  roundRect(ctx, badgeX, pad + 20, 88, 28, 8);
  ctx.fillStyle = "rgba(52, 211, 153, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "rgba(52, 211, 153, 0.5)";
  ctx.stroke();
  ctx.fillStyle = t.success;
  ctx.font = "bold 11px system-ui, sans-serif";
  ctx.fillText("READY", badgeX + 22, pad + 38);

  const contentTop = pad + 110;
  const statsW = 200;
  const photosX = pad + 24 + statsW + 24;
  const photosW = EXPORT_WIDTH - photosX - pad - 24;

  ctx.fillStyle = t.textMuted;
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillText("BASE STATS", pad + 24, contentTop);

  let statY = contentTop + 18;
  for (const { key, label } of STAT_LABELS) {
    roundRect(ctx, pad + 24, statY, statsW, 36, 8);
    ctx.fillStyle = t.panel;
    ctx.fill();
    ctx.strokeStyle = "rgba(147, 130, 255, 0.2)";
    ctx.stroke();
    ctx.fillStyle = t.textMuted;
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(label, pad + 36, statY + 22);
    ctx.fillStyle = t.text;
    ctx.font = "600 12px ui-monospace, monospace";
    const val = data.stats[key];
    const tw = ctx.measureText(val).width;
    ctx.fillText(val, pad + 24 + statsW - tw - 12, statY + 22);
    statY += 42;
  }

  const slots = [...data.photos.slice(0, 7)];
  while (slots.length < 7) slots.push({ id: `e-${slots.length}`, signedUrl: "" });

  if (aiImageUrl) {
    const img = await loadImage(aiImageUrl);
    const boxH = EXPORT_HEIGHT - contentTop - 50;
    roundRect(ctx, photosX, contentTop, photosW, boxH, 10);
    ctx.save();
    ctx.clip();
    drawImageCover(ctx, img, photosX, contentTop, photosW, boxH);
    ctx.restore();
    ctx.strokeStyle = "rgba(147, 130, 255, 0.3)";
    ctx.stroke();
  } else {
    ctx.fillStyle = t.textMuted;
    ctx.font = "bold 10px system-ui, sans-serif";
    ctx.fillText("REFERENCE ANGLES", photosX, contentTop);

    const gap = 10;
    const cols = 4;
    const cellW = Math.floor((photosW - gap * (cols - 1)) / cols);
    const row1H = cellW;
    const row2H = Math.floor(cellW * (4 / 3));
    const gridTop = contentTop + 16;

    const images = await Promise.all(
      slots.map(async (s, i) => {
        if (!s.signedUrl) return null;
        try {
          return { i, img: await loadImage(s.signedUrl) };
        } catch {
          return null;
        }
      })
    );

    for (let col = 0; col < 4; col++) {
      const x = photosX + col * (cellW + gap);
      const y1 = gridTop;
      roundRect(ctx, x, y1, cellW, row1H, 8);
      ctx.fillStyle = t.panel;
      ctx.fill();
      const loaded = images.find((r) => r?.i === col);
      if (loaded) {
        ctx.save();
        roundRect(ctx, x, y1, cellW, row1H, 8);
        ctx.clip();
        drawImageCover(ctx, loaded.img, x, y1, cellW, row1H);
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(147, 130, 255, 0.25)";
      ctx.stroke();
    }

    const row2Count = 3;
    const row2TotalW = row2Count * cellW + (row2Count - 1) * gap;
    const row2StartX = photosX + (photosW - row2TotalW) / 2;
    const y2 = gridTop + row1H + gap;
    for (let j = 0; j < row2Count; j++) {
      const idx = 4 + j;
      const x = row2StartX + j * (cellW + gap);
      roundRect(ctx, x, y2, cellW, row2H, 8);
      ctx.fillStyle = t.panel;
      ctx.fill();
      const loaded = images.find((r) => r?.i === idx);
      if (loaded) {
        ctx.save();
        roundRect(ctx, x, y2, cellW, row2H, 8);
        ctx.clip();
        drawImageCover(ctx, loaded.img, x, y2, cellW, row2H);
        ctx.restore();
      }
      ctx.strokeStyle = "rgba(147, 130, 255, 0.25)";
      ctx.stroke();
    }
  }

  ctx.fillStyle = t.textDim;
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Encrypted in your Vault · Share exported PNG with brands",
    EXPORT_WIDTH / 2,
    EXPORT_HEIGHT - pad - 12
  );
  ctx.textAlign = "left";

  return canvas;
}

export async function renderCharacterSheetToBlob(
  data: CharacterSheetGenerateResponse,
  aiImageUrl?: string,
  preferJpeg = true
): Promise<Blob> {
  const canvas = await renderCharacterSheetToCanvas(data, aiImageUrl);
  const mime = preferJpeg ? "image/jpeg" : "image/png";
  const quality = preferJpeg ? 0.92 : undefined;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed"))),
      mime,
      quality
    );
  });
}
