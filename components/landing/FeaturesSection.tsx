'use client';

import { Bot, Smartphone, Shield, Globe, Zap, Wallet } from 'lucide-react';

const features = [
  {
    icon: Bot,
    title: "AI-Powered Chat Interface",
    description: "Natural language processing for blockchain commands. Simply chat to execute transactions, check balances, and manage wallets across multiple chains."
  },
  {
    icon: Smartphone,
    title: "Mobile 2FA Security",
    description: "Bank-grade security with mobile app authentication. Every transaction requires mobile approval for maximum security and peace of mind."
  },
  {
    icon: Globe,
    title: "Cross-Chain Operations",
    description: "Seamless bridging and operations across Sepolia, Amoy, and Neon networks. One interface for all your multi-chain needs."
  },
  {
    icon: Wallet,
    title: "Custodial Wallet Management",
    description: "Professional-grade wallet infrastructure with automatic key management, backup, and recovery systems built-in."
  },
  {
    icon: Zap,
    title: "Instant Execution",
    description: "Lightning-fast transaction processing with real-time updates and status tracking for all blockchain operations."
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Military-grade encryption, secure key storage, and comprehensive audit trails for complete transaction transparency."
  }
];

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30 dark:bg-muted/20">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Powerful Features for
            <span className="gradient-primary bg-clip-text text-transparent"> Modern DeFi</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to build, deploy, and manage blockchain applications with AI-powered intelligence and enterprise-grade security.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-8 bg-card rounded-2xl border security-glow light-mode-card dark:dark-mode-card light-shadow-hover dark:dark-shadow-hover theme-transition hover:scale-105"
            >
              <div className="p-3 bg-primary/10 rounded-xl w-fit mb-6">
                <feature.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}