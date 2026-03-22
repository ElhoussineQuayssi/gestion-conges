'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, getDashboardRoute } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Home,
  User,
  Briefcase,
  ClipboardList,
  Wallet,
  Inbox,
  Users,
  LayoutDashboard,
  Shield,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// User types
interface CurrentUser {
  id: number;
  email: string;
  full_name: string;
  role: 'employee' | 'hr_admin' | 'owner';
  department: string | null;
}

// Navigation item type
interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: ('employee' | 'hr_admin' | 'owner')[];
  badge?: number;
}

// Navigation configuration
const navigationConfig: NavItem[] = [
  // Employee links
  {
    title: 'Tableau de bord',
    href: '/employee/dashboard',
    icon: Home,
    roles: ['employee'],
  },
  {
    title: 'Mon Profil',
    href: '/dashboard/profil',
    icon: User,
    roles: ['employee'],
  },
  {
    title: 'Catalogue des Offres',
    href: '/employee/offers',
    icon: Briefcase,
    roles: ['employee'],
  },
  {
    title: 'Historique',
    href: '/employee/history',
    icon: FileText,
    roles: ['employee'],
  },
  {
    title: 'Mes Demandes',
    href: '/employee/leave-request',
    icon: ClipboardList,
    roles: ['employee'],
  },
  {
    title: 'Mon Solde',
    href: '/dashboard/solde',
    icon: Wallet,
    roles: ['employee'],
  },
  
  // HR Admin links
  {
    title: 'Tableau de bord',
    href: '/admin/dashboard',
    icon: Home,
    roles: ['hr_admin'],
  },
  {
    title: 'Mon Profil',
    href: '/dashboard/profil',
    icon: User,
    roles: ['hr_admin'],
  },
  {
    title: 'Gestion des Offres',
    href: '/admin/offers',
    icon: Briefcase,
    roles: ['hr_admin'],
  },
  {
    title: 'Validation des Demandes',
    href: '/admin/requests',
    icon: Inbox,
    roles: ['hr_admin'],
    badge: 0, // Will be updated dynamically
  },
  {
    title: 'Gestion des Soldes',
    href: '/admin/balances',
    icon: Users,
    roles: ['hr_admin'],
  },
  
  // Owner links
  {
    title: 'Tableau de bord',
    href: '/owner/dashboard',
    icon: Home,
    roles: ['owner'],
  },
  {
    title: 'Mon Profil',
    href: '/dashboard/profil',
    icon: User,
    roles: ['owner'],
  },
  {
    title: 'Gestion des Comptes RH',
    href: '/owner/admins',
    icon: Shield,
    roles: ['owner'],
  },
  {
    title: 'Gestion des employés',
    href: '/owner/employees',
    icon: Users,
    roles: ['owner'],
  },
  {
    title: 'Gestion d\'offres',
    href: '/admin/offers',
    icon: Briefcase,
    roles: ['owner'],
  },
  {
    title: 'Gestion des demandes',
    href: '/admin/requests',
    icon: Inbox,
    roles: ['owner'],
    badge: 0,
  },
  {
    title: 'Gestion des soldes',
    href: '/admin/balances',
    icon: Wallet,
    roles: ['owner'],
  },
  {
    title: 'Journaux d\'Audit',
    href: '/owner/activity-logs',
    icon: FileText,
    roles: ['owner'],
  },
  {
    title: 'Paramètres',
    href: '/owner/settings',
    icon: Settings,
    roles: ['owner'],
  },
];

interface DashboardSidebarProps {
  user: CurrentUser | null;
  children?: React.ReactNode;
}

export function DashboardSidebar({ user, children }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dashboardHref = getDashboardRoute(user?.role);

  // Filter navigation items by user role
  const userNavigation = navigationConfig.filter(
    (item) => user && item.roles.includes(user.role)
  );

  // Group navigation items - dashboard home and profil are common
  const commonNav = userNavigation.filter(
    (item) => item.href.includes('/dashboard') || item.href === '/dashboard/profil'
  );
  const roleNav = userNavigation.filter(
    (item) => !item.href.includes('/dashboard') && item.href !== '/dashboard/profil'
  );

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('[Dashboard] Erreur lors de la déconnexion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavClick = () => {
    // Close mobile sheet on navigation
    setIsMobileOpen(false);
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Role display name
  const roleNames: Record<string, string> = {
    employee: 'Employé',
    hr_admin: 'Admin RH',
    owner: 'Propriétaire',
  };

  // Sidebar content component
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700">
        {!isCollapsed && (
          <Link href={dashboardHref} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">FB</span>
            </div>
            <span className="font-semibold text-sm">Fenie Brossette</span>
          </Link>
        )}
        {isCollapsed && !isMobile && (
          <div className="mx-auto">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">FB</span>
            </div>
          </div>
        )}
        {isMobile && (
          <Link href={dashboardHref} onClick={handleNavClick} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">FB</span>
            </div>
            <span className="font-semibold text-sm">Fenie Brossette</span>
          </Link>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(false)}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
        {!isMobile && !isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {!isMobile && isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Common Navigation */}
        <nav className="px-2 space-y-1">
          {commonNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.title}</span>}
              </Link>
            );

            if (isCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-800 text-white">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Separator */}
        {!isCollapsed && (
          <div className="my-4 mx-4 h-px bg-slate-700" />
        )}

        {/* Role-specific Navigation */}
        <nav className="px-2 space-y-1">
          {roleNav.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="flex-1">{item.title}</span>
                )}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            if (isCollapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-800 text-white">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>
      </div>

      {/* User Footer */}
      {user && (
        <div className="border-t border-slate-700 p-4">
          <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
            <Avatar className="h-9 w-9 bg-slate-700">
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {roleNames[user.role]}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              onClick={handleLogout}
              disabled={loading}
              className="w-full mt-3 justify-start text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Déconnexion
            </Button>
          )}
          {isCollapsed && !isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={loading}
                  className="w-full mt-3 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white">
                Déconnexion
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Header with Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-700 z-40 flex items-center px-4 gap-4">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-white"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 p-0 bg-slate-900 border-slate-700"
          >
            <SidebarContent isMobile />
          </SheetContent>
        </Sheet>
        <span className="font-semibold text-white">Fenie Brossette</span>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed top-0 left-0 h-full z-30">
        <div
          className={cn(
            'h-full transition-all duration-200',
            isCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <SidebarContent />
        </div>
      </div>

      {/* Main Content Area */}
      <main
        className={cn(
          'min-h-screen bg-slate-50 pt-16 md:pt-0 transition-all duration-200',
          !isCollapsed ? 'md:pl-64' : 'md:pl-16'
        )}
      >
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </>
  );
}
