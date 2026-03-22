'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/dashboard-sidebar';

interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: 'employee' | 'hr_admin' | 'owner';
  department: string | null;
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        
        if (!response.ok) {
          router.push('/login');
          return;
        }

        const data = await response.json();
        
        // Only allow employees to access this layout
        if (data.user.role !== 'employee') {
          router.push('/login');
          return;
        }
        
        setUser(data.user);
      } catch (error) {
        console.error('[Employee Layout] Error fetching user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-sm text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardSidebar user={user}>{children}</DashboardSidebar>;
}
