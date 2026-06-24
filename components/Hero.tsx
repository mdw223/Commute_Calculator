export default function Hero() {
  return (
    <header className="text-center px-4 py-8 md:py-12 border-b-4 border-ink">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-headline mb-3">
        ★ Front Page Exclusive ★
      </p>
      <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black uppercase leading-[0.95] text-headline">
        Gas In
        <br />
        This Economy
      </h1>
      <p className="mt-4 font-display text-xl md:text-2xl font-bold uppercase text-ink">
        Is This Drive Worth Your Life?
      </p>
      <p className="mt-3 text-muted max-w-lg mx-auto text-sm md:text-base">
        Enter your route. The math will decide your fate. No signup. No cap.
        Just brutal honesty about what driving actually costs in this economy.
      </p>
    </header>
  );
}
