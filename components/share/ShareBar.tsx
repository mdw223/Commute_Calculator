"use client";

import { useCallback, useRef, useState } from "react";
import CommuteShareCard from "@/components/share/CommuteShareCard";
import SalaryShareCard from "@/components/share/SalaryShareCard";
import {
  canNativeShareFile,
  copyImageToClipboard,
  copyTextToClipboard,
  nativeShareWithFile,
  prepareShareImage,
} from "@/lib/shareImage";
import {
  buildCommuteShareText,
  buildSalaryShareText,
  getCommutePageUrl,
  getSalaryPageUrl,
} from "@/lib/shareText";
import { openSocialShare, type SocialPlatform } from "@/lib/socialLinks";
import type {
  CostBreakdown,
  CostSettings,
  SalaryCalculatorState,
  Stop,
  WorthItAnalysis,
} from "@/types";

type ShareBarProps =
  | {
      variant: "commute";
      stops: Stop[];
      breakdown: CostBreakdown;
      worthIt: WorthItAnalysis;
      settings: CostSettings;
    }
  | {
      variant: "salary";
      state: SalaryCalculatorState;
    };

type ShareStep = "idle" | "preparing" | "ready" | "error";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: "X / Twitter",
  facebook: "Facebook",
  linkedin: "LinkedIn",
};

export default function ShareBar(props: ShareBarProps) {
  const [step, setStep] = useState<ShareStep>("idle");
  const [includeAddresses, setIncludeAddresses] = useState(true);
  const [shareText, setShareText] = useState("");
  const [imageCopied, setImageCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const pageUrl =
    props.variant === "commute" ? getCommutePageUrl() : getSalaryPageUrl();

  const buildText = useCallback(() => {
    if (props.variant === "commute") {
      return buildCommuteShareText({
        breakdown: props.breakdown,
        worthIt: props.worthIt,
        settings: props.settings,
        stops: props.stops,
        includeAddresses,
      });
    }
    return buildSalaryShareText(props.state);
  }, [props, includeAddresses]);

  const handlePrepare = useCallback(async () => {
    if (!cardRef.current) return;

    setStep("preparing");
    setImageCopied(false);
    setTextCopied(false);
    const text = buildText();
    setShareText(text);

    // Allow React to paint the share card before capture.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    try {
      const blob = await prepareShareImage(cardRef.current);
      setImageBlob(blob);
      setNativeShareAvailable(canNativeShareFile(blob));
      setStep("ready");

      void copyImageToClipboard(blob).then(setImageCopied);
      void copyTextToClipboard(text).then(setTextCopied);
    } catch {
      setStep("error");
    }
  }, [buildText]);

  const handleCopyText = useCallback(async () => {
    const copied = await copyTextToClipboard(shareText);
    setTextCopied(copied);
  }, [shareText]);

  const handlePlatformShare = useCallback(
    (platform: SocialPlatform) => {
      openSocialShare(platform, shareText, pageUrl);
    },
    [shareText, pageUrl]
  );

  const handleNativeShare = useCallback(async () => {
    if (!imageBlob) return;
    const title =
      props.variant === "commute"
        ? "Gas In This Economy — Commute Verdict"
        : "Gas In This Economy — Salary Decoder";
    await nativeShareWithFile(imageBlob, shareText, title);
  }, [imageBlob, shareText, props.variant]);

  return (
    <>
      <div
        ref={cardRef}
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[10000px] w-[600px] -z-10"
      >
        {props.variant === "commute" ? (
          <CommuteShareCard
            breakdown={props.breakdown}
            worthIt={props.worthIt}
            settings={props.settings}
            stops={props.stops}
            includeAddresses={includeAddresses}
          />
        ) : (
          <SalaryShareCard state={props.state} />
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 border-t-4 border-ink bg-surface shadow-brutal pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {step === "idle" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {props.variant === "commute" && (
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={includeAddresses}
                    onChange={(e) => setIncludeAddresses(e.target.checked)}
                    className="w-4 h-4 accent-headline"
                  />
                  <span className="font-mono text-xs uppercase">
                    Include route addresses
                  </span>
                </label>
              )}
              <button
                type="button"
                onClick={handlePrepare}
                className="border-3 border-ink bg-cta px-4 py-2 font-mono text-xs uppercase tracking-wider shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all sm:ml-auto"
              >
                Share Results
              </button>
            </div>
          )}

          {step === "preparing" && (
            <p className="font-mono text-xs uppercase tracking-wider text-center">
              Preparing share image & text…
            </p>
          )}

          {step === "error" && (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-wider text-headline text-center">
                Couldn&apos;t create the share image — try again, or use Copy
                text below
              </p>
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <button
                  type="button"
                  onClick={handlePrepare}
                  className="border-3 border-ink bg-cta px-3 py-1.5 font-mono text-xs uppercase shadow-brutal-sm"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => setStep("idle")}
                  className="border-3 border-ink bg-surface px-3 py-1.5 font-mono text-xs uppercase text-muted"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {step === "ready" && (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-wider text-headline text-center">
                Image saved{textCopied ? " & text copied" : ""} — attach the
                image to your post
                {!imageCopied && " (use the downloaded PNG if paste didn’t work)"}
              </p>

              <div className="border-3 border-ink bg-newsprint p-3 max-h-24 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-sans text-ink">
                  {shareText}
                </pre>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="border-3 border-ink bg-surface px-3 py-1.5 font-mono text-xs uppercase hover:bg-cta/20 transition-colors"
                >
                  {textCopied ? "Copied!" : "Copy text"}
                </button>

                {(Object.keys(PLATFORM_LABELS) as SocialPlatform[]).map(
                  (platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handlePlatformShare(platform)}
                      className="border-3 border-ink bg-surface px-3 py-1.5 font-mono text-xs uppercase hover:bg-cta/20 transition-colors"
                    >
                      {PLATFORM_LABELS[platform]}
                    </button>
                  )
                )}

                {nativeShareAvailable && (
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="border-3 border-ink bg-cta px-3 py-1.5 font-mono text-xs uppercase shadow-brutal-sm hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
                  >
                    Share…
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setStep("idle")}
                  className="border-3 border-ink bg-surface px-3 py-1.5 font-mono text-xs uppercase text-muted hover:bg-headline hover:text-newsprint transition-colors sm:ml-auto"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
