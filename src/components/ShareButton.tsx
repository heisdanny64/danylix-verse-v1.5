import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildDetailsHref } from "@/lib/slug";

interface Props {
  type: "movie" | "tv" | "anime";
  id: string | number;
  title: string;
  overview?: string;
}

const ShareButton = ({ type, id, title, overview }: Props) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}${buildDetailsHref(type, id, title)}`;
    const data: ShareData = { title, url, text: overview?.slice(0, 200) };
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share(data);
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
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