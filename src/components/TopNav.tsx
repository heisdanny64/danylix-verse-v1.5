import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Library, Search, User } from "lucide-react";

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (path === "/search") {
      const url = new URLSearchParams(location.search);
      setQ(url.get("q") || "");
    }
  }, [path, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (path === "/" || path.startsWith("/player/")) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  const tabs = [
    { to: "/home", label: "Home", icon: Home, end: true },
    { to: "/library", label: "Library", icon: Library, end: false },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 hidden w-full border-b border-border bg-background/85 pt-safe backdrop-blur-md transition-shadow duration-200 md:flex ${scrolled ? "shadow-md" : "shadow-none"}`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-6">
        <Link to="/home" className="flex items-center font-extrabold text-foreground">
          <span className="text-foreground">D.</span>
          <span className="ml-1 text-primary">Verse</span>
        </Link>
        <div className="flex items-center gap-1">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
        <form onSubmit={onSubmit} className="ml-auto max-w-xl flex-1">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 transition-colors focus-within:border-primary">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search movies, series or shorts…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
        <NavLink
          to="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary/25"
          aria-label="Profile"
        >
          <User className="h-4 w-4" />
        </NavLink>
      </div>
    </nav>
  );
};

export default TopNav;
