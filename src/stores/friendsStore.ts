import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuthStore } from "./authStore"; // Import auth store

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

interface FriendsState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  loading: boolean; // For friends-specific operations
}

interface FriendsActions {
  refreshFriends: () => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
  searchUsers: (query: string) => Promise<{ id: string; username: string }[]>;
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
}

const initialState: FriendsState = {
  friends: [],
  friendRequests: [],
  loading: false,
};

export const useFriendsStore = create<FriendsState & FriendsActions>((set, get) => ({
  ...initialState,

  refreshFriends: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.log("Cannot refresh friends: no authenticated user");
      return;
    }
    
    set({ loading: true });
    try {
      console.log("Fetching friends for user:", user.id);
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
      
      console.log("Friend data fetched:", { 
        sentCount: sentFriendships?.length || 0, 
        receivedCount: receivedFriendships?.length || 0 
      });
      
      const combinedFriends = [
        ...(sentFriendships || []).map(f => ({
          id: f.friend_id,
          username: f.profiles.username,
          weeklyCount: f.profiles.weekly_count,
          streakDays: f.profiles.streak_days
        })),
        ...(receivedFriendships || []).map(f => ({
          id: f.user_id,
          username: f.profiles.username,
          weeklyCount: f.profiles.weekly_count,
          streakDays: f.profiles.streak_days
        }))
      ];
      set({ friends: combinedFriends });
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({ title: 'Error', description: 'Failed to load friends', variant: 'destructive' });
      // Set empty array to prevent undefined errors
      set({ friends: [] });
    } finally {
      set({ loading: false });
    }
  },
  
  refreshFriendRequests: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, profiles!friendships_user_id_fkey(id, username)')
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;
      
      const requests = data.map(request => ({
        id: request.id,
        from: { id: request.user_id, username: request.profiles.username },
        status: 'pending' as const
      }));
      set({ friendRequests: requests });
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({ title: 'Error', description: 'Failed to load friend requests', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },

  searchUsers: async (query: string) => {
    const user = useAuthStore.getState().user;
    if (!user || !query.trim()) return [];
    
    // No set({ loading: true }) here as it's a search, not main data loading
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .neq('id', user.id)
        .limit(10);
      if (error) throw error;
      
      const friendIds = new Set(get().friends.map(friend => friend.id));
      return data.filter(foundUser => !friendIds.has(foundUser.id));
    } catch (error) {
      console.error('Error searching users:', error);
      toast({ title: 'Error', description: 'Failed to search users', variant: 'destructive' });
      return [];
    }
  },

  sendFriendRequest: async (targetUsername: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true }); // This action modifies state that might be displayed, so loading is appropriate
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', targetUsername)
        .single();
      if (userError) throw userError;
      if (!userData) {
        toast({ title: 'User not found', description: `Could not find user ${targetUsername}`, variant: 'destructive' });
        set({loading: false});
        return;
      }
      
      const { data: existingRequest, error: checkError } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .or(`user_id.eq.${userData.id},friend_id.eq.${userData.id}`);
      if (checkError) throw checkError;
      
      if (existingRequest && existingRequest.length > 0) {
        toast({ title: 'Request already exists', variant: 'destructive' });
        set({loading: false});
        return;
      }
      
      const { error } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: userData.id, status: 'pending' });
      if (error) throw error;
      
      toast({ title: 'Request sent', description: `Friend request sent to ${targetUsername}` });
      // Potentially refresh pending sent requests if displaying them, or rely on target user's view.
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({ title: 'Error', description: error.message || 'Failed to send friend request', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },

  acceptFriendRequest: async (requestId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId)
        .eq('friend_id', user.id); // Ensure only the recipient can accept
      if (error) throw error;
      
      toast({ title: 'Request accepted', description: 'You are now friends!' });
      await get().refreshFriends();
      await get().refreshFriendRequests();
    } catch (error: any) {
      console.error('Error accepting friend request:', error);
      toast({ title: 'Error', description: error.message || 'Failed to accept request', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },

  declineFriendRequest: async (requestId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', requestId)
        .eq('friend_id', user.id); // Ensure only the recipient can decline
      if (error) throw error;
      
      toast({ title: 'Request declined' });
      await get().refreshFriendRequests();
    } catch (error: any) {
      console.error('Error declining friend request:', error);
      toast({ title: 'Error', description: error.message || 'Failed to decline request', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },

  removeFriend: async (friendId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
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
        
      if (error1 && error2) { // If both attempts failed. One might succeed if relationship is one way.
          // A more robust check might be needed if partial success is an issue.
          // For now, assume if one works, it's good. If both fail, then throw.
          // This logic might need adjustment based on how friendships are strictly managed.
          // If we can ensure error1 covers the case or error2 covers the case, this is fine.
          // To be safe, let's consider it an error if both fail.
          console.error('Error removing friend (attempt 1):', error1);
          console.error('Error removing friend (attempt 2):', error2);
          throw new Error("Failed to remove friendship from both perspectives.");
      }
      
      set(state => ({ friends: state.friends.filter(friend => friend.id !== friendId) }));
      toast({ title: 'Friend removed' });
      // No need to call refreshFriends, as we updated locally.
      // If other parts of app rely on full refresh, then call it.
    } catch (error: any) {
      console.error('Error removing friend:', error);
      toast({ title: 'Error', description: error.message || 'Failed to remove friend', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },
}));

// Subscribe to authStore to react to user login/logout
useAuthStore.subscribe(
  (state, prevState) => {
    const currentUser = state.user;
    const previousUser = prevState.user;

    if (currentUser && !previousUser) { // User logged in
      useFriendsStore.getState().refreshFriends();
      useFriendsStore.getState().refreshFriendRequests();
    } else if (!currentUser && previousUser) { // User logged out
      useFriendsStore.setState(initialState); // Reset to initial state
    }
  }
);