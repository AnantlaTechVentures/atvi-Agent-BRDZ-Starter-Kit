'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-secondary/5 dark:from-primary/10 dark:via-background dark:to-secondary/10">
      <div className="container px-4 mx-auto text-center max-w-4xl">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-primary/10 rounded-2xl security-glow light-shadow dark:dark-shadow theme-transition">
            <Shield className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Ready to Build the Future?
        </h2>
        
        <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
          Join the revolution in AI-powered blockchain interaction. Start building with enterprise-grade security and lightning-fast cross-chain operations.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="text-lg px-8 py-6 gradient-primary text-white border-0 security-glow light-shadow-hover dark:dark-shadow-hover theme-transition group">
            <Link href="/auth/login">
              Get Started Now
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-8">
          Secure • Fast • Reliable • Enterprise-Ready
        </p>
      </div>
    </section>
  );
}