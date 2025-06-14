
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore"; 
import { Avatar } from "@/components/avatar";

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
  const isInitialized = useAuthStore(state => state.isInitialized);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    console.log(`🔄 [LAYOUT] Auth state in MainLayout:`, { 
      isAuthenticated, 
      isFetchingProfile,
      hasProfile: !!profile,
      hasUser: !!user,
      isInitialized,
      path: location.pathname
    });
    
    // Only redirect if we're fully initialized and not authenticated
    if (isInitialized && !isAuthenticated) {
      console.warn("⚠️ [LAYOUT] Not authenticated, redirecting to login");
      navigate("/");
    }
  }, [isAuthenticated, isInitialized, navigate]);

  const isActive = (path: string) => location.pathname === path;

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
      await fetchUserProfile(user.id);
    }
  };

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
        <p className="text-lg">Initializing...</p>
      </div>
    );
  }

  // Show loading while fetching profile
  if (isAuthenticated && isFetchingProfile && !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
        <p className="text-lg">Loading account details...</p>
      </div>
    );
  }

  // Show error state if authenticated but no profile and not fetching
  if (isAuthenticated && !profile && !isFetchingProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
        <div className="text-center space-y-4 p-6 vercel-card max-w-md">
          <h2 className="text-xl font-semibold">Profile Not Found</h2>
          <p className="text-muted-foreground">
            Your profile information couldn't be loaded.
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleRefreshProfile} disabled={isFetchingProfile}>
              <RefreshCcw className="w-4 h-4 mr-2" /> 
              {isFetchingProfile ? "Refreshing..." : "Refresh Profile"}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null; 
  }

  // Don't render if no profile
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-vercel-black">
        <p className="text-lg text-destructive">Loading profile...</p>
      </div>
    );
  }

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
              size={32}
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
