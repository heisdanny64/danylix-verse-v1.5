import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import MaintenancePage from "./pages/MaintenancePage.tsx";

const queryClient = new QueryClient();

const ChromeShell = ({ children }: { children: React.ReactNode }) => {
  const { pathname } = useLocation();
  // Hide app chrome on all maintenance-mode public pages
  const hideChrome = ["/", "/privacy", "/terms"].includes(pathname);
  return (
    <>
      {!hideChrome && <TopNav />}
      {children}
      {!hideChrome && <BottomNav />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ChromeShell>
            <Routes>
              {/* MAINTENANCE MODE — only "/", "/home", "/privacy", "/terms" are reachable. */}
              <Route path="/" element={<MaintenancePage />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              {/* All other paths redirect to maintenance */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ChromeShell>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
