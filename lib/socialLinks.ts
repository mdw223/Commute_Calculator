export type SocialPlatform = "twitter" | "facebook" | "linkedin";

export function buildTwitterShareUrl(text: string, url: string): string {
  const params = new URLSearchParams({ text: `${text}\n\n${url}` });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function buildFacebookShareUrl(url: string): string {
  const params = new URLSearchParams({ u: url });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function buildLinkedInShareUrl(url: string): string {
  const params = new URLSearchParams({ url });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

export function getSocialShareUrl(
  platform: SocialPlatform,
  text: string,
  pageUrl: string
): string {
  switch (platform) {
    case "twitter":
      return buildTwitterShareUrl(text, pageUrl);
    case "facebook":
      return buildFacebookShareUrl(pageUrl);
    case "linkedin":
      return buildLinkedInShareUrl(pageUrl);
  }
}

export function openSocialShare(
  platform: SocialPlatform,
  text: string,
  pageUrl: string
): void {
  const shareUrl = getSocialShareUrl(platform, text, pageUrl);
  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
}
