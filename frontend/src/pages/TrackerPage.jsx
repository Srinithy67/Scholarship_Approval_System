import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertOctagon,
  ArrowRight,
  FileText,
  User,
  GraduationCap,
  IndianRupee,
  ShieldCheck,
  CreditCard,
  Bell,
  RefreshCw,
  AlertTriangle,
  History
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

export default function TrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const { refreshKey } = useApp();
  const [searchTerm, setSearchTerm] = useState(initialRef);
  const [application, setApplication] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentList, setRecentList] = useState([]);

  // Fetch recent applications for quick selection
  useEffect(() => {
    async function loadRecent() {
      try {
        const data = await api.getApplications();
        if (data?.applications) {
          setRecentList(data.applications.slice(0, 5));
          // If no search term provided, default to the latest application
          if (!initialRef && data.applications.length > 0) {
            handleSearch(data.applications[0].applicationRef);
          }
        }
      } catch (err) {
        console.warn('Could not load recent applications:', err);
      }
    }
    loadRecent();
  }, [refreshKey]);

  useEffect(() => {
    if (initialRef) {
      handleSearch(initialRef);
    }
  }, [initialRef, refreshKey]);

  const handleSearch = async (queryRef) => {
    const refToSearch = queryRef || searchTerm;
    if (!refToSearch.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const app = await api.getApplication(refToSearch.trim());
      setApplication(app);
      setSearchParams({ ref: app.applicationRef });

      // Fetch student notifications
      try {
        const notifs = await api.getNotifications({
          studentEmail: app.studentEmail,
          studentId: app.studentId
        });
        setNotifications(Array.isArray(notifs) ? notifs : []);
      } catch (e) {
        setNotifications([]);
      }
    } catch (err) {
      setApplication(null);
      setError(`Application "${refToSearch}" not found. Verify the reference or student ID.`);
    } finally {
      setLoading(false);
    }
  };

  const calculateStageStatus = (stageIndex) => {
    if (!application) return 'PENDING';
    const status = application.status;
    const isCompleted = application.isCompleted;

    // 1: Submitted
    if (stageIndex === 1) return 'COMPLETED';

    // 2: Eligibility Evaluated (DMN)
    if (stageIndex === 2) {
      if (status === 'INELIGIBLE') return 'INELIGIBLE';
      return 'COMPLETED';
    }

    // 3: Committee Review
    if (stageIndex === 3) {
      if (status === 'INELIGIBLE') return 'SKIPPED';
      if (status === 'REJECTED') return 'REJECTED';
      if (status === 'IN_REVIEW' && !['VC', 'Activity_0x10378'].includes(application.activeTaskId)) {
        return 'ACTIVE';
      }
      return 'COMPLETED';
    }

    // 4: Final Sign-off (VC & Chancellor)
    if (stageIndex === 4) {
      if (status === 'INELIGIBLE' || status === 'REJECTED') return 'SKIPPED';
      if (['VC', 'Activity_0x10378'].includes(application.activeTaskId)) {
        return 'ACTIVE';
      }
      if (['APPROVED', 'DISBURSED', 'DISBURSEMENT_EXCEPTION', 'DISBURSEMENT_DELAYED'].includes(status)) {
        return 'COMPLETED';
      }
      return 'PENDING';
    }

    // 5: Financial Disbursement
    if (stageIndex === 5) {
      if (status === 'INELIGIBLE' || status === 'REJECTED') return 'SKIPPED';
      if (status === 'DISBURSEMENT_EXCEPTION') return 'EXCEPTION';
      if (status === 'DISBURSEMENT_DELAYED') return 'ESCALATED';
      if (status === 'APPROVED' || application.variables?.disbursementId) return 'COMPLETED';
      return 'PENDING';
    }

    // 6: Process Complete
    if (stageIndex === 6) {
      if (isCompleted) return 'COMPLETED';
      return 'PENDING';
    }

    return 'PENDING';
  };

  const stages = [
    { id: 1, label: 'Application Submitted', subtitle: 'Validated by Worker' },
    { id: 2, label: 'Eligibility Evaluation', subtitle: 'DMN Table Evaluated' },
    { id: 3, label: 'Committee Review', subtitle: 'FA&AA, HOD & Chair' },
    { id: 4, label: 'Executive Sign-off', subtitle: 'VC & Chancellor' },
    { id: 5, label: 'Financial Disbursement', subtitle: 'Accounts Outbound API' },
    { id: 6, label: 'Process Finalized', subtitle: 'Terminal End Event' },
  ];

  const getStageBadge = (st) => {
    switch (st) {
      case 'COMPLETED':
        return <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300 shrink-0"><CheckCircle2 className="w-5 h-5" /></span>;
      case 'ACTIVE':
        return <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center border border-brand-400 shrink-0 animate-pulse"><Clock className="w-5 h-5" /></span>;
      case 'INELIGIBLE':
      case 'REJECTED':
        return <span className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-300 shrink-0"><XCircle className="w-5 h-5" /></span>;
      case 'EXCEPTION':
        return <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300 shrink-0 animate-bounce"><AlertTriangle className="w-5 h-5" /></span>;
      case 'ESCALATED':
        return <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center border border-orange-300 shrink-0"><AlertOctagon className="w-5 h-5" /></span>;
      case 'SKIPPED':
        return <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0 text-xs font-mono">-</span>;
      default:
        return <span className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center border border-slate-200 shrink-0 text-xs font-bold font-mono">{st === 'PENDING' ? '○' : ''}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <div className="max-w-2xl">
          <h1 className="text-xl font-bold text-slate-900 heading-font">
            Track Scholarship Process State
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search by institutional application reference (e.g. <code>APP-S2026-001</code>) or student ID (e.g. <code>S2026-001</code>).
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex items-center gap-2 mt-4"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter Application Ref (e.g. APP-S2026-001) or Student ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-200 bg-slate-50/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 shrink-0"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Search Status'}
            </button>
          </form>

          {/* Quick Select Buttons from Recent Applications */}
          {recentList.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Select:</span>
              {recentList.map((app) => (
                <button
                  key={app.applicationRef}
                  onClick={() => {
                    setSearchTerm(app.applicationRef);
                    handleSearch(app.applicationRef);
                  }}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all ${
                    application?.applicationRef === app.applicationRef
                      ? 'bg-brand-50 border-brand-300 text-brand-900 font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  {app.applicationRef}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {application && (
        <div className="space-y-6">
          {/* Application Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-mono font-bold text-slate-900">
                    {application.applicationRef}
                  </span>
                  <StatusBadge status={application.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                  <span>Student: <strong>{application.studentName}</strong> ({application.studentId})</span>
                  <span>•</span>
                  <span>Course: <strong>{application.course}</strong></span>
                  <span>•</span>
                  <span>Submitted: {new Date(application.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Camunda Process Instance</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{application.processInstanceId}</span>
                </div>
              </div>
            </div>

            {/* Visual Dynamic Process Pipeline Timeline */}
            <div className="pt-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">
                Automated Workflow Execution Flow
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                {stages.map((st) => {
                  const stageStatus = calculateStageStatus(st.id);
                  return (
                    <div
                      key={st.id}
                      className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 ${
                        stageStatus === 'ACTIVE'
                          ? 'bg-brand-50/70 border-brand-300 shadow-sm'
                          : stageStatus === 'COMPLETED'
                          ? 'bg-slate-50/70 border-slate-200'
                          : stageStatus === 'EXCEPTION'
                          ? 'bg-amber-50/80 border-amber-300'
                          : stageStatus === 'INELIGIBLE' || stageStatus === 'REJECTED'
                          ? 'bg-rose-50/70 border-rose-200'
                          : 'bg-white border-slate-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-400">Step 0{st.id}</span>
                        {getStageBadge(stageStatus)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs leading-tight">{st.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{st.subtitle}</p>
                      </div>
                      <div className="pt-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          stageStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          stageStatus === 'ACTIVE' ? 'bg-brand-100 text-brand-800' :
                          stageStatus === 'EXCEPTION' ? 'bg-amber-100 text-amber-800' :
                          stageStatus === 'INELIGIBLE' || stageStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {stageStatus}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details Grid: Decision Card + Disbursement Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scholarship Decision Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 heading-font flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-800" />
                  DMN Decision & Committee Verdict
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Decision Table</span>
              </div>

              {application.variables?.eligibilityDecision ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Eligibility Evaluation:</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      application.variables.eligibilityDecision.eligibility === 'Eligible'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {application.variables.eligibilityDecision.eligibility}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Scholarship Scheme:</span>
                    <span className="font-bold text-slate-800">
                      {application.variables.eligibilityDecision.scholarshipCategory}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Approved Award Amount:</span>
                    <span className="text-sm font-bold text-emerald-700">
                      ₹{application.variables.eligibilityDecision.scholarshipAmount?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Evaluation Rationale</span>
                    <p className="text-slate-700 font-medium">
                      {application.variables.eligibilityDecision.decisionReason}
                    </p>
                  </div>

                  {application.variables.committeeDecision && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Chairperson Decision:</span>
                        <span className={`font-bold px-2 py-0.5 rounded ${
                          application.variables.committeeDecision === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {application.variables.committeeDecision}
                        </span>
                      </div>
                      {application.variables.chairRemarks && (
                        <p className="text-slate-600 text-[11px] italic">
                          "{application.variables.chairRemarks}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">DMN eligibility not evaluated yet.</p>
              )}
            </div>

            {/* Financial Disbursement Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-900 heading-font flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-800" />
                  Financial Accounts & Disbursement
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Accounts API</span>
              </div>

              {application.variables?.disbursementId ? (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-800">Disbursement Reference</span>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                        {application.variables.disbursementStatus || 'QUEUED'}
                      </span>
                    </div>
                    <p className="text-xl font-mono font-bold text-emerald-950">
                      {application.variables.disbursementId}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Transaction Reference:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {application.variables.transactionRef}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Amount Initiated:</span>
                      <span className="font-bold text-slate-900">
                        ₹{application.variables.eligibilityDecision?.scholarshipAmount?.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Beneficiary:</span>
                      <span className="font-medium text-slate-800">
                        {application.studentName} ({application.studentId})
                      </span>
                    </div>
                  </div>
                </div>
              ) : application.status === 'DISBURSEMENT_EXCEPTION' ? (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Accounts API Error (HTTP 503)
                  </div>
                  <p className="leading-relaxed">
                    The automated REST outbound connector task encountered an error. The process has branched into the <strong>Resolve disbursement failure</strong> user task in the Finance Desk.
                  </p>
                </div>
              ) : application.status === 'DISBURSEMENT_DELAYED' ? (
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertOctagon className="w-4 h-4 text-orange-600" />
                    Escalated for Manual Disbursement
                  </div>
                  <p className="leading-relaxed">
                    Finance Officer resolved the exception with <strong>GIVE_UP</strong>. Accounts office will issue a manual bank draft.
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CreditCard className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p>Awaiting completion of all committee review stages prior to accounts disbursement.</p>
                </div>
              )}
            </div>
          </div>

          {/* Audit Timeline & Notifications */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline Audit Log (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 heading-font flex items-center gap-2">
                <History className="w-4 h-4 text-brand-800" />
                Live Process Event Audit Trail
              </h3>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {application.timeline?.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative text-xs space-y-0.5">
                    <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-700 ring-4 ring-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{evt.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{evt.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Notifications (1 col) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900 heading-font flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-800" />
                Student Notifications
              </h3>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No personal notifications broadcast for this student yet.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  {notifications.map((n) => (
                    <div
                      key={n.notificationId}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                          {n.type}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(n.sentAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900">{n.subject}</p>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
