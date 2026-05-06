import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Privacy Policy</h1>
      </header>
      <article className="px-4 max-w-2xl mx-auto space-y-5 text-sm text-muted-foreground leading-relaxed pb-12">
        <p className="text-xs italic">Last updated: May 2026</p>

        <section>
          <h2 className="text-foreground font-semibold mb-1">Information we collect</h2>
          <p>When you create an account we collect your username, email address, and an encrypted password. We also store your watchlist, watch progress, and player preferences so we can sync them across devices.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">How we use your data</h2>
          <p>Your data is used solely to operate D. Verse: to authenticate you, deliver personalized recommendations, and remember where you left off. We never sell your data.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">Cookies & local storage</h2>
          <p>We use cookies and browser storage to keep you signed in and to cache content you've already loaded. You can clear these at any time from your browser settings.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">Third-party services</h2>
          <p>We rely on Supabase for authentication and database storage, and on third-party metadata providers (such as TMDB and AniList) to display content information. Their use of data is governed by their respective privacy policies.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">Your rights</h2>
          <p>You may request export or deletion of your personal data at any time. Account deletion permanently removes your profile, library, and progress.</p>
        </section>
        <section>
          <h2 className="text-foreground font-semibold mb-1">Contact</h2>
          <p>Privacy questions? Email <a href="mailto:support@dverse.name.ng" className="text-primary">support@dverse.name.ng</a>.</p>
        </section>
      </article>
    </div>
  );
};

export default Privacy;