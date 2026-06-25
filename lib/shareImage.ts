import { getFontEmbedCSS, toBlob } from "html-to-image";

export const SHARE_IMAGE_FILENAME = "gas-in-this-economy-results.png";

export interface ShareImageResult {
  blob: Blob;
  imageCopied: boolean;
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
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

export async function captureElementAsPng(element: HTMLElement): Promise<Blob> {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const saved = saveCaptureStyles(element);
  applyCaptureStyles(element);
  await waitForPaint();

  try {
    let fontEmbedCSS: string | undefined;
    try {
      fontEmbedCSS = await getFontEmbedCSS(element);
    } catch {
      fontEmbedCSS = undefined;
    }

    const blob = await toBlob(element, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#fffbeb",
      ...(fontEmbedCSS ? { fontEmbedCSS } : {}),
    });

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
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
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
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function prepareShareImage(
  element: HTMLElement
): Promise<ShareImageResult> {
  const blob = await captureElementAsPng(element);
  downloadBlob(blob, SHARE_IMAGE_FILENAME);
  const imageCopied = await copyImageToClipboard(blob);
  return { blob, imageCopied };
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
