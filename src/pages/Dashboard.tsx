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
  
  const profile = useAuthStore((state) => state.profile);
  const isLoadingAuth = useAuthStore((state) => state.isLoadingAuth);
  const isFetchingProfile = useAuthStore((state) => state.isFetchingProfile);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // const user = useAuthStore((state) => state.user); // Not directly used here, profile has necessary info
  const updateWeeklyCount = useAuthStore((state) => state.updateWeeklyCount);
  
  const refreshFriends = useFriendsStore((state) => state.refreshFriends);
  const friends = useFriendsStore((state) => state.friends);
  const friendsLoading = useFriendsStore((state) => state.loading); // Use friends store's loading flag
  
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  // const [loadingFriends, setLoadingFriends] = useState(false); // Replaced by friendsStore.loading
  const [error, setError] = useState<string | null>(null); // For local dashboard errors
  const [hasFetchedFriendsInitial, setHasFetchedFriendsInitial] = useState(false);
  
  useEffect(() => {
    console.log("🔄 [DASHBOARD] Component mounted with auth state:", {
      isAuthenticated,
      isLoadingAuth,
      isFetchingProfile,
      hasProfile: !!profile,
    });
    return () => console.log("🔄 [DASHBOARD] Component unmounting");
  }, []); // Deliberately empty for mount/unmount only with initial values

  useEffect(() => {
    console.log("🔄 [DASHBOARD] Effect triggered by state change:", { 
      hasProfile: !!profile, 
      isLoadingAuth,
      isFetchingProfile,
      isAuthenticated,
      friendsCount: friends.length,
      hasFetchedFriendsInitial
    });
    
    // Load friends data when profile is available and initial friends fetch hasn't happened.
    if (profile && !isLoadingAuth && !isFetchingProfile && !hasFetchedFriendsInitial && !friendsLoading) {
      console.log("👥 [DASHBOARD] Profile ready, attempting initial friends data load.");
      setHasFetchedFriendsInitial(true); // Attempt only once per component lifecycle here
      refreshFriends().catch(err => {
        console.error("👥 [DASHBOARD] Error loading initial friends:", err);
        // setError("Failed to load friends data."); // Optionally set local error
      });
    }
  }, [profile, isLoadingAuth, isFetchingProfile, isAuthenticated, friends.length, refreshFriends, hasFetchedFriendsInitial, friendsLoading]);

  // The MainLayout will handle global loading states (auth, profile).
  // Dashboard assumes MainLayout has ensured profile exists if this point is reached.
  // However, if profile is somehow null here despite MainLayout's checks, it's an error.
  if (!profile) {
     // This state should ideally be caught by MainLayout or ProtectedRoute.
     // If it reaches here, it's an unexpected state.
    console.error("❌ [DASHBOARD] Critical: Profile is null. This shouldn't happen if MainLayout/ProtectedRoute are working.");
    return (
        <MainLayout>
            <div className="flex items-center justify-center h-96">
                <p className="text-lg text-destructive">Error: User profile not available.</p>
            </div>
        </MainLayout>
    );
  }
  
  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <p className="text-lg text-destructive">Error loading dashboard</p>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => setError(null) /* Or a more specific retry */}>Try Again</Button>
        </div>
      </MainLayout>
    );
  }

  const handleRelapseClick = async () => {
    if (isConfirming) {
      setIsConfirming(false); // Reset first in case of error
      try {
        await updateWeeklyCount();
      } catch (err) { /* Error already toasted by authStore */ }
    } else {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  const topFriends = [...(friends || [])]
    .sort((a, b) => a.weeklyCount - b.weeklyCount)
    .slice(0, 3);

  const streakDays = profile.streakDays || 0;
  const maxStreakDays = 30;

  console.log("🔄 [DASHBOARD] Rendering main dashboard UI with profile:", profile.username);
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and stay accountable.</p>
        </div>

        <Card className="bg-goon-charcoal/30 border-goon-charcoal/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-medium">This Week's Count</h2>
                <p className="text-4xl font-bold text-goon-purple">{profile.weeklyCount}</p>
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
              {friendsLoading && !friends.length && ( // Show loading only if no friends displayed yet
                <div className="text-center text-muted-foreground py-2">Loading friends...</div>
              )}
              {!friendsLoading && topFriends.length === 0 && friends.length === 0 && (
                <div className="text-center text-muted-foreground py-2">Add friends to see the leaderboard</div>
              )}
              {topFriends.length > 0 && (
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;