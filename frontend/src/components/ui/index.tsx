import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, sub, icon: Icon, iconColor = 'text-brand-600' }: {
  label:string; value:string|number; sub?:string; icon?:LucideIcon; iconColor?:string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && <div className={cn('p-2 rounded-lg bg-gray-50', iconColor)}><Icon className="w-5 h-5" /></div>}
      </div>
    </div>
  );
}

export function Badge({ children, className }: { children:React.ReactNode; className?:string }) {
  return <span className={cn('badge', className)}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon?:LucideIcon; title:string; description?:string; action?:React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Icon className="w-7 h-7 text-gray-400" /></div>}
      <h3 className="text-gray-900 font-medium text-base">{title}</h3>
      {description && <p className="text-gray-500 text-sm mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 'md' }: { size?:'sm'|'md'|'lg' }) {
  const s = { sm:'w-4 h-4', md:'w-6 h-6', lg:'w-8 h-8' }[size];
  return <div className={cn('border-2 border-brand-600 border-t-transparent rounded-full animate-spin', s)} />;
}

export function PageSpinner() {
  return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;
}

export function PageHeader({ title, description, action }: { title:string; description?:string; action?:React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, className, barClassName }: { value:number; className?:string; barClassName?:string }) {
  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-2', className)}>
      <div className={cn('h-2 rounded-full transition-all duration-500', barClassName ?? 'bg-brand-600')} style={{ width: `${Math.min(100,Math.max(0,value))}%` }} />
    </div>
  );
}