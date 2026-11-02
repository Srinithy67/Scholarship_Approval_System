import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ArrowRight,
  TrendingUp,
  Banknote,
  Send,
  PlusCircle,
  Users,
  CreditCard,
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
  const { refreshKey, refreshAll } = useApp();
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [appData, notifData] = await Promise.all([
          api.getApplications(),
          api.getNotifications()
        ]);
        setData(appData);
        setNotifications(Array.isArray(notifData) ? notifData.slice(0, 8) : []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [refreshKey]);

  const metrics = data?.metrics || {
    total: 0,
    inReview: 0,
    eligible: 0,
    ineligible: 0,
    approved: 0,
    rejected: 0,
    disbursed: 0,
    exceptions: 0,
    manualEscalated: 0
  };

  const pipeline = data?.pipeline || {
    submitted: 0,
    eligibilityEvaluation: 0,
    committeeReview: 0,
    finalApproval: 0,
    disbursement: 0,
    completed: 0
  };

  const pipelineSteps = [
    { title: 'Submitted', count: pipeline.submitted, color: 'text-slate-700 bg-slate-100' },
    { title: 'Eligibility DMN', count: pipeline.eligibilityEvaluation, color: 'text-sky-700 bg-sky-100' },
    { title: 'Committee Review', count: pipeline.committeeReview, color: 'text-indigo-700 bg-indigo-100' },
    { title: 'Final Approval', count: pipeline.finalApproval, color: 'text-purple-700 bg-purple-100' },
    { title: 'Disbursement', count: pipeline.disbursement, color: 'text-blue-700 bg-blue-100' },
    { title: 'Completed', count: pipeline.completed, color: 'text-emerald-700 bg-emerald-100' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-navy-900 to-brand-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest bg-brand-700/60 text-brand-200 px-2.5 py-1 rounded-full mb-2 border border-brand-500/30">
            Institutional Camunda 8 Workflow Hub
          </span>
          <h1 className="text-2xl font-bold heading-font text-white">
            Scholarship Approval Automation Command Center
          </h1>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Live process engine monitoring student submissions, automated DMN eligibility rules, 5-stage committee review, and mock accounts disbursement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/apply"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Application
          </Link>
          <Link
            to="/committee"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-sm border border-white/10 transition-all"
          >
            <Users className="w-4 h-4" />
            Review Inbox
          </Link>
          <Link
            to="/viva-demo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs backdrop-blur-sm border border-white/10 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Viva Demo (TC01–08)
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Applications"
          value={metrics.total}
          icon={FileText}
          subtext="Processed by workflow"
          variant="slate"
        />
        <MetricCard
          title="Under Committee Review"
          value={metrics.inReview}
          icon={Clock}
          subtext="Active in user task inbox"
          variant="amber"
          badge={metrics.inReview > 0 ? "Pending action" : undefined}
        />
        <MetricCard
          title="Approved by Chair"
          value={metrics.approved}
          icon={CheckCircle2}
          subtext="Qualified for disbursement"
          variant="emerald"
        />
        <MetricCard
          title="Disbursed Successfully"
          value={metrics.disbursed}
          icon={Banknote}
          subtext="Accounts transaction ref"
          variant="blue"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Eligible Candidates"
          value={metrics.eligible}
          icon={TrendingUp}
          subtext="Passed DMN criteria"
          variant="indigo"
        />
        <MetricCard
          title="Ineligible Gate"
          value={metrics.ineligible}
          icon={AlertOctagon}
          subtext="Income/CGPA criteria not met"
          variant="slate"
        />
        <MetricCard
          title="Rejected by Committee"
          value={metrics.rejected}
          icon={XCircle}
          subtext="Chairperson negative decision"
          variant="rose"
        />
        <MetricCard
          title="Disbursement Exceptions"
          value={metrics.exceptions + metrics.manualEscalated}
          icon={AlertOctagon}
          subtext={metrics.exceptions > 0 ? `${metrics.exceptions} in resolution queue` : "503 Boundary handled"}
          variant="amber"
        />
      </div>

      {/* Workflow Pipeline Progression */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 heading-font">
              Automated Workflow Execution Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Live token counts at each stage of the scholarship BPMN process model
            </p>
          </div>
          <Link
            to="/workflow"
            className="text-xs font-semibold text-brand-800 hover:text-brand-900 flex items-center gap-1"
          >
            Inspect BPMN Diagram <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {pipelineSteps.map((step, idx) => (
            <div
              key={step.title}
              className="relative p-4 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
            >
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Stage 0{idx + 1}
              </div>
              <div className="text-2xl font-bold text-slate-900 heading-font">
                {step.count}
              </div>
              <div className="text-xs font-medium text-slate-600 truncate mt-0.5">
                {step.title}
              </div>
              <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-700 h-full rounded-full transition-all duration-500"
                  style={{
                    width: pipeline.submitted > 0 ? `${Math.min(100, (step.count / pipeline.submitted) * 100)}%` : '0%'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Section: Recent Applications & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div>
              <h2 className="text-base font-bold text-slate-900 heading-font">
                Recent Applications
              </h2>
              <p className="text-xs text-slate-500">
                Processed through external worker and Camunda DMN table
              </p>
            </div>
            <Link
              to="/tracker"
              className="text-xs font-semibold text-brand-800 hover:text-brand-900 flex items-center gap-1"
            >
              All Applications <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading live application records...
              </div>
            ) : !data?.applications || data.applications.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">No applications submitted yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click 'New Application' or load one of the test presets in the Viva Demo Console to test the automated workflow.
                </p>
                <Link
                  to="/apply"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-800 text-white text-xs font-semibold"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Submit First Application
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Application Ref</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Award Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.applications.slice(0, 6).map((app) => (
                    <tr key={app.applicationRef} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {app.applicationRef}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{app.studentName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{app.studentId}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {app.course}
                      </td>
                      <td className="py-3 px-4">
                        {app.variables?.eligibilityDecision ? (
                          <div>
                            <span className="font-semibold text-slate-800">
                              {app.variables.eligibilityDecision.scholarshipCategory}
                            </span>
                            {app.variables.eligibilityDecision.scholarshipAmount > 0 && (
                              <span className="text-emerald-700 font-semibold block text-[11px]">
                                ₹{app.variables.eligibilityDecision.scholarshipAmount.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/tracker?ref=${app.applicationRef}`}
                          className="text-xs font-semibold text-brand-800 hover:text-brand-900"
                        >
                          Track
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Live Notification & Activity Feed (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-800" />
              <h2 className="text-base font-bold text-slate-900 heading-font">
                Live Notification Stream
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              Mock API: /notifications
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] pr-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Send className="w-6 h-6 text-slate-300 mx-auto" />
                <p>No notifications generated yet.</p>
                <p className="text-[11px]">Notifications will broadcast here as workers execute in Camunda.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.notificationId}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-1 hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      notif.type === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      notif.type === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      notif.type === 'INELIGIBLE' ? 'bg-slate-200 text-slate-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {notif.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(notif.sentAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 leading-snug">{notif.subject}</p>
                  <p className="text-slate-600 text-[11px] line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400 pt-0.5">
                    To: {notif.to}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
