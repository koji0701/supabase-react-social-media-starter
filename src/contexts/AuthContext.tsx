
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for existing session and setup auth state listener
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setIsLoading(true);
          await fetchUserProfile(currentSession.user.id);
          setIsLoading(false);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      setIsLoading(true);
      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await fetchUserProfile(currentSession.user.id);
      }
      
      setIsLoading(false);
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Error fetching profile:", error);
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
      }
    } catch (error) {
      console.error("Unexpected error fetching profile:", error);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
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
    } finally {
      setIsLoading(false);
    }
  };

  // Signup function
  const signup = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });
      
      if (error) throw error;
      
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
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await supabase.auth.signOut();
      
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
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update weekly count (track relapse)
  const updateWeeklyCount = async () => {
    if (!user) return;
    
    try {
      // Call the database function to increment count and reset streak
      const { data, error } = await supabase.rpc(
        'increment_relapse_count', 
        { p_user_id: user.id }
      );
      
      if (error) throw error;
      
      // Refetch the profile to get updated data
      await fetchUserProfile(user.id);
      
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
        isAuthenticated: !!user,
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
