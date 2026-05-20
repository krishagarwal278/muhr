import html2canvas from "html2canvas";

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  ).then(() => undefined);
}

/** Capture off-screen to avoid Tailwind lab()/oklch() from ancestors breaking html2canvas. */
export async function captureElementToPngBlob(element: HTMLElement): Promise<Blob> {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.zIndex = "-1";
  clone.style.color = "#fafafa";
  clone.style.backgroundColor = "#0a0a0a";
  document.body.appendChild(clone);

  try {
    await waitForImages(clone);

    const canvas = await html2canvas(clone, {
      backgroundColor: "#0a0a0a",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Capture failed"))), "image/png");
    });
  } finally {
    document.body.removeChild(clone);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
