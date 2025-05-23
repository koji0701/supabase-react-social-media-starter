import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useAuthStore } from "./authStore"; // Import auth store
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Friend {
  id: string;
  username: string;
  weeklyCount: number;
  streakDays: number;
  avatarUrl: string | null;
}

interface FriendRequest {
  id: string;
  from: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  status: "pending" | "accepted";
}

interface FriendsState {
  friends: Friend[];
  friendRequests: FriendRequest[];
  sentRequests: string[]; // Array of user IDs to whom we've sent pending requests
  loading: boolean; // For friends-specific operations
  realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  subscriptions: RealtimeChannel[];
  connectionAttempts: number;
  lastError: string | null;
}

interface FriendsActions {
  refreshFriends: () => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
  refreshSentRequests: () => Promise<void>; // New method to refresh sent requests
  searchUsers: (query: string) => Promise<{ id: string; username: string }[]>;
  sendFriendRequest: (username: string) => Promise<void>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  // Real-time subscription methods
  startRealtimeSubscriptions: () => Promise<void>;
  stopRealtimeSubscriptions: () => void;
  handleNewFriendRequest: (payload: any) => Promise<void>;
  handleFriendRequestUpdate: (payload: any) => void;
  handleFriendRequestDelete: (payload: any) => void;
  retryConnection: () => Promise<void>;
  clearError: () => void;
}

