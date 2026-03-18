import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index.tsx";
import SearchPage from "./pages/SearchPage.tsx";
import DetailsPage from "./pages/DetailsPage.tsx";
import PlayerPage from "./pages/PlayerPage.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import RecommendationsPage from "./pages/RecommendationsPage.tsx";
import LibraryPage from "./pages/LibraryPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/details/:type/:id" element={<DetailsPage />} />
          <Route path="/player/:type/:id" element={<PlayerPage />} />
          <Route path="/player/anime/:id" element={<PlayerPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
