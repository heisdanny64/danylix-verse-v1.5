import { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { Home, Sparkles, Library, Search, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const path = location.pathname;
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // Sync from URL when on /search
  useEffect(() => {
    if (path === "/search") {
      const url = new URLSearchParams(location.search);
      setQ(url.get("q") || "");
    }
  }, [path, location.search]);

  // Track scroll for shadow effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hide on immersive routes
  if (path.startsWith("/player/") || path === "/auth") return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  const tabs = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/recommendations", label: "Discover", icon: Sparkles, end: false },
    { to: "/library", label: "Library", icon: Library, end: false },
  ];

  return (
    // Desktop only — hidden on mobile, BottomNav handles mobile navigation
    <nav className={`hidden md:flex sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md pt-safe normal-case transition-shadow duration-200 ${scrolled ? "shadow-md" : "shadow-none"}`}>
      <div className="w-full max-w-7xl mx-auto flex items-center gap-6 px-6 h-16">
        <Link to="/" className="flex items-center font-extrabold text-foreground normal-case" style={{ textTransform: "none" }}>
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
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex-1 max-w-xl ml-auto">
          <div className="flex items-center gap-2 rounded-full bg-card px-4 py-2 border border-border focus-within:border-primary transition-colors">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for movies, series, anime…"
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </form>
        <NavLink
          to={user ? "/profile" : "/auth"}
          className="w-9 h-9 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-primary transition-colors"
          aria-label={user ? "Profile" : "Sign in"}
        >
          <User className="w-4 h-4" />
        </NavLink>
      </div>
    </nav>
  );
};

export default TopNav;
