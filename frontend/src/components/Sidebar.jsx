import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  Search,
  Users,
  CreditCard,
  Workflow,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Server,
  Radio,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar({ collapsed, setCollapsed }) {
  const { currentRole, pendingTasksCount, systemHealth } = useApp();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      to: '/apply',
      label: 'Student Portal',
      icon: FilePlus,
      badge: 'Apply'
    },
    {
      to: '/tracker',
      label: 'Application Tracker',
      icon: Search,
      badge: null
    },
    {
      to: '/committee',
      label: 'Committee Workspace',
      icon: Users,
      badge: pendingTasksCount > 0 ? `${pendingTasksCount} Pending` : null,
      badgeVariant: 'amber'
    },
    {
      to: '/finance',
      label: 'Finance & Disbursement',
      icon: CreditCard,
      badge: null
    },
    {
      to: '/workflow',
      label: 'Workflow Inspector',
      icon: Workflow,
      badge: null
    },
    {
      to: '/viva-demo',
      label: 'Viva Demo Console',
      icon: Sparkles,
      badge: 'TC01-08',
      badgeVariant: 'indigo'
    }
  ];

  const isCamundaOnline = systemHealth?.camunda?.status === 'ONLINE';
  const isMockOnline = systemHealth?.mockApi?.status === 'ONLINE';

  return (
    <aside
      className={`relative bg-navy-900 text-slate-200 border-r border-navy-800 transition-all duration-300 flex flex-col shrink-0 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-navy-800/80 bg-navy-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-800 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-bold text-sm tracking-tight text-white leading-tight truncate heading-font">
                SCHOLARSHIP PORTAL
              </h1>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-brand-300">
                  CAMUNDA 8 SaaS
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation Modules
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-brand-800 text-white shadow-sm shadow-brand-900/40'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        item.badgeVariant === 'amber'
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                          : item.badgeVariant === 'indigo'
                          ? 'bg-indigo-400/20 text-indigo-300 border border-indigo-400/30'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Role Indicator & Cluster Status */}
      <div className="p-3 border-t border-navy-800/80 bg-navy-950/30 space-y-2">
        {!collapsed ? (
          <>
            <div className="bg-navy-850/80 rounded-lg p-2.5 border border-navy-800 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Active Role</span>
                <span className="text-[10px] font-semibold text-brand-300 bg-brand-900/60 px-1.5 py-0.5 rounded border border-brand-700/50">
                  Demo
                </span>
              </div>
              <p className="font-semibold text-white truncate">{currentRole}</p>
            </div>

            <div className="px-1 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isCamundaOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  Camunda 8
                </span>
                <span className="font-mono text-[10px]">
                  {systemHealth?.camunda?.status || '503 Standby'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isMockOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  Mock API (4000)
                </span>
                <span className="font-mono text-[10px]">
                  {isMockOnline ? 'UP (7ms)' : 'DOWN'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${isCamundaOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}
              title={`Camunda 8: ${systemHealth?.camunda?.status || 'Standby'}`}
            />
            <span
              className={`w-2.5 h-2.5 rounded-full ${isMockOnline ? 'bg-emerald-400' : 'bg-rose-400'}`}
              title={`Mock API: ${isMockOnline ? 'Online' : 'Offline'}`}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
