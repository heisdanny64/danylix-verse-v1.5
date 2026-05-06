import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Terms of Service</h1>
      </header>
      <article className="px-4 max-w-2xl mx-auto space-y-5 text-sm text-muted-foreground leading-relaxed pb-12">
        <p className="text-xs italic">Last updated: May 2026</p>

        <section>
          <h2 className="text-foreground font-semibold mb-1">1. Acceptance of Terms</h2>
          <p>By accessing or using D. Verse you agree to be bound by these Terms. If you do not agree, please do not use the service.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">2. Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information and update it when it changes.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">3. Content</h2>
          <p>D. Verse aggregates metadata and links to content from third-party providers. We do not host or stream the underlying media files ourselves. All trademarks and copyrights remain the property of their respective owners.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">4. Acceptable Use</h2>
          <p>You agree not to misuse the service, attempt to access it through unauthorized means, scrape data at scale, or use it for any unlawful purpose.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">5. Intellectual Property</h2>
          <p>The D. Verse name, logo, design system, and software are owned by us. You may not copy, modify, or distribute them without written permission.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">6. Termination</h2>
          <p>We may suspend or terminate access to accounts that violate these Terms or that pose risk to the service or other users.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">7. Disclaimer</h2>
          <p>The service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted availability of any specific title or feature.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">8. Contact</h2>
          <p>Questions about these Terms? Email <a href="mailto:support@dverse.name.ng" className="text-primary">support@dverse.name.ng</a>.</p>
        </section>
      </article>
    </div>
  );
};

export default Terms;