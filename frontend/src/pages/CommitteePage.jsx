import React, { useState, useEffect } from 'react';
import {
  Users,
  Inbox,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Send,
  AlertCircle,
  Award,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Building,
  GraduationCap
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';

export default function CommitteePage() {
  const { currentRole, setCurrentRole, roles, refreshKey, refreshAll } = useApp();

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('CREATED');

  // Form states matching existing forms
  const [stepConfirmed, setStepConfirmed] = useState(false);
  const [stepRemarks, setStepRemarks] = useState('');
  const [committeeDecision, setCommitteeDecision] = useState('APPROVED');
  const [chairRemarks, setChairRemarks] = useState('');

  // Load tasks from BFF
  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        const data = await api.getTasks({
          role: currentRole === 'ALL' ? undefined : currentRole,
          state: statusFilter === 'ALL' ? undefined : statusFilter
        });
        setTasks(Array.isArray(data) ? data : []);
        if (data && data.length > 0 && !selectedTask) {
          setSelectedTask(data[0]);
        } else if (selectedTask) {
          // Re-sync selected task if it still exists
          const updated = data.find((t) => t.id === selectedTask.id);
          setSelectedTask(updated || data[0] || null);
        }
      } catch (err) {
        console.warn('Error loading tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [currentRole, statusFilter, refreshKey]);

  // Reset form inputs when task changes
  useEffect(() => {
    setStepConfirmed(false);
    setStepRemarks('');
    setCommitteeDecision('APPROVED');
    setChairRemarks('');
  }, [selectedTask]);

  const handleCompleteTask = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    const isChair = selectedTask.taskDefinitionId === 'Chair';

    if (!isChair && !stepConfirmed) {
      alert('Please check "I have reviewed this application" before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = isChair
        ? { committeeDecision, chairRemarks }
        : { stepConfirmed: true, stepRemarks };

      await api.completeTask(selectedTask.id, payload);
      refreshAll();
      alert(`Task "${selectedTask.taskName}" completed successfully.`);
    } catch (err) {
      alert(`Error completing task: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.taskName.toLowerCase().includes(term) ||
      t.studentName.toLowerCase().includes(term) ||
      t.applicationRef.toLowerCase().includes(term)
    );
  });

  const isChairTask = selectedTask?.taskDefinitionId === 'Chair';
  const vars = selectedTask?.variables || {};
  const dmn = vars.eligibilityDecision || {};

  return (
    <div className="space-y-6">
      {/* Top Banner: Role Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              Demo Reviewer Role Selection
            </span>
            <h1 className="text-xl font-bold text-slate-900 heading-font mt-1">
              Committee Review Workspace & Task Inbox
            </h1>
            <p className="text-xs text-slate-500">
              Select a committee role to inspect assigned review stages or choose 'All' to review all open tasks.
            </p>
          </div>

          {/* Role Pills */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {roles
              .filter((r) => ['ALL', 'FA_AA', 'HOD', 'CHAIRPERSON', 'VICE_CHANCELLOR', 'CHANCELLOR'].includes(r.id))
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => setCurrentRole(r.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    currentRole === r.id
                      ? 'bg-brand-800 text-white border-brand-900 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {r.badge}
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* Main Workspace: 2 Columns (Task Inbox on left, Review Panel on right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Task Inbox (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-brand-800" />
                <h2 className="text-sm font-bold text-slate-900 heading-font">
                  Pending Task Inbox
                </h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800">
                  {filteredTasks.length}
                </span>
              </div>
              <button
                onClick={refreshAll}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                title="Refresh Tasks"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search and State Filters */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter tasks by student, ref..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
              >
                <option value="CREATED">Active (Open)</option>
                <option value="COMPLETED">Completed</option>
                <option value="ALL">All States</option>
              </select>
            </div>
          </div>

          {/* Task List Items */}
          <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400">Loading Camunda user tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">No pending tasks for this role</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Submit a new student application or switch roles in the header to review tasks assigned to other committee stages.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isSelected = selectedTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-brand-50/70 border-l-4 border-l-brand-800'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-100/70 px-2 py-0.5 rounded">
                          {task.stage}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs pt-1">
                          {task.taskName}
                        </h4>
                        <p className="text-xs text-slate-600 font-medium">
                          {task.studentName}{' '}
                          <span className="font-mono text-slate-400 text-[11px]">
                            ({task.applicationRef})
                          </span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-400 block">
                          {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${
                          task.state === 'CREATED' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {task.state}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Application Review Panel & Dynamic Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedTask ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
              {/* Task Header */}
              <div className="pb-4 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-800 text-white px-2 py-0.5 rounded">
                      Camunda Form: {selectedTask.formId}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Task ID: {selectedTask.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 heading-font mt-1">
                    {selectedTask.taskName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Application Reference: <strong className="text-slate-800 font-mono">{selectedTask.applicationRef}</strong>
                  </p>
                </div>

                <StatusBadge status={selectedTask.state === 'COMPLETED' ? 'APPROVED' : 'IN_REVIEW'} />
              </div>

              {/* Student Profile & Academic Overview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Applicant Profile & Credentials
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px]">Student Name:</span>
                    <p className="font-semibold text-slate-900">{selectedTask.studentName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Student ID:</span>
                    <p className="font-mono font-semibold text-slate-900">{selectedTask.studentId}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Course:</span>
                    <p className="font-semibold text-slate-900">{vars.course || 'B.Tech CSE'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Annual Family Income:</span>
                    <p className="font-semibold text-slate-900">
                      ₹{vars.familyIncome ? Number(vars.familyIncome).toLocaleString('en-IN') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">CGPA:</span>
                    <p className="font-semibold text-slate-900">{vars.cgpa} / 10.0</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Attendance & Backlogs:</span>
                    <p className="font-semibold text-slate-900">
                      {vars.attendancePercent}% attendance | {vars.activeBacklogs || 0} backlogs
                    </p>
                  </div>
                </div>
              </div>

              {/* DMN Decision Banner */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                    Automated DMN Eligibility Table Output
                  </span>
                  <span className="font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded">
                    {dmn.eligibility || 'Eligible'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-slate-500 text-[11px]">Proposed Scheme:</span>
                    <p className="font-bold text-slate-900 text-sm">{dmn.scholarshipCategory}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px]">Proposed Amount:</span>
                    <p className="font-bold text-emerald-800 text-sm">
                      ₹{dmn.scholarshipAmount?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-600 pt-1 border-t border-indigo-200/50">
                  {dmn.decisionReason}
                </p>
              </div>

              {/* Dynamic Review Action Form */}
              {selectedTask.state === 'COMPLETED' ? (
                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 text-center space-y-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  <p className="font-semibold">This task was already completed.</p>
                  <p className="text-[11px] text-slate-400">The process has advanced in the workflow engine.</p>
                </div>
              ) : isChairTask ? (
                /* CHAIRPERSON FORM (chair-decision.form) */
                <form onSubmit={handleCompleteTask} className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                      Chairperson Decision <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          committeeDecision === 'APPROVED'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="chairDecision"
                          value="APPROVED"
                          checked={committeeDecision === 'APPROVED'}
                          onChange={() => setCommitteeDecision('APPROVED')}
                          className="accent-emerald-600"
                        />
                        <span className="text-xs">Approve (Proceeds to VC & Chancellor)</span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                          committeeDecision === 'REJECTED'
                            ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="chairDecision"
                          value="REJECTED"
                          checked={committeeDecision === 'REJECTED'}
                          onChange={() => setCommitteeDecision('REJECTED')}
                          className="accent-rose-600"
                        />
                        <span className="text-xs">Reject Application</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Chairperson Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={chairRemarks}
                      onChange={(e) => setChairRemarks(e.target.value)}
                      placeholder="Add formal justification or comments for the candidate..."
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      'Advancing Camunda Process...'
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Chairperson Decision & Advance Process
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* STANDARD COMMITTEE STEP FORM (committee-step.form for FA&AA, HOD, VC, Chancellor) */
                <form onSubmit={handleCompleteTask} className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stepConfirmed}
                        onChange={(e) => setStepConfirmed(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-800 focus:ring-brand-500 accent-brand-800"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        I have reviewed this application and confirm endorsement
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 pl-6">
                      Required for Camunda form submission (variable: <code>stepConfirmed</code>).
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      Reviewer Remarks (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={stepRemarks}
                      onChange={(e) => setStepRemarks(e.target.value)}
                      placeholder={`Remarks by ${selectedTask.stage}...`}
                      className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !stepConfirmed}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      'Advancing Camunda Process...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Submit Review ({selectedTask.stage})
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-12 text-center text-xs text-slate-400 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">Select a task from the inbox to review</p>
              <p className="text-[11px]">Click any open task on the left to inspect student details and submit review.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
