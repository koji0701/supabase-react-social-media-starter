
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import MainLayout from "@/components/layout/MainLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { profile, updateWeeklyCount } = useAuth();
  const { friends } = useFriends();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading your dashboard...</p>
        </div>
      </MainLayout>
    );
  }

  const handleRelapseClick = async () => {
    if (isConfirming) {
      await updateWeeklyCount();
      setIsConfirming(false);
    } else {
      setIsConfirming(true);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setIsConfirming(false), 3000);
    }
  };

  // Get top 3 friends for leaderboard preview
  const topFriends = [...friends]
    .sort((a, b) => a.weeklyCount - b.weeklyCount)
    .slice(0, 3);

  // Calculate streak statistics
  const streakDays = profile.streakDays;
  const maxStreakDays = 30; // Example max for progress bar

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your progress and stay accountable.
          </p>
        </div>

        {/* Main tracking button */}
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
          {/* Current streak */}
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

          {/* Leaderboard preview */}
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
              {topFriends.length > 0 ? (
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
              ) : (
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
