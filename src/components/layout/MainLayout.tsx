import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore

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
  
  // Fix: Use individual selectors instead of object destructuring to avoid reference equality issues
  const profile = useAuthStore(state => state.profile);
  const authLogout = useAuthStore(state => state.logout);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const fetchUserProfile = useAuthStore(state => state.fetchUserProfile);
  
  // Add a state to track profile fetching attempts to avoid loops
  const [hasAttemptedProfileFetch, setHasAttemptedProfileFetch] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    console.log(`🔄 [LAYOUT] MainLayout mounted at path: ${location.pathname}`);
    console.log("🔄 [LAYOUT] Auth state in MainLayout:", { 
      isAuthenticated, 
      hasProfile: !!profile,
      hasUser: !!user,
      userId: user?.id,
      profileData: profile ? { 
        id: profile.id,
        username: profile.username,
        email: profile.email
      } : null
    });
    
    // If authenticated but no profile, try to fetch it only once
    if (isAuthenticated && user && !profile && !hasAttemptedProfileFetch) {
      console.log("🔄 [LAYOUT] Has user but no profile, attempting to fetch profile");
      setHasAttemptedProfileFetch(true);
      fetchUserProfile(user.id).catch(err => {
        console.error("🔄 [LAYOUT] Error fetching profile:", err);
      });
    }
    
    return () => {
      console.log(`🔄 [LAYOUT] MainLayout unmounting from path: ${location.pathname}`);
    };
  }, [location.pathname, profile, isAuthenticated, user, fetchUserProfile, hasAttemptedProfileFetch]);

  const isActive = (path: string) => location.pathname === path;
  
  console.log(`🔄 [LAYOUT] Current path: ${location.pathname}`);

  const navItems = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      path: "/dashboard",
    },
    {
      icon: <List className="h-5 w-5" />,
      label: "Leaderboard",
      path: "/leaderboard",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Friends",
      path: "/friends",
    },
    {
      icon: <User className="h-5 w-5" />,
      label: "Profile",
      path: "/profile",
    },
  ];

  const handleLogout = async () => {
    console.log("🚪 [LAYOUT] Logout button clicked");
    try {
      await authLogout();
      console.log("🚪 [LAYOUT] Logout successful, navigating to login");
      navigate("/"); // Navigate to login page after logout
    } catch (error) {
      // Error is already handled and toasted by the authStore
      console.error("🚪 [LAYOUT] Logout failed:", error);
    }
  };
  
  const handleRefreshProfile = async () => {
    console.log("🔄 [LAYOUT] Manual profile refresh requested");
    if (user) {
      try {
        await fetchUserProfile(user.id);
      } catch (err) {
        console.error("🔄 [LAYOUT] Manual profile refresh failed:", err);
      }
    }
  };

  if (!profile) {
    console.log("⚠️ [LAYOUT] No profile data available in MainLayout!");
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-goon-deep-bg">
        <div className="text-center space-y-4 p-6 bg-goon-charcoal/30 rounded-lg border border-goon-charcoal/50 max-w-md">
          <h2 className="text-xl font-semibold">Profile Not Found</h2>
          <p className="text-muted-foreground">
            Your profile information couldn't be loaded. This could be due to a temporary issue.
          </p>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleRefreshProfile}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh Profile
            </Button>
            <Button variant="ghost" onClick={() => navigate("/")}>
              Back to Login
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
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
              className={`py-4 ${
                isActive(item.path)
                  ? "text-goon-purple"
                  : "text-goon-gray"
              }`}
              onClick={() => navigate(item.path)}
            >
              {item.icon}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
