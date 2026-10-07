import Link from 'next/link';
import { MagicLinkForm, PasswordForm } from '@/components/auth/auth-forms';

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-[#8a6d3b] dark:text-[#c9a96a]">Ever After</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Start planning</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Create your account — your first wedding makes you its owner.
      </p>
      <div className="mt-6 flex flex-col gap-6">
        <PasswordForm mode="register" />
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-zinc-400">
          <span className="h-px flex-1 bg-black/10" /> or <span className="h-px flex-1 bg-black/10" />
        </div>
        <MagicLinkForm />
      </div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{' '}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </main>
  );
}
