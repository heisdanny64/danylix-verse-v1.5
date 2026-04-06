import { NavLink, useLocation } from "react-router-dom";
import { Home, Sparkles, Library, Download, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const { user } = useAuth();

  // Hide on certain pages
  if (
    path.startsWith("/movie/") ||
    path.startsWith("/series/") ||
    path.startsWith("/details/") ||
    path.startsWith("/player/") ||
    path.startsWith("/category/") ||
    path === "/search" ||
    path === "/auth"
  ) {
    return null;
  }

  const tabs = [
    { to: "/", label: "Home", icon: Home },
    { to: "/recommendations", label: "Discover", icon: Sparkles },
    { to: "/library", label: "Library", icon: Library },
    { to: "/downloads", label: "Downloads", icon: Download },
    { to: user ? "/profile" : "/auth", label: user ? "Me" : "Sign In", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 text-[10px] transition-colors ${
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
