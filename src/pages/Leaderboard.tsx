
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import MainLayout from "@/components/layout/MainLayout";
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
  isCurrentUser: boolean;
  rank: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const { friends } = useFriends();
  const navigate = useNavigate();
  const [rankedUsers, setRankedUsers] = useState<RankedUser[]>([]);
  
  useEffect(() => {
    if (!user) return;
    
    // Combine current user with friends
    const allUsers = [
      {
        id: user.id,
        username: user.username,
        weeklyCount: user.weeklyCount,
        streakDays: user.streakDays,
        isCurrentUser: true
      },
      ...friends.map(friend => ({
        ...friend,
        isCurrentUser: false
      }))
    ];
    
    // Sort by weekly count (lowest first) and then by streak (highest first)
    const sorted = [...allUsers].sort((a, b) => {
      if (a.weeklyCount === b.weeklyCount) {
        return b.streakDays - a.streakDays;
      }
      return a.weeklyCount - b.weeklyCount;
    });
    
    // Add rank
    const ranked = sorted.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    
    setRankedUsers(ranked);
  }, [user, friends]);
  
  if (!user) {
    navigate("/");
    return null;
  }
  
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-amber-500 hover:bg-amber-600">1st</Badge>;
      case 2:
        return <Badge className="bg-slate-400 hover:bg-slate-500">2nd</Badge>;
      case 3:
        return <Badge className="bg-amber-800 hover:bg-amber-900">3rd</Badge>;
      default:
        return <Badge variant="outline">{rank}th</Badge>;
    }
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
          <Trophy className="h-8 w-8 text-goon-purple" />
        </div>
        
        {rankedUsers.length > 1 ? (
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
                    className={rankedUser.isCurrentUser ? "bg-goon-purple/10" : ""}
                  >
                    <TableCell className="font-medium">
                      {getRankBadge(rankedUser.rank)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-goon-purple/20 text-goon-purple">
                          {rankedUser.username.charAt(0).toUpperCase()}
                        </div>
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
