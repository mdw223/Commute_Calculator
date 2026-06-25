/** Inline palette for share cards — html-to-image clones reliably with hex values. */
export const SHARE_CARD = {
  newsprint: "#fffbeb",
  ink: "#1a1a1a",
  headline: "#dc2626",
  cta: "#ccff00",
  surface: "#ffffff",
  muted: "#525252",
  meh: "#fde047",
  fontSans: "var(--font-space-grotesk, Space Grotesk), system-ui, sans-serif",
  fontDisplay: "var(--font-libre-baskerville, Libre Baskerville), Georgia, serif",
  fontMono: "var(--font-jetbrains-mono, JetBrains Mono), ui-monospace, monospace",
  shadowBrutal: "4px 4px 0 0 #1a1a1a",
  shadowBrutalSm: "2px 2px 0 0 #1a1a1a",
} as const;

export function moodColors(mood: "good" | "meh" | "bad") {
  switch (mood) {
    case "good":
      return { background: SHARE_CARD.cta, color: SHARE_CARD.ink };
    case "bad":
      return { background: SHARE_CARD.headline, color: SHARE_CARD.newsprint };
    default:
      return { background: SHARE_CARD.meh, color: SHARE_CARD.ink };
  }
}
