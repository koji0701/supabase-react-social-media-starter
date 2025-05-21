
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate, useParams } from "react-router-dom";

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

const FriendProfile = () => {
  const { user } = useAuth();
  const { friends, removeFriend } = useFriends();
  const navigate = useNavigate();
  const { friendId } = useParams<{ friendId: string }>();
  const [friend, setFriend] = useState<typeof friends[0] | null>(null);
  
  useEffect(() => {
    if (friendId && friends.length > 0) {
      const foundFriend = friends.find(f => f.id === friendId);
      setFriend(foundFriend || null);
    }
  }, [friendId, friends]);
  
  if (!user) {
    navigate("/");
    return null;
  }
  
  if (!friend) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Friend not found</h3>
          <p className="text-muted-foreground mb-4">
            This user may not be your friend anymore.
          </p>
          <Button onClick={() => navigate("/friends")}>
            Back to Friends
          </Button>
        </div>
      </MainLayout>
    );
  }
  
  const maxStreakDays = 30; // Example max for progress bar
  
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold mb-2">{friend.username}'s Profile</h1>
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
                {friend.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{friend.username}</h2>
                
                <div className="flex items-center mt-2 justify-center md:justify-start">
                  <Award className="h-4 w-4 mr-1 text-goon-purple" />
                  <span className="text-sm">
                    {friend.streakDays} day streak
                  </span>
                </div>
                
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      removeFriend(friend.id);
                      navigate("/friends");
                    }}
                    className="text-destructive hover:text-destructive/80"
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
          {/* Friend's streak */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" /> Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Clean</span>
                <span className="font-medium">{friend.streakDays} days</span>
              </div>
              <Progress value={(friend.streakDays / maxStreakDays) * 100} className="h-2" />
            </CardContent>
          </Card>
          
          {/* Weekly stats */}
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
                  {friend.weeklyCount}
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
