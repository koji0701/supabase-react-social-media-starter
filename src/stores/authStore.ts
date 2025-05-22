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
  isLoadingAuth: boolean; // Renamed: True until initial auth check is complete
  isFetchingProfile: boolean; // New: True while actively fetching profile
}

interface AuthActions {
  initializeAuth: () => void;
  fetchUserProfile: (userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateWeeklyCount: () => Promise<void>;
  // resetLoading removed as isLoadingAuth is simpler now
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isLoadingAuth: true, // Indicates initial auth check ongoing
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
    lastRelapse: data.last_relapse
  };
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initialState,

  initializeAuth: () => {
    console.log("🔐 [AUTH] Initializing auth system...");
    // isLoadingAuth is true by default. It will be set to false after the first session check/auth event.

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`🔐 [AUTH] Auth state changed: event=${_event}, hasSession=${!!session}`);
      const currentUser = session?.user ?? null;
      
      set(state => ({ 
        ...state, // Preserve existing state
        session, 
        user: currentUser, 
        isAuthenticated: !!currentUser,
        // isLoadingAuth will be set to false once, after the first event or initial getSession completes
      }));

      if (currentUser) {
        if (!get().profile || get().profile?.id !== currentUser.id) { // Fetch profile if no profile or different user
          console.log(`🔐 [AUTH] User authenticated (${currentUser.id}), fetching profile.`);
          await get().fetchUserProfile(currentUser.id);
        } else {
          console.log(`🔐 [AUTH] User (${currentUser.id}) already has profile loaded.`);
           // If profile for current user already exists, ensure loading states are false.
          if (get().isLoadingAuth || get().isFetchingProfile) {
            set({ isLoadingAuth: false, isFetchingProfile: false });
          }
        }
      } else {
        console.log("🔐 [AUTH] No user, clearing profile.");
        set({ profile: null, isLoadingAuth: false, isFetchingProfile: false });
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      console.log(`🔐 [AUTH] Initial session check: hasSession=${!!initialSession}, hasError=${!!error}`);
      if (error) {
        console.error("🔐 [AUTH] Error getting initial session:", error);
        set({ ...initialState, user: null, session: null, profile: null, isAuthenticated: false, isLoadingAuth: false, isFetchingProfile: false });
        return;
      }

      // If there's no initial session, onAuthStateChange might not fire immediately with USER_SIGNED_OUT or similar.
      // So, we ensure isLoadingAuth is set to false.
      // If a session *does* exist, onAuthStateChange will handle it and eventually set loading states.
      if (!initialSession && get().isLoadingAuth) { // Only update if still loading and no session
         console.log("🔐 [AUTH] No initial session, setting isLoadingAuth to false.");
         set({ isLoadingAuth: false, isFetchingProfile: false });
      }
      // If initialSession exists, onAuthStateChange is expected to fire and handle it.
      // If onAuthStateChange has already run (e.g. due to a fast event), isLoadingAuth might already be false.
    }).catch(error => {
      console.error("🔐 [AUTH] Unexpected error getting initial session:", error);
      set({ ...initialState, user: null, session: null, profile: null, isAuthenticated: false, isLoadingAuth: false, isFetchingProfile: false });
    });

    return () => {
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
        set({ profile: null, isFetchingProfile: false, isLoadingAuth: false }); // Ensure isLoadingAuth is false
        return;
      }
      
      if (data) {
        const profileData = createProfileObject(data);
        set({
          profile: profileData,
          isFetchingProfile: false,
          isLoadingAuth: false, // Ensure isLoadingAuth is false
        });
        console.log("👤 [PROFILE] Profile loaded:", profileData);
      } else {
        console.warn(`👤 [PROFILE] No profile data found for user: ${userId}. Attempting to create one.`);
        const user = get().user;
        if (!user) {
          console.error("👤 [PROFILE] Cannot create profile - user object is null");
          set({ profile: null, isFetchingProfile: false, isLoadingAuth: false });
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
          set({ profile: null, isFetchingProfile: false, isLoadingAuth: false });
          return;
        }
        
        if (newProfile) {
          const profileData = createProfileObject(newProfile);
          set({ profile: profileData, isFetchingProfile: false, isLoadingAuth: false });
          console.log("👤 [PROFILE] New profile created and loaded:", profileData);
        } else {
          set({ profile: null, isFetchingProfile: false, isLoadingAuth: false }); // Should not happen if insert succeeded
        }
      }
    } catch (e: any) { 
      console.error("👤 [PROFILE] Unexpected error fetching profile:", e);
      toast({ title: "Error loading profile", variant: "destructive" });
      set({ profile: null, isFetchingProfile: false, isLoadingAuth: false });
    }
  },

  login: async (email, password) => {
    console.log(`🔑 [LOGIN] Attempting login for ${email}`);
    // Login page can set its own local loading state for the form submission
    // No need to set global isLoadingAuth or isFetchingProfile here, onAuthStateChange will handle it.
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will trigger, setting user, session, and fetching profile.
      toast({ title: "Logged in successfully", description: "Welcome back!" });
    } catch (error: any) {
      console.error("🔑 [LOGIN] Login error:", error);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      // Potentially set isAuthenticated to false if login fails and somehow it was true
      set(state => ({...state, isAuthenticated: false, user: null, profile: null, session: null }));
      throw error;
    }
  },

  signup: async (username, email, password) => {
    console.log(`📝 [SIGNUP] Attempting signup for ${email} with username ${username}`);
    // Signup page can set its own local loading state
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
      
      // onAuthStateChange will handle profile creation if needed.
      toast({ title: "Signup successful", description: "Please check your email to verify your account if required." });
    } catch (error: any) {
      console.error("📝 [SIGNUP] Signup error:", error);
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      set(state => ({...state, isAuthenticated: false, user: null, profile: null, session: null }));
      throw error;
    }
  },

  logout: async () => {
    console.log("🚪 [LOGOUT] Logging out user");
    try {
      await supabase.auth.signOut();
      // onAuthStateChange will set user/profile to null, isAuthenticated to false.
      // It will also ensure isLoadingAuth and isFetchingProfile are false.
      toast({ title: "Logged out", description: "You have been logged out." });
    } catch (error: any) {
      console.error("🚪 [LOGOUT] Logout error:", error);
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      // Force clear state on error too
      set({ ...initialState, isLoadingAuth: false, isFetchingProfile: false });
      throw error;
    }
  },
  
  updateWeeklyCount: async () => {
    const user = get().user;
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      if (error) throw error;
      await get().fetchUserProfile(user.id); // Refetch profile
      toast({ title: "Relapse logged" });
    } catch (error: any) {
      console.error("📊 [COUNT] Error updating count:", error);
      toast({ title: "Error updating count", variant: "destructive" });
    }
  },
  // resetLoading is no longer needed with the new isLoadingAuth logic
}));

// Initialize authentication listeners when the store is created/imported.
useAuthStore.getState().initializeAuth();