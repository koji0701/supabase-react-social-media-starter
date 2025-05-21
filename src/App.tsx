import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { FriendsProvider } from "@/contexts/FriendsContext";

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
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, isLoading } = useAuth(); // Use AuthContext

  if (isLoading) {
    // Show a loading indicator while auth state is being determined
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-goon-deep-bg">
        <p className="text-lg text-foreground">Loading session...</p>
        {/* You could add a spinner component here */}
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <FriendsProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/leaderboard" 
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/friends" 
                element={
                  <ProtectedRoute>
                    <Friends />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile/:friendId" 
                element={
                  <ProtectedRoute>
                    <FriendProfile />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
            <Sonner />
          </FriendsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;