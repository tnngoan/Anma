'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/database';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  Scissors,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  DoorOpen,
} from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Role[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, roles: ['owner', 'manager', 'masseuse', 'receptionist'] },
  { label: 'Bookings', href: '/bookings', icon: <Calendar className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist', 'masseuse'] },
  { label: 'Shifts', href: '/shifts', icon: <Clock className="h-5 w-5" />, roles: ['owner', 'manager', 'masseuse'] },
  { label: 'Customers', href: '/customers', icon: <Users className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Services', href: '/services', icon: <Scissors className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Staff', href: '/staff', icon: <UserCircle className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Rooms', href: '/rooms', icon: <DoorOpen className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Inventory', href: '/inventory', icon: <Package className="h-5 w-5" />, roles: ['owner', 'manager'] },
  { label: 'Payments', href: '/payments', icon: <CreditCard className="h-5 w-5" />, roles: ['owner', 'manager', 'receptionist'] },
  { label: 'Reports', href: '/reports', icon: <BarChart3 className="h-5 w-5" />, roles: ['owner', 'manager'] },
];

interface SidebarProps {
  tenantName: string;
  userName: string;
  userRole: Role;
}

export function Sidebar({ tenantName, userName, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole));

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo / Tenant */}
      <div className="border-b border-gray-200 px-4 py-5">
        <h1 className="text-lg font-bold text-indigo-600 truncate">{tenantName}</h1>
        <p className="text-xs text-gray-500 mt-1 capitalize">{userRole}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-gray-200 bg-white">
        {sidebarContent}
      </aside>
    </>
  );
}
