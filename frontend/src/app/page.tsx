'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getHomeRoute } from '@/lib/auth-guard';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(getHomeRoute(user?.role));
  }, [hydrated, user, router]);

  return null;
}
