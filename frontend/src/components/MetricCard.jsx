import React from 'react';

const VARIANT_STYLES = {
  blue: {
    bg: 'bg-blue-50/50',
    iconBg: 'bg-blue-100 text-blue-700',
    border: 'border-blue-100',
    hover: 'hover:border-blue-300'
  },
  emerald: {
    bg: 'bg-emerald-50/40',
    iconBg: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-100',
    hover: 'hover:border-emerald-300'
  },
  amber: {
    bg: 'bg-amber-50/40',
    iconBg: 'bg-amber-100 text-amber-700',
    border: 'border-amber-100',
    hover: 'hover:border-amber-300'
  },
  rose: {
    bg: 'bg-rose-50/40',
    iconBg: 'bg-rose-100 text-rose-700',
    border: 'border-rose-100',
    hover: 'hover:border-rose-300'
  },
  indigo: {
    bg: 'bg-indigo-50/40',
    iconBg: 'bg-indigo-100 text-indigo-700',
    border: 'border-indigo-100',
    hover: 'hover:border-indigo-300'
  },
  slate: {
    bg: 'bg-slate-50',
    iconBg: 'bg-slate-200 text-slate-700',
    border: 'border-slate-200',
    hover: 'hover:border-slate-300'
  }
};

export default function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'blue',
  onClick,
  badge
}) {
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.blue;

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl border p-5 transition-all duration-200 shadow-sm ${styles.border} ${styles.hover} ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 heading-font">
              {value}
            </span>
            {badge && (
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                {badge}
              </span>
            )}
          </div>
          {subtext && (
            <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
              {subtext}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${styles.iconBg} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}
