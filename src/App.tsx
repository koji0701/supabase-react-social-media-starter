
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/authStore";
import { useEffect } from "react";
import { useFriendsStore } from "@/stores/friendsStore";

// Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import FriendProfile from "./pages/FriendProfile";
import NotFound from "./pages/NotFound";

// Auth-protected route
const ProtectedRoute = ({ children, path }: { children: JSX.Element, path: string }) => {
  console.log(`🛡️ [PROTECTED ROUTE] Checking auth for ${path}`);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  
  console.log(`🛡️ [PROTECTED ROUTE] Auth state for ${path}:`, { 
    isAuthenticated, 
    userId: user?.id,
    hasProfile: !!profile,
    isInitialized
  });

  // Don't redirect until auth is initialized
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log(`🛡️ [PROTECTED ROUTE] Not authenticated, redirecting from ${path} to login`);
    return <Navigate to="/" replace />;
  }
  
  console.log(`🛡️ [PROTECTED ROUTE] Authenticated, rendering ${path}`);
  return children;
};

const queryClient = new QueryClient();

// Global state initialization 
const AppInitializer = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const refreshFriends = useFriendsStore((state) => state.refreshFriends);
  
  // Initialize friends data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log("🌐 [APP] User is authenticated, initializing friends data");
      refreshFriends().catch(err => {
        console.error("🌐 [APP] Failed to load initial friends data:", err);
      });
    }
  }, [isAuthenticated, user, refreshFriends]);
  
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppInitializer />
        
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute path="/dashboard">
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <ProtectedRoute path="/leaderboard">
                <Leaderboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/friends" 
            element={
              <ProtectedRoute path="/friends">
                <Friends />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute path="/profile">
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile/:friendId" 
            element={
              <ProtectedRoute path="/profile/:friendId">
                <FriendProfile />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
        <SonnerToaster />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
