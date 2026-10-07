import Link from 'next/link';
import { NewWeddingForm } from './wedding-form';

export default function NewWeddingPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link href="/dashboard" className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← All weddings
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">New wedding</h1>
      <div className="mt-6">
        <NewWeddingForm />
      </div>
    </main>
  );
}
