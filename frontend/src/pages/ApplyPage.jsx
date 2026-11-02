import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  IndianRupee,
  GraduationCap,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Send,
  HelpCircle,
  Copy,
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';

const INITIAL_FORM = {
  studentId: '',
  studentName: '',
  studentEmail: '',
  course: 'B.Tech CSE',
  incomeCertificateNo: '',
  familyIncome: '',
  cgpa: '',
  attendancePercent: '',
  activeBacklogs: 0
};

export default function ApplyPage() {
  const navigate = useNavigate();
  const { refreshAll } = useApp();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [scenarios, setScenarios] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState(null);
  const [copied, setCopied] = useState(false);

  // Load test presets from backend
  useEffect(() => {
    async function loadPresets() {
      try {
        const data = await api.getScenarios();
        setScenarios(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn("Could not load presets:", err);
      }
    }
    loadPresets();
  }, []);

  // Fetch real-time indicative preview when relevant fields change
  useEffect(() => {
    const { familyIncome, cgpa, attendancePercent, activeBacklogs } = formData;
    if (familyIncome !== '' || cgpa !== '') {
      const timer = setTimeout(async () => {
        try {
          setPreviewLoading(true);
          const res = await api.previewEligibility({
            familyIncome: Number(familyIncome) || 0,
            cgpa: Number(cgpa) || 0,
            attendancePercent: Number(attendancePercent) || 0,
            activeBacklogs: Number(activeBacklogs) || 0
          });
          setPreview(res);
        } catch (e) {
          // ignore preview error
        } finally {
          setPreviewLoading(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [formData.familyIncome, formData.cgpa, formData.attendancePercent, formData.activeBacklogs]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSelectPreset = (e) => {
    const scenarioId = e.target.value;
    if (!scenarioId) return;
    const selected = scenarios.find((s) => s.id === scenarioId);
    if (selected && selected.payload) {
      setFormData({
        studentId: selected.payload.studentId || '',
        studentName: selected.payload.studentName || '',
        studentEmail: selected.payload.studentEmail || '',
        course: selected.payload.course || 'B.Tech CSE',
        incomeCertificateNo: selected.payload.incomeCertificateNo || 'IC-2026-0001',
        familyIncome: selected.payload.familyIncome ?? '',
        cgpa: selected.payload.cgpa ?? '',
        attendancePercent: selected.payload.attendancePercent ?? '',
        activeBacklogs: selected.payload.activeBacklogs ?? 0
      });
      setErrors({});
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};
    if (currentStep === 1) {
      if (!formData.studentId.trim()) newErrors.studentId = 'Student ID is required';
      if (!formData.studentName.trim()) newErrors.studentName = 'Student Name is required';
      if (!formData.studentEmail.trim()) {
        newErrors.studentEmail = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.studentEmail)) {
        newErrors.studentEmail = 'Enter a valid email address';
      }
      if (!formData.course) newErrors.course = 'Please select a course';
    } else if (currentStep === 2) {
      if (!formData.incomeCertificateNo.trim()) newErrors.incomeCertificateNo = 'Certificate number is required';
      if (formData.familyIncome === '' || Number(formData.familyIncome) < 0) {
        newErrors.familyIncome = 'Enter valid annual family income (>= 0)';
      }
    } else if (currentStep === 3) {
      const cgpa = Number(formData.cgpa);
      if (formData.cgpa === '' || isNaN(cgpa) || cgpa < 0 || cgpa > 10) {
        newErrors.cgpa = 'CGPA must be between 0.0 and 10.0';
      }
      const att = Number(formData.attendancePercent);
      if (formData.attendancePercent === '' || isNaN(att) || att < 0 || att > 100) {
        newErrors.attendancePercent = 'Attendance must be between 0% and 100%';
      }
      const backlogs = Number(formData.activeBacklogs);
      if (formData.activeBacklogs === '' || isNaN(backlogs) || backlogs < 0) {
        newErrors.activeBacklogs = 'Backlogs must be 0 or higher';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.startApplication({
        studentId: formData.studentId.trim(),
        studentName: formData.studentName.trim(),
        studentEmail: formData.studentEmail.trim(),
        course: formData.course,
        incomeCertificateNo: formData.incomeCertificateNo.trim(),
        familyIncome: Number(formData.familyIncome),
        cgpa: Number(formData.cgpa),
        attendancePercent: Number(formData.attendancePercent),
        activeBacklogs: Number(formData.activeBacklogs)
      });
      setSubmittedApp(res.application);
      refreshAll();
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = () => {
    if (submittedApp?.applicationRef) {
      navigator.clipboard.writeText(submittedApp.applicationRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If application was submitted, show the official institutional receipt!
  if (submittedApp) {
    const isEligible = submittedApp.variables?.eligibilityDecision?.eligibility === 'Eligible';
    const decision = submittedApp.variables?.eligibilityDecision;

    return (
      <div className="max-w-2xl mx-auto space-y-6 py-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-navy-900 to-brand-900 p-6 text-white text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-bold tracking-widest uppercase bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Camunda 8 Process Initialized
            </span>
            <h1 className="text-xl font-bold heading-font text-white">
              Application Submission Receipt
            </h1>
            <p className="text-xs text-slate-300">
              The external worker has extracted details, validated criteria, and executed the DMN decision table.
            </p>
          </div>

          {/* Reference Card */}
          <div className="p-6 space-y-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Application Reference</span>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-mono font-bold text-slate-900">
                  {submittedApp.applicationRef}
                </span>
                <button
                  onClick={copyRef}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                  title="Copy Reference"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <p className="text-xs text-emerald-600 font-medium">Copied to clipboard!</p>}
            </div>

            {/* Application Summary Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Student Name</span>
                <p className="font-semibold text-slate-800">{submittedApp.studentName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Student ID</span>
                <p className="font-mono font-semibold text-slate-800">{submittedApp.studentId}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Course</span>
                <p className="font-semibold text-slate-800">{submittedApp.course}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 uppercase font-semibold text-[10px]">Submission Time</span>
                <p className="text-slate-800">{new Date(submittedApp.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* DMN Decision Banner */}
            <div className={`p-4 rounded-xl border ${
              isEligible ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Automated DMN Decision
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {decision?.eligibility}
                </span>
              </div>
              <p className="text-xs text-slate-600">{decision?.decisionReason}</p>
              {isEligible && (
                <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between">
                  <span className="text-xs text-emerald-800 font-medium">
                    Award Category: <strong>{decision?.scholarshipCategory}</strong>
                  </span>
                  <span className="text-sm font-bold text-emerald-900">
                    ₹{decision?.scholarshipAmount?.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Next Steps Info */}
            <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl space-y-1">
              <p className="font-semibold text-slate-700">What happens next?</p>
              {isEligible ? (
                <p>
                  Your application has entered the <strong>Committee Review Subprocess</strong>. It is currently queued for review by the <strong>Finance & Academic Affairs (FA and AA)</strong> committee member.
                </p>
              ) : (
                <p>
                  Your application did not satisfy the scholarship criteria. An automated notification has been broadcast to your registered email address.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                to={`/tracker?ref=${submittedApp.applicationRef}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold text-center shadow-sm flex items-center justify-center gap-2"
              >
                Track Live Application <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  setSubmittedApp(null);
                  setFormData(INITIAL_FORM);
                  setStep(1);
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Test Preset Selector Banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Demo Preset Selector (test-data/)
            </h3>
            <p className="text-xs text-indigo-700">
              Quickly populate the form with official test personas (TC01–TC08) from project specifications.
            </p>
          </div>
        </div>

        <select
          onChange={handleSelectPreset}
          defaultValue=""
          className="bg-white border border-indigo-300 text-indigo-900 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm shrink-0"
        >
          <option value="" disabled>
            ⚡ Select a Test Persona Preset...
          </option>
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}: {s.name} ({s.persona})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Application Form Wizard (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-card p-6 space-y-6">
          {/* Step Indicator */}
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">
                Step 0{step} of 04
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {step === 1 && 'Student Information'}
                {step === 2 && 'Financial Information'}
                {step === 3 && 'Academic Information'}
                {step === 4 && 'Review & Final Submit'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-brand-800 h-full rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* STEP 1: Student Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Student ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    placeholder="e.g. S2026-001 (or FAIL-001 / FLAKY-001 for test scenarios)"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.studentId ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.studentId && <p className="text-[11px] text-rose-500">{errors.studentId}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="studentName"
                    value={formData.studentName}
                    onChange={handleChange}
                    placeholder="e.g. Asha Raman"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.studentName ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.studentName && <p className="text-[11px] text-rose-500">{errors.studentName}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Student Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="studentEmail"
                    value={formData.studentEmail}
                    onChange={handleChange}
                    placeholder="e.g. asha.raman@student.example"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.studentEmail ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.studentEmail && <p className="text-[11px] text-rose-500">{errors.studentEmail}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Course of Study <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-200 bg-white"
                  >
                    <option value="B.Tech CSE">B.Tech Computer Science & Engineering</option>
                    <option value="B.Tech ECE">B.Tech Electronics & Communication</option>
                    <option value="B.Tech Mechanical">B.Tech Mechanical Engineering</option>
                    <option value="B.Tech Civil">B.Tech Civil Engineering</option>
                    <option value="BBA">Bachelor of Business Administration (BBA)</option>
                    <option value="B.Sc">Bachelor of Science (B.Sc)</option>
                  </select>
                </div>
              </div>
            )}

            {/* STEP 2: Financial Information */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Income Certificate Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="incomeCertificateNo"
                    value={formData.incomeCertificateNo}
                    onChange={handleChange}
                    placeholder="e.g. IC-2026-0001"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.incomeCertificateNo ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.incomeCertificateNo && <p className="text-[11px] text-rose-500">{errors.incomeCertificateNo}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Annual Family Income (INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">₹</span>
                    <input
                      type="number"
                      name="familyIncome"
                      value={formData.familyIncome}
                      onChange={handleChange}
                      placeholder="e.g. 150000"
                      min="0"
                      className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                        errors.familyIncome ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                      }`}
                    />
                  </div>
                  {errors.familyIncome && <p className="text-[11px] text-rose-500">{errors.familyIncome}</p>}
                  <p className="text-[11px] text-slate-500">
                    Slabs: Low (≤ ₹2,00,000), Middle (₹2,00,001–₹5,00,000), High (&gt; ₹5,00,000)
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: Academic Information */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Current CGPA (0.00 – 10.00) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="cgpa"
                    value={formData.cgpa}
                    onChange={handleChange}
                    placeholder="e.g. 8.9"
                    min="0"
                    max="10"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.cgpa ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.cgpa && <p className="text-[11px] text-rose-500">{errors.cgpa}</p>}
                  <p className="text-[11px] text-slate-500">Minimum CGPA 7.50 required for eligibility.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Attendance Percentage (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="attendancePercent"
                    value={formData.attendancePercent}
                    onChange={handleChange}
                    placeholder="e.g. 92"
                    min="0"
                    max="100"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.attendancePercent ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.attendancePercent && <p className="text-[11px] text-rose-500">{errors.attendancePercent}</p>}
                  <p className="text-[11px] text-slate-500">Minimum 75% attendance required.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    Active Backlogs <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="activeBacklogs"
                    value={formData.activeBacklogs}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                      errors.activeBacklogs ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-brand-200'
                    }`}
                  />
                  {errors.activeBacklogs && <p className="text-[11px] text-rose-500">{errors.activeBacklogs}</p>}
                  <p className="text-[11px] text-slate-500">Must be 0 active backlogs for scholarship qualification.</p>
                </div>
              </div>
            )}

            {/* STEP 4: Final Review Screen */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="font-bold text-xs uppercase text-slate-500 tracking-wider">
                    Confirm Submission Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Student:</span>
                      <p className="font-semibold text-slate-900">{formData.studentName} ({formData.studentId})</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Email:</span>
                      <p className="font-semibold text-slate-900 truncate">{formData.studentEmail}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Course:</span>
                      <p className="font-semibold text-slate-900">{formData.course}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Family Income:</span>
                      <p className="font-semibold text-slate-900">₹{Number(formData.familyIncome).toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">CGPA:</span>
                      <p className="font-semibold text-slate-900">{formData.cgpa}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Attendance:</span>
                      <p className="font-semibold text-slate-900">{formData.attendancePercent}%</p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <p>
                    Upon clicking Submit, this application will start an automated process instance in the <strong>Camunda 8 engine</strong>. The external worker will extract credentials and the <strong>scholarship_eligibility.dmn</strong> table will execute.
                  </p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-brand-800 hover:bg-brand-900 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting to Camunda...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Submit Application
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Real-time Indicative Eligibility Preview Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-700" />
                Indicative Eligibility Preview
              </span>
              {previewLoading && (
                <span className="text-[10px] text-slate-400 animate-pulse">Calculating...</span>
              )}
            </div>

            {preview ? (
              <div className="space-y-3 text-xs">
                {/* Slabs */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Income Slab:</span>
                    <span className="font-bold text-slate-800 uppercase font-mono px-2 py-0.5 rounded bg-slate-100">
                      {preview.incomeSlab}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Academic Criteria:</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      preview.academicCriteriaMet ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {preview.academicCriteriaMet ? 'Met (CGPA ≥ 7.5)' : 'Not Met'}
                    </span>
                  </div>
                </div>

                {/* Preliminary Result */}
                <div className={`p-3.5 rounded-xl border ${
                  preview.preliminaryDecision.eligibility === 'Eligible'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      Potential Eligibility
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      preview.preliminaryDecision.eligibility === 'Eligible'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {preview.preliminaryDecision.eligibility}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700">
                    {preview.preliminaryDecision.decisionReason}
                  </p>

                  {preview.preliminaryDecision.eligibility === 'Eligible' && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-900">
                        {preview.preliminaryDecision.scholarshipCategory}
                      </span>
                      <span className="text-xs font-bold text-emerald-900">
                        ₹{preview.preliminaryDecision.scholarshipAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Disclaimer */}
                <p className="text-[10px] text-slate-400 italic leading-snug">
                  * Preliminary estimate based on DMN logic. The final official award is evaluated inside Camunda 8 during process execution.
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <HelpCircle className="w-5 h-5 mx-auto text-slate-300" />
                <p>Fill in income and academic details to see an indicative eligibility preview.</p>
              </div>
            )}
          </div>

          {/* DMN Rules Reference Quickcard */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs space-y-2">
            <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
              Scholarship Award Tiers
            </h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Full Waiver (LOW, CGPA ≥ 8.5)</span>
                <span className="font-bold text-slate-800">₹1,00,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Partial A (LOW, CGPA 7.5-8.5)</span>
                <span className="font-bold text-slate-800">₹60,000</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-600">Partial B (MIDDLE, CGPA ≥ 8.5)</span>
                <span className="font-bold text-slate-800">₹40,000</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Partial C (MIDDLE, CGPA 7.5-8.5)</span>
                <span className="font-bold text-slate-800">₹25,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
