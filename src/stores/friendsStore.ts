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
      
      // Get friendships
      const { data: friendshipData, error: friendshipError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');
        
      if (friendshipError) throw friendshipError;
      
      // Extract friend IDs
      const friendIds = new Set<string>();
      if (friendshipData) {
        for (const friendship of friendshipData as any[]) {
          if (friendship.user_id === user.id) {
            friendIds.add(friendship.friend_id);
          } else if (friendship.friend_id === user.id) {
            friendIds.add(friendship.user_id);
          }
        }
      }
      
      // Get friend profiles
      if (friendIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, weekly_count, streak_days')
          .in('id', Array.from(friendIds));
          
        if (profilesError) throw profilesError;
        
        const friends = (profilesData as any[] || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          weeklyCount: profile.weekly_count,
          streakDays: profile.streak_days
        }));
        
        set({ friends });
      } else {
        set({ friends: [] });
      }
      
      console.log("Friends loaded:", friendIds.size);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast({ title: 'Error', description: 'Failed to load friends', variant: 'destructive' });
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
      const { data: requestData, error } = await supabase
        .from('friendships')
        .select('id, user_id')
        .eq('friend_id', user.id)
        .eq('status', 'pending');
        
      if (error) throw error;
      
      if (requestData && requestData.length > 0) {
        const userIds = (requestData as any[]).map(req => req.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        const requests = (requestData as any[]).map(req => {
          const profile = (profilesData as any[] || []).find((p: any) => p.id === req.user_id);
          return {
            id: req.id,
            from: { 
              id: req.user_id, 
              username: profile?.username || 'Unknown' 
            },
            status: 'pending' as const
          };
        }).filter(req => req.from.username !== 'Unknown');
        
        set({ friendRequests: requests });
      } else {
        set({ friendRequests: [] });
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
      toast({ title: 'Error', description: 'Failed to load friend requests', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },

  searchUsers: async (query: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || !query.trim()) return [];

    console.log("🔍 [SEARCH] Starting search for:", query, "as user:", currentUser.id);

    try {
      // Step 1: Search profiles
      const { data: matchingProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .neq('id', currentUser.id)
        .limit(10);

      if (profilesError) throw profilesError;
      console.log("🔍 [SEARCH] Found profiles:", matchingProfiles?.length || 0);
      
      if (!matchingProfiles || matchingProfiles.length === 0) {
        console.log("🔍 [SEARCH] No matching profiles found");
        return [];
      }

      // Step 2: Get existing friendships to exclude
      const { data: existingFriendships, error: friendshipError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .in('status', ['pending', 'accepted']);
      
      if (friendshipError) throw friendshipError;
      
      // Step 3: Build exclusion set
      const excludedUserIds = new Set<string>();
      if (existingFriendships) {
        for (const friendship of existingFriendships as any[]) {
          if (friendship.user_id === currentUser.id) {
            excludedUserIds.add(friendship.friend_id);
          } else if (friendship.friend_id === currentUser.id) {
            excludedUserIds.add(friendship.user_id);
          }
        }
      }
      
      // Step 4: Filter results
      const filteredResults = (matchingProfiles as any[]).filter(profile => 
        !excludedUserIds.has(profile.id)
      );
      
      console.log("🔍 [SEARCH] Returning", filteredResults.length, "results after filtering");
      return filteredResults;

    } catch (error) {
      console.error('🔍 [SEARCH] Error searching users:', error);
      toast({ title: 'Error', description: 'Failed to search users', variant: 'destructive' });
      return [];
    }
  },

  sendFriendRequest: async (targetUsername: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', targetUsername)
        .single();
        
      if (userError) throw userError;
      if (!userData) {
        toast({ title: 'User not found', description: `Could not find user ${targetUsername}`, variant: 'destructive' });
        return;
      }
      
      // Check for existing relationship
      const { data: existingRelationship, error: checkError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${(userData as any).id}),and(user_id.eq.${(userData as any).id},friend_id.eq.${user.id})`)
        .in('status', ['pending', 'accepted'])
        .limit(1);

      if (checkError) throw checkError;
      
      if (existingRelationship && existingRelationship.length > 0) {
        const relationship = existingRelationship[0] as any;
        if (relationship.status === 'accepted') {
           toast({ title: 'Already friends', description: `You are already friends with ${targetUsername}.`, variant: 'default' });
        } else if (relationship.status === 'pending') {
           toast({ title: 'Request pending', description: `A friend request involving you and ${targetUsername} is already pending.`, variant: 'default' });
        }
        return;
      }
      
      const { error } = await supabase
        .from('friendships')
        .insert({ user_id: user.id, friend_id: (userData as any).id, status: 'pending' });
        
      if (error) throw error;
      toast({ title: 'Request sent', description: `Friend request sent to ${targetUsername}` });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({ title: 'Error', description: 'Failed to send friend request', variant: 'destructive' });
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
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .eq('friend_id', user.id);
        
      if (error) throw error;
      
      toast({ title: 'Request accepted', description: 'You are now friends!' });
      await get().refreshFriends();
      await get().refreshFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({ title: 'Error', description: 'Failed to accept request', variant: 'destructive' });
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
        .eq('friend_id', user.id);
        
      if (error) throw error;
      
      toast({ title: 'Request declined' });
      await get().refreshFriendRequests();
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast({ title: 'Error', description: 'Failed to decline request', variant: 'destructive' });
    } finally {
      set({ loading: false });
    }
  },

  removeFriend: async (friendId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId},status.eq.accepted),and(user_id.eq.${friendId},friend_id.eq.${user.id},status.eq.accepted)`);
        
      if (error) throw error;
      
      set(state => ({ friends: state.friends.filter(friend => friend.id !== friendId) }));
      toast({ title: 'Friend removed' });
    } catch (error) {
      console.error('Error removing friend:', error);
      toast({ title: 'Error', description: 'Failed to remove friend', variant: 'destructive' });
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

    if (currentUser && (!previousUser || previousUser.id !== currentUser.id)) {
      console.log("[FriendsStore] User logged in or changed, refreshing friends data.");
      useFriendsStore.getState().refreshFriends();
      useFriendsStore.getState().refreshFriendRequests();
    } else if (!currentUser && previousUser) {
      console.log("[FriendsStore] User logged out, resetting friends state.");
      useFriendsStore.setState(initialState);
    }
  }
);