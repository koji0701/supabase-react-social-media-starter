import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, User, Calendar } from "lucide-react";

interface RankedUser {
  id: string;
  username: string;
  weeklyCount: number;
  streakDays: number;
  avatarUrl?: string | null;
  isCurrentUser: boolean;
  rank: number;
}

const Leaderboard = () => {
  const profile = useAuthStore((state) => state.profile);
  const friends = useFriendsStore((state) => state.friends);
  const loadingFriends = useFriendsStore((state) => state.loading); // Loading state from friends store
  const navigate = useNavigate();
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  
  useEffect(() => {
    if (!profile) return;
    
    const allUsers = [
      {
        id: profile.id,
        username: profile.username,
        weeklyCount: profile.weeklyCount,
        streakDays: profile.streakDays,
        avatarUrl: profile.avatarUrl,
        isCurrentUser: true
      },
      ...friends.map(friend => ({
        ...friend,
        isCurrentUser: false
      }))
    ];
    
    const sorted = [...allUsers].sort((a, b) => {
      if (a.weeklyCount === b.weeklyCount) {
        return b.streakDays - a.streakDays;
      }
      return a.weeklyCount - b.weeklyCount;
    });
    
    const ranked = sorted.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    
    setRankedUsers(ranked);
  }, [profile, friends]);
  
  if (!profile) { // Auth profile still loading or not available
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading leaderboard...</p>
        </div>
      </MainLayout>
    );
  }
  
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-amber-500 hover:bg-amber-600">1st</Badge>;
    if (rank === 2) return <Badge className="bg-slate-400 hover:bg-slate-500">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-800 hover:bg-amber-900">3rd</Badge>;
    return <Badge variant="outline">{rank}th</Badge>;
  };
  
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
            <p className="text-muted-foreground">
              See how you compare with your friends this week.
            </p>
          </div>
          <Trophy className="h-8 w-8 text-vercel-purple" />
        </div>
        
        {loadingFriends && rankedUsers.length === 0 ? ( // Show loading if friends data is loading and no users yet
          <div className="text-center py-8">
            <p>Loading leaderboard data...</p>
          </div>
        ) : rankedUsers.length > 1 || (rankedUsers.length === 1 && rankedUsers[0].isCurrentUser) ? ( // Also show table if only current user exists
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Weekly Count</TableHead>
                  <TableHead className="text-right">Streak</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedUsers.map(rankedUser => (
                  <TableRow 
                    key={rankedUser.id}
                    className={rankedUser.isCurrentUser ? "bg-vercel-purple/10" : ""}
                  >
                    <TableCell className="font-medium">
                      {getRankBadge(rankedUser.rank)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar
                          src={rankedUser.avatarUrl}
                          fallback={rankedUser.username}
                          size={32}
                        />
                        <span className={rankedUser.isCurrentUser ? "font-medium" : ""}>
                          {rankedUser.username}
                          {rankedUser.isCurrentUser && " (You)"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {rankedUser.weeklyCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{rankedUser.streakDays} days</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!rankedUser.isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/profile/${rankedUser.id}`)}
                          aria-label={`View ${rankedUser.username}'s profile`}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mb-4">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Friends Yet</h3>
            <p className="text-muted-foreground mb-4">
              Add friends to see how you compare on the leaderboard.
            </p>
            <Button onClick={() => navigate("/friends")}>
              Add Friends
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Leaderboard;