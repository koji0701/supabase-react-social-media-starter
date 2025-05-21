import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Import useNavigate
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore
import AuthLayout from "@/components/layout/AuthLayout";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type FormData = z.infer<typeof formSchema>;

const Login = () => {
  console.log("🔄 [LOGIN PAGE] Rendering Login component");
  const login = useAuthStore((state) => state.login);
  const fetchUserProfile = useAuthStore((state) => state.fetchUserProfile);
  const user = useAuthStore((state) => state.user);
  const resetLoading = useAuthStore((state) => state.resetLoading);
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);
  const navigate = useNavigate(); // For navigation
  const [error, setError] = useState<string | null>(null); // Local form error
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Local submitting state for button
  
  // Track component mount and render stats
  useEffect(() => {
    console.log("🔄 [LOGIN PAGE] Component mounted");
    return () => {
      console.log("🔄 [LOGIN PAGE] Component unmounting");
    };
  }, []);
  
  useEffect(() => {
    // Debug logging
    console.log("🔄 [LOGIN PAGE] Auth state changed:", { 
      isAuthenticated, 
      isAuthLoading, 
      hasProfile: !!profile,
      hasUser: !!user,
      userId: user?.id,
      profileData: profile ? {
        id: profile.id,
        username: profile.username,
        email: profile.email 
      } : null
    });
    
    // If we're authenticated but don't have a profile, try fetching it directly
    if (isAuthenticated && user && !profile && !isAuthLoading) {
      console.log("🔄 [LOGIN PAGE] Authenticated but no profile, fetching profile manually");
      fetchUserProfile(user.id).catch(err => {
        console.error("🔄 [LOGIN PAGE] Manual profile fetch failed:", err);
      });
      return;
    }
    
    // Handle navigation when authenticated
    if (isAuthenticated && profile && !isAuthLoading) {
      console.log("🚀 [NAVIGATION] Redirecting to dashboard from Login");
      navigate('/dashboard');
    }
  }, [isAuthenticated, isAuthLoading, profile, navigate, user, fetchUserProfile]);
  
  // Force reset loading state if stuck
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthLoading) {
        console.log("⚠️ [LOGIN PAGE] Detected stuck loading state, resetting");
        resetLoading();
      }
    }, 10000); // 10 second safety timeout
    
    return () => clearTimeout(timer);
  }, [isAuthLoading, resetLoading]);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const onSubmit = async (data: FormData) => {
    console.log(`🔑 [LOGIN PAGE] Submitting login form for ${data.email}`);
    setError(null);
    setIsSubmitting(true);
    try {
      console.log("🔑 [LOGIN PAGE] Calling login function");
      await login(data.email, data.password);
      // No need to navigate here - the useEffect will handle it
      console.log("🔑 [LOGIN PAGE] Login function returned successfully");
    } catch (err) {
      // Error is already toasted by the authStore.
      // Set local error for inline display if needed.
      console.error("🔑 [LOGIN PAGE] Login error in component:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during login.");
      }
    } finally {
      console.log("🔑 [LOGIN PAGE] Login submission complete, resetting local submit state");
      setIsSubmitting(false);
    }
  };
  
  // Show loading state if already authenticated
  if (isAuthenticated && isAuthLoading) {
    console.log("🔄 [LOGIN PAGE] Rendering authenticated loading state");
    return (
      <AuthLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">Loading your account...</p>
        </div>
      </AuthLayout>
    );
  }
  
  console.log("🔄 [LOGIN PAGE] Rendering login form");
  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Sign In</h2>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      disabled={isSubmitting || isAuthLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                      disabled={isSubmitting || isAuthLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isAuthLoading}
            >
              {(isSubmitting || isAuthLoading) ? (
                "Signing in..."
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </>
              )}
            </Button>
          </form>
        </Form>
        
        <div className="text-center text-sm">
          <p>
            Don't have an account?{" "}
            <Link to="/signup" className="text-goon-purple hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;
