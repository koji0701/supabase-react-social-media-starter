import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "@/components/ui/use-toast";

interface Profile {
  id: string;
  username: string;
  email: string;
  weeklyCount: number;
  streakDays: number;
  lastRelapse: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  // isLoadingAuth: boolean; // REMOVED: No longer needed as session isn't persisted
  isFetchingProfile: boolean; // True while actively fetching profile after login
}

interface AuthActions {
  initializeAuth: () => void;
  fetchUserProfile: (userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateWeeklyCount: () => Promise<void>;
  updateAvatarUrl: (avatarUrl: string | null) => void;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  // isLoadingAuth: false, // REMOVED
  isFetchingProfile: false,
};

// Helper function to create stable profile object references
const createProfileObject = (data: any): Profile => {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    weeklyCount: data.weekly_count,
    streakDays: data.streak_days,
    lastRelapse: data.last_relapse,
    avatarUrl: data.avatar_url
  };
};
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  initializeAuth: () => {
    console.log("🔐 [AUTH] Initializing auth system and subscribing to auth state changes...");
    // With persistSession:false, onAuthStateChange will fire with INITIAL_SESSION and session=null.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`🔐 [AUTH] Auth state changed: event=${_event}, hasSession=${!!session}`);
      const currentUser = session?.user ?? null;
      
      // Update core authentication status
      set(state => ({ 
        ...state, 
        session, 
        user: currentUser, 
        isAuthenticated: !!currentUser,
      }));

      if (currentUser) {
        // If a user is now authenticated (e.g. after login), fetch their profile.
        // (get().profile?.id !== currentUser.id) handles re-login as different user or initial login.
        if (!get().profile || get().profile?.id !== currentUser.id) { 
          console.log(`🔐 [AUTH] User authenticated (${currentUser.id}), fetching/validating profile.`);
          await get().fetchUserProfile(currentUser.id);
        } else {
          // User is the same, profile already loaded, ensure isFetchingProfile is false.
          console.log(`🔐 [AUTH] User (${currentUser.id}) already has profile loaded. Ensuring fetching states are false.`);
          if (get().isFetchingProfile) {
            set({ isFetchingProfile: false });
          }
        }
      } else {
        // No user (e.g. after logout or initial load without session), clear profile and related states.
        console.log("🔐 [AUTH] No user, clearing profile.");
        set({ profile: null, isFetchingProfile: false });
      }
    });

    return () => {
      console.log("🔐 [AUTH] Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  },

  fetchUserProfile: async (userId: string) => {
    console.log(`👤 [PROFILE] Fetching profile for user ${userId}`);
    set({ isFetchingProfile: true });
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("👤 [PROFILE] Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: error.message || "Could not load your user profile.",
          variant: "destructive",
        });
        set({ profile: null, isFetchingProfile: false }); 
        return;
      }
      
      if (data) {
        const profileData = createProfileObject(data);
        set({
          profile: profileData,
          isFetchingProfile: false,
        });
        console.log("👤 [PROFILE] Profile loaded:", profileData);
      } else {
        console.warn(`👤 [PROFILE] No profile data found for user: ${userId}. Attempting to create one.`);
        const user = get().user;
        if (!user) {
          console.error("👤 [PROFILE] Cannot create profile - user object is null during profile fetch.");
          set({ profile: null, isFetchingProfile: false });
          return;
        }
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: user.email || '',
            username: user.user_metadata?.username || `user_${userId.substring(0, 6)}`,
            weekly_count: 0,
            streak_days: 0
          })
          .select('*')
          .single();
        
        if (createError) {
          console.error("👤 [PROFILE] Error creating profile:", createError);
          toast({ title: "Profile creation failed", variant: "destructive" });
          set({ profile: null, isFetchingProfile: false });
          return;
        }
        
        if (newProfile) {
          const profileData = createProfileObject(newProfile);
          set({ profile: profileData, isFetchingProfile: false });
          console.log("👤 [PROFILE] New profile created and loaded:", profileData);
        } else {
          set({ profile: null, isFetchingProfile: false }); 
        }
      }
    } catch (e: any) { 
      console.error("👤 [PROFILE] Unexpected error fetching profile:", e);
      toast({ title: "Error loading profile", variant: "destructive" });
      set({ profile: null, isFetchingProfile: false });
    }
  },

  login: async (email, password) => {
    console.log(`🔑 [LOGIN] Attempting login for ${email}`);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will trigger, setting user, session, isAuthenticated,
      // and initiating profile fetch.
      toast({ title: "Logged in successfully", description: "Welcome back!" });
    } catch (error: any) {
      console.error("🔑 [LOGIN] Login error:", error);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      // Ensure auth state reflects failure if onAuthStateChange doesn't immediately clear it.
      set(state => ({...state, isAuthenticated: false, user: null, profile: null, session: null, isFetchingProfile: false }));
      throw error;
    }
  },

  signup: async (username, email, password) => {
    console.log(`📝 [SIGNUP] Attempting signup for ${email} with username ${username}`);
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { username },
          emailRedirectTo: window.location.origin
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Signup succeeded but no user was returned");
      
      // onAuthStateChange will handle setting user, session, isAuthenticated,
      // and profile creation/fetching.
      toast({ title: "Signup successful", description: "Please check your email to verify your account if required." });
    } catch (error: any) {
      console.error("📝 [SIGNUP] Signup error:", error);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      set(state => ({...state, isAuthenticated: false, user: null, profile: null, session: null, isFetchingProfile: false }));
      throw error;
    }
  },

  logout: async () => {
    console.log("🚪 [LOGOUT] Logging out user");
    try {
      await supabase.auth.signOut();
      // onAuthStateChange will set user/profile to null, isAuthenticated to false, and isFetchingProfile to false.
      toast({ title: "Logged out", description: "You have been logged out." });
    } catch (error: any) {
      console.error("🚪 [LOGOUT] Logout error:", error);
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      // Force clear state on error too.
      set({ ...initialState, isFetchingProfile: false }); // Reset to initial state, ensuring isFetchingProfile is false
      throw error;
    }
  },
  
  updateWeeklyCount: async () => {
    const user = get().user;
    if (!user) {
      console.warn("📊 [COUNT] Update weekly count called but no user is authenticated.");
      return;
    }
    
    try {
      const { error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      if (error) throw error;
      await get().fetchUserProfile(user.id); // Refetch profile to get updated counts
      // toast({ title: "Relapse logged" });
    } catch (error: any) {
      console.error("📊 [COUNT] Error updating count:", error);
      toast({ title: "Error updating count", description: error.message || "Failed to log relapse.", variant: "destructive" });
    }
  },

  updateAvatarUrl: (avatarUrl: string | null) => {
    const currentProfile = get().profile;
    if (currentProfile) {
      set({
        profile: {
          ...currentProfile,
          avatarUrl
        }
      });
    }
  },
}));
// Initialize authentication listeners when the store is created/imported.
useAuthStore.getState().initializeAuth();