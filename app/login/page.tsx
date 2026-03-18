import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">1Team Labs</h1>
          <p className="text-sm text-muted-foreground">Sign in to your training platform</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
