import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore"; 
import { Avatar } from "@/components/avatar"; // Added import

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
  const isFetchingProfile = useAuthStore(state => state.isFetchingProfile);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const [manualRefreshAttempted, setManualRefreshAttempted] = useState(false);

  useEffect(() => {
    console.log(`🔄 [LAYOUT] MainLayout effect at path: ${location.pathname}`);
    console.log("🔄 [LAYOUT] Auth state in MainLayout:", { 
      isAuthenticated, 
      isFetchingProfile,
      hasProfile: !!profile,
      hasUser: !!user,
      userId: user?.id,
    });
    
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

  if (isAuthenticated && isFetchingProfile && !profile) {
    console.log("⚠️ [LAYOUT] Loading profile data in MainLayout...");
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
        <p className="text-lg">Loading account details...</p>
      </div>
    );
  }

  if (isAuthenticated && !profile && !isFetchingProfile) {
    console.log("⚠️ [LAYOUT] No profile data available after loading, showing error/refresh UI.");
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
        <div className="text-center space-y-4 p-6 vercel-card max-w-md">
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
  
  if (!isAuthenticated) {
     console.warn("⚠️ [LAYOUT] Reached MainLayout without authentication. Redirecting to login.");
     navigate("/"); 
     return null; 
  }

  if (!profile) {
    console.error("⚠️ [LAYOUT] Critical: Profile is null when it should not be (authenticated, not fetching). Rendering minimal error.");
    return (
         <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
            <p className="text-lg text-destructive">An unexpected error occurred loading your profile.</p>
             <Button variant="outline" onClick={handleLogout} className="mt-4">Logout and Retry</Button>
        </div>
    );
  }
  
  console.log(`✅ [LAYOUT] Rendering layout with profile: ${profile.username}`);

  return (
    <div className="flex h-screen bg-vercel-black">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex w-64 flex-col bg-vercel-gray-900 border-r border-vercel-gray-800">
        <div className="flex items-center justify-center h-16 border-b border-vercel-gray-800">
          <h1 className="text-xl font-bold text-gradient">SupaSocial</h1>
        </div>
        <div className="flex flex-col flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              className={`justify-start ${
                isActive(item.path)
                  ? "bg-vercel-purple/20 text-vercel-purple hover:bg-vercel-purple/30 border-vercel-purple/30"
                  : "text-vercel-gray-400 hover:text-white hover:bg-vercel-gray-800"
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
            className="justify-start text-vercel-gray-400 hover:text-white hover:bg-vercel-gray-800"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="ml-2">Logout</span>
          </Button>
        </div>
        <div className="p-4 border-t border-vercel-gray-800">
          <div className="flex items-center space-x-3">
            <Avatar
              src={profile.avatarUrl}
              alt={profile.username ? `${profile.username}'s avatar` : "User avatar"}
              size={32} // Corresponds to h-8 w-8
              userId={profile.id}
              fallback={profile.username || "?"}
              className="ring-1 ring-vercel-purple/30"
            />
            <div className="font-medium text-sm text-vercel-gray-300 truncate">
              {profile.username || "User"}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile navbar at bottom */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-vercel-gray-900 border-t border-vercel-gray-800 z-50">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="icon"
              className={`py-4 ${ isActive(item.path) ? "text-vercel-purple" : "text-vercel-gray-400" }`}
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