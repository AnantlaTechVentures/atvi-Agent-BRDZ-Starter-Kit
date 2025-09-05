'use client';

import { Shield, Smartphone, Lock, Eye } from 'lucide-react';

export default function SecuritySection() {
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Security-First
              <span className="gradient-primary bg-clip-text text-transparent"> Architecture</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Built with enterprise-grade security from the ground up. Every interaction is protected by multiple layers of authentication and encryption.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">Mobile 2FA Authentication</h3>
                  <p className="text-muted-foreground">Every login and transaction requires mobile app approval with device verification.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Lock className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">End-to-End Encryption</h3>
                  <p className="text-muted-foreground">All data transmission and storage uses military-grade encryption protocols.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Eye className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">Complete Audit Trails</h3>
                  <p className="text-muted-foreground">Every action is logged with timestamps, IP addresses, and device information.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 gradient-primary rounded-3xl opacity-10 blur-3xl"></div>
            <div className="relative p-8 bg-card rounded-3xl border security-glow light-mode-card dark:dark-mode-card theme-transition">
              <div className="text-center mb-6">
                <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold">Mobile Security Flow</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl light-shadow dark:dark-shadow theme-transition">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">1</div>
                  <span>Enter email/username</span>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl light-shadow dark:dark-shadow theme-transition">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">2</div>
                  <span>Mobile push notification sent</span>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-secondary/5 dark:bg-secondary/10 rounded-xl light-shadow dark:dark-shadow theme-transition">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">3</div>
                  <span>Device verification & approval</span>
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-secondary/5 dark:bg-secondary/10 rounded-xl light-shadow dark:dark-shadow theme-transition">
                  <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">4</div>
                  <span>Secure access granted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}