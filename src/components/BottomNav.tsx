import { NavLink, useLocation } from "react-router-dom";
import { Home, Sparkles, Library } from "lucide-react";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles },
  { to: "/library", label: "Library", icon: Library },
];

const BottomNav = () => {
  const location = useLocation();

  // Hide on movie details and search pages
  if (location.pathname.startsWith("/movie/") || location.pathname === "/search") {
    return null;
  }

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
