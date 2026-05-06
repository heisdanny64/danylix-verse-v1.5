import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import DetailsPage from "./pages/DetailsPage.tsx";
import Player from "./pages/Player.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import RecommendationsPage from "./pages/RecommendationsPage.tsx";
import LibraryPage from "./pages/LibraryPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import About from "./pages/About.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <TopNav />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/details/:type/:id" element={<DetailsPage />} />
            <Route path="/player/:type/:id" element={<Player />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Slug-based detail routes — must come AFTER specific routes */}
            <Route path="/movie/:slug" element={<DetailsPage />} />
            <Route path="/tv/:slug" element={<DetailsPage />} />
            <Route path="/anime/:slug" element={<DetailsPage />} />
            {/* Legacy redirects */}
            <Route path="/details/anime/:id" element={<LegacyAnimeRedirect />} />
            <Route path="/player/anime/:id" element={<LegacyAnimePlayerRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Legacy redirect components
import { useParams } from "react-router-dom";

const LegacyAnimeRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/details/tv/${id}`} replace />;
};

const LegacyAnimePlayerRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/player/tv/${id}?season=1&episode=1`} replace />;
};

export default App;
