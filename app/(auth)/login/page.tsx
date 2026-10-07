import Link from 'next/link';
import { MagicLinkForm, PasswordForm } from '@/components/auth/auth-forms';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-[#8a6d3b] dark:text-[#c9a96a]">Ever After</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back</h1>
      <div className="mt-6 flex flex-col gap-6">
        <PasswordForm mode="login" />
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-400">
          <span className="h-px flex-1 bg-black/10" /> or <span className="h-px flex-1 bg-black/10" />
        </div>
        <MagicLinkForm />
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/reset" className="text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
          Forgot password?
        </Link>
        <Link href="/register" className="font-medium underline underline-offset-4">
          Create account
        </Link>
      </div>
    </main>
  );
}
