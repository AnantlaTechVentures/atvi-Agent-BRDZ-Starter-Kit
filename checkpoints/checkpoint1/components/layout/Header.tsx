'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Menu } from 'lucide-react';
import ModeToggle from '@/components/mode/ModeToggle';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function Header() {
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 light-shadow dark:dark-shadow theme-transition">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Mobile menu button */}
        <div className="flex items-center gap-4 lg:hidden">
          <Button variant="ghost" size="icon" className="light-mode-button dark:dark-mode-button theme-transition">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
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
        </div>

        {/* Desktop title */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <ModeToggle />
          
          {/* Enhanced Theme Toggle */}
          <ThemeToggle />

          {/* User info - Simplified */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-secondary/10 text-secondary light-shadow dark:dark-shadow theme-transition">
              Verified
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}