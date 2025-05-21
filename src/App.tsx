import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner"; // Renamed to avoid conflict
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore
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
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  
  console.log(`🛡️ [PROTECTED ROUTE] Auth state for ${path}:`, { 
    isAuthenticated, 
    isLoading,
    userId: user?.id,
    hasProfile: !!profile,
    profileId: profile?.id
  });

  if (isLoading) {
    console.log(`🛡️ [PROTECTED ROUTE] Loading state for ${path}`);
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-goon-deep-bg">
        <p className="text-lg text-foreground">Loading session...</p>
      </div>
    );
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
    console.log("🌐 [APP] Auth state changed in AppInitializer:", { 
      isAuthenticated, 
      userId: user?.id 
    });
    
    if (isAuthenticated) {
      console.log("🌐 [APP] User is authenticated, initializing friends data");
      refreshFriends().catch(err => {
        console.error("🌐 [APP] Failed to load initial friends data:", err);
      });
    }
  }, [isAuthenticated, refreshFriends, user]);
  
  return null;
};

console.log("🚀 [APP] App component rendering");

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        {/* Initialize global state */}
        <AppInitializer />
        
        {/* Zustand stores are globally accessible, no providers needed here */}
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
