'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

/**
 * Role-based access control hook.
 *
 * @param allowedRoles - Array of roles that may access the page (e.g. ['admin', 'reviewer']).
 *                       Pass null / undefined to allow any authenticated user.
 * @param redirectTo   - Where to send unauthorized users (defaults to '/login').
 * @returns { allowed, user, loading }
 */
export function useRequireRole(
  allowedRoles?: string[] | null,
  redirectTo = '/login'
) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Wait one tick for zustand persisted store to hydrate from localStorage
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Not logged in → send to login
    if (!user) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      router.replace(`${redirectTo}?returnUrl=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Logged in but wrong role → send to dashboard
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [hydrated, user, allowedRoles, redirectTo, router]);

  const allowed =
    hydrated &&
    !!user &&
    (!allowedRoles || allowedRoles.includes(user.role));

  return { allowed, user, loading: !hydrated };
}

/**
 * Returns the appropriate "home" route for the current user.
 */
export function getHomeRoute(role?: string | null): string {
  if (!role) return '/login';
  return '/dashboard';
}
