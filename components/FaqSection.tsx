"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Is this actually free or am I gonna get fleeced?",
    a: "100% free. No signup, no premium tier, no credit card. We calculate, you cry about gas prices, we forget everything. Your data stays in your browser.",
  },
  {
    q: "Where does the distance come from?",
    a: "OpenRouteService — real driving routes, not a crow flying in a straight line. Multi-stop supported. API calls go through our server so your key stays secret.",
  },
  {
    q: "What's the maintenance cost thing?",
    a: "Wear and tear — oil, tires, depreciation, your car aging in real time. It's on by default at ~$0.10/mile, but you can toggle it off or adjust the rate ($0.05–$0.25/mi). Turn it off and we'll still show you what it would've cost, strikethrough style.",
  },
  {
    q: "Why is round trip on by default?",
    a: "Because most commutes are there AND back. You're not teleporting home bestie. Toggle it off if you're literally never returning.",
  },
  {
    q: "How does 'worth it' work?",
    a: "We compare trip cost to what you'd earn in the same drive time at your salary. Plus side-hustle hours if you gave us that rate. It's judgmental. On purpose.",
  },
  {
    q: "Why 'Gas In This Economy'?",
    a: "Because every fill-up feels personal now. We're not here to sugarcoat it — we're here to show you the receipt before you commit.",
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="border-t-4 border-ink mt-12">
      <div className="px-4 py-8 max-w-2xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-widest text-headline text-center mb-6">
          ★ Letters to the Editor ★
        </p>
        <h2 className="font-display text-2xl font-black uppercase text-center text-ink mb-6">
          Frequently Asked (Frantically)
        </h2>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="border-3 border-ink bg-surface shadow-brutal-sm">
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left px-4 py-3 flex justify-between items-start gap-4 hover:bg-cta/10 transition-colors"
              >
                <span className="font-mono text-sm font-bold">
                  Q. {item.q}
                </span>
                <span className="shrink-0 text-headline font-bold">
                  {openIndex === i ? "−" : "+"}
                </span>
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4 border-t-2 border-ink/10">
                  <p className="text-sm text-muted mt-2">
                    <span className="font-mono font-bold text-ink">A. </span>
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
