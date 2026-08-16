export interface CastRowItem {
  name: string;
  role?: string;
  avatar?: string | null;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const CastRow = ({ cast }: { cast: CastRowItem[] }) => {
  if (!cast?.length) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Cast & Crew</h2>
      <div className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
        {cast.map((p, i) => (
          <div key={`${p.name}-${i}`} className="w-20 flex-shrink-0 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {p.avatar ? (
                <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                initials(p.name)
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs font-medium text-foreground">{p.name}</p>
            {p.role && <p className="line-clamp-1 text-[10px] text-muted-foreground">{p.role}</p>}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CastRow;
