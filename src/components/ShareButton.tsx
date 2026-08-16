import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildDetailsHref } from "@/lib/slug";
import type { SubjectKind } from "@/services/moviebox";

interface Props {
  type: SubjectKind;
  id: string;
  title: string;
  overview?: string;
  rating?: number | null;
}

const ShareButton = ({ type, id, title, overview, rating }: Props) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}${buildDetailsHref(type, id)}`;
    const typeLabel = type === "tv" ? "Series" : type === "shorts" ? "Shorts" : "Movie";
    const text = [
      `🎬 Title: ${title}`,
      `📺 Type: ${typeLabel}`,
      rating ? `⭐ Rating: ${rating.toFixed(1)} / 10` : null,
      overview ? `📝 ${overview.slice(0, 200)}${overview.length > 200 ? "…" : ""}` : null,
      ` `,
      `Check it out on D. Verse 👇`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title, url, text });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Could not share link", variant: "destructive" });
    }
  };

  return (
    <Button variant="outline" className="gap-1.5" onClick={handleShare} aria-label="Share">
      <Share2 className="h-4 w-4" />
    </Button>
  );
};

export default ShareButton;
