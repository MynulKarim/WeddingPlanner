import Link from 'next/link';
import { ResetForm } from '@/components/auth/auth-forms';

export default function ResetPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-[#8a6d3b] dark:text-[#c9a96a]">Ever After</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset password</h1>
      <div className="mt-6">
        <ResetForm />
      </div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/login" className="font-medium underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </main>
  );
}
