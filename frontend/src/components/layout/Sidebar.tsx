'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Calculator, Receipt, FolderOpen, MessageSquare, User, Shield, LogOut, ClipboardList, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout } from '@/lib/hooks';
import type { UserProfile } from '@/lib/types';

const USER_NAV = [
  { href:'/dashboard', label:'Dashboard', icon:LayoutDashboard, exact:true },
  { href:'/dashboard/documents', label:'Documents', icon:FileText },
  { href:'/dashboard/tax', label:'Tax Calculator', icon:Calculator },
  { href:'/dashboard/gst', label:'GST Calculator', icon:Receipt },
  { href:'/dashboard/filings', label:'My Filings', icon:FolderOpen },
  { href:'/dashboard/chat', label:'AI Assistant', icon:MessageSquare },
];
const CA_NAV = [{ href:'/dashboard/ca', label:'Client Filings', icon:ClipboardList }];
const ADMIN_NAV = [{ href:'/dashboard/admin', label:'Admin', icon:Shield }];

export function Sidebar({ user, isOpen, onClose }: { user: UserProfile; isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const logout = useLogout();
  
  let items: Array<{ href: string; label: string; icon: any; exact?: boolean }> = [];
  if (user.role === 'ca') {
    items = [...CA_NAV];
  } else if (user.role === 'admin') {
    items = [...ADMIN_NAV];
  } else {
    items = [...USER_NAV];
  }
  items.push({ href:'/dashboard/profile', label:'Profile', icon:User });

  const active = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out md:static md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center">
            <span className="text-xl font-bold text-brand-600">TaxAI</span>
            <span className="ml-2 text-xs text-gray-400 font-medium">Beta</span>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} href={href} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors', active(href, exact) ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')}>
              <Icon className="w-4 h-4 flex-shrink-0" />{label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <LogOut className="w-4 h-4" />Sign out
          </button>
        </div>
      </aside>
    </>
  );
}