const initialState: FriendsState = {
  friends: [],
  friendRequests: [],
  sentRequests: [],
  loading: false,
  realtimeStatus: 'disconnected',
  subscriptions: [],
  connectionAttempts: 0,
  lastError: null,
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
          .select('id, username, weekly_count, streak_days, avatar_url')
          .in('id', Array.from(friendIds));
          
        if (profilesError) throw profilesError;
        
        const friends = (profilesData as any[] || []).map(profile => ({
          id: profile.id,
          username: profile.username,
          weeklyCount: profile.weekly_count,
          streakDays: profile.streak_days,
          avatarUrl: profile.avatar_url
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
          .select('id, username, avatar_url')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        const requests = (requestData as any[]).map(req => {
          const profile = (profilesData as any[] || []).find((p: any) => p.id === req.user_id);
          return {
            id: req.id,
            from: { 
              id: req.user_id, 
              username: profile?.username || 'Unknown',
              avatarUrl: profile?.avatar_url || null
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

  refreshSentRequests: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    set({ loading: true });
    try {
      const { data: sentRequestsData, error } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'pending');
        
      if (error) throw error;
      
      if (sentRequestsData && sentRequestsData.length > 0) {
        const sentRequestIds = (sentRequestsData as any[]).map(req => req.friend_id);
        set({ sentRequests: sentRequestIds });
      } else {
        set({ sentRequests: [] });
      }
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      toast({ title: 'Error', description: 'Failed to load sent requests', variant: 'destructive' });
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
      
      const insertData = { user_id: user.id, friend_id: (userData as any).id, status: 'pending' };
      console.log("🔄 [SEND_REQUEST] Inserting friend request:", insertData);
      
      const { data: insertResult, error } = await supabase
        .from('friendships')
        .insert(insertData)
        .select(); // Add select to see what was actually inserted
        
      if (error) throw error;
      
      console.log("🔄 [SEND_REQUEST] Friend request inserted successfully:", insertResult);
      
      // Update sentRequests state to include the new recipient
      set(state => ({
        sentRequests: [...state.sentRequests, (userData as any).id]
      }));
      
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
      await get().refreshSentRequests();
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
      await get().refreshSentRequests();
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

  // Real-time subscription methods
  startRealtimeSubscriptions: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.log("🔄 [REALTIME] Cannot start subscriptions: no authenticated user");
      return;
    }

    const { connectionAttempts } = get();
    const maxRetries = 3;
    const retryDelay = Math.min(1000 * (2 ** connectionAttempts), 10000); // Fixed Math.pow to ** operator

    if (connectionAttempts >= maxRetries) {
      console.log("🔄 [REALTIME] Max connection attempts reached");
      set({ 
        realtimeStatus: 'error',
        lastError: 'Maximum connection attempts exceeded'
      });
      return;
    }

    // Stop existing subscriptions first
    get().stopRealtimeSubscriptions();

    console.log(`🔄 [REALTIME] Starting friend request subscriptions for user: ${user.id} (attempt ${connectionAttempts + 1})`);
    set({ 
      realtimeStatus: 'connecting',
      connectionAttempts: connectionAttempts + 1,
      lastError: null
    });

    try {
      // Set auth token for realtime
      console.log("🔄 [REALTIME] Setting auth token for realtime connection");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("🔄 [REALTIME] Session details:", { 
        hasSession: !!session, 
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id 
      });
      
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
        console.log("🔄 [REALTIME] Auth token set successfully");
      } else {
        throw new Error("No valid session found for real-time connection");
      }

      // Subscribe to new friend requests (INSERTs where current user is friend_id)
      console.log(`🔄 [REALTIME] Setting up INSERT subscription with filter: friend_id=eq.${user.id}`);
      const friendRequestChannel = supabase
        .channel('friend-requests')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friendships',
            filter: `friend_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔄 [REALTIME] New friend request received:", payload);
            console.log("🔄 [REALTIME] Payload details:", {
              event: payload.eventType,
              table: payload.table,
              new: payload.new,
              schema: payload.schema
            });
            get().handleNewFriendRequest(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
            filter: `friend_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔄 [REALTIME] Friend request updated:", payload);
            get().handleFriendRequestUpdate(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'friendships',
            filter: `friend_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔄 [REALTIME] Friend request deleted:", payload);
            get().handleFriendRequestDelete(payload);
          }
        )
        .subscribe((status, err) => {
          console.log("🔄 [REALTIME] Subscription status changed:", { status, error: err });
          if (status === 'SUBSCRIBED') {
            console.log("🔄 [REALTIME] Friend requests subscription active");
            set({ 
              realtimeStatus: 'connected',
              connectionAttempts: 0,
              lastError: null
            });
          } else if (status === 'CHANNEL_ERROR') {
            console.error("🔄 [REALTIME] Friend requests subscription error:", err);
            const errorMessage = err?.message || 'Connection failed';
            set({ 
              realtimeStatus: 'error',
              lastError: errorMessage
            });
            
            // Auto-retry after delay
            setTimeout(() => {
              if (get().realtimeStatus === 'error') {
                get().retryConnection();
              }
            }, retryDelay);
          } else if (status === 'CLOSED') {
            console.log("🔄 [REALTIME] Connection closed, attempting to reconnect");
            setTimeout(() => {
              if (get().realtimeStatus !== 'connected') {
                get().retryConnection();
              }
            }, retryDelay);
          }
        });

      // Subscribe to friendship updates (for when requests are accepted by others)
      const friendshipUpdatesChannel = supabase
        .channel('friendship-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'friendships',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔄 [REALTIME] Friendship status updated:", payload);
            // Refresh friends list when a sent request is accepted
            if ((payload.new as any)?.status === 'accepted') {
              get().refreshFriends();
            }
            // Also refresh sent requests to update UI state
            get().refreshSentRequests();
          }
        )
        .subscribe((status, err) => {
          console.log("🔄 [REALTIME] Friendship updates subscription status:", { status, error: err });
        });

      // Store channels for cleanup
      set(state => ({
        subscriptions: [...state.subscriptions, friendRequestChannel, friendshipUpdatesChannel]
      }));

      console.log("🔄 [REALTIME] All subscriptions started successfully");
    } catch (error) {
      console.error("🔄 [REALTIME] Error starting subscriptions:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ 
        realtimeStatus: 'error',
        lastError: errorMessage
      });
      
      // Auto-retry after delay
      setTimeout(() => {
        if (get().realtimeStatus === 'error') {
          get().retryConnection();
        }
      }, retryDelay);
    }
  },

  stopRealtimeSubscriptions: () => {
    const { subscriptions } = get();
    console.log("🔄 [REALTIME] Stopping subscriptions:", subscriptions.length);
    
    for (const channel of subscriptions) {
      supabase.removeChannel(channel);
    }
    
    set({ 
      subscriptions: [],
      realtimeStatus: 'disconnected'
    });
  },

  handleNewFriendRequest: async (payload: any) => {
    try {
      console.log("🔄 [REALTIME] Raw payload received:", JSON.stringify(payload, null, 2));
      
      const newFriendship = payload.new;
      if (!newFriendship || newFriendship.status !== 'pending') {
        console.log("🔄 [REALTIME] Skipping - not a pending friend request:", { 
          hasNew: !!newFriendship, 
          status: newFriendship?.status 
        });
        return;
      }

      console.log("🔄 [REALTIME] Processing new friend request from:", newFriendship.user_id);

      // Get the sender's profile information with explicit typing
      const { data: senderProfile, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', newFriendship.user_id)
        .single();

      console.log("🔄 [REALTIME] Profile query result:", { 
        senderProfile, 
        error,
        hasData: !!senderProfile 
      });

      if (error) {
        console.error("🔄 [REALTIME] Error fetching sender profile:", error);
        return;
      }

      if (!senderProfile) {
        console.log("🔄 [REALTIME] No sender profile found");
        return;
      }

      // Type assertion to help TypeScript understand the structure
      const profile = senderProfile as { id: string; username: string };

      const newRequest: FriendRequest = {
        id: newFriendship.id,
        from: {
          id: profile.id,
          username: profile.username,
          avatarUrl: null
        },
        status: 'pending'
      };

      console.log("🔄 [REALTIME] Adding new request to state:", newRequest);

      // Add to friend requests state (check for duplicates first)
      set(state => {
        // Check if this request already exists
        const existingRequest = state.friendRequests.find(req => req.id === newRequest.id);
        if (existingRequest) {
          console.log("🔄 [REALTIME] Request already exists, skipping:", newRequest.id);
          return state; // Return unchanged state
        }

        const updatedRequests = [...state.friendRequests, newRequest];
        console.log("🔄 [REALTIME] Updated friend requests state:", {
          previousCount: state.friendRequests.length,
          newCount: updatedRequests.length,
          newRequest: newRequest
        });
        return {
          friendRequests: updatedRequests
        };
      });

      // Show notification
      toast({
        title: 'New Friend Request',
        description: `${profile.username} wants to be your friend!`,
      });

      console.log("🔄 [REALTIME] Friend request processed successfully");

    } catch (error) {
      console.error("🔄 [REALTIME] Error handling new friend request:", error);
    }
  },

  handleFriendRequestUpdate: (payload: any) => {
    const updatedFriendship = payload.new;
    if (!updatedFriendship) return;

    console.log("🔄 [REALTIME] Handling friend request update:", updatedFriendship);

    if (updatedFriendship.status === 'accepted') {
      // Remove from friend requests and refresh friends
      set(state => ({
        friendRequests: state.friendRequests.filter(req => req.id !== updatedFriendship.id)
      }));
      get().refreshFriends();
    }
    // Refresh sent requests to update UI state
    get().refreshSentRequests();
  },

  handleFriendRequestDelete: (payload: any) => {
    const deletedFriendship = payload.old;
    if (!deletedFriendship) return;

    console.log("🔄 [REALTIME] Handling friend request deletion:", deletedFriendship);

    // Remove from friend requests
    set(state => ({
      friendRequests: state.friendRequests.filter(req => req.id !== deletedFriendship.id)
    }));
    // Also refresh sent requests to update UI state
    get().refreshSentRequests();
  },

  retryConnection: async () => {
    console.log("🔄 [REALTIME] Retrying connection...");
    await get().startRealtimeSubscriptions();
  },

  clearError: () => {
    set({ 
      lastError: null,
      connectionAttempts: 0
    });
  },
}));

// Subscribe to authStore to react to user login/logout
useAuthStore.subscribe(
  (state, prevState) => {
    const currentUser = state.user;
    const previousUser = prevState.user;

    if (currentUser && (!previousUser || previousUser.id !== currentUser.id)) {
      console.log("[FriendsStore] User logged in or changed, refreshing friends data and starting realtime.");
      const friendsStore = useFriendsStore.getState();
      friendsStore.refreshFriends();
      friendsStore.refreshFriendRequests();
      friendsStore.refreshSentRequests();
      friendsStore.startRealtimeSubscriptions();
    } else if (!currentUser && previousUser) {
      console.log("[FriendsStore] User logged out, stopping realtime and resetting friends state.");
      const friendsStore = useFriendsStore.getState();
      friendsStore.stopRealtimeSubscriptions();
      useFriendsStore.setState(initialState);
    }
  }
);