import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import DetailsPage from "./pages/DetailsPage.tsx";
import Player from "./pages/Player.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import RecommendationsPage from "./pages/RecommendationsPage.tsx";
import LibraryPage from "./pages/LibraryPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import GiftedDetailsPage from "./pages/GiftedDetailsPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/details/:type/:id" element={<DetailsPage />} />
            <Route path="/details/gifted/:id" element={<GiftedDetailsPage />} />
            <Route path="/player/:type/:id" element={<Player />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Legacy redirects */}
            <Route path="/movie/movie-:id" element={<LegacyMovieRedirect />} />
            <Route path="/series/:id" element={<LegacySeriesRedirect />} />
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

const LegacyMovieRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/details/movie/${id}`} replace />;
};

const LegacySeriesRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/details/tv/${id}`} replace />;
};

const LegacyAnimeRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/details/tv/${id}`} replace />;
};

const LegacyAnimePlayerRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/player/tv/${id}?season=1&episode=1`} replace />;
};

export default App;
