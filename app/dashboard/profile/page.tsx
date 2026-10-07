import Link from 'next/link';
import { getMyProfile } from '@/lib/db/profile';
import { ProfileForm } from './profile-form';

export default async function ProfilePage() {
  const { email, profile } = await getMyProfile();
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link href="/dashboard" className="text-sm text-zinc-600 dark:text-zinc-400 underline underline-offset-4">
        ← All weddings
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Profile</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">{email}</p>
      <div className="mt-6">
        <ProfileForm initialName={profile?.display_name ?? ''} initialLocale={profile?.locale ?? ''} />
      </div>
      {!profile && (
        <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
          No profile row yet — it is created automatically on sign-up (migration 0002 trigger).
        </p>
      )}
    </main>
  );
}
