import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Download, Star } from "lucide-react";
import { getGiftedSubject } from "@/services/giftedApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const GiftedDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [_, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["gifted-subject", id],
    queryFn: () => getGiftedSubject(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-8">
        <Skeleton className="h-[50vh] w-full" />
        <div className="px-4 mt-4 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Title not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-[50vh] overflow-hidden bg-muted">
        {data.imageUrl && (
          <img src={data.imageUrl} alt={data.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-background/60 backdrop-blur flex items-center justify-center text-foreground hover:bg-background/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 -mt-20 relative z-10 space-y-4">
        <h1 className="text-3xl font-extrabold text-foreground leading-tight">{data.title}</h1>
        <div className="flex items-center gap-3 text-sm">
          {data.year && <span className="text-muted-foreground">{data.year}</span>}
          {data.rating && (
            <div className="flex items-center gap-1 text-primary">
              <Star className="w-4 h-4 fill-primary" />
              <span className="font-semibold">{Number(data.rating).toFixed(1)}</span>
            </div>
          )}
        </div>
        {data.overview && (
          <p className="text-sm text-muted-foreground leading-relaxed">{data.overview}</p>
        )}
        <div className="flex gap-2">
          <Button
            className="flex-1 gap-1.5"
            onClick={() => navigate(`/player/movie/${id}`)}
          >
            <Play className="w-4 h-4 fill-current" /> Watch Now
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setOpen(true)} disabled>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GiftedDetailsPage;