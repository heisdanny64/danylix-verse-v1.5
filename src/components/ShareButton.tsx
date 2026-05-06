import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildDetailsHref } from "@/lib/slug";

interface Props {
  type: "movie" | "tv" | "anime";
  id: string | number;
  title: string;
  overview?: string;
  rating?: number | null;
}

const ShareButton = ({ type, id, title, overview, rating }: Props) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}${buildDetailsHref(type, id, title)}`;
    const typeLabel = type === "tv" ? "Series" : type === "anime" ? "Anime" : "Movie";
    const ratingStr = rating ? `⭐ ${rating.toFixed(1)} / 10` : null;

    const text = [
      `🎬 Title: ${title}`,
      `📺 Type: ${typeLabel}`,
      ratingStr ? `⭐ Rating: ${ratingStr}` : null,
      overview ? `📝 Description: ${overview.slice(0, 200)}${overview.length > 200 ? "…" : ""}` : null,
      ``,
      `Check it out on D. Verse 👇`,
    ].filter(Boolean).join("\n");

    const shareData: ShareData = { title, url, text };

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share(shareData);
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    // Fallback — copy full formatted text + link to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Could not share link", variant: "destructive" });
    }
  };

  return (
    <Button variant="outline" className="gap-1.5" onClick={handleShare} aria-label="Share">
      <Share2 className="w-4 h-4" />
    </Button>
  );
};

export default ShareButton;
