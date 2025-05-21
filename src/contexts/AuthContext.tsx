import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string;
  email: string;
  weeklyCount: number;
  streakDays: number;
  lastRelapse: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateWeeklyCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        const currentUser = currentSession?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          setIsLoading(true); // Set loading before fetching profile
          await fetchUserProfile(currentUser.id);
          setIsLoading(false); // Clear loading after fetching profile
        } else {
          setProfile(null);
          setIsLoading(false); // Clear loading if no user (e.g., logout)
        }
      }
    );

    const initializeAuth = async () => {
      setIsLoading(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      // onAuthStateChange will handle setting user, profile, and final isLoading state
      // if there's a session. If no session, onAuthStateChange handles it too.
      // This call primarily ensures the session is checked.
      // The crucial part is that isLoading is false after all checks.
      if (!currentSession) {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
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
          description: error.message || "Could not load your user profile. Please try again later.",
          variant: "destructive",
        });
        setProfile(null); // Explicitly set to null on error
        return;
      }
      
      if (data) {
        setProfile({
          id: data.id,
          username: data.username,
          email: data.email,
          weeklyCount: data.weekly_count,
          streakDays: data.streak_days,
          lastRelapse: data.last_relapse
        });
      } else {
        // This case should ideally be caught by .single() if no data, 
        // which would make 'error' non-null.
        console.error("No profile data returned for user:", userId);
        toast({
          title: "Profile not found",
          description: "Your user profile data could not be found.",
          variant: "destructive",
        });
        setProfile(null);
      }
    } catch (e) { 
      console.error("Unexpected error fetching profile:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({
        title: "Error loading profile",
        description: errorMessage,
        variant: "destructive",
      });
      setProfile(null); 
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true); 
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // onAuthStateChange will handle fetching profile and setting final isLoading state
      toast({
        title: "Logged in successfully",
        description: "Welcome back!",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error?.message || "Invalid credentials",
        variant: "destructive",
      });
      setIsLoading(false); // Ensure loading is false on login failure
    }
    // isLoading will be set to false by onAuthStateChange after profile fetch or if no user
  };

  const signup = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });
      
      if (error) throw error;
      
      // onAuthStateChange will handle fetching profile and setting final isLoading state
      toast({
        title: "Signup successful",
        description: "Welcome to GoonSquad!",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error?.message || "An unknown error occurred",
        variant: "destructive",
      });
      setIsLoading(false); // Ensure loading is false on signup failure
    }
  };

  const logout = async () => {
    setIsLoading(true); // Set loading true before sign out
    try {
      await supabase.auth.signOut();
      // onAuthStateChange will set user to null, profile to null, and isLoading to false.
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error?.message || "An unknown error occurred",
        variant: "destructive",
      });
      setIsLoading(false); // Ensure loading is false on logout failure
    }
  };
  
  const updateWeeklyCount = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      
      if (error) throw error;
      
      // Refetch the profile to get updated data
      // setIsLoading(true); // Optional: indicate loading for profile refresh
      await fetchUserProfile(user.id);
      // setIsLoading(false); // Optional: clear loading
      
      toast({
        title: "Relapse logged",
        description: "Stay strong. Every day is a new opportunity.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating count",
        description: error?.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        login,
        signup,
        logout,
        isAuthenticated: !!user, // Based on Supabase user object
        isLoading,
        updateWeeklyCount
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};