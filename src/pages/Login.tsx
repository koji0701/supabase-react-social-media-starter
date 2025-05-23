import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
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
  const user = useAuthStore((state) => state.user);
  // const isLoadingAuth = useAuthStore((state) => state.isLoadingAuth); // REMOVED
  const isFetchingProfile = useAuthStore((state) => state.isFetchingProfile);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const profile = useAuthStore((state) => state.profile);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  useEffect(() => {
    console.log("🔄 [LOGIN PAGE] Component mounted");
    return () => {
      console.log("🔄 [LOGIN PAGE] Component unmounting");
    };
  }, []);
  
  useEffect(() => {
    console.log("🔄 [LOGIN PAGE] Auth state changed:", { 
      isAuthenticated, 
      // isLoadingAuth, // REMOVED
      isFetchingProfile,
      hasProfile: !!profile,
      hasUser: !!user,
      userId: user?.id,
    });
    
    // Navigate if authenticated, profile is loaded, and profile isn't currently being fetched.
    if (isAuthenticated && profile && !isFetchingProfile) {
      console.log("🚀 [NAVIGATION] Redirecting to dashboard from Login");
      navigate('/dashboard');
    } else if (isAuthenticated && !profile && !isFetchingProfile && user) {
      // This case: authenticated, no profile, not fetching.
      // This could mean profile fetch failed or hasn't started for some reason.
      // authStore's onAuthStateChange should handle profile fetching.
      console.log("🔄 [LOGIN PAGE] Authenticated, no profile yet, not fetching. Waiting for profile or further action.");
    }

  }, [isAuthenticated, isFetchingProfile, profile, user, navigate]);
  
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
      await login(data.email, data.password);
      // Navigation is handled by the useEffect hook based on auth state changes
      console.log("🔑 [LOGIN PAGE] Login function call succeeded. Waiting for auth state change.");
    } catch (err) {
      console.error("🔑 [LOGIN PAGE] Login error in component:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Show a loading state if authenticated and profile is being fetched.
  // The "Initializing session..." part is removed as session is not persisted.
  if (isAuthenticated && isFetchingProfile) {
    console.log("🔄 [LOGIN PAGE] Rendering loading state (profile fetch)");
    return (
      <AuthLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">
            Loading your account...
          </p>
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
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
            <Link to="/signup" className="text-vercel-purple hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Login;