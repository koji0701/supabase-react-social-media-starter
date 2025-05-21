
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface Friend {
  id: string;
  username: string;
  weeklyCount: number;
  streakDays: number;
}

interface FriendRequest {
  id: string;
  from: {
    id: string;
    username: string;
  };
  status: "pending" | "accepted" | "declined";
}

interface FriendsContextType {
  friends: Friend[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (username: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  removeFriend: (friendId: string) => void;
  searchUsers: (query: string) => Promise<{ id: string; username: string }[]>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export const FriendsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Load friends and requests from local storage
  useEffect(() => {
    if (user) {
      const savedFriends = localStorage.getItem(`goonSquad_friends_${user.id}`);
      if (savedFriends) {
        setFriends(JSON.parse(savedFriends));
      } else {
        // Seed with mock friends for demo
        const mockFriends = [
          {
            id: "friend-1",
            username: "JohnDoe",
            weeklyCount: 2,
            streakDays: 3
          },
          {
            id: "friend-2",
            username: "JaneSmith",
            weeklyCount: 0,
            streakDays: 21
          }
        ];
        setFriends(mockFriends);
        localStorage.setItem(`goonSquad_friends_${user.id}`, JSON.stringify(mockFriends));
      }

      const savedRequests = localStorage.getItem(`goonSquad_requests_${user.id}`);
      if (savedRequests) {
        setFriendRequests(JSON.parse(savedRequests));
      }
    }
  }, [user]);

  // Mock search users function
  const searchUsers = async (query: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (!query.trim()) return [];

    const mockUsers = [
      { id: "user-1", username: "DemoUser" },
      { id: "user-2", username: "JohnDoe" },
      { id: "user-3", username: "JaneSmith" },
      { id: "user-4", username: "RobertJones" },
      { id: "user-5", username: "SarahWilliams" },
      { id: "user-6", username: "MichaelBrown" }
    ];

    // Filter out current user and already added friends
    return mockUsers
      .filter(mockUser => {
        if (!user) return false;
        if (mockUser.id === user.id) return false;
        if (friends.some(friend => friend.id === mockUser.id)) return false;
        
        return mockUser.username.toLowerCase().includes(query.toLowerCase());
      });
  };

  // Send friend request
  const sendFriendRequest = (username: string) => {
    if (!user) return;

    // In a real app, this would send an API request
    toast({
      title: "Friend request sent",
      description: `Request sent to ${username}`
    });

    // Simulate the request being accepted instantly for demo purposes
    const newFriend: Friend = {
      id: `friend-${Date.now()}`,
      username,
      weeklyCount: Math.floor(Math.random() * 5),
      streakDays: Math.floor(Math.random() * 30)
    };

    const updatedFriends = [...friends, newFriend];
    setFriends(updatedFriends);
    localStorage.setItem(`goonSquad_friends_${user.id}`, JSON.stringify(updatedFriends));
  };

  const acceptFriendRequest = (requestId: string) => {
    if (!user) return;

    const request = friendRequests.find(req => req.id === requestId);
    if (!request) return;

    const newFriend: Friend = {
      id: request.from.id,
      username: request.from.username,
      weeklyCount: Math.floor(Math.random() * 5),
      streakDays: Math.floor(Math.random() * 30)
    };

    // Add to friends
    const updatedFriends = [...friends, newFriend];
    setFriends(updatedFriends);
    localStorage.setItem(`goonSquad_friends_${user.id}`, JSON.stringify(updatedFriends));

    // Remove from requests
    const updatedRequests = friendRequests.filter(req => req.id !== requestId);
    setFriendRequests(updatedRequests);
    localStorage.setItem(`goonSquad_requests_${user.id}`, JSON.stringify(updatedRequests));

    toast({
      title: "Friend request accepted",
      description: `You are now friends with ${request.from.username}`
    });
  };

  const declineFriendRequest = (requestId: string) => {
    if (!user) return;

    const request = friendRequests.find(req => req.id === requestId);
    if (!request) return;

    const updatedRequests = friendRequests.filter(req => req.id !== requestId);
    setFriendRequests(updatedRequests);
    localStorage.setItem(`goonSquad_requests_${user.id}`, JSON.stringify(updatedRequests));

    toast({
      title: "Friend request declined",
      description: `You declined ${request.from.username}'s request`
    });
  };

  const removeFriend = (friendId: string) => {
    if (!user) return;

    const friend = friends.find(f => f.id === friendId);
    if (!friend) return;

    const updatedFriends = friends.filter(f => f.id !== friendId);
    setFriends(updatedFriends);
    localStorage.setItem(`goonSquad_friends_${user.id}`, JSON.stringify(updatedFriends));

    toast({
      title: "Friend removed",
      description: `You removed ${friend.username} from your friends`
    });
  };

  return (
    <FriendsContext.Provider
      value={{
        friends,
        friendRequests,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        searchUsers
      }}
    >
      {children}
    </FriendsContext.Provider>
  );
};

export const useFriends = () => {
  const context = useContext(FriendsContext);
  if (context === undefined) {
    throw new Error("useFriends must be used within a FriendsProvider");
  }
  return context;
};
