import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import LibraryPage from "./pages/LibraryPage.tsx";
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
            <Route path="/movie/:id" element={<DetailsPage />} />
            <Route path="/tv/:id" element={<DetailsPage />} />
            <Route path="/shorts/:id" element={<DetailsPage />} />
            <Route path="/player/:type/:id" element={<Player />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Legacy routes from the old providers */}
            <Route path="/recommendations" element={<Navigate to="/" replace />} />
            <Route path="/category/:slug" element={<Navigate to="/" replace />} />
            <Route path="/auth" element={<Navigate to="/profile" replace />} />
            <Route path="/details/:type/:id" element={<Navigate to="/" replace />} />
            <Route path="/anime/:slug" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
