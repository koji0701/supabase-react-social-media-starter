
import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore

import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  List,
  User,
  LogOut
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { profile, logout: authLogout } = useAuthStore((state) => ({ // Get profile for username display
    profile: state.profile,
    logout: state.logout,
  }));
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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
    try {
      await authLogout();
      navigate("/"); // Navigate to login page after logout
    } catch (error) {
      // Error is already handled and toasted by the authStore
      console.error("Logout failed:", error);
    }
  };


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
