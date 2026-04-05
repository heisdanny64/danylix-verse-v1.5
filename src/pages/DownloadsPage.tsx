import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCloudDownloads } from "@/lib/supabase-library";
import { posterUrl } from "@/lib/tmdb";
import { ArrowLeft, Download } from "lucide-react";

const DownloadsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: downloads, isLoading } = useQuery({
    queryKey: ["downloads", user?.id],
    queryFn: () => fetchCloudDownloads(user!.id),
    enabled: !!user,
  });

  if (!user) {
    navigate("/auth", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <header className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Downloads</h1>
      </header>

      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (downloads?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {downloads!.map((d: any) => (
              <div key={d.id} className="space-y-1">
                <img src={posterUrl(d.poster)} alt={d.title} className="w-full aspect-[2/3] rounded-lg object-cover bg-muted" />
                <p className="text-xs text-foreground truncate">{d.title}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{d.content_type}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 rounded-lg bg-card border border-border">
            <Download className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No downloads yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadsPage;
