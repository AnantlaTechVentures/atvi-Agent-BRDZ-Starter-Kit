'use client';

import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-10 h-10">
        <div className="w-5 h-5 bg-muted-foreground/20 rounded animate-pulse" />
      </Button>
    );
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('light');
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5 text-amber-500" />;
      case 'dark':
        return <Moon className="h-5 w-5 text-blue-400" />;
      default:
        return <Monitor className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Switch to Dark Mode';
      case 'dark':
        return 'Switch to Light Mode';
      default:
        return 'Switch Theme';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Enhanced Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="relative w-10 h-10 rounded-lg transition-all duration-300 hover:bg-muted/80 hover:scale-105 active:scale-95"
        title={getThemeLabel()}
      >
        <div className="relative w-5 h-5">
          {/* Sun Icon */}
          <Sun className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            theme === 'light' 
              ? 'rotate-0 scale-100 text-amber-500' 
              : 'rotate-90 scale-0 text-muted-foreground'
          }`} />
          
          {/* Moon Icon */}
          <Moon className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            theme === 'dark' 
              ? 'rotate-0 scale-100 text-blue-400' 
              : '-rotate-90 scale-0 text-muted-foreground'
          }`} />
          
          {/* System Icon */}
          <Monitor className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
            theme === 'system' 
              ? 'rotate-0 scale-100 text-muted-foreground' 
              : 'rotate-90 scale-0 text-muted-foreground'
          }`} />
        </div>
      </Button>

      {/* Theme Menu (Optional - for more theme options) */}
      <div className="hidden md:flex items-center gap-1">
        <Button
          variant={theme === 'light' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTheme('light')}
          className="h-8 px-3 text-xs transition-all duration-200"
        >
          <Sun className="h-3 w-3 mr-1" />
          Light
        </Button>
        
        <Button
          variant={theme === 'dark' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTheme('dark')}
          className="h-8 px-3 text-xs transition-all duration-200"
        >
          <Moon className="h-3 w-3 mr-1" />
          Dark
        </Button>
        
        <Button
          variant={theme === 'system' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTheme('system')}
          className="h-8 px-3 text-xs transition-all duration-200"
        >
          <Monitor className="h-3 w-3 mr-1" />
          Auto
        </Button>
      </div>
    </div>
  );
}

