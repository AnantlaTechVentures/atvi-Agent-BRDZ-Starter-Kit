'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Bot, Zap, Globe } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 dark:from-primary/10 dark:via-background dark:to-secondary/10">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] -z-10" />
      
      <div className="container px-4 mx-auto text-center max-w-6xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/10 rounded-2xl security-glow">
            <Shield className="h-16 w-16 text-primary" />
          </div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
          AI Blockchain
          <span className="block gradient-primary bg-clip-text text-transparent">
            Starter Kit
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
          Revolutionary AI agent framework for seamless blockchain interaction with 
          cross-chain operations, mobile 2FA security, and custodial wallet management.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-2xl mx-auto">
          <div className="flex flex-col items-center p-4 bg-card rounded-xl border security-glow light-mode-card dark:dark-mode-card theme-transition">
            <Bot className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">AI Chat</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-card rounded-xl border security-glow light-mode-card dark:dark-mode-card theme-transition">
            <Globe className="h-8 w-8 text-secondary mb-2" />
            <span className="text-sm font-medium">Multi-chain</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-card rounded-xl border security-glow light-mode-card dark:dark-mode-card theme-transition">
            <Shield className="h-8 w-8 text-primary mb-2" />
            <span className="text-sm font-medium">Secure 2FA</span>
          </div>
          <div className="flex flex-col items-center p-4 bg-card rounded-xl border security-glow light-mode-card dark:dark-mode-card theme-transition">
            <Zap className="h-8 w-8 text-warning mb-2" />
            <span className="text-sm font-medium">Lightning Fast</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8 py-6 gradient-primary text-white border-0 security-glow light-shadow-hover dark:dark-shadow-hover theme-transition">
            <Link href="/auth/login">
              Start Building
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-primary/20 light-mode-button dark:dark-mode-button light-shadow dark:dark-shadow light-shadow-hover dark:dark-shadow-hover theme-transition">
            <Link href="#features">
              Learn More
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}