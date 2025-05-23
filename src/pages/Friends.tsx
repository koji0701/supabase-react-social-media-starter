import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useFriendsStore } from "@/stores/friendsStore";
import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/avatar";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TabsContents // Added TabsContents for animated container
} from "@/components/animate-ui/components/tabs";
import { 
  Users, 
  UserPlus, 
  Search, 
  User,
  UserCheck,
  UserMinus,
  X,
  Wifi,
  WifiOff,
  AlertCircle
} from "lucide-react";

const Friends = () => {
  const profile = useAuthStore((state) => state.profile);
  const { 
    friends, 
    friendRequests,
    sentRequests,
    sendFriendRequest, 
    acceptFriendRequest, 
    declineFriendRequest, 
    removeFriend,
    searchUsers,
    loading: friendsLoading, // Renamed to avoid conflict with local isSearching
    realtimeStatus,
    lastError,
    retryConnection,
    clearError
  } = useFriendsStore();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{id: string, username: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false); // Local search operation loading
  
  if (!profile) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading your friends...</p>
        </div>
      </MainLayout>
    );
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
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getRealtimeStatusIcon = () => {
    switch (realtimeStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRealtimeStatusText = () => {
    switch (realtimeStatus) {
      case 'connected':
        return 'Real-time active';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection error';
      default:
        return 'Real-time inactive';
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
            {/* <div className="flex items-center mt-2 text-sm text-muted-foreground">
              {getRealtimeStatusIcon()}
              <span className="ml-2">{getRealtimeStatusText()}</span>
              {realtimeStatus === 'error' && lastError && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-2 text-xs"
                  onClick={() => {
                    clearError();
                    retryConnection();
                  }}
                >
                  Retry
                </Button>
              )}
            </div> */}
          </div>
          <Users className="h-8 w-8 text-vercel-purple" />
        </div>
        
        <Tabs defaultValue="friends" as any>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="friends" className="flex-1">
              <Users className="h-4 w-4 mr-2" /> Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" /> Add Friends
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 relative">
              <User className="h-4 w-4 mr-2" /> Requests ({friendRequests.length})
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-vercel-purple rounded-full animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContents> {/* Wrap TabsContent components with TabsContents */}
            <TabsContent value="friends">
              <div className="space-y-4">
                {friendsLoading ? ( // Use friendsLoading from store for this tab
                  <div className="text-center py-4">Loading friends...</div>
                ) : friends.length > 0 ? (
                  friends.map(friend => (
                    <Card key={friend.id} className="bg-secondary/30">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            src={friend.avatarUrl}
                            fallback={friend.username}
                            size={40}
                          />
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
                            aria-label={`View ${friend.username}'s profile`}
                          >
                            <User className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeFriend(friend.id)}
                            className="text-destructive hover:text-destructive/80"
                            aria-label={`Remove ${friend.username} as friend`}
                            disabled={friendsLoading}
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
                  <Button onClick={handleSearch} disabled={isSearching || friendsLoading}>
                    <Search className="h-4 w-4 mr-2" />
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {isSearching ? ( // Use local isSearching for search results part
                    <div className="text-center py-4">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map(result => (
                      <Card key={result.id} className="bg-secondary/30">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar
                              src={null} // Search results don't include avatar URLs
                              fallback={result.username}
                              size={40}
                            />
                            <p className="font-medium">{result.username}</p>
                          </div>
                          <Button 
                            variant={sentRequests.includes(result.id) ? "secondary" : "outline"}
                            size="sm"
                            disabled={friendsLoading || sentRequests.includes(result.id)}
                            onClick={() => sendFriendRequest(result.username)}
                          >
                            {sentRequests.includes(result.id) ? (
                              <UserCheck className="h-4 w-4 mr-2" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-2" />
                            )}
                            {sentRequests.includes(result.id) ? "Request Sent" : "Add Friend"}
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    searchQuery && !isSearching ? ( // ensure not to show "no results" while searching
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">No results found</h3>
                        <p className="text-muted-foreground">
                          Try searching for a different username
                        </p>
                      </div>
                    ) : (
                      !searchQuery && !isSearching && // Only show initial placeholder if not searching and no query
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
            
            <TabsContent value="requests">
              <div className="space-y-4">
                {friendsLoading ? ( // Use friendsLoading for this tab too
                  <div className="text-center py-4">Loading requests...</div>
                ) : friendRequests.length > 0 ? (
                  friendRequests.map(request => (
                    <Card key={request.id} className="bg-secondary/30">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar
                            src={request.from.avatarUrl}
                            fallback={request.from.username}
                            size={40}
                          />
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
                            disabled={friendsLoading}
                            onClick={() => acceptFriendRequest(request.id)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={friendsLoading}
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
          </TabsContents>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Friends;