'use client';

import { useCallback, useEffect, useState } from 'react';

export interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: 'employee' | 'hr_admin' | 'owner';
  department: string | null;
}

type FetchUserOptions = {
  skipLoading?: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async ({ skipLoading = false }: FetchUserOptions = {}) => {
    if (!skipLoading) setLoading(true);

    try {
      const response = await fetch('/api/auth/me');

      if (!response.ok) {
        setUser(null);
        return null;
      }

      const data = await response.json();
      setUser(data.user);
      setError(null);
      return data.user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUser(null);
      return null;
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refresh = useCallback(async () => {
    return fetchUser({ skipLoading: true });
  }, [fetchUser]);

  return { user, loading, error, refresh };
}
