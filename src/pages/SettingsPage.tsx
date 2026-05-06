import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePlayerPrefs, type SubtitleSize } from "@/hooks/usePlayerPrefs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

const QUALITIES = ["Auto", "1080p", "720p", "480p", "360p"];
const LANGS = [
  "English", "Spanish", "French", "German", "Italian", "Portuguese",
  "Japanese", "Korean", "Chinese", "Hindi", "Arabic", "Russian", "Turkish",
];
const SIZES: { value: SubtitleSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { prefs, update } = usePlayerPrefs();

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">General Settings</h1>
      </header>

      <div className="px-4 max-w-md mx-auto space-y-8 pt-2">
        <section className="space-y-2">
          <label className="text-sm font-medium text-foreground">Preferred video quality</label>
          <p className="text-xs text-muted-foreground">Highest quality at or below this will be auto-selected.</p>
          <Select value={prefs.quality} onValueChange={(v) => update({ quality: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUALITIES.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-medium text-foreground">Preferred subtitle language</label>
          <p className="text-xs text-muted-foreground">Subtitles in this language will be selected when available.</p>
          <Select value={prefs.subtitleLang} onValueChange={(v) => update({ subtitleLang: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </section>

        <section className="space-y-2">
          <label className="text-sm font-medium text-foreground">Subtitle size</label>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => update({ subtitleSize: s.value })}
                className={`py-2 rounded-md border text-sm font-medium transition-colors ${
                  prefs.subtitleSize === s.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >{s.label}</button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">Preview: <span style={{ fontSize: prefs.subtitleSize === "large" ? 21 : prefs.subtitleSize === "medium" ? 17 : 14 }}>This is how subtitles will look.</span></p>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;