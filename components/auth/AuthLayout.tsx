//Path: components/auth/AuthLayout.tsx

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Shield } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl security-glow">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <img 
              src="/ABSK-light.png" 
              alt="ABSK Logo" 
              className="h-8 w-auto dark:hidden"
            />
            <img 
              src="/ABSK-dark.png" 
              alt="ABSK Logo" 
              className="h-8 w-auto hidden dark:block"
            />
          </Link>
          
          <h1 className="text-3xl font-bold mb-2">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <div className="bg-card rounded-2xl border security-glow p-8">
          {children}
        </div>
      </div>
    </div>
  );
}