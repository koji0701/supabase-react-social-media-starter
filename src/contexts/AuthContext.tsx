
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface User {
  id: string;
  username: string;
  email: string;
  weeklyCount: number;
  streakDays: number;
  lastRelapse: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateWeeklyCount: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("goonSquad_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user:", error);
      }
    }
    setIsLoading(false);
  }, []);

  // Simulated login function
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      if (email === "demo@example.com" && password === "password") {
        // Demo user for testing
        const userData: User = {
          id: "user-1",
          username: "DemoUser",
          email: "demo@example.com",
          weeklyCount: 0,
          streakDays: 14,
          lastRelapse: null
        };
        
        setUser(userData);
        localStorage.setItem("goonSquad_user", JSON.stringify(userData));
        
        toast({
          title: "Logged in successfully",
          description: `Welcome back, ${userData.username}!`,
        });
        
        navigate("/dashboard");
      } else {
        // Check if user exists in localStorage (for users who have signed up)
        const users = JSON.parse(localStorage.getItem("goonSquad_users") || "[]");
        const foundUser = users.find((u: any) => u.email === email && u.password === password);
        
        if (foundUser) {
          const { password, ...userData } = foundUser;
          setUser(userData);
          localStorage.setItem("goonSquad_user", JSON.stringify(userData));
          
          toast({
            title: "Logged in successfully",
            description: `Welcome back, ${userData.username}!`,
          });
          
          navigate("/dashboard");
        } else {
          throw new Error("Invalid credentials");
        }
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Simulated signup function
  const signup = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Check if email already exists
      const users = JSON.parse(localStorage.getItem("goonSquad_users") || "[]");
      
      if (users.some((u: any) => u.email === email)) {
        throw new Error("Email already in use");
      }
      
      if (users.some((u: any) => u.username === username)) {
        throw new Error("Username already taken");
      }
      
      const newUser = {
        id: `user-${Date.now()}`,
        username,
        email,
        password, // In a real app, this would be hashed
        weeklyCount: 0,
        streakDays: 0,
        lastRelapse: null,
      };
      
      // Save to "database"
      users.push(newUser);
      localStorage.setItem("goonSquad_users", JSON.stringify(users));
      
      // Log the user in
      const { password: _, ...userData } = newUser;
      setUser(userData);
      localStorage.setItem("goonSquad_user", JSON.stringify(userData));
      
      toast({
        title: "Signup successful",
        description: `Welcome to GoonSquad, ${username}!`,
      });
      
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("goonSquad_user");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    navigate("/");
  };
  
  const updateWeeklyCount = () => {
    if (!user) return;
    
    const updatedUser = {
      ...user,
      weeklyCount: user.weeklyCount + 1,
      lastRelapse: new Date().toISOString(),
      streakDays: 0 // Reset streak on relapse
    };
    
    setUser(updatedUser);
    localStorage.setItem("goonSquad_user", JSON.stringify(updatedUser));
    
    toast({
      title: "Relapse logged",
      description: "Stay strong. Every day is a new opportunity.",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
