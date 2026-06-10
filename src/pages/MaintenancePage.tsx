import { useEffect } from "react";

const MaintenancePage = () => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "D. Verse — Under Maintenance";
    return () => { document.title = prevTitle; };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Animated background blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full bg-primary/25 blur-3xl animate-blob-float" />
        <div className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full bg-secondary/20 blur-3xl animate-blob-float-delayed" />
        <div className="absolute -bottom-40 left-1/4 h-[26rem] w-[26rem] rounded-full bg-primary/15 blur-3xl animate-blob-float" style={{ animationDelay: "-6s" }} />
        {/* subtle starfield */}
        <div className="absolute inset-0 opacity-[0.18] mix-blend-screen"
             style={{
               backgroundImage:
                 "radial-gradient(1px 1px at 20% 30%, hsl(var(--foreground)) 50%, transparent 51%), radial-gradient(1px 1px at 70% 60%, hsl(var(--foreground)) 50%, transparent 51%), radial-gradient(1px 1px at 40% 80%, hsl(var(--foreground)) 50%, transparent 51%), radial-gradient(1px 1px at 85% 20%, hsl(var(--foreground)) 50%, transparent 51%), radial-gradient(1px 1px at 10% 70%, hsl(var(--foreground)) 50%, transparent 51%)",
               backgroundSize: "400px 400px",
             }}
        />
        {/* vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_hsl(var(--background))_100%)]" />
      </div>

      {/* Content */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {/* Logo with animated ring */}
        <div className="relative mb-8 flex items-center justify-center">
          <div
            aria-hidden
            className="absolute h-40 w-40 rounded-full opacity-60 blur-xl animate-spin-slow"
            style={{
              background:
                "conic-gradient(from 0deg, hsl(var(--primary)), transparent, hsl(var(--secondary)), transparent, hsl(var(--primary)))",
            }}
          />
          <h1 className="logo-text relative text-5xl md:text-6xl font-semibold tracking-wide animate-fade-in-up">
            <span className="logo-d">D.</span><span className="logo-verse">Verse</span>
          </h1>
        </div>

        <div className="relative max-w-lg space-y-4 animate-fade-in-up" style={{ animationDelay: "150ms", animationFillMode: "backwards" }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Maintenance in progress
          </div>

          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
            We'll be right back.
          </h2>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            D. Verse is getting some big upgrades. We're polishing the experience
            behind the scenes and will be back online shortly. Thanks for your patience.
          </p>
        </div>
      </main>

      {/* SEO / crawl-safe footer (matches homepage) */}
      <footer className="relative z-10 px-4 pb-6 pt-6">
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground/70">
          <a href="/privacy" className="opacity-70 transition-opacity hover:opacity-100">Privacy</a>
          <span className="opacity-40">•</span>
          <a href="/terms" className="opacity-70 transition-opacity hover:opacity-100">Terms</a>
        </div>
        <p className="mt-3 text-center text-[10px] text-muted-foreground/40">© 2026 D. Verse</p>
      </footer>
    </div>
  );
};

export default MaintenancePage;