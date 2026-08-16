import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Info, Shield, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLibrary } from "@/lib/library";

const ProfilePage = () => {
  const { profile, updateProfile } = useAuth();
  const { watchlist, continueWatching, clearLibrary } = useLibrary();
  const { toast } = useToast();
  const [name, setName] = useState(profile.name);

  const save = () => {
    updateProfile({ name: name.trim() || "Guest" });
    toast({ title: "Profile updated" });
  };

  const links = [
    { to: "/settings", label: "Settings", icon: User },
    { to: "/about", label: "About D. Verse", icon: Info },
    { to: "/privacy", label: "Privacy Policy", icon: Shield },
    { to: "/terms", label: "Terms of Use", icon: Shield },
  ];

  return (
    <div className="min-h-screen pb-28">
      <header className="space-y-4 px-4 pb-4 pt-8">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-xl font-bold text-primary">
            {profile.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{profile.name}</h1>
            <p className="text-xs text-muted-foreground">
              {watchlist.length} saved · {continueWatching.length} in progress
            </p>
          </div>
        </div>
      </header>

      <section className="space-y-3 px-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display name</p>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <Button onClick={save}>Save</Button>
        </div>
      </section>

      <section className="mt-6 space-y-1 px-4">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
        <button
          onClick={() => {
            clearLibrary();
            toast({ title: "Library cleared" });
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-destructive transition-colors hover:bg-muted"
        >
          <Trash2 className="h-4 w-4" />
          <span className="flex-1 text-left">Clear local library</span>
        </button>
      </section>

      <p className="mt-8 px-4 text-center text-xs text-muted-foreground">
        Accounts are coming back soon. For now your library is stored on this device.
      </p>
    </div>
  );
};

export default ProfilePage;
