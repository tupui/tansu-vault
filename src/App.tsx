import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { Dashboard } from "./pages/Dashboard";
import { Vault } from "./pages/Vault";
import { CarbonOffset } from "./pages/CarbonOffset";
import { Admin } from "./pages/Admin";
import { WalletProvider } from '@/components/WalletProvider';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { FiatCurrencyProvider } from '@/contexts/FiatCurrencyContext';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NetworkProvider>
        <FiatCurrencyProvider>
          <WalletProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="light min-h-screen clean-bg">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/vault" element={<Vault />} />
                  <Route path="/carbon" element={<CarbonOffset />} />
                  <Route path="/admin" element={<Admin />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </BrowserRouter>
          </WalletProvider>
        </FiatCurrencyProvider>
      </NetworkProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
