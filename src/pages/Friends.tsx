
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/contexts/FriendsContext";
import MainLayout from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  UserPlus, 
  Search, 
  User,
  UserCheck,
  UserMinus,
  X
} from "lucide-react";

const Friends = () => {
  const { user } = useAuth();
  const { 
    friends, 
    friendRequests, 
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest, 
    removeFriend,
    searchUsers
  } = useFriends();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{id: string, username: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  if (!user) {
    navigate("/");
    return null;
  }
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchUsers(searchQuery);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Friends</h1>
            <p className="text-muted-foreground">
              Manage your friends and stay accountable together.
            </p>
          </div>
          <Users className="h-8 w-8 text-goon-purple" />
        </div>
        
        <Tabs defaultValue="friends">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="friends" className="flex-1">
              <Users className="h-4 w-4 mr-2" /> Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" /> Add Friends
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1">
              <User className="h-4 w-4 mr-2" /> Requests ({friendRequests.length})
            </TabsTrigger>
          </TabsList>
          
          {/* Friends List Tab */}
          <TabsContent value="friends">
            <div className="space-y-4">
              {friends.length > 0 ? (
                friends.map(friend => (
                  <Card key={friend.id} className="bg-secondary/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-goon-purple/20 text-goon-purple">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{friend.username}</p>
                          <p className="text-sm text-muted-foreground">
                            {friend.weeklyCount} this week • {friend.streakDays} day streak
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/profile/${friend.id}`)}
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeFriend(friend.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Friends Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add friends to see them here and compete on the leaderboard.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* Add Friends Tab */}
          <TabsContent value="add">
            <div className="space-y-6">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search by username"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>
              
              <div className="space-y-4">
                {searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <Card key={result.id} className="bg-secondary/30">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-goon-purple/20 text-goon-purple">
                            {result.username.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium">{result.username}</p>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => sendFriendRequest(result.username)}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Friend
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  searchQuery ? (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">No results found</h3>
                      <p className="text-muted-foreground">
                        Try searching for a different username
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Search for friends</h3>
                      <p className="text-muted-foreground">
                        Enter a username to find and add friends
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Friend Requests Tab */}
          <TabsContent value="requests">
            <div className="space-y-4">
              {friendRequests.length > 0 ? (
                friendRequests.map(request => (
                  <Card key={request.id} className="bg-secondary/30">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-goon-purple/20 text-goon-purple">
                          {request.from.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{request.from.username}</p>
                          <p className="text-xs text-muted-foreground">
                            wants to be your friend
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => acceptFriendRequest(request.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => declineFriendRequest(request.id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Friend Requests</h3>
                  <p className="text-muted-foreground">
                    Friend requests will appear here when someone adds you
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Friends;
