import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePlayerPrefs } from "@/hooks/usePlayerPrefs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const QUALITIES = ["Auto", "1080p", "720p", "480p", "360p"];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { prefs, update } = usePlayerPrefs();

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="flex items-center gap-3 px-4 pb-4 pt-6">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/profile"))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">General Settings</h1>
      </header>

      <div className="mx-auto max-w-md space-y-8 px-4 pt-2">
        <section className="space-y-2">
          <label className="text-sm font-medium text-foreground">Preferred video quality</label>
          <p className="text-xs text-muted-foreground">
            The highest quality at or below this is selected automatically.
          </p>
          <Select value={prefs.quality} onValueChange={(v) => update({ quality: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITIES.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Autoplay next episode</p>
            <p className="text-xs text-muted-foreground">Continue to the next episode automatically.</p>
          </div>
          <Switch
            checked={prefs.autoplayNext}
            onCheckedChange={(checked) => update({ autoplayNext: checked })}
          />
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
