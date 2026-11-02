import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  CreditCard,
  UserCheck,
  FileText,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

export default function WorkflowPage() {
  const { refreshKey } = useApp();
  const [applications, setApplications] = useState([]);
  const [selectedRef, setSelectedRef] = useState('');
  const [activeApp, setActiveApp] = useState(null);

  useEffect(() => {
    async function loadApps() {
      try {
        const data = await api.getApplications();
        if (data?.applications && data.applications.length > 0) {
          setApplications(data.applications);
          if (!selectedRef) {
            setSelectedRef(data.applications[0].applicationRef);
            setActiveApp(data.applications[0]);
          }
        }
      } catch (err) {
        console.warn('Error loading applications:', err);
      }
    }
    loadApps();
  }, [refreshKey]);

  const handleSelectApp = (ref) => {
    setSelectedRef(ref);
    const found = applications.find((a) => a.applicationRef === ref);
    setActiveApp(found || null);
  };

  const isNodeActive = (nodeId) => {
    if (!activeApp) return false;
    return activeApp.activeNodeId === nodeId;
  };

  const isNodeCompleted = (nodeId) => {
    if (!activeApp || !activeApp.timeline) return false;
    // Map timeline event names or stages to nodes
    if (nodeId === 'Start') return true;
    if (nodeId === 'Extract') return activeApp.timeline.some((e) => e.stage === 'EXTRACTION');
    if (nodeId === 'DMN') return activeApp.timeline.some((e) => e.stage === 'DMN');
    if (nodeId === 'Activity_0xiv2pn') return activeApp.timeline.some((e) => e.name.includes('FA and AA') && e.status === 'COMPLETED');
    if (nodeId === 'HOD') return activeApp.timeline.some((e) => e.name.includes('HOD') && e.status === 'COMPLETED');
    if (nodeId === 'Chair') return activeApp.timeline.some((e) => e.name.includes('Chairperson') && e.status === 'COMPLETED');
    if (nodeId === 'VC') return activeApp.timeline.some((e) => e.name.includes('Vice-Chancellor') && e.status === 'COMPLETED');
    if (nodeId === 'Activity_0x10378') return activeApp.timeline.some((e) => e.name.includes('Chancellor') && e.status === 'COMPLETED');
    if (nodeId === 'Post') return activeApp.timeline.some((e) => e.stage === 'DISBURSEMENT' && e.status === 'COMPLETED');
    if (nodeId === 'Resolve') return activeApp.timeline.some((e) => e.stage === 'EXCEPTION' && e.status === 'COMPLETED');
    if (nodeId === 'EndDisb') return activeApp.status === 'APPROVED';
    if (nodeId === 'EndInel') return activeApp.status === 'INELIGIBLE';
    if (nodeId === 'EndRej') return activeApp.status === 'REJECTED';
    if (nodeId === 'EndEsc') return activeApp.status === 'DISBURSEMENT_DELAYED';
    return false;
  };

  const getNodeStyle = (nodeId) => {
    if (isNodeActive(nodeId)) {
      return 'border-brand-500 bg-brand-50 ring-2 ring-brand-400 text-brand-950 font-bold shadow-md animate-pulse';
    }
    if (isNodeCompleted(nodeId)) {
      return 'border-emerald-300 bg-emerald-50/60 text-emerald-950 font-semibold';
    }
    return 'border-slate-200 bg-white text-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              Process Model Definition: ScholarshipProcess
            </span>
            <h1 className="text-xl font-bold text-slate-900 heading-font mt-1">
              Live BPMN Process Architecture & Token Inspector
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Inspect the exact executable BPMN process model deployed to Camunda 8. Select an active application below to highlight visited nodes, active wait states, and gateway branches.
            </p>
          </div>

          {/* Select Application to Trace */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-500">Inspect App:</span>
            <select
              value={selectedRef}
              onChange={(e) => handleSelectApp(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-200"
            >
              {applications.length === 0 ? (
                <option value="">No applications available</option>
              ) : (
                applications.map((a) => (
                  <option key={a.applicationRef} value={a.applicationRef}>
                    {a.applicationRef} - {a.studentName} ({a.status})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Application Meta Pill */}
      {activeApp && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-slate-900">{activeApp.applicationRef}</span>
            <span>•</span>
            <span>Candidate: <strong>{activeApp.studentName}</strong></span>
            <span>•</span>
            <span>Current Node: <strong className="text-brand-900">{activeApp.activeNodeName}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">Node ID: {activeApp.activeNodeId}</span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
              activeApp.isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-brand-800'
            }`}>
              {activeApp.isCompleted ? 'Terminal End State' : 'In Progress'}
            </span>
          </div>
        </div>
      )}

      {/* BPMN Interactive Visual Map */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 overflow-x-auto">
        <div className="min-w-[980px] space-y-8 py-4">
          {/* Main Horizontal Flow: Extraction -> DMN -> Gateway */}
          <div className="flex items-center gap-4">
            {/* Start Event */}
            <div className="flex flex-col items-center text-center w-28">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${getNodeStyle('Start')}`}>
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-slate-800 mt-2">Start Form</span>
              <span className="text-[9px] text-slate-400 font-mono">scholarship-application</span>
            </div>

            <div className="h-0.5 w-8 bg-slate-300" />

            {/* Extract Task */}
            <div className="flex flex-col items-center text-center w-36">
              <div className={`w-36 p-3 rounded-xl border-2 text-xs transition-all ${getNodeStyle('Extract')}`}>
                <span className="text-[9px] font-bold uppercase tracking-wider block text-brand-800">External Worker</span>
                <p className="font-bold text-slate-900 mt-0.5">Extract Details</p>
                <span className="text-[9px] text-slate-400 font-mono block mt-1">extract-application-details</span>
              </div>
            </div>

            <div className="h-0.5 w-8 bg-slate-300" />

            {/* DMN Business Rule Task */}
            <div className="flex flex-col items-center text-center w-36">
              <div className={`w-36 p-3 rounded-xl border-2 text-xs transition-all ${getNodeStyle('DMN')}`}>
                <span className="text-[9px] font-bold uppercase tracking-wider block text-indigo-800">Business Rule Task</span>
                <p className="font-bold text-slate-900 mt-0.5">DMN Eligibility</p>
                <span className="text-[9px] text-slate-400 font-mono block mt-1">scholarship_eligibility</span>
              </div>
            </div>

            <div className="h-0.5 w-8 bg-slate-300" />

            {/* Gateway GwElig */}
            <div className="flex flex-col items-center text-center w-20">
              <div className="w-10 h-10 rotate-45 border-2 border-slate-300 bg-slate-50 flex items-center justify-center">
                <span className="-rotate-45 text-xs font-bold text-slate-700">✕</span>
              </div>
              <span className="text-[11px] font-bold text-slate-800 mt-3">Eligible?</span>
            </div>

            <div className="h-0.5 w-8 bg-slate-300" />

            {/* Subprocess: Committee Review Container */}
            <div className="flex-1 p-5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-700" />
                  Subprocess: Committee Review
                </span>
                <span className="text-[10px] text-indigo-700 font-mono">PT48H Non-interrupting Timer Attached</span>
              </div>

              {/* Sequential 5 User Tasks */}
              <div className="flex items-center justify-between gap-2">
                {/* 1. FA and AA */}
                <div className={`p-2.5 rounded-xl border-2 text-center text-xs flex-1 ${getNodeStyle('Activity_0xiv2pn')}`}>
                  <span className="text-[9px] font-bold text-brand-800 block">User Task</span>
                  <p className="font-bold text-slate-900 text-[11px]">FA and AA</p>
                  <span className="text-[9px] text-slate-400 font-mono block">committee-step</span>
                </div>

                <span className="text-slate-300">→</span>

                {/* 2. HOD */}
                <div className={`p-2.5 rounded-xl border-2 text-center text-xs flex-1 ${getNodeStyle('HOD')}`}>
                  <span className="text-[9px] font-bold text-brand-800 block">User Task</span>
                  <p className="font-bold text-slate-900 text-[11px]">HOD Endorse</p>
                  <span className="text-[9px] text-slate-400 font-mono block">committee-step</span>
                </div>

                <span className="text-slate-300">→</span>

                {/* 3. Chair */}
                <div className={`p-2.5 rounded-xl border-2 text-center text-xs flex-1 ${getNodeStyle('Chair')}`}>
                  <span className="text-[9px] font-bold text-brand-800 block">Decision</span>
                  <p className="font-bold text-slate-900 text-[11px]">Chairperson</p>
                  <span className="text-[9px] text-slate-400 font-mono block">chair-decision</span>
                </div>

                <span className="text-slate-300">→</span>

                {/* 4. VC */}
                <div className={`p-2.5 rounded-xl border-2 text-center text-xs flex-1 ${getNodeStyle('VC')}`}>
                  <span className="text-[9px] font-bold text-brand-800 block">Sign-off</span>
                  <p className="font-bold text-slate-900 text-[11px]">Vice-Chancellor</p>
                  <span className="text-[9px] text-slate-400 font-mono block">committee-step</span>
                </div>

                <span className="text-slate-300">→</span>

                {/* 5. Chancellor */}
                <div className={`p-2.5 rounded-xl border-2 text-center text-xs flex-1 ${getNodeStyle('Activity_0x10378')}`}>
                  <span className="text-[9px] font-bold text-brand-800 block">Sign-off</span>
                  <p className="font-bold text-slate-900 text-[11px]">Chancellor</p>
                  <span className="text-[9px] text-slate-400 font-mono block">committee-step</span>
                </div>
              </div>
            </div>
          </div>

          {/* Branches & Financial Disbursement Flow */}
          <div className="grid grid-cols-3 gap-6 pt-2">
            {/* Branch A: Ineligible Path */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Ineligible Gateway Branch
              </span>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg border-2 text-xs flex-1 ${getNodeStyle('NotifyNE')}`}>
                  <span className="text-[9px] font-bold text-slate-600 block">Worker: send-notification</span>
                  <p className="font-semibold text-slate-900">Notify: INELIGIBLE</p>
                </div>
                <span>→</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${getNodeStyle('EndInel')}`}>
                  <span className="text-[10px] font-bold">End</span>
                </div>
              </div>
            </div>

            {/* Branch B: Committee Rejection Path */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Chairperson Rejection Branch
              </span>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg border-2 text-xs flex-1 ${getNodeStyle('NotifyRej')}`}>
                  <span className="text-[9px] font-bold text-rose-700 block">Worker: send-notification</span>
                  <p className="font-semibold text-slate-900">Notify: REJECTED</p>
                </div>
                <span>→</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${getNodeStyle('EndRej')}`}>
                  <span className="text-[10px] font-bold">End</span>
                </div>
              </div>
            </div>

            {/* Branch C: Financial Disbursement & Boundary Event */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
                Financial Disbursement & Exception
              </span>
              <div className="flex items-center gap-2">
                <div className={`p-2.5 rounded-lg border-2 text-xs flex-1 ${getNodeStyle('Post')}`}>
                  <span className="text-[9px] font-bold text-blue-800 block">REST Connector</span>
                  <p className="font-semibold text-slate-900">Post Disbursement</p>
                </div>
                <span>→</span>
                <div className={`p-2.5 rounded-lg border-2 text-xs flex-1 ${getNodeStyle('NotifyAppr')}`}>
                  <span className="text-[9px] font-bold text-emerald-800 block">Worker</span>
                  <p className="font-semibold text-slate-900">Notify APPROVED</p>
                </div>
                <span>→</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${getNodeStyle('EndDisb')}`}>
                  <span className="text-[10px] font-bold">End</span>
                </div>
              </div>

              {/* Boundary Error Event */}
              <div className="pt-2 border-t border-blue-200/60 flex items-center gap-2 text-[11px]">
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold text-[10px]">
                  503 Err Boundary
                </span>
                <span>→</span>
                <div className={`p-1.5 rounded-md border text-center flex-1 ${getNodeStyle('Resolve')}`}>
                  Resolve failure (RETRY / GIVE_UP)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
