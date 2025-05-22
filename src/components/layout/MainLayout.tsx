import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore"; 

import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  List,
  User,
  LogOut,
  RefreshCcw
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  console.log("🔄 [LAYOUT] MainLayout component rendering");
  
  const profile = useAuthStore(state => state.profile);
  const authLogout = useAuthStore(state => state.logout);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const fetchUserProfile = useAuthStore(state => state.fetchUserProfile);
  // const isLoadingAuth = useAuthStore(state => state.isLoadingAuth); // REMOVED
  const isFetchingProfile = useAuthStore(state => state.isFetchingProfile);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const [manualRefreshAttempted, setManualRefreshAttempted] = useState(false);

  useEffect(() => {
    console.log(`🔄 [LAYOUT] MainLayout effect at path: ${location.pathname}`);
    console.log("🔄 [LAYOUT] Auth state in MainLayout:", { 
      isAuthenticated, 
      // isLoadingAuth, // REMOVED
      isFetchingProfile,
      hasProfile: !!profile,
      hasUser: !!user,
      userId: user?.id,
    });
    
    // Fallback: If authenticated, user exists, but no profile and not currently fetching,
    // and no manual refresh tried yet, attempt to fetch profile.
    if (isAuthenticated && user && !profile && !isFetchingProfile && !manualRefreshAttempted) {
      console.log("🔄 [LAYOUT] Fallback: Has user, not fetching, but no profile. Attempting manual fetch.");
      setManualRefreshAttempted(true); 
      fetchUserProfile(user.id).catch(err => {
        console.error("🔄 [LAYOUT] Fallback profile fetch error:", err);
      });
    }
    
    return () => {
      console.log(`🔄 [LAYOUT] MainLayout unmounting from path: ${location.pathname}`);
    };
  }, [location.pathname, profile, isAuthenticated, user, fetchUserProfile, isFetchingProfile, manualRefreshAttempted]);

  const isActive = (path: string) => location.pathname === path;
  
  console.log(`🔄 [LAYOUT] Current path: ${location.pathname}`);

  const navItems = [
    { icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard", path: "/dashboard" },
    { icon: <List className="h-5 w-5" />, label: "Leaderboard", path: "/leaderboard" },
    { icon: <Users className="h-5 w-5" />, label: "Friends", path: "/friends" },
    { icon: <User className="h-5 w-5" />, label: "Profile", path: "/profile" },
  ];

  const handleLogout = async () => {
    await authLogout();
    navigate("/"); 
  };
  
  const handleRefreshProfile = async () => {
    if (user) {
      setManualRefreshAttempted(true); 
      await fetchUserProfile(user.id);
    }
  };

  // Show a loading indicator if authenticated but profile is still being fetched (and not yet available).
  if (isAuthenticated && isFetchingProfile && !profile) {
    console.log("⚠️ [LAYOUT] Loading profile data in MainLayout...");
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-goon-deep-bg">
        <p className="text-lg">Loading account details...</p>
      </div>
    );
  }

  // If authenticated, all fetching is done, but profile is still missing
  if (isAuthenticated && !profile && !isFetchingProfile) {
    console.log("⚠️ [LAYOUT] No profile data available after loading, showing error/refresh UI.");
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-goon-deep-bg">
        <div className="text-center space-y-4 p-6 bg-goon-charcoal/30 rounded-lg border border-goon-charcoal/50 max-w-md">
          <h2 className="text-xl font-semibold">Profile Not Found</h2>
          <p className="text-muted-foreground">
            Your profile information couldn't be loaded. This might be a temporary issue or your profile data is missing.
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleRefreshProfile} disabled={isFetchingProfile}>
              <RefreshCcw className="w-4 h-4 mr-2" /> 
              {isFetchingProfile ? "Refreshing..." : "Refresh Profile"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>Back to Login</Button>
            <Button variant="outline" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" /> Logout</Button>
          </div>
        </div>
      </div>
    );
  }
  
  // If not authenticated, ProtectedRoute should handle the redirection.
  // This is a safeguard.
  if (!isAuthenticated) {
     console.warn("⚠️ [LAYOUT] Reached MainLayout without authentication. Redirecting to login.");
     navigate("/"); // Redirect to login page
     return null; 
  }

  // If authenticated and not fetching, profile should exist. If not, it's a critical error.
  if (!profile) {
    console.error("⚠️ [LAYOUT] Critical: Profile is null when it should not be (authenticated, not fetching). Rendering minimal error.");
    return (
         <div className="flex flex-col items-center justify-center h-screen bg-goon-deep-bg">
            <p className="text-lg text-destructive">An unexpected error occurred loading your profile.</p>
             <Button variant="outline" onClick={handleLogout} className="mt-4">Logout and Retry</Button>
        </div>
    );
  }
  
  console.log(`✅ [LAYOUT] Rendering layout with profile: ${profile.username}`);

  return (
    <div className="flex h-screen bg-goon-deep-bg">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex w-64 flex-col bg-gradient-to-b from-goon-charcoal/50 to-transparent backdrop-blur-md border-r border-white/5">
        <div className="flex items-center justify-center h-16 border-b border-white/5">
          <h1 className="text-xl font-bold text-gradient">GoonSquad</h1>
        </div>
        <div className="flex flex-col flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              className={`justify-start ${
                isActive(item.path)
                  ? "bg-goon-purple/20 text-goon-purple hover:bg-goon-purple/30"
                  : "text-goon-gray hover:text-white hover:bg-muted"
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
          <div className="flex-grow" />
          <Button
            variant="ghost"
            className="justify-start text-goon-gray hover:text-white hover:bg-muted"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-goon-purple/20 text-goon-purple">
              {profile?.username ? profile.username.charAt(0).toUpperCase() : "?"}
            </div>
            <div className="font-medium text-sm text-goon-gray truncate">
              {profile?.username || "User"}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-goon-charcoal border-t border-white/10 z-50">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="icon"
              className={`py-4 ${ isActive(item.path) ? "text-goon-purple" : "text-goon-gray" }`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;