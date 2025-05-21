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
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean; // For initial auth check and major auth operations
}

interface AuthActions {
  initializeAuth: () => void;
  fetchUserProfile: (userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateWeeklyCount: () => Promise<void>;
  resetLoading: () => void;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  initializeAuth: () => {
    // Set initial loading to true if it's not already (e.g. on hot reload)
    if (!get().isLoading) {
      set({ isLoading: true });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, isLoading: true }); // Start loading for this change
      const currentUser = session?.user ?? null;
      set({ user: currentUser, isAuthenticated: !!currentUser });

      if (currentUser) {
        await get().fetchUserProfile(currentUser.id);
        // fetchUserProfile will update profile, isLoading should be false after it if successful
      } else {
        set({ profile: null, isLoading: false }); // No user, clear profile, done loading
      }
    });

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!initialSession) {
        // If no initial session, and onAuthStateChange hasn't set user, we are done loading.
        if (!get().user) {
          set({ ...initialState, isLoading: false });
        }
      }
      // If initialSession exists, onAuthStateChange will handle it.
    });
  },

  fetchUserProfile: async (userId: string) => {
    // This function specifically handles fetching and setting the profile.
    // It also sets isLoading to false as it's the last step in an auth flow.
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: error.message || "Could not load your user profile.",
          variant: "destructive",
        });
        set({ profile: null, isLoading: false }); // Done loading, but with error
        return;
      }
      
      if (data) {
        set({
          profile: {
            id: data.id,
            username: data.username,
            email: data.email,
            weeklyCount: data.weekly_count,
            streakDays: data.streak_days,
            lastRelapse: data.last_relapse
          },
          isLoading: false, // Profile fetched, done loading
        });
      } else {
        console.error("No profile data returned for user:", userId);
        toast({
          title: "Profile not found",
          description: "Your user profile data could not be found.",
          variant: "destructive",
        });
        set({ profile: null, isLoading: false }); // Done loading, profile not found
      }
    } catch (e: any) { 
      console.error("Unexpected error fetching profile:", e);
      toast({
        title: "Error loading profile",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
      set({ profile: null, isLoading: false }); // Done loading, with error
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle fetching profile and setting final isLoading state
      toast({ title: "Logged in successfully", description: "Welcome back!" });
    } catch (error: any) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      set({ isLoading: false }); // Explicitly set false on direct failure
      throw error; // Re-throw for component to handle navigation or further UI updates
    }
  },

  signup: async (username, email, password) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) throw error;
      // onAuthStateChange will handle fetching profile and setting final isLoading state
      toast({ title: "Signup successful", description: "Welcome to GoonSquad!" });
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      // onAuthStateChange will set user/profile to null and isLoading to false.
      toast({ title: "Logged out", description: "You have been logged out." });
    } catch (error: any) {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      set({ isLoading: false }); // Error, so explicitly set isLoading false
      throw error;
    }
  },
  
  updateWeeklyCount: async () => {
    const user = get().user;
    if (!user) return;
    
    // Optimistically update profile for instant UI feedback, or wait for refetch
    // For simplicity, we'll refetch.
    try {
      const { error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      
      if (error) throw error;
      
      await get().fetchUserProfile(user.id); // Refetch profile
      toast({
        title: "Relapse logged",
        description: "Stay strong. Every day is a new opportunity.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating count",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
  },
  resetLoading: () => {
    set({isLoading: false});
  }
}));

// Initialize authentication listeners when the store is created/imported.
useAuthStore.getState().initializeAuth();