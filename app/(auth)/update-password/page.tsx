import { UpdatePasswordForm } from '@/components/auth/auth-forms';

export default function UpdatePasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-[#8a6d3b] dark:text-[#c9a96a]">Ever After</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <div className="mt-6">
        <UpdatePasswordForm />
      </div>
    </main>
  );
}
