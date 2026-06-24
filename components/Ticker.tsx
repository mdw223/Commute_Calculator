const HEADLINES = [
  "BREAKING: Gas prices remain unhinged · Experts say 'just stay home bestie'",
  "LOCAL DRIVER questions life choices after $47 fill-up · 'In this economy??'",
  "STUDY: Your commute costs more than your streaming subscriptions combined",
  "ALERT: Maintenance defaults to $0.10/mile — toggle it off if you're in denial · The math ain't mathing",
  "OPINION: Round trips are a scam · Society refuses to comment",
];

export default function Ticker() {
  const segment = HEADLINES.join("   ★   ");
  const text = `${segment}   ★   ${segment}`;

  return (
    <div className="border-b-4 border-ink bg-headline text-newsprint overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="font-mono text-xs font-bold uppercase tracking-widest shrink-0 bg-ink text-cta px-2 py-0.5">
          ● Live
        </span>
        <div className="ticker-wrap flex-1 overflow-hidden">
          <p className="ticker-text font-mono text-sm whitespace-nowrap">
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}
