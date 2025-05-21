import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore"; // For current user context (e.g. ID)
import { useFriendsStore } from "@/stores/friendsStore"; // For friends list and removeFriend action
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client"; // Direct Supabase client for detailed profile

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Calendar, 
  Award, 
  Clock,
  ArrowLeft,
  UserMinus
} from "lucide-react";

interface FriendProfileData { // Renamed to avoid conflict with store's Profile type
  id: string;
  username: string;
  weeklyCount: number;
  streakDays: number;
  lastRelapse: string | null; // This is the key difference from Friend object in store
}

const FriendProfile = () => {
  const currentUser = useAuthStore((state) => state.user); // Get current user for context
  const { friends, removeFriend, loading: friendsLoading } = useFriendsStore();
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  
  const [friendProfile, setFriendProfile] = useState<FriendProfileData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true); // Local loading for this specific profile
  
  useEffect(() => {
    const fetchFriendDetails = async () => {
      if (!friendId || !currentUser) {
        setIsLoadingProfile(false);
        return;
      }
      
      setIsLoadingProfile(true);
      // First, check if basic info is in the friends list from the store
      const friendFromStore = friends.find(f => f.id === friendId);

      try {
        // Always fetch full profile from Supabase for `last_relapse` and latest data
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, weekly_count, streak_days, last_relapse')
          .eq('id', friendId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setFriendProfile({
            id: data.id,
            username: data.username,
            weeklyCount: data.weekly_count,
            streakDays: data.streak_days,
            lastRelapse: data.last_relapse
          });
        } else if (friendFromStore) {
          // Fallback to store data if Supabase fetch fails but friend exists in list
          // Note: lastRelapse will be null here
          setFriendProfile({ ...friendFromStore, lastRelapse: null });
        }

      } catch (error) {
        console.error("Error fetching friend profile:", error);
        // If Supabase fetch fails but friend was in store, use store data as fallback
        if (friendFromStore) {
            setFriendProfile({ ...friendFromStore, lastRelapse: null });
        }
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchFriendDetails();
  }, [friendId, currentUser, friends]); // Depend on friends from store to potentially update if list changes
  
  if (isLoadingProfile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading friend profile...</p>
        </div>
      </MainLayout>
    );
  }
  
  if (!friendProfile) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Friend not found</h3>
          <p className="text-muted-foreground mb-4">
            This user profile could not be loaded.
          </p>
          <Button onClick={() => navigate("/friends")}>
            Back to Friends
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  const maxStreakDays = 30; // Example max for progress bar
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };
  
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">{friendProfile.username}'s Profile</h1>
              <p className="text-muted-foreground">
                View your friend's progress.
              </p>
            </div>
          </div>
        </div>
        
        <Card className="bg-goon-charcoal/30 border-goon-charcoal/50">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:space-x-6 text-center md:text-left">
              <div className="flex items-center justify-center h-24 w-24 rounded-full bg-goon-purple/20 text-goon-purple text-4xl font-medium mb-4 md:mb-0">
                {friendProfile.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{friendProfile.username}</h2>
                
                <div className="flex items-center mt-2 justify-center md:justify-start">
                  <Award className="h-4 w-4 mr-1 text-goon-purple" />
                  <span className="text-sm">
                    {friendProfile.streakDays} day streak
                  </span>
                </div>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      await removeFriend(friendProfile.id);
                      navigate("/friends");
                    }}
                    className="text-destructive hover:text-destructive/80"
                    disabled={friendsLoading}
                    aria-label={`Remove ${friendProfile.username} as friend`}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Remove Friend
                  </Button>
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
                <span className="font-medium">{friendProfile.streakDays} days</span>
              </div>
              <Progress value={(friendProfile.streakDays / maxStreakDays) * 100} className="h-2" />
               {friendProfile.lastRelapse && (
                <div className="pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Last relapse</span>
                    <span>{formatDate(friendProfile.lastRelapse)}</span>
                  </div>
                </div>
              )}
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
                <span className="text-4xl font-bold text-goon-purple block mt-2">
                  {friendProfile.weeklyCount}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default FriendProfile;