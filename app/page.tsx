import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import SecuritySection from '@/components/landing/SecuritySection';
import CTASection from '@/components/landing/CTASection';
import PublicLayout from '@/components/layout/PublicLayout';

export default function Home() {
  return (
    <PublicLayout>
      <HeroSection />
      <FeaturesSection />
      <SecuritySection />
      <CTASection />
    </PublicLayout>
  );
}