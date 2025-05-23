import { useAuthStore } from "@/stores/authStore";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarUpload } from "@/components/avatar";
import { 
  User, 
  Calendar, 
  Award, 
  Clock,
  ArrowRight
} from "lucide-react";

const Profile = () => {
  const profile = useAuthStore((state) => state.profile);
  const updateAvatarUrl = useAuthStore((state) => state.updateAvatarUrl);
  const navigate = useNavigate();
  
  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading your profile...</p>
        </div>
      </MainLayout>
    );
  }
  
  const maxStreakDays = 30; // Example max for progress bar
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  // Handle avatar upload success
  const handleAvatarUpload = (filePath: string) => {
    // Update the avatar URL in the store
    updateAvatarUrl(filePath || null);
  };
  
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Profile</h1>
            <p className="text-muted-foreground">
              View your progress and statistics.
            </p>
          </div>
          <User className="h-8 w-8 text-vercel-purple" />
        </div>
        
        {/* Profile Header with Avatar */}
        <Card className="vercel-card">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row items-center lg:space-x-6 text-center lg:text-left space-y-6 lg:space-y-0">
              {/* Avatar Section */}
              <div className="flex-shrink-0">
                <AvatarUpload
                  currentAvatarUrl={profile.avatarUrl}
                  onUpload={handleAvatarUpload}
                  size={120}
                />
              </div>
              
              {/* Profile Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{profile.username}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                
                <div className="flex items-center mt-2 justify-center lg:justify-start">
                  <Award className="h-4 w-4 mr-1 text-vercel-purple" />
                  <span className="text-sm">Active Member</span> 
                </div>
              </div>
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
                <span className="font-medium">{profile.streakDays} days</span>
              </div>
              <Progress value={(profile.streakDays / maxStreakDays) * 100} className="h-2" />
              
              <div className="pt-4">
                <div className="flex justify-between text-sm">
                  <span>Last relapse</span>
                  <span>{formatDate(profile.lastRelapse)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2" /> This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <span className="text-muted-foreground block">Total Relapses</span>
                <span className="text-4xl font-bold text-vercel-purple block mt-2">
                  {profile.weeklyCount}
                </span>
                <Button 
                  variant="link" 
                  className="mt-4 text-vercel-purple"
                  onClick={() => navigate("/leaderboard")}
                >
                  View Leaderboard <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;