import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Activity,
  Cloud,
  Radio,
  FileText,
  Clock,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Send,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

export default function VivaDemoPage() {
  const { systemHealth, refreshKey, refreshAll, checkHealth } = useApp();

  const [scenarios, setScenarios] = useState([]);
  const [runningScenarioId, setRunningScenarioId] = useState(null);
  const [lastRunResult, setLastRunResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notifFilter, setNotifFilter] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const [scenData, notifData] = await Promise.all([
          api.getScenarios(),
          api.getNotifications()
        ]);
        setScenarios(Array.isArray(scenData) ? scenData : []);
        setNotifications(Array.isArray(notifData) ? notifData : []);
      } catch (err) {
        console.warn('Error loading viva demo data:', err);
      }
    }
    loadData();
  }, [refreshKey]);

  const handleRunScenario = async (scenarioId, autoAdvance = true) => {
    try {
      setRunningScenarioId(scenarioId);
      setLastRunResult(null);
      const res = await api.runScenario(scenarioId, autoAdvance);
      setLastRunResult(res);
      refreshAll();
    } catch (err) {
      alert(`Scenario execution error: ${err.message}`);
    } finally {
      setRunningScenarioId(null);
    }
  };

  const handleExecuteReset = async () => {
    try {
      setResetting(true);
      await api.resetSystem();
      setResetModalOpen(false);
      setLastRunResult(null);
      refreshAll();
      alert('Mock Accounts API state and process engine successfully reset.');
    } catch (err) {
      alert(`Reset error: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const isCamundaOnline = systemHealth?.camunda?.status === 'ONLINE';
  const isMockOnline = systemHealth?.mockApi?.status === 'ONLINE';
  const isNgrokOnline = systemHealth?.ngrokTunnel?.status === 'ONLINE';

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'ALL') return true;
    return n.type === notifFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-indigo-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-700/60 text-indigo-200 px-2.5 py-1 rounded-full border border-indigo-400/30">
            Interactive Examination & Demonstration Console
          </span>
          <h1 className="text-xl font-bold heading-font text-white mt-1">
            Viva Demonstration Console & Test Scenarios
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Execute official test cases (TC01–TC08), monitor live system diagnostics across Camunda 8 SaaS and mock accounts, inspect notification broadcasts, and reset state.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-semibold text-xs border border-rose-500/40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset State (Mock API)
          </button>
        </div>
      </div>

      {/* System Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Camunda 8 Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-brand-800" />
              Camunda 8 SaaS Cluster
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isCamundaOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {systemHealth?.camunda?.status || '503 HIBERNATED'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {systemHealth?.camunda?.message || 'Cluster endpoint check'}
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Cluster ID: {systemHealth?.clusterId?.slice(0, 10)}...</span>
            <span>Latency: {systemHealth?.camunda?.latencyMs || 0}ms</span>
          </div>
        </div>

        {/* Mock Accounts API Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-brand-800" />
              Mock Accounts API
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isMockOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {isMockOnline ? 'ONLINE (UP)' : 'OFFLINE'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Listening on <code>http://localhost:4000</code>. Serves <code>POST /api/disbursements</code> and <code>/api/notifications</code>.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Status: {systemHealth?.mockApi?.httpStatus === 200 ? '200 OK' : 'Failed'}</span>
            <span>Latency: {systemHealth?.mockApi?.latencyMs || 0}ms</span>
          </div>
        </div>

        {/* Cloud Connector Tunnel (ngrok) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-brand-800" />
              Cloud Connector Tunnel
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              isNgrokOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {isNgrokOnline ? 'ONLINE' : 'OFFLINE (404)'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            ngrok public URL configured inside BPMN for cloud REST connector tasks.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[10px] font-mono text-slate-400 truncate">
            {systemHealth?.ngrokTunnel?.url}
          </div>
        </div>
      </div>

      {/* Scenario Execution Result Banner (if run recently) */}
      {lastRunResult && (
        <div className="bg-white rounded-2xl border border-emerald-300 shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base heading-font">
                Execution Completed: {lastRunResult.scenario?.id} - {lastRunResult.scenario?.name}
              </h3>
            </div>
            <StatusBadge status={lastRunResult.finalStatus} />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Application Reference:</span>
              <p className="font-mono font-bold text-slate-900">{lastRunResult.applicationRef}</p>
            </div>
            <div>
              <span className="text-slate-400">Candidate:</span>
              <p className="font-semibold text-slate-900">{lastRunResult.scenario?.persona}</p>
            </div>
            <div>
              <span className="text-slate-400">Final Process Status:</span>
              <p className="font-semibold text-emerald-800">{lastRunResult.finalStatus}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Automated Step Execution Trace
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {lastRunResult.stepsExecuted?.map((s, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-900 block">{s.step}</span>
                  <span className="text-[11px] text-emerald-700">{s.details}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Viva Scenarios Runner Grid (TC01 - TC08) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 heading-font">
            Official Viva Test Scenario Runner (TC01–TC08)
          </h2>
          <p className="text-xs text-slate-500">
            Execute real scenarios from <code>test-data/</code>. Click 'Run Scenario' to submit and observe complete automated progression.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scenarios.map((scen) => {
            const isRunning = runningScenarioId === scen.id;
            return (
              <div
                key={scen.id}
                className="p-5 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 bg-slate-50/40"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-brand-100 text-brand-900">
                      {scen.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {scen.file}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 heading-font leading-tight">
                    {scen.name}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Candidate: <strong>{scen.persona}</strong> • Income: ₹{scen.income?.toLocaleString('en-IN')} • CGPA: {scen.cgpa}
                  </p>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block">Expected Outcome:</span>
                    <p className="leading-relaxed">{scen.expectedOutcome}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
                  <button
                    onClick={() => handleRunScenario(scen.id, true)}
                    disabled={isRunning}
                    className="flex-1 py-2 px-3 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    {isRunning ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Executing Scenario...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Run 1-Click Scenario
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleRunScenario(scen.id, false)}
                    disabled={isRunning}
                    className="py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                    title="Submit only without auto-advancing committee steps (lets you manually test in Committee Inbox)"
                  >
                    Submit Only
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification Broadcast Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 heading-font flex items-center gap-2">
              <Send className="w-4 h-4 text-brand-800" />
              Notification Broadcast Audit Log
            </h2>
            <p className="text-xs text-slate-500">
              Live records sent to Mock Accounts/Notification API by the <code>send-notification</code> worker
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Filter Type:</span>
            <select
              value={notifFilter}
              onChange={(e) => setNotifFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-slate-50"
            >
              <option value="ALL">All Types</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="INELIGIBLE">INELIGIBLE</option>
              <option value="DISBURSEMENT_DELAYED">DISBURSEMENT_DELAYED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No notifications matching current filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Message Snippet</th>
                  <th className="py-2.5 px-3">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotifications.map((n) => (
                  <tr key={n.notificationId} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-bold text-brand-900">
                      {n.notificationId}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        n.type === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        n.type === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        n.type === 'INELIGIBLE' ? 'bg-slate-200 text-slate-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {n.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {n.to}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {n.subject}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={n.message}>
                      {n.message}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {new Date(n.sentAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Demo Reset Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base heading-font">
                  Confirm Mock API State Reset
                </h3>
                <p className="text-xs text-slate-500">
                  Target: POST /admin/reset on Mock API
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will clear all records in the Mock Accounts & Notification API (disbursements ledger, flaky retry attempts, and notification log).
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              <strong>Notice:</strong> This strictly resets test data and mock records. It does <em>not</em> modify or undeploy the Camunda 8 BPMN / DMN process definitions.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Mock State'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
