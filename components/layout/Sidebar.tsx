'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  LayoutDashboard, 
  MessageCircle, 
  Settings, 
  History, 
  LogOut,
  Wrench
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'PAYAi Chat Mode', href: '/chat', icon: MessageCircle },
          { name: 'Wallets', href: '/manual', icon: Wrench },
  { name: 'Transaction History', href: '/transactions', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card border-r border-border px-6 py-4 light-mode-card dark:dark-mode-card theme-transition">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl light-shadow dark:dark-shadow theme-transition">
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
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`group flex gap-x-3 rounded-lg p-3 text-sm leading-6 font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground hover:bg-muted hover:text-foreground hover:shadow-sm'
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User section */}
        <div className="mt-auto space-y-4">
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start gap-x-3 text-destructive hover:text-destructive hover:bg-destructive/10 light-shadow dark:dark-shadow theme-transition"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </nav>
    </div>
  );
}