import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  RefreshCw,
  PlusCircle,
  Activity,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Server,
  Cloud,
  ChevronDown
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const PAGE_TITLES = {
  '/dashboard': { title: 'Executive Command Dashboard', subtitle: 'Real-time overview of automated scholarship applications and Camunda 8 processes' },
  '/apply': { title: 'Student Application Submission', subtitle: 'Submit new student application, preview DMN eligibility, and initiate workflow' },
  '/tracker': { title: 'Student Application Tracker', subtitle: 'Self-service verification and visual multi-stage timeline inspection' },
  '/committee': { title: 'Committee Review Workspace', subtitle: 'Role-based task inbox and interactive multi-stage review forms' },
  '/finance': { title: 'Finance & Accounts Desk', subtitle: 'Disbursement ledger, Accounts API monitoring, and error exception handling' },
  '/workflow': { title: 'Live Workflow Inspector', subtitle: 'BPMN process model visualization, active flow node tracking, and FEEL expressions' },
  '/viva-demo': { title: 'Viva Demo Console', subtitle: 'System diagnostics, automated test scenario execution (TC01–TC08), and state reset' },
};

export default function Navbar() {
  const location = useLocation();
  const {
    currentRole,
    setCurrentRole,
    roles,
    demoMode,
    setDemoMode,
    systemHealth,
    refreshAll,
    notificationsCount,
    pendingTasksCount
  } = useApp();

  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const pageInfo = PAGE_TITLES[location.pathname] || {
    title: 'Scholarship Approval Automation',
    subtitle: 'Camunda 8 Enterprise Portal'
  };

  const isCamundaOnline = systemHealth?.camunda?.status === 'ONLINE';
  const isMockOnline = systemHealth?.mockApi?.status === 'ONLINE';
  const isNgrokOnline = systemHealth?.ngrokTunnel?.status === 'ONLINE';

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        {/* Page Title & Breadcrumbs */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 heading-font truncate">
              {pageInfo.title}
            </h2>
            <span className="hidden sm:inline-block text-xs text-slate-400">/</span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-500 truncate">
              {pageInfo.subtitle}
            </span>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          {/* Quick Refresh */}
          <button
            onClick={refreshAll}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Refresh All Modules"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* System Diagnostics Trigger Badge */}
          <button
            onClick={() => setDiagnosticsOpen(true)}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium transition-all"
            title="View Camunda & Service Diagnostics"
          >
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCamundaOnline ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-slate-700">Camunda 8</span>
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isMockOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <span className="text-slate-700">Accounts API</span>
            </span>
            <Activity className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-medium text-slate-800 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5 text-brand-700" />
              <span className="hidden sm:inline text-slate-500">Role:</span>
              <span className="font-semibold text-brand-900 truncate max-w-[120px]">
                {roles.find(r => r.id === currentRole)?.badge || currentRole}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {roleDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-dropdown border border-slate-200 py-1.5 z-50 text-xs"
                onClick={() => setRoleDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="font-semibold text-slate-900">Demo Role Switcher</p>
                  <p className="text-[11px] text-slate-500">Switch reviewer perspective in Committee Workspace</p>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setCurrentRole(r.id)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        currentRole === r.id ? 'bg-brand-50/70 font-semibold text-brand-900' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate pr-2">{r.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono shrink-0">
                        {r.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification Button */}
          <Link
            to="/tracker"
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title={`${notificationsCount} Student Notifications`}
          >
            <Bell className="w-4 h-4" />
            {notificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </Link>

          {/* New Application Button */}
          <Link
            to="/apply"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-sm transition-all hover:shadow"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Application</span>
          </Link>
        </div>
      </header>

      {/* System Diagnostics Modal */}
      {diagnosticsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-brand-100 text-brand-800">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base heading-font">System Integration Diagnostics</h3>
                  <p className="text-xs text-slate-500">Live connectivity & cluster health status</p>
                </div>
              </div>
              <button
                onClick={() => setDiagnosticsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Camunda 8 SaaS Status */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-brand-700" />
                    Camunda 8 SaaS Cluster
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                    isCamundaOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {systemHealth?.camunda?.status || '503 HIBERNATED'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {systemHealth?.camunda?.message || 'Cluster status pending'}
                </p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-500">
                  <div>Cluster ID: <span className="text-slate-700">{systemHealth?.clusterId?.slice(0, 12)}...</span></div>
                  <div>Region: <span className="text-slate-700">{systemHealth?.region}</span></div>
                  <div>Zeebe Gateway: <span className="text-slate-700">{systemHealth?.camunda?.httpStatus || 503}</span></div>
                  <div>Latency: <span className="text-slate-700">{systemHealth?.camunda?.latencyMs || 0}ms</span></div>
                </div>
              </div>

              {/* Mock Accounts API Status */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Server className="w-4 h-4 text-brand-700" />
                    Mock Accounts API (Port 4000)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                    isMockOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {isMockOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Disbursements & Notification mock backend service running locally.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] font-mono text-slate-500">
                  <span>URL: http://localhost:4000</span>
                  <span>Latency: {systemHealth?.mockApi?.latencyMs || 0}ms</span>
                </div>
              </div>

              {/* Cloud Connector Tunnel Status */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <Radio className="w-4 h-4 text-brand-700" />
                    Cloud Connector Tunnel (ngrok)
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                    isNgrokOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {isNgrokOnline ? 'ONLINE' : 'OFFLINE (404)'}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  Configured in BPMN for cloud REST connector tasks (`Post` & `Remind`).
                  {isNgrokOnline ? ' Receiving webhook traffic.' : ' When testing locally without active ngrok tunnel, BFF automatically routes disbursement requests.'}
                </p>
                <div className="text-[10px] font-mono text-slate-500 truncate pt-1">
                  URL: {systemHealth?.ngrokTunnel?.url}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Last verified: {systemHealth?.timestamp ? new Date(systemHealth.timestamp).toLocaleTimeString() : 'Just now'}
              </span>
              <button
                onClick={() => setDiagnosticsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-brand-800 text-white font-medium hover:bg-brand-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
