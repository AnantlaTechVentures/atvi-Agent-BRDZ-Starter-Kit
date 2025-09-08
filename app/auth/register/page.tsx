//Path: app/auth/login/page.tsx

import RegisterForm from '@/components/auth/RegisterForm';
import AuthLayout from '@/components/auth/AuthLayout';

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join ABSK for secure blockchain operations"
    >
      <RegisterForm />
    </AuthLayout>
  );
}