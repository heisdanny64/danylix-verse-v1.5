import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">About</h1>
      </header>
      <article className="px-4 prose prose-invert max-w-2xl mx-auto space-y-4 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-foreground text-lg font-semibold">Welcome to D. Verse</h2>
        <p>
          D. Verse is a cinematic discovery platform that brings together the world's
          best movies, series, and anime in a single, beautifully crafted experience.
          We believe great stories deserve a great home — one that's fast, focused,
          and free of distractions.
        </p>
        <h3 className="text-foreground font-semibold">Our mission</h3>
        <p>
          To help every viewer find their next favorite story. We curate, organize,
          and surface content from across the globe so that whether you crave a quiet
          indie drama, a blockbuster franchise, or a long-running anime saga, you can
          find it in seconds.
        </p>
        <h3 className="text-foreground font-semibold">Built with care</h3>
        <p>
          D. Verse is designed mobile-first, optimized for performance on every
          device, and continuously improved based on community feedback. We sweat
          the small details — typography, motion, color — so the focus always stays
          on the content.
        </p>
        <h3 className="text-foreground font-semibold">Get in touch</h3>
        <p>
          Have a suggestion or found a bug? Reach out at{" "}
          <a href="mailto:support@dverse.name.ng" className="text-primary">support@dverse.name.ng</a>.
        </p>
      </article>
    </div>
  );
};

export default About;