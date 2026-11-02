require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const {
  checkCamundaHealth,
  startCamundaProcessInstance,
  searchCamundaTasks,
  completeCamundaTask
} = require("./camundaClient");

const {
  startProcess,
  completeTask,
  getApplications,
  getApplicationByRef,
  getUserTasks,
  getTaskById,
  resetEngine
} = require("./workflowEngine");

const { evaluateScholarshipEligibility } = require("./dmnEvaluator");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MOCK_API = () => process.env.MOCK_API_URL || "http://localhost:4000";
const NGROK_URL = () => process.env.NGROK_TUNNEL_URL || "https://panda-stunner-nutmeg.ngrok-free.dev";

// Request logger
app.use((req, _res, next) => {
  if (req.path !== "/api/health") {
    console.log(`[BFF] ${req.method} ${req.path}`);
  }
  next();
});

// ============================================================================
// 1. SYSTEM HEALTH & DIAGNOSTICS
// ============================================================================
app.get("/api/health", async (_req, res) => {
  const timestamp = new Date().toISOString();

  // A. Check Camunda 8 SaaS Status
  const camundaHealth = await checkCamundaHealth();

  // B. Check Mock Accounts & Notification API
  let mockApiHealth = { status: "OFFLINE", connected: false, latencyMs: 0 };
  const mockStart = Date.now();
  try {
    const mockRes = await fetch(`${MOCK_API()}/health`, { signal: AbortSignal.timeout(3000) });
    mockApiHealth = {
      status: mockRes.ok ? "ONLINE" : "ERROR",
      connected: mockRes.ok,
      httpStatus: mockRes.status,
      latencyMs: Date.now() - mockStart,
      url: MOCK_API()
    };
  } catch (err) {
    mockApiHealth = {
      status: "OFFLINE",
      connected: false,
      message: err.message,
      latencyMs: Date.now() - mockStart,
      url: MOCK_API()
    };
  }

  // C. Check Cloud Connector ngrok tunnel
  let ngrokHealth = { status: "OFFLINE", connected: false, latencyMs: 0 };
  const ngrokStart = Date.now();
  try {
    const ngrokRes = await fetch(`${NGROK_URL()}/health`, {
      headers: { "ngrok-skip-browser-warning": "true" },
      signal: AbortSignal.timeout(4000)
    });
    ngrokHealth = {
      status: ngrokRes.ok ? "ONLINE" : "ERROR",
      connected: ngrokRes.ok,
      httpStatus: ngrokRes.status,
      latencyMs: Date.now() - ngrokStart,
      url: NGROK_URL()
    };
  } catch (err) {
    ngrokHealth = {
      status: "OFFLINE",
      connected: false,
      message: err.message,
      latencyMs: Date.now() - ngrokStart,
      url: NGROK_URL()
    };
  }

  // Aggregate Status
  const systemStatus = {
    bff: { status: "ONLINE", port: PORT, uptime: process.uptime() },
    camunda: camundaHealth,
    mockApi: mockApiHealth,
    ngrokTunnel: ngrokHealth,
    timestamp,
    clusterId: "371d9ee0-d1c5-4066-abfc-9df4c49e17b3",
    region: "sin-1"
  };

  res.json(systemStatus);
});

// ============================================================================
// 2. REAL-TIME INDICATIVE ELIGIBILITY PREVIEW
// ============================================================================
app.post("/api/eligibility/preview", (req, res) => {
  const { familyIncome, cgpa, attendancePercent, activeBacklogs } = req.body || {};

  const LOW_INCOME_LIMIT = 200000;
  const MIDDLE_INCOME_LIMIT = 500000;
  const MIN_CGPA = 7.5;
  const MIN_ATTENDANCE = 75;

  const income = typeof familyIncome === "number" ? familyIncome : Number(familyIncome) || 0;
  const cgpaNum = typeof cgpa === "number" ? cgpa : Number(cgpa) || 0;
  const attNum = typeof attendancePercent === "number" ? attendancePercent : Number(attendancePercent) || 0;
  const backlogsNum = typeof activeBacklogs === "number" ? activeBacklogs : Number(activeBacklogs) || 0;

  const incomeSlab = income <= LOW_INCOME_LIMIT ? "LOW" : income <= MIDDLE_INCOME_LIMIT ? "MIDDLE" : "HIGH";
  const academicCriteriaMet = cgpaNum >= MIN_CGPA && attNum >= MIN_ATTENDANCE && backlogsNum === 0;

  const decision = evaluateScholarshipEligibility({
    incomeSlab,
    academicCriteriaMet,
    cgpa: cgpaNum
  });

  res.json({
    incomeSlab,
    academicCriteriaMet,
    preliminaryDecision: decision,
    isEstimate: true,
    disclaimer: "Preliminary estimate. The final decision is determined by the Camunda DMN decision table execution upon submission."
  });
});

// ============================================================================
// 3. PROCESS INSTANCE & APPLICATION MANAGEMENT
// ============================================================================
app.post("/api/process/start", async (req, res) => {
  try {
    const payload = req.body || {};
    const {
      studentId,
      studentName,
      studentEmail,
      course,
      incomeCertificateNo,
      familyIncome,
      cgpa,
      attendancePercent,
      activeBacklogs
    } = payload;

    if (!studentId || !studentName || !studentEmail) {
      return res.status(400).json({ error: "studentId, studentName, and studentEmail are required" });
    }

    const numericPayload = {
      studentId: String(studentId).trim(),
      studentName: String(studentName).trim(),
      studentEmail: String(studentEmail).trim(),
      course: String(course || "B.Tech CSE").trim(),
      incomeCertificateNo: String(incomeCertificateNo || "IC-2026-DEFAULT").trim(),
      familyIncome: Number(familyIncome),
      cgpa: Number(cgpa),
      attendancePercent: Number(attendancePercent),
      activeBacklogs: Number(activeBacklogs)
    };

    // Execute application process
    const application = await startProcess(numericPayload);

    res.status(201).json({
      success: true,
      applicationRef: application.applicationRef,
      processInstanceId: application.processInstanceId,
      status: application.status,
      currentStage: application.currentStage,
      application
    });
  } catch (err) {
    console.error("[BFF] Process start error:", err);
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/applications", (_req, res) => {
  const apps = getApplications();
  
  // Calculate summary metrics
  const total = apps.length;
  const inReview = apps.filter(a => a.status === "IN_REVIEW").length;
  const approved = apps.filter(a => a.status === "APPROVED").length;
  const rejected = apps.filter(a => a.status === "REJECTED").length;
  const ineligible = apps.filter(a => a.status === "INELIGIBLE").length;
  const exceptions = apps.filter(a => a.status === "DISBURSEMENT_EXCEPTION").length;
  const disbursed = apps.filter(a => a.variables.disbursementId).length;
  const manualEscalated = apps.filter(a => a.status === "DISBURSEMENT_DELAYED").length;

  res.json({
    metrics: {
      total,
      inReview,
      eligible: approved + inReview + exceptions + manualEscalated,
      ineligible,
      approved,
      rejected,
      disbursed,
      exceptions,
      manualEscalated
    },
    pipeline: {
      submitted: total,
      eligibilityEvaluation: apps.filter(a => a.timeline.some(e => e.stage === "DMN")).length,
      committeeReview: apps.filter(a => a.timeline.some(e => e.stage === "COMMITTEE")).length,
      finalApproval: approved + exceptions + manualEscalated,
      disbursement: apps.filter(a => a.timeline.some(e => e.stage === "DISBURSEMENT")).length,
      completed: apps.filter(a => a.isCompleted).length
    },
    applications: apps
  });
});

app.get("/api/applications/:reference", (req, res) => {
  const app = getApplicationByRef(req.params.reference);
  if (!app) {
    return res.status(404).json({ error: "Application not found" });
  }
  res.json(app);
});

// ============================================================================
// 4. COMMITTEE TASKS INBOX & RESOLUTION
// ============================================================================
app.get("/api/tasks", (req, res) => {
  const { role, state, studentId } = req.query;
  const tasks = getUserTasks({ role, state, studentId });
  res.json(tasks);
});

app.get("/api/tasks/:taskKey", (req, res) => {
  const task = getTaskById(req.params.taskKey);
  if (!task) {
    return res.status(404).json({ error: "Task not found" });
  }
  res.json(task);
});

app.post("/api/tasks/:taskKey/complete", async (req, res) => {
  try {
    const taskKey = req.params.taskKey;
    const taskVariables = req.body || {};
    const result = await completeTask(taskKey, taskVariables);
    res.json({
      success: true,
      message: `Task ${taskKey} completed successfully`,
      task: result.task,
      application: result.app
    });
  } catch (err) {
    console.error("[BFF] Task completion error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ============================================================================
// 5. MOCK ACCOUNTS API & NOTIFICATION PROXY
// ============================================================================
app.get("/api/mock/disbursements", async (_req, res) => {
  try {
    const resp = await fetch(`${MOCK_API()}/api/disbursements`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `Mock Accounts API unavailable: ${err.message}` });
  }
});

app.get("/api/mock/notifications", async (req, res) => {
  try {
    const resp = await fetch(`${MOCK_API()}/api/notifications`);
    let data = await resp.json();
    const { studentEmail, studentId } = req.query;
    if (studentEmail) {
      data = data.filter(n => n.to && n.to.toLowerCase() === studentEmail.toLowerCase());
    }
    if (studentId) {
      data = data.filter(n => n.message && n.message.includes(studentId));
    }
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `Mock Notification API unavailable: ${err.message}` });
  }
});

app.post("/api/mock/reset", async (_req, res) => {
  try {
    const resp = await fetch(`${MOCK_API()}/admin/reset`, { method: "POST" });
    const data = await resp.json();
    resetEngine();
    res.json({ success: true, mockApi: data, message: "Mock API and local process engine state reset successfully." });
  } catch (err) {
    res.status(502).json({ error: `Failed to reset mock API: ${err.message}` });
  }
});

// ============================================================================
// 6. TEST SCENARIOS (TC01 - TC08)
// ============================================================================
const testDataDir = path.join(__dirname, "..", "test-data");
const testCaseMeta = [
  {
    id: "TC01",
    file: "TC01-eligible-approved-disbursed.json",
    name: "Eligible, Full Tuition Waiver (Approved & Disbursed)",
    persona: "Asha Raman (S2026-001)",
    income: 150000,
    cgpa: 8.9,
    expectedOutcome: "DMN: FULL_TUITION_WAIVER (₹100,000). All committee approvals. Automatic disbursement successful."
  },
  {
    id: "TC02",
    file: "TC02-eligible-middle-income-approved.json",
    name: "Eligible, Middle Income (Approved & Disbursed)",
    persona: "Asha Raman (S2026-002)",
    income: 350000,
    cgpa: 8.0,
    expectedOutcome: "DMN: PARTIAL_C (₹25,000). Committee approval. Automatic disbursement successful."
  },
  {
    id: "TC03",
    file: "TC03-ineligible-high-income.json",
    name: "Ineligible, High Income (> ₹5,00,000)",
    persona: "Asha Raman (S2026-003)",
    income: 750000,
    cgpa: 9.1,
    expectedOutcome: "DMN: Ineligible (Income above scholarship limit). Early gateway termination. INELIGIBLE notification sent."
  },
  {
    id: "TC04",
    file: "TC04-ineligible-low-cgpa.json",
    name: "Ineligible, Low CGPA (< 7.5)",
    persona: "Asha Raman (S2026-004)",
    income: 120000,
    cgpa: 7.0,
    expectedOutcome: "Academic check fails (CGPA < 7.5). DMN: Ineligible. Early gateway termination. INELIGIBLE notification sent."
  },
  {
    id: "TC05",
    file: "TC05-eligible-committee-rejects.json",
    name: "Eligible, Committee Chairperson Rejection",
    persona: "Asha Raman (S2026-005)",
    income: 180000,
    cgpa: 8.2,
    expectedOutcome: "DMN: PARTIAL_A (₹60,000). FA&AA and HOD endorse. Chairperson REJECTS. Application terminated with REJECTED notification."
  },
  {
    id: "TC06",
    file: "TC06-api-failure-give-up.json",
    name: "Accounts API 503 Failure -> Exception -> Give Up",
    persona: "Asha Raman (FAIL-001)",
    income: 150000,
    cgpa: 8.9,
    expectedOutcome: "Approved by committee. Accounts API returns 503. Error boundary triggers 'Resolve' task. Finance Officer chooses GIVE_UP -> Escalated to manual disbursement."
  },
  {
    id: "TC07",
    file: "TC07-api-failure-retry-success.json",
    name: "Accounts API Flaky -> Exception -> Retry Success",
    persona: "Asha Raman (FLAKY-001)",
    income: 150000,
    cgpa: 8.6,
    expectedOutcome: "Accounts API returns 503 on 1st attempt. Error boundary triggers 'Resolve' task. Finance Officer chooses RETRY -> 2nd call succeeds (201) -> Disbursed."
  },
  {
    id: "TC08",
    file: "TC08-boundary-income-200000.json",
    name: "Boundary Income Exactly ₹2,00,000 (Low Slab)",
    persona: "Asha Raman (S2026-008)",
    income: 200000,
    cgpa: 8.5,
    expectedOutcome: "Income exactly 200,000 falls in LOW income slab (<=200000). CGPA 8.5 matches Rule 3: FULL_TUITION_WAIVER (₹100,000)."
  }
];

app.get("/api/scenarios", (_req, res) => {
  const scenarios = testCaseMeta.map(tc => {
    let payload = null;
    try {
      const filePath = path.join(testDataDir, tc.file);
      if (fs.existsSync(filePath)) {
        payload = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch (e) {
      console.warn("Could not read test file:", tc.file);
    }
    return { ...tc, payload };
  });
  res.json(scenarios);
});

// Run a complete automated scenario for viva demonstrations
app.post("/api/scenarios/run", async (req, res) => {
  try {
    const { scenarioId, autoAdvance = true } = req.body;
    const meta = testCaseMeta.find(s => s.id === scenarioId);
    if (!meta) {
      return res.status(404).json({ error: `Scenario ${scenarioId} not found` });
    }

    const filePath = path.join(testDataDir, meta.file);
    const rawData = fs.readFileSync(filePath, "utf-8");
    const testData = JSON.parse(rawData);

    // 1. Submit application
    console.log(`[BFF Scenario] Running ${meta.id}: ${meta.name}`);
    const appRecord = await startProcess(testData);

    const stepsExecuted = [
      { step: "Application Submitted", details: `Student: ${testData.studentName} (${testData.studentId})` },
      { step: "Details Extracted", details: `Slab: ${appRecord.variables.validation.incomeSlab}, Criteria Met: ${appRecord.variables.validation.academicCriteriaMet}` },
      { step: "DMN Evaluated", details: `Result: ${appRecord.variables.eligibilityDecision.eligibility} (${appRecord.variables.eligibilityDecision.scholarshipCategory})` }
    ];

    if (!autoAdvance) {
      return res.json({
        scenario: meta,
        applicationRef: appRecord.applicationRef,
        application: appRecord,
        stepsExecuted,
        currentStage: appRecord.currentStage
      });
    }

    // 2. Automated Advancement based on scenario logic
    if (meta.id === "TC01" || meta.id === "TC02" || meta.id === "TC08") {
      // Step FA & AA
      let tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { stepConfirmed: true, stepRemarks: "Verified academic and financial credentials." });
        stepsExecuted.push({ step: "FA and AA Endorsed", details: "Reviewed & confirmed" });
      }

      // Step HOD
      tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { stepConfirmed: true, stepRemarks: "HOD recommendation granted." });
        stepsExecuted.push({ step: "HOD Endorsed", details: "Endorsement recorded" });
      }

      // Step Chair: APPROVE
      tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { committeeDecision: "APPROVED", chairRemarks: "Approved full award." });
        stepsExecuted.push({ step: "Chairperson Approved", details: "Approved (advances to VC)" });
      }

      // Step VC
      tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { stepConfirmed: true, stepRemarks: "Vice-Chancellor concurrence." });
        stepsExecuted.push({ step: "Vice-Chancellor Signed", details: "VC signature confirmed" });
      }

      // Step Chancellor
      tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { stepConfirmed: true, stepRemarks: "Chancellor final executive approval." });
        stepsExecuted.push({ step: "Chancellor Signed", details: "Proceeded to disbursement connector" });
      }

    } else if (meta.id === "TC05") {
      // Committee rejects
      let tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { stepConfirmed: true, stepRemarks: "FA and AA review done." });
      }
      tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { stepConfirmed: true, stepRemarks: "HOD review done." });
      }
      tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (tasks.length > 0) {
        await completeTask(tasks[0].id, { committeeDecision: "REJECTED", chairRemarks: "Incomplete supporting income documentation." });
        stepsExecuted.push({ step: "Chairperson Rejected", details: "Application rejected by committee" });
      }

    } else if (meta.id === "TC06") {
      // FAIL-001 -> Give up
      // FA&AA, HOD, Chair, VC, Chancellor
      for (const roleStep of ["FA and AA", "HOD", "Chair", "VC", "Chancellor"]) {
        const tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
        if (tasks.length > 0) {
          const payload = roleStep === "Chair" ? { committeeDecision: "APPROVED", chairRemarks: "Approved" } : { stepConfirmed: true, stepRemarks: `${roleStep} endorsed.` };
          await completeTask(tasks[0].id, payload);
          stepsExecuted.push({ step: `${roleStep} Completed`, details: "Endorsed" });
        }
      }
      // Now resolve task exists
      const resolveTasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (resolveTasks.length > 0) {
        stepsExecuted.push({ step: "Disbursement 503 Exception Caught", details: "ACCOUNTS_API_ERROR caught by boundary event" });
        await completeTask(resolveTasks[0].id, { retryDisbursement: "GIVE_UP", accountsRemarks: "Escalated for manual bank draft disbursement." });
        stepsExecuted.push({ step: "Exception Resolved: GIVE_UP", details: "Escalated to manual disbursement" });
      }

    } else if (meta.id === "TC07") {
      // FLAKY-001 -> Retry -> Success
      for (const roleStep of ["FA and AA", "HOD", "Chair", "VC", "Chancellor"]) {
        const tasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
        if (tasks.length > 0) {
          const payload = roleStep === "Chair" ? { committeeDecision: "APPROVED", chairRemarks: "Approved" } : { stepConfirmed: true, stepRemarks: `${roleStep} endorsed.` };
          await completeTask(tasks[0].id, payload);
          stepsExecuted.push({ step: `${roleStep} Completed`, details: "Endorsed" });
        }
      }
      // Resolve task exists
      const resolveTasks = getUserTasks({ studentId: testData.studentId, state: "CREATED" });
      if (resolveTasks.length > 0) {
        stepsExecuted.push({ step: "Disbursement 503 Exception Caught", details: "ACCOUNTS_API_ERROR on first attempt" });
        await completeTask(resolveTasks[0].id, { retryDisbursement: "RETRY", accountsRemarks: "Retrying after API recovery." });
        stepsExecuted.push({ step: "Exception Resolved: RETRY", details: "Retry succeeded with HTTP 201" });
      }
    }

    const updatedApp = getApplicationByRef(appRecord.applicationRef);

    res.json({
      scenario: meta,
      applicationRef: appRecord.applicationRef,
      application: updatedApp,
      stepsExecuted,
      finalStatus: updatedApp.status
    });

  } catch (err) {
    console.error("[BFF Scenario] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Scholarship BFF listening on http://localhost:${PORT}`);
});
