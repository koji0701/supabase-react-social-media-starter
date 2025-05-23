import type { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-vercel-black">
      <div className="container mx-auto flex flex-col justify-center items-center px-4 py-12">
        <div className="mb-8 flex items-center justify-center">
          <h1 className="text-3xl font-bold text-gradient">SupaSocial</h1>
        </div>
        
        <div className="w-full max-w-md vercel-card">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
