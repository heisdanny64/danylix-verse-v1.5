import { NavLink, useLocation } from "react-router-dom";
import { Home, Library, User } from "lucide-react";

const BottomNav = () => {
  const { pathname } = useLocation();

  if (
    pathname === "/" ||
    pathname.startsWith("/info/") ||
    pathname.startsWith("/player/") ||
    pathname === "/search"
  ) {
    return null;
  }

  const tabs = [
    { to: "/home", label: "Home", icon: Home, end: true },
    { to: "/library", label: "Library", icon: Library, end: false },
    { to: "/profile", label: "You", icon: User, end: false },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="flex w-full max-w-sm items-center justify-around rounded-full border border-border/60 bg-card/60 px-2 py-2 shadow-[0_8px_30px_hsl(var(--background)/0.6)] backdrop-blur-xl">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium transition-colors ${
                isActive ? "bg-primary/15 text-primary" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
