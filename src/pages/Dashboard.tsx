import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";

const Dashboard = () => {
  console.log("🔄 [DASHBOARD] Rendering Dashboard component");
  
  // Fix: Use individual selectors instead of object destructuring to avoid reference equality issues
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const updateWeeklyCount = useAuthStore((state) => state.updateWeeklyCount);
  
  const refreshFriends = useFriendsStore((state) => state.refreshFriends);
  const friends = useFriendsStore((state) => state.friends);
  
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetchedFriends, setHasFetchedFriends] = useState(false);
  
  // Track component mount - deliberately using empty deps for mount/unmount only
  useEffect(() => {
    console.log("🔄 [DASHBOARD] Component mounted with auth state:", {
      isAuthenticated,
      isLoading,
      hasUser: !!user,
      hasProfile: !!profile,
      userEmail: user?.email,
      username: profile?.username
    });
    
    return () => {
      console.log("🔄 [DASHBOARD] Component unmounting");
    };
  // We intentionally want this to run only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle friends loading and profile display
  useEffect(() => {
    console.log("🔄 [DASHBOARD] Auth state change in Dashboard:", { 
      hasProfile: !!profile, 
      isLoading,
      isAuthenticated,
      friendsCount: friends.length 
    });
    
    if (profile) {
      console.log("👤 [DASHBOARD] Profile data:", {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        weeklyCount: profile.weeklyCount,
        streakDays: profile.streakDays
      });
    }
    
    // Load friends data when the dashboard loads
    const loadFriends = async () => {
      // Only fetch friends once per component instance
      if (hasFetchedFriends) return;
      
      try {
        console.log("👥 [DASHBOARD] Loading friends data");
        setLoadingFriends(true);
        await refreshFriends();
        setHasFetchedFriends(true);
        console.log(`👥 [DASHBOARD] Friends loaded: ${friends.length} friends`);
      } catch (err) {
        console.error("👥 [DASHBOARD] Error loading friends:", err);
        // Silently fail - we don't want to block the dashboard for this
      } finally {
        setLoadingFriends(false);
      }
    };
    
    if (profile && !isLoading) {
      console.log("👥 [DASHBOARD] Profile ready, loading friends data");
      loadFriends();
    } else {
      console.log("👥 [DASHBOARD] Not loading friends, waiting for profile", { 
        hasProfile: !!profile, 
        isLoading 
      });
    }
  }, [profile, isLoading, refreshFriends, friends.length, hasFetchedFriends, isAuthenticated]);

  if (isLoading || !profile) {
    console.log("🔄 [DASHBOARD] Rendering loading state", { isLoading, hasProfile: !!profile });
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-lg">Loading your dashboard...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (error) {
    console.log("🔄 [DASHBOARD] Rendering error state:", error);
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-lg text-destructive">Error loading dashboard</p>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </MainLayout>
    );
  }

  const handleRelapseClick = async () => {
    if (isConfirming) {
      console.log("📊 [DASHBOARD] Confirming relapse");
      try {
        await updateWeeklyCount();
      } catch (err) {
        console.error("📊 [DASHBOARD] Error updating relapse count:", err);
        toast({
          title: "Error updating count",
          description: "Please try again later",
          variant: "destructive"
        });
      }
      setIsConfirming(false);
    } else {
      console.log("📊 [DASHBOARD] Initiating relapse confirmation");
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  const topFriends = [...(friends || [])]
    .sort((a, b) => a.weeklyCount - b.weeklyCount)
    .slice(0, 3);
  
  console.log(`👥 [DASHBOARD] Top friends loaded: ${topFriends.length}`);

  const streakDays = profile.streakDays || 0;
  const maxStreakDays = 30; // Example max for progress bar

  console.log("🔄 [DASHBOARD] Rendering main dashboard UI");
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your progress and stay accountable.
          </p>
        </div>

        <Card className="bg-goon-charcoal/30 border-goon-charcoal/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-medium">This Week's Count</h2>
                <p className="text-4xl font-bold text-goon-purple">
                  {profile.weeklyCount}
                </p>
              </div>
              
              <Button
                size="lg"
                variant={isConfirming ? "destructive" : "outline"}
                className={`w-full py-6 text-lg transition-all ${
                  isConfirming
                    ? "bg-destructive/90 hover:bg-destructive"
                    : "border-goon-purple/50 text-goon-purple hover:bg-goon-purple/10"
                }`}
                onClick={handleRelapseClick}
              >
                {isConfirming ? "Confirm Relapse" : "I Relapsed"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" /> Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Clean</span>
                <span className="font-medium">{streakDays} days</span>
              </div>
              <Progress value={(streakDays / maxStreakDays) * 100} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Leaderboard</CardTitle>
              <Button
                variant="ghost"
                className="text-goon-purple hover:text-goon-purple/80"
                onClick={() => navigate("/leaderboard")}
              >
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingFriends && (
                <div className="text-center text-muted-foreground py-2">
                  Loading friends...
                </div>
              )}
              {!loadingFriends && topFriends.length > 0 ? (
                <div className="space-y-2">
                  {topFriends.map((friend, index) => (
                    <div key={friend.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span>{friend.username}</span>
                      </div>
                      <span className="font-medium">{friend.weeklyCount}</span>
                    </div>
                  ))}
                </div>
              ) : !loadingFriends && (
                <div className="text-center text-muted-foreground py-2">
                  Add friends to see the leaderboard
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;