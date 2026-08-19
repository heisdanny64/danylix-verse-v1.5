import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildDetailsHref } from "@/lib/slug";
import type { SubjectKind } from "@/services/moviebox";

interface Props {
  type: SubjectKind;
  id: string;
  title: string;
}

const ShareButton = ({ type, id, title }: Props) => {
  const { toast } = useToast();

  const handleShare = async () => {
    const url = `${window.location.origin}${buildDetailsHref(type, id)}`;
    const message = `Watch ${title} on D. Verse:\n${url}`;

    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: `${title} - D. Verse`, url, text: message });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(message);
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
