export default function SiteFooter() {
  return (
    <footer className="border-t-4 border-ink py-6 text-center">
      <p className="font-mono text-xs text-muted uppercase tracking-widest">
        Gas In This Economy · No cap · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
