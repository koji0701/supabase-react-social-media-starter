
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  status: "pending" | "accepted";
}

interface FriendsContextType {
  friends: Friend[];
  friendRequests: FriendRequest[];
  loading: boolean;
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<{ id: string; username: string }[]>;
  refreshFriends: () => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
}

const FriendsContext = createContext<FriendsContextType | undefined>(undefined);

export const FriendsProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Load friends and friend requests when user changes
  useEffect(() => {
    if (user) {
      refreshFriends();
      refreshFriendRequests();
    } else {
      setFriends([]);
      setFriendRequests([]);
    }
  }, [user]);

  // Fetch friends from Supabase
  const refreshFriends = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get friendships where user is either the requester or the recipient and status is 'accepted'
      const { data: sentFriendships, error: sentError } = await supabase
        .from('friendships')
        .select('friend_id, profiles!friendships_friend_id_fkey(*)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      if (sentError) throw sentError;
      
      const { data: receivedFriendships, error: receivedError } = await supabase
        .from('friendships')
        .select('user_id, profiles!friendships_user_id_fkey(*)')
        .eq('friend_id', user.id)
        .eq('status', 'accepted');
      
      if (receivedError) throw receivedError;
      
      // Combine both friendship types into a single friends array
      const combinedFriends = [
        ...sentFriendships.map(f => ({
          id: f.friend_id,
          username: f.profiles.username,
          weeklyCount: f.profiles.weekly_count,
          streakDays: f.profiles.streak_days
        })),
        ...receivedFriendships.map(f => ({
          id: f.user_id,
          username: f.profiles.username,
          weeklyCount: f.profiles.weekly_count,
          streakDays: f.profiles.streak_days
        }))
      ];
      
      setFriends(combinedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({
        title: 'Error',
        description: 'Failed to load friends',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch friend requests from Supabase
  const refreshFriendRequests = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get pending friend requests sent to the current user
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, profiles!friendships_user_id_fkey(id, username)')
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      const requests = data.map(request => ({
        id: request.id,
        from: {
          id: request.user_id,
          username: request.profiles.username
        },
        status: 'pending' as const
      }));
      
      setFriendRequests(requests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load friend requests',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Search users by username
  const searchUsers = async (query: string) => {
    if (!user || !query.trim()) return [];
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .neq('id', user.id)
        .limit(10);
      
      if (error) throw error;
      
      // Filter out users who are already friends
      const friendIds = new Set(friends.map(friend => friend.id));
      
      return data.filter(foundUser => !friendIds.has(foundUser.id));
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive'
      });
      return [];
    }
  };

  // Send friend request
  const sendFriendRequest = async (username: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // First get the user ID for this username
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
      
      if (userError) throw userError;
      
      if (!userData) {
        toast({
          title: 'User not found',
          description: `Could not find user ${username}`,
          variant: 'destructive'
        });
        return;
      }
      
      // Check if a friendship request already exists
      const { data: existingRequest, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .or(`user_id.eq.${userData.id},friend_id.eq.${userData.id}`);
      
      if (checkError) throw checkError;
      
      if (existingRequest && existingRequest.length > 0) {
        toast({
          title: 'Request already exists',
          description: 'A friend request already exists between you and this user',
          variant: 'destructive'
        });
        return;
      }
      
      // Insert the new friend request
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: userData.id,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast({
        title: 'Request sent',
        description: `Friend request sent to ${username}`
      });
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to send friend request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('friend_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Request accepted',
        description: 'You are now friends with this user'
      });
      
      // Refresh friends and requests lists
      refreshFriends();
      refreshFriendRequests();
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to accept friend request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Decline friend request
  const declineFriendRequest = async (requestId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('friend_id', user.id);
      
      if (error) throw error;
      
      toast({
        title: 'Request declined',
        description: 'Friend request has been declined'
      });
      
      // Refresh the requests list
      refreshFriendRequests();
    } catch (error: any) {
      console.error('Error declining friend request:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to decline friend request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove friend
  const removeFriend = async (friendId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Need to check both ways since friendship can be stored either way
      const { error: error1 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);
      
      const { error: error2 } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id);
      
      if (error1 && error2) throw error1;
      
      // Update the local friends list
      setFriends(friends.filter(friend => friend.id !== friendId));
      
      toast({
        title: 'Friend removed',
        description: 'This user has been removed from your friends'
      });
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to remove friend',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <FriendsContext.Provider
      value={{
        friends,
        friendRequests,
        loading,
        sendFriendRequest,
        acceptFriendRequest,
        declineFriendRequest,
        removeFriend,
        searchUsers,
        refreshFriends,
        refreshFriendRequests
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
