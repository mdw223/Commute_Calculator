import {
  appleMapsSearchUrl,
  googleMapsSearchUrl,
} from "@/lib/externalMaps";

interface ExternalMapsFallbackProps {
  query: string;
}

export default function ExternalMapsFallback({ query }: ExternalMapsFallbackProps) {
  return (
    <div className="px-4 py-3 space-y-3 border-b border-ink/10">
      <p className="text-sm font-medium text-ink">
        No places found in our map data.
      </p>
      <p className="text-sm text-muted border-l-4 border-headline pl-3">
        Try Google or Apple Maps, copy the address, then paste it into the
        search box above and pick from suggestions.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={googleMapsSearchUrl(query)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 border-3 border-ink bg-surface px-3 py-2 font-mono text-xs uppercase text-center hover:bg-cta/30 transition-colors"
        >
          Open in Google Maps
        </a>
        <a
          href={appleMapsSearchUrl(query)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 border-3 border-ink bg-surface px-3 py-2 font-mono text-xs uppercase text-center hover:bg-cta/30 transition-colors"
        >
          Open in Apple Maps
        </a>
      </div>
    </div>
  );
}
