'use client';
import { Menu } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

export function TopBar({ user, onMenuClick }: { user: UserProfile; onMenuClick?: () => void }) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden"
            aria-label="Toggle sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-sm font-semibold">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.firstName}</span>
        </div>
      </div>
    </header>
  );
}