import { getFontEmbedCSS, toBlob } from "html-to-image";

export const SHARE_IMAGE_FILENAME = "gas-in-this-economy-results.png";

const CAPTURE_TIMEOUT_MS = 15_000;
const FONT_EMBED_TIMEOUT_MS = 3_000;
const CLIPBOARD_TIMEOUT_MS = 2_000;

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

interface SavedCaptureStyles {
  position: string;
  left: string;
  top: string;
  opacity: string;
  visibility: string;
  zIndex: string;
  pointerEvents: string;
}

function saveCaptureStyles(element: HTMLElement): SavedCaptureStyles {
  return {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    opacity: element.style.opacity,
    visibility: element.style.visibility,
    zIndex: element.style.zIndex,
    pointerEvents: element.style.pointerEvents,
  };
}

function applyCaptureStyles(element: HTMLElement): void {
  Object.assign(element.style, {
    position: "fixed",
    left: "0px",
    top: "0px",
    opacity: "1",
    visibility: "visible",
    zIndex: "2147483646",
    pointerEvents: "none",
  });
}

function restoreCaptureStyles(
  element: HTMLElement,
  saved: SavedCaptureStyles
): void {
  Object.assign(element.style, saved);
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await new Promise<void>((resolve) =>
    setTimeout(resolve, isMobileDevice() ? 150 : 50)
  );
}

async function loadFontEmbedCSS(element: HTMLElement): Promise<string | undefined> {
  if (isMobileDevice()) {
    return undefined;
  }

  try {
    return await withTimeout(
      getFontEmbedCSS(element),
      FONT_EMBED_TIMEOUT_MS,
      "Font embed timed out"
    );
  } catch {
    return undefined;
  }
}

export async function captureElementAsPng(element: HTMLElement): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const saved = saveCaptureStyles(element);
  applyCaptureStyles(element);
  await waitForPaint();

  try {
    const fontEmbedCSS = await loadFontEmbedCSS(element);
    const pixelRatio = isMobileDevice()
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);

    const blob = await withTimeout(
      toBlob(element, {
        cacheBust: true,
        pixelRatio,
        backgroundColor: "#fffbeb",
        skipFonts: !fontEmbedCSS,
        ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
      }),
      CAPTURE_TIMEOUT_MS,
      "Screenshot capture timed out"
    );

    if (!blob) {
      throw new Error("Screenshot capture returned no image data");
    }

    return blob;
  } finally {
    restoreCaptureStyles(element, saved);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === "undefined"
  ) {
    return false;
  }

  try {
    await withTimeout(
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]),
      CLIPBOARD_TIMEOUT_MS,
      "Image clipboard timed out"
    );
    return true;
  } catch {
    return false;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await withTimeout(
      navigator.clipboard.writeText(text),
      CLIPBOARD_TIMEOUT_MS,
      "Text clipboard timed out"
    );
    return true;
  } catch {
    return false;
  }
}

export async function prepareShareImage(element: HTMLElement): Promise<Blob> {
  const blob = await captureElementAsPng(element);
  downloadBlob(blob, SHARE_IMAGE_FILENAME);
  return blob;
}

export function canNativeShareFile(blob: Blob): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) {
    return false;
  }

  const file = new File([blob], SHARE_IMAGE_FILENAME, { type: "image/png" });
  try {
    return navigator.canShare({ files: [file], text: "share" });
  } catch {
    return false;
  }
}

export async function nativeShareWithFile(
  blob: Blob,
  text: string,
  title: string
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  const file = new File([blob], SHARE_IMAGE_FILENAME, { type: "image/png" });

  try {
    if (navigator.canShare?.({ files: [file], text, title })) {
      await navigator.share({ files: [file], text, title });
      return true;
    }
    await navigator.share({ text, title, url: window.location.href });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }
    return false;
  }
}
