import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import Index from "./pages/Index.tsx";
import WelcomePage from "./pages/WelcomePage.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import DetailsPage from "./pages/DetailsPage.tsx";
import Player from "./pages/Player.tsx";
import LibraryPage from "./pages/LibraryPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import About from "./pages/About.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const STATIC_TITLES: Record<string, string> = {
  "/home": "Danylix Verse (D. Verse) - Movies & Series",
  "/library": "Your Library - D. Verse",
  "/profile": "Your Profile - D. Verse",
  "/settings": "Settings - D. Verse",
  "/about": "About - D. Verse",
  "/terms": "Terms of Service - D. Verse",
  "/privacy": "Privacy Policy - D. Verse",
};

const RouteTitleManager = () => {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search } = location;
    if (pathname === "/") {
      document.title = "Welcome Back - D. Verse";
      return;
    }
    if (pathname.startsWith("/info/") || pathname.startsWith("/player/")) return;
    if (pathname === "/search") {
      const query = new URLSearchParams(search).get("q")?.trim();
      document.title = query ? `Search results for ${query} - D. Verse` : "Search - D. Verse";
      return;
    }
    document.title = STATIC_TITLES[pathname] ?? "Page Not Found - D. Verse";
  }, [location]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RouteTitleManager />
          <TopNav />
          <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/home" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/info/:id" element={<DetailsPage />} />
            <Route path="/player/:type/:id" element={<Player />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Non-content legacy routes */}
            <Route path="/recommendations" element={<Navigate to="/home" replace />} />
            <Route path="/category/:slug" element={<Navigate to="/home" replace />} />
            <Route path="/auth" element={<Navigate to="/profile" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
