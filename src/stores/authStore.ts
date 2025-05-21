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

// Helper function to create stable profile object references
const createProfileObject = (data: any): Profile => {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    weeklyCount: data.weekly_count,
    streakDays: data.streak_days,
    lastRelapse: data.last_relapse
  };
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  initializeAuth: () => {
    console.log("🔐 [AUTH] Initializing auth system...");
    // Set initial loading to true if it's not already (e.g. on hot reload)
    if (!get().isLoading) {
      set({ isLoading: true });
    }

    // Setup auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`🔐 [AUTH] Auth state changed: event=${_event}, hasSession=${!!session}`);
      try {
        set({ session, isLoading: true }); // Start loading for this change
        const currentUser = session?.user ?? null;
        console.log(`🔐 [AUTH] Setting user: ${currentUser?.email}, isAuthenticated=${!!currentUser}`);
        set({ user: currentUser, isAuthenticated: !!currentUser });

        if (currentUser) {
          try {
            console.log(`🔐 [AUTH] User authenticated, fetching profile for ${currentUser.id}`);
            await get().fetchUserProfile(currentUser.id);
            // fetchUserProfile will update profile and set isLoading to false when successful
          } catch (error) {
            console.error("🔐 [AUTH] Error in auth state change profile fetch:", error);
            set({ profile: null, isLoading: false });
          }
        } else {
          console.log("🔐 [AUTH] No user, clearing profile");
          set({ profile: null, isLoading: false }); // No user, clear profile, done loading
        }
      } catch (error) {
        console.error("🔐 [AUTH] Error in auth state change:", error);
        set({ ...initialState, isLoading: false });
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      console.log(`🔐 [AUTH] Initial session check: hasSession=${!!initialSession}, hasError=${!!error}`);
      if (error) {
        console.error("🔐 [AUTH] Error getting initial session:", error);
        set({ ...initialState, isLoading: false });
        return;
      }

      if (!initialSession) {
        // If no initial session, we are done loading
        console.log("🔐 [AUTH] No initial session found, clearing loading state");
        set({ ...initialState, isLoading: false });
      } else {
        console.log("🔐 [AUTH] Initial session found, onAuthStateChange will handle it");
      }
      // If initialSession exists, onAuthStateChange will handle it
    }).catch(error => {
      console.error("🔐 [AUTH] Unexpected error getting session:", error);
      set({ ...initialState, isLoading: false });
    });

    // Cleanup function not called in this context, but good practice
    return () => {
      subscription.unsubscribe();
    };
  },

  fetchUserProfile: async (userId: string) => {
    console.log(`👤 [PROFILE] Fetching profile for user ${userId}`);
    // This function specifically handles fetching and setting the profile.
    // It also sets isLoading to false as it's the last step in an auth flow.
    try {
      console.log(`👤 [PROFILE] Making Supabase query to profiles table with id=${userId}`);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log(`👤 [PROFILE] Query response:`, { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        errorDetails: error?.details,
        dataKeys: data ? Object.keys(data) : null,
        rawData: data
      });
      
      if (error) {
        console.error("👤 [PROFILE] Error fetching profile:", error);
        toast({
          title: "Error loading profile",
          description: error.message || "Could not load your user profile.",
          variant: "destructive",
        });
        set({ profile: null, isLoading: false }); // Done loading, but with error
        return;
      }
      
      if (data) {
        console.log(`👤 [PROFILE] Profile data found for user ${userId}:`, data);
        
        // Use the helper function to create a stable profile object
        const profileData = createProfileObject(data);
        
        console.log(`👤 [PROFILE] Parsed profile data:`, profileData);
        
        // Update state with profile data
        set({
          profile: profileData,
          isLoading: false, // Profile fetched, done loading
        });
        
        console.log("👤 [PROFILE] Auth state after profile load:", {
          isAuthenticated: get().isAuthenticated,
          isLoading: false,
          hasProfile: true,
          username: data.username
        });
      } else {
        console.error(`👤 [PROFILE] No profile data returned for user: ${userId}`);
        console.log("👤 [PROFILE] User exists but might not have a profile record. Creating one...");
        
        // Get current user data to help with profile creation
        const user = get().user;
        if (!user) {
          console.error("👤 [PROFILE] Cannot create profile - user object is null");
          set({ profile: null, isLoading: false });
          return;
        }
        
        try {
          // Try to create a profile for this user
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
            toast({
              title: "Profile creation failed",
              description: "Could not create a profile for your account.",
              variant: "destructive",
            });
            set({ profile: null, isLoading: false });
            return;
          }
          
          if (newProfile) {
            console.log("👤 [PROFILE] New profile created successfully:", newProfile);
            // Use the helper function to create a stable profile object
            const profileData = createProfileObject(newProfile);
            
            set({
              profile: profileData,
              isLoading: false
            });
          }
        } catch (createErr: any) {
          console.error("👤 [PROFILE] Unexpected error creating profile:", createErr);
          toast({
            title: "Profile creation failed",
            description: createErr.message || "An unknown error occurred.",
            variant: "destructive",
          });
          set({ profile: null, isLoading: false });
        }
      }
    } catch (e: any) { 
      console.error("👤 [PROFILE] Unexpected error fetching profile:", e);
      toast({
        title: "Error loading profile",
        description: e.message || "An unknown error occurred.",
        variant: "destructive",
      });
      set({ profile: null, isLoading: false }); // Done loading, with error
    }
  },

  login: async (email, password) => {
    console.log(`🔑 [LOGIN] Attempting login for ${email}`);
    set({ isLoading: true });
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      console.log(`🔑 [LOGIN] Login successful for ${email}`, data);
      
      // onAuthStateChange will handle fetching profile and setting final isLoading state
      toast({ title: "Logged in successfully", description: "Welcome back!" });
    } catch (error: any) {
      console.error("🔑 [LOGIN] Login error:", error);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      set({ isLoading: false }); // Explicitly set false on direct failure
      throw error; // Re-throw for component to handle navigation or further UI updates
    }
  },
  signup: async (username, email, password) => {
    console.log(`📝 [SIGNUP] Attempting signup for ${email} with username ${username}`);
    set({ isLoading: true });
    try {
      console.log(`📝 [SIGNUP] Calling supabase.auth.signUp`);
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { username },
          emailRedirectTo: window.location.origin
        },
      });
      
      console.log(`📝 [SIGNUP] SignUp response:`, { 
        hasError: !!error, 
        errorMessage: error?.message,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        userMetadata: data?.user?.user_metadata
      });
      
      if (error) throw error;
      
      if (!data.user) {
        throw new Error("Signup succeeded but no user was returned");
      }
      
      console.log(`📝 [SIGNUP] Signup successful, user created with ID: ${data.user.id}`);
      
      // The onAuthStateChange listener and subsequent fetchUserProfile call
      // will handle creating the profile if it doesn't exist.
      // fetchUserProfile already contains logic to create a profile if one isn't found.
      
      toast({ title: "Signup successful", description: "Welcome to GoonSquad! Please check your email to verify your account if required." });
    } catch (error: any) {
      console.error("📝 [SIGNUP] Signup error:", error);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    console.log("🚪 [LOGOUT] Logging out user");
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      console.log("🚪 [LOGOUT] Logout successful");
      // onAuthStateChange will set user/profile to null and isLoading to false.
      toast({ title: "Logged out", description: "You have been logged out." });
    } catch (error: any) {
      console.error("🚪 [LOGOUT] Logout error:", error);
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      set({ isLoading: false }); // Error, so explicitly set isLoading false
      throw error;
    }
  },
  
  updateWeeklyCount: async () => {
    const user = get().user;
    if (!user) return;
    
    console.log(`📊 [COUNT] Updating weekly count for user ${user.id}`);
    // Optimistically update profile for instant UI feedback, or wait for refetch
    // For simplicity, we'll refetch.
    try {
      const { error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      
      if (error) throw error;
      
      console.log(`📊 [COUNT] Weekly count updated, refetching profile`);
      await get().fetchUserProfile(user.id); // Refetch profile
      toast({
        title: "Relapse logged",
        description: "Stay strong. Every day is a new opportunity.",
      });
    } catch (error: any) {
      console.error("📊 [COUNT] Error updating count:", error);
      toast({
        title: "Error updating count",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
  },
  resetLoading: () => {
    console.log("⚠️ [AUTH] Force resetting loading state");
    set({isLoading: false});
  }
}));

// Initialize authentication listeners when the store is created/imported.
useAuthStore.getState().initializeAuth();
