import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ButtonManager from "./pages/ButtonManager";
import BotSettings from "./pages/BotSettings";
import RedemptionCodes from "./pages/RedemptionCodes";
import BotUsers from "./pages/BotUsers";
import ForceJoin from "./pages/ForceJoin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="text-muted-foreground animate-pulse">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/buttons" element={<ProtectedRoute><ButtonManager /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><BotSettings /></ProtectedRoute>} />
    <Route path="/codes" element={<ProtectedRoute><RedemptionCodes /></ProtectedRoute>} />
    <Route path="/users" element={<ProtectedRoute><BotUsers /></ProtectedRoute>} />
    <Route path="/force-join" element={<ProtectedRoute><ForceJoin /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
