import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Send,
  Building,
  FileText
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import MetricCard from '../components/MetricCard';
import StatusBadge from '../components/StatusBadge';

export default function FinancePage() {
  const { refreshKey, refreshAll } = useApp();

  const [disbursements, setDisbursements] = useState([]);
  const [exceptionTasks, setExceptionTasks] = useState([]);
  const [selectedException, setSelectedException] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states for disbursement-failure.form
  const [retryAction, setRetryAction] = useState('RETRY');
  const [accountsRemarks, setAccountsRemarks] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    async function loadFinanceData() {
      try {
        setLoading(true);
        const [disbData, taskData] = await Promise.all([
          api.getDisbursements(),
          api.getTasks({ state: 'CREATED' })
        ]);
        setDisbursements(Array.isArray(disbData) ? disbData : []);

        // Filter tasks that have taskDefinitionId === "Resolve" or role === "FINANCE_OFFICER"
        const exceptions = Array.isArray(taskData)
          ? taskData.filter((t) => t.taskDefinitionId === 'Resolve' || t.requiredRole === 'FINANCE_OFFICER')
          : [];
        setExceptionTasks(exceptions);
      } catch (err) {
        console.warn('Error loading finance data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFinanceData();
  }, [refreshKey]);

  const handleResolveException = async (e) => {
    e.preventDefault();
    if (!selectedException) return;

    try {
      setResolving(true);
      await api.completeTask(selectedException.id, {
        retryDisbursement: retryAction,
        accountsRemarks
      });
      alert(`Exception resolved with: ${retryAction}`);
      setSelectedException(null);
      setAccountsRemarks('');
      setRetryAction('RETRY');
      refreshAll();
    } catch (err) {
      alert(`Error resolving exception: ${err.message}`);
    } finally {
      setResolving(false);
    }
  };

  const totalAmount = disbursements.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const successfulCount = disbursements.filter((d) => d.status === 'QUEUED' || d.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 to-brand-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-brand-700/60 text-brand-200 px-2.5 py-1 rounded-full border border-brand-500/30">
            Accounts & Bursar Operations
          </span>
          <h1 className="text-xl font-bold heading-font text-white mt-1">
            Financial Ledger & Disbursement Management
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Live integration with Accounts API (POST /api/disbursements). Monitor transaction references, view ledger, and resolve boundary exceptions.
          </p>
        </div>

        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 transition-all shrink-0 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Ledger
        </button>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Amount Disbursed"
          value={`₹${totalAmount.toLocaleString('en-IN')}`}
          icon={Banknote}
          subtext="Approved grants posted"
          variant="emerald"
        />
        <MetricCard
          title="Disbursement Transactions"
          value={disbursements.length}
          icon={CreditCard}
          subtext="Posted to Accounts system"
          variant="blue"
        />
        <MetricCard
          title="Pending Exceptions"
          value={exceptionTasks.length}
          icon={AlertTriangle}
          subtext="HTTP 503 boundary events"
          variant="amber"
          badge={exceptionTasks.length > 0 ? "Requires action" : undefined}
        />
        <MetricCard
          title="Successful Queue"
          value={successfulCount}
          icon={CheckCircle2}
          subtext="Mock accounts status: QUEUED"
          variant="indigo"
        />
      </div>

      {/* Exception Resolution Queue (Visible if tasks exist) */}
      {exceptionTasks.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-amber-950 heading-font">
                  Disbursement Failure Exception Queue ({exceptionTasks.length})
                </h2>
                <p className="text-xs text-amber-800">
                  Camunda caught boundary error <code>ACCOUNTS_API_ERROR</code>. A Finance Officer must decide whether to Retry or Give Up.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exceptionTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-amber-200 p-4 space-y-3 shadow-sm hover:shadow transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {task.applicationRef}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                    HTTP 503 ERROR
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-slate-700">
                    Student: <strong>{task.studentName}</strong> ({task.studentId})
                  </p>
                  <p className="text-slate-500">
                    Amount: <strong className="text-slate-800">₹{task.variables?.eligibilityDecision?.scholarshipAmount?.toLocaleString('en-IN')}</strong> ({task.variables?.eligibilityDecision?.scholarshipCategory})
                  </p>
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg font-mono">
                    Error: Accounts system unavailable (Simulated 503 on {task.studentId})
                  </p>
                </div>

                <button
                  onClick={() => setSelectedException(task)}
                  className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Open Resolution Form (disbursement-failure.form)
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disbursement Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 heading-font">
              Accounts Disbursement Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Transaction records returned by the Outbound REST Connector task
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Source: GET /api/disbursements
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading ledger records...</div>
          ) : disbursements.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600">No disbursements recorded yet</p>
              <p className="text-[11px] max-w-sm mx-auto">
                Applications must pass through all 5 committee review stages before the Outbound REST Connector triggers the accounts disbursement.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-medium uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Disbursement ID</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Transaction Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {disbursements.map((d) => (
                  <tr key={d.disbursementId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-brand-900">
                      {d.disbursementId}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-medium text-slate-900 block">{d.studentName || 'Student'}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{d.studentId}</span>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700">
                      {d.category || 'SCHOLARSHIP'}
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-emerald-800">
                      ₹{Number(d.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {d.transactionRef}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <StatusBadge status={d.status || 'QUEUED'} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-sans">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Exception Resolution Modal (disbursement-failure.form) */}
      {selectedException && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base heading-font">
                    Resolve Disbursement Failure
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Form: disbursement-failure-form | Task: {selectedException.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveException} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-slate-700">
                  The accounts system could not process the disbursement request for{' '}
                  <strong>{selectedException.studentName}</strong> ({selectedException.studentId}), amount{' '}
                  <strong className="text-emerald-800">
                    ₹{selectedException.variables?.eligibilityDecision?.scholarshipAmount?.toLocaleString('en-IN')} INR
                  </strong>.
                </p>
                <p className="text-slate-500 text-[11px] pt-1">
                  Check the accounts system, then choose whether to retry the request or hand it over for manual disbursement.
                </p>
              </div>

              {/* Action Radios */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                  Next Action <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <label
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      retryAction === 'RETRY'
                        ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="retryChoice"
                      value="RETRY"
                      checked={retryAction === 'RETRY'}
                      onChange={() => setRetryAction('RETRY')}
                      className="accent-brand-800"
                    />
                    <div>
                      <span>Retry the request</span>
                      <p className="text-[11px] font-normal text-slate-500">
                        Loops back to the REST Outbound Connector task in BPMN.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      retryAction === 'GIVE_UP'
                        ? 'bg-orange-50 border-orange-300 text-orange-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="retryChoice"
                      value="GIVE_UP"
                      checked={retryAction === 'GIVE_UP'}
                      onChange={() => setRetryAction('GIVE_UP')}
                      className="accent-orange-600"
                    />
                    <div>
                      <span>Give up and process manually</span>
                      <p className="text-[11px] font-normal text-slate-500">
                        Sends DISBURSEMENT_DELAYED notification and routes to manual escalation end event.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block text-xs">
                  Accounts Remarks
                </label>
                <textarea
                  rows={3}
                  value={accountsRemarks}
                  onChange={(e) => setAccountsRemarks(e.target.value)}
                  placeholder="Reason for decision, incident reference, or notes..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedException(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-5 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white font-semibold flex items-center gap-1.5 shadow"
                >
                  {resolving ? 'Executing Decision...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
