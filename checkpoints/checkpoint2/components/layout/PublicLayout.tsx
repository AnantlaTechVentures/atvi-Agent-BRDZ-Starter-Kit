'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 light-shadow dark:dark-shadow theme-transition">
        <div className="container px-4 mx-auto">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg light-shadow dark:dark-shadow theme-transition">
                <Shield className="h-6 w-6 text-primary" />
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
            
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" className="light-mode-button dark:dark-mode-button theme-transition">
                <Link href="#features">Features</Link>
              </Button>
              <Button asChild variant="outline" className="light-mode-button dark:dark-mode-button light-shadow dark:dark-shadow theme-transition">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild className="gradient-primary text-white border-0 light-shadow-hover dark:dark-shadow-hover theme-transition">
                <Link href="/auth/register">Get Started</Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>
      
      <main>{children}</main>
      
      <footer className="border-t border-border/40 py-8 bg-muted/30 dark:bg-muted/20 light-shadow dark:dark-shadow theme-transition">
        <div className="container px-4 mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg light-shadow dark:dark-shadow theme-transition">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <img 
              src="/ABSK-light.png" 
              alt="ABSK Logo" 
              className="h-6 w-auto dark:hidden"
            />
            <img 
              src="/ABSK-dark.png" 
              alt="ABSK Logo" 
              className="h-6 w-auto hidden dark:block"
            />
          </div>
          <p className="text-muted-foreground">
            AI Blockchain Starter Kit • Built with security and performance in mind
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            © 2025 <img 
              src="/ABSK-light.png" 
              alt="ABSK" 
              className="inline h-4 w-auto dark:hidden"
            /><img 
              src="/ABSK-dark.png" 
              alt="ABSK" 
              className="inline h-4 w-auto hidden dark:block"
            />. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}