'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMode } from '@/contexts/ModeContext';
import { MessageCircle, Wrench } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

export default function ModeToggle() {
  const { mode, toggleMode } = useMode();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
      <Button
        variant={pathname === '/chat' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          if (pathname !== '/chat') {
            toggleMode();
            router.push('/chat');
          }
        }}
        className={pathname === '/chat' ? 'gradient-primary text-white border-0' : ''}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        AI Chat
      </Button>
      
      <Button
        variant={pathname === '/manual' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => {
          if (pathname !== '/manual') {
            toggleMode();
            router.push('/manual');
          }
        }}
        className={pathname === '/manual' ? 'gradient-primary text-white border-0' : ''}
      >
        <Wrench className="h-4 w-4 mr-2" />
        Manual
      </Button>
    </div>
  );
}