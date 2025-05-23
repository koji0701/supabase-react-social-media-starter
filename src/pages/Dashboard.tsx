import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SlidingNumber } from "@/components/animate-ui/text/sliding-number";
import { FireworksBackground } from "@/components/animate-ui/backgrounds/fireworks";

const FIREWORKS_FADE_IN_DURATION = 500;   // ms
const FIREWORKS_ACTIVE_DURATION = 6000;  // ms
const FIREWORKS_FADE_OUT_DURATION = 1000; // ms

const Dashboard = () => {
  console.log("🔄 [DASHBOARD] Rendering Dashboard component");

  const profile           = useAuthStore((s) => s.profile);
  const isFetchingProfile = useAuthStore((s) => s.isFetchingProfile);
  const isAuthenticated   = useAuthStore((s) => s.isAuthenticated);
  const updateWeeklyCount = useAuthStore((s) => s.updateWeeklyCount);

  const refreshFriends = useFriendsStore((s) => s.refreshFriends);
  const friends        = useFriendsStore((s) => s.friends);
  const friendsLoading = useFriendsStore((s) => s.loading);

  const navigate = useNavigate();

  const [isConfirming, setIsConfirming]               = useState(false);
  const [error, setError]                             = useState<string | null>(null);
  const [hasFetchedFriendsInitial, setHasFetchedFriendsInitial] = useState(false);

  const [renderFireworksComponent, setRenderFireworksComponent] = useState(false);
  const [fireworksAreVisible, setFireworksAreVisible]           = useState(false);

  // ... (useEffect hooks and other logic remain the same) ...
  useEffect(() => {
    console.log("🔄 [DASHBOARD] Component mounted with auth state:", {
      isAuthenticated,
      isFetchingProfile,
      hasProfile: !!profile,
    });
    return () => console.log("🔄 [DASHBOARD] Component unmounting");
  }, [isAuthenticated, isFetchingProfile, profile]);

  useEffect(() => {
    console.log("🔄 [DASHBOARD] Effect triggered by state change:", {
      hasProfile: !!profile,
      isFetchingProfile,
      isAuthenticated,
      friendsCount: friends.length,
      hasFetchedFriendsInitial,
    });

    if (profile && !isFetchingProfile && !hasFetchedFriendsInitial && !friendsLoading) {
      console.log("👥 [DASHBOARD] Profile ready, attempting initial friends data load.");
      setHasFetchedFriendsInitial(true);
      refreshFriends().catch((err) => {
        console.error("👥 [DASHBOARD] Error loading initial friends:", err);
        setError("Failed to load friends data.");
      });
    }
  }, [
    profile,
    isFetchingProfile,
    isAuthenticated,
    friends.length,
    refreshFriends,
    hasFetchedFriendsInitial,
    friendsLoading,
  ]);

  useEffect(() => {
    let fadeInTimer: NodeJS.Timeout;
    let fadeOutTimer: NodeJS.Timeout;
    let unmountTimer: NodeJS.Timeout;

    if (renderFireworksComponent) {
      fadeInTimer = setTimeout(() => setFireworksAreVisible(true), 50);

      fadeOutTimer = setTimeout(
        () => setFireworksAreVisible(false),
        FIREWORKS_ACTIVE_DURATION + 50,
      );

      unmountTimer = setTimeout(
        () => setRenderFireworksComponent(false),
        FIREWORKS_ACTIVE_DURATION + FIREWORKS_FADE_OUT_DURATION + 50,
      );
    } else {
      setFireworksAreVisible(false);
    }

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
    };
  }, [renderFireworksComponent]);

  if (!profile) {
    console.error(
      "❌ [DASHBOARD] Critical: Profile is null. This shouldn't happen if MainLayout/ProtectedRoute are working.",
    );
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
          <Button
            onClick={() => {
              setError(null);
              setHasFetchedFriendsInitial(false);
            }}
          >
            Try Again
          </Button>
        </div>
      </MainLayout>
    );
  }

  const handleRelapseClick = async () => {
    if (isConfirming) {
      setIsConfirming(false);
      try {
        await updateWeeklyCount(); 
        setFireworksAreVisible(false);
        setRenderFireworksComponent(true);
      } catch (err) {
        console.error("🔄 [DASHBOARD] Error during relapse update:", err);
      }
    } else {
      setIsConfirming(true);
      setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  const topFriends = [...friends]
    .sort((a, b) => a.weeklyCount - b.weeklyCount)
    .slice(0, 3);

  const streakDays    = profile.streakDays || 0;
  const maxStreakDays = 30;

  console.log("🔄 [DASHBOARD] Rendering main dashboard UI with profile:", profile.username);

  return (
    <MainLayout>
      {renderFireworksComponent && (
        <FireworksBackground
          className={cn(
            "fixed inset-0 z-[100] transition-opacity ease-in-out",
            fireworksAreVisible ? "opacity-100" : "opacity-0",
          )}
          style={{
            transitionDuration: fireworksAreVisible
              ? `${FIREWORKS_FADE_IN_DURATION}ms`
              : `${FIREWORKS_FADE_OUT_DURATION}ms`,
          }}
          population={2}
          particleSpeed={{ min: 1, max: 8 }}
          fireworkSpeed={{ min: 4, max: 9 }}
          color={["#a855f7", "#ec4899", "#f97316", "#84cc16"]}
        />
      )}

      <div className="space-y-8 animate-fade-in">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Track your progress and stay accountable.</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Avatar
              src={profile.avatarUrl}
              fallback={profile.username}
              size={48}
              className="border-2 border-vercel-purple/30"
            />
            <div className="hidden sm:block text-right">
              <p className="font-medium">{profile.username}</p>
              <p className="text-sm text-muted-foreground">{streakDays} day streak</p>
            </div>
          </div>
        </div>

        {/* WEEKLY COUNT CARD */}
        <Card className="vercel-card">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              {/* MODIFIED PARENT DIV FOR H2 AND SLIDINGNUMBER */}
              <div className="flex flex-col items-center space-y-2">
                <h2 className="text-xl font-medium">This Week's Count</h2>
                <SlidingNumber
                  key={profile.weeklyCount}
                  number={profile.weeklyCount}
                  // MODIFIED CLASSNAME FOR SLIDINGNUMBER
                  className="text-4xl font-bold text-vercel-purple text-center"
                  transition={{ stiffness: 200, damping: 20, mass: 0.4 }}
                />
              </div>

              <Button
                size="lg"
                variant={isConfirming ? "destructive" : "outline"}
                className="w-full py-6 text-lg transition-all"
                onClick={handleRelapseClick}
              >
                {isConfirming ? "Confirm Relapse" : "I Relapsed"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* STREAK + LEADERBOARD */}
        {/* ... (rest of the component remains the same) ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="vercel-card">
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

          <Card className="vercel-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Leaderboard</CardTitle>
              <Button
                variant="ghost"
                className="text-vercel-purple hover:text-vercel-purple/80"
                onClick={() => navigate("/leaderboard")}
              >
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent>
              {friendsLoading && !friends.length && (
                <div className="text-center text-muted-foreground py-2">
                  Loading friends...
                </div>
              )}

              {!friendsLoading && topFriends.length === 0 && friends.length === 0 && (
                <div className="text-center text-muted-foreground py-2">
                  Add friends to see the leaderboard
                </div>
              )}

              {topFriends.length > 0 && (
                <div className="space-y-3">
                  {topFriends.map((friend, index) => (
                    <div key={friend.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-muted-foreground font-medium w-4">{index + 1}.</span>
                        <Avatar
                          src={friend.avatarUrl}
                          fallback={friend.username}
                          size={32}
                        />
                        <span className="font-medium">{friend.username}</span>
                      </div>
                      <span className="font-medium text-vercel-purple">{friend.weeklyCount}</span>
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