// Workflow execution engine maintaining application state, BPMN node tracing,
// and user task lifecycle.
const { extractApplicationDetails, buildNotification, ValidationError } = require("../workers/lib");
const { evaluateScholarshipEligibility } = require("./dmnEvaluator");

const MOCK_API = () => process.env.MOCK_API_URL || "http://localhost:4000";

// In-memory store for applications, tasks, and history
const applications = new Map();
const userTasks = new Map();
let taskCounter = 2000;
let instanceCounter = 5000;

// Helper to send notification to mock API
async function dispatchNotification(type, variables) {
  try {
    const notifBody = buildNotification(type, variables);
    const res = await fetch(`${MOCK_API()}/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifBody)
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`[BFF Notification] ${type} sent: ${data.notificationId} to ${notifBody.to}`);
      return data;
    } else {
      console.warn(`[BFF Notification] Mock API returned ${res.status}`);
      return null;
    }
  } catch (err) {
    console.error("[BFF Notification] Error dispatching notification:", err.message);
    return null;
  }
}

// Helper to post disbursement to mock API
async function dispatchDisbursement(payload) {
  try {
    const res = await fetch(`${MOCK_API()}/api/disbursements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

// Record timeline event
function addTimelineEvent(app, stage, name, description, status = "COMPLETED", metadata = {}) {
  const event = {
    id: `EVT-${Date.now().toString(36)}-${Math.floor(Math.random()*1000)}`,
    stage,
    name,
    description,
    status,
    timestamp: new Date().toISOString(),
    metadata
  };
  app.timeline.push(event);
  return event;
}

// Create a User Task
function createUserTask(app, taskDef) {
  const taskId = `TASK-${++taskCounter}`;
  const task = {
    id: taskId,
    taskKey: taskId,
    applicationRef: app.applicationRef,
    processInstanceId: app.processInstanceId,
    studentId: app.variables.studentId,
    studentName: app.variables.studentName,
    taskDefinitionId: taskDef.id,
    taskName: taskDef.name,
    stage: taskDef.stage,
    formId: taskDef.formId,
    requiredRole: taskDef.role,
    state: "CREATED",
    createdAt: new Date().toISOString(),
    variables: { ...app.variables, stepTitle: taskDef.name }
  };
  userTasks.set(taskId, task);
  app.activeTaskId = taskId;
  app.activeTaskName = taskDef.name;
  app.activeTaskRole = taskDef.role;
  return task;
}

// Start a new Scholarship Application process
async function startProcess(inputVariables) {
  const processInstanceId = `PI-${++instanceCounter}`;
  
  // 1. Validate & Extract details using worker logic
  const extracted = extractApplicationDetails(inputVariables);
  const applicationRef = extracted.applicationRef;

  const appRecord = {
    processInstanceId,
    applicationRef,
    studentId: inputVariables.studentId,
    studentName: inputVariables.studentName,
    studentEmail: extracted.studentEmail,
    course: inputVariables.course,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "PROCESSING",
    currentStage: "EXTRACTION",
    activeNodeId: "Extract",
    activeNodeName: "Extract details from the application",
    activeTaskId: null,
    activeTaskName: null,
    activeTaskRole: null,
    variables: {
      ...inputVariables,
      applicationRef,
      validation: extracted.validation,
      studentEmail: extracted.studentEmail
    },
    timeline: [],
    disbursement: null,
    isCompleted: false
  };

  addTimelineEvent(appRecord, "SUBMISSION", "Application Submitted", `Application received for ${inputVariables.studentName} (${inputVariables.studentId})`);
  addTimelineEvent(appRecord, "EXTRACTION", "Details Extracted & Validated", `Income slab: ${extracted.validation.incomeSlab}, Academic criteria met: ${extracted.validation.academicCriteriaMet}`);

  // 2. Evaluate DMN
  appRecord.activeNodeId = "DMN";
  appRecord.activeNodeName = "Decide eligibility (DMN)";
  
  const eligibilityDecision = evaluateScholarshipEligibility({
    incomeSlab: extracted.validation.incomeSlab,
    academicCriteriaMet: extracted.validation.academicCriteriaMet,
    cgpa: inputVariables.cgpa
  });

  appRecord.variables.eligibilityDecision = eligibilityDecision;
  addTimelineEvent(
    appRecord,
    "DMN",
    `DMN Evaluation: ${eligibilityDecision.eligibility}`,
    `${eligibilityDecision.decisionReason} | Category: ${eligibilityDecision.scholarshipCategory} (₹${eligibilityDecision.scholarshipAmount.toLocaleString("en-IN")})`,
    "COMPLETED",
    eligibilityDecision
  );

  // 3. Gateway GwElig: Check eligibility
  if (eligibilityDecision.eligibility !== "Eligible") {
    // Ineligible path
    appRecord.status = "INELIGIBLE";
    appRecord.currentStage = "INELIGIBLE";
    appRecord.activeNodeId = "NotifyNE";
    appRecord.activeNodeName = "Notify student: not eligible";

    // Send notification
    const notif = await dispatchNotification("INELIGIBLE", appRecord.variables);
    addTimelineEvent(appRecord, "NOTIFICATION", "Ineligible Notification Sent", `Reason: ${eligibilityDecision.decisionReason}`, "COMPLETED", { notificationId: notif?.notificationId });

    appRecord.activeNodeId = "EndInel";
    appRecord.activeNodeName = "Application ineligible";
    appRecord.isCompleted = true;
    appRecord.updatedAt = new Date().toISOString();
    applications.set(applicationRef, appRecord);
    return appRecord;
  }

  // 4. Eligible path -> Enters Subprocess "Committee review"
  appRecord.status = "IN_REVIEW";
  appRecord.currentStage = "COMMITTEE_REVIEW";
  appRecord.activeNodeId = "Activity_0xiv2pn";
  appRecord.activeNodeName = "FA and AA";

  // First review task: FA and AA
  const firstTask = createUserTask(appRecord, {
    id: "Activity_0xiv2pn",
    name: "FA and AA Review",
    stage: "FA and AA",
    formId: "committee-step-form",
    role: "FA_AA"
  });

  addTimelineEvent(appRecord, "COMMITTEE", "Review Task Created: FA and AA", "Application routed to Finance & Academic Affairs committee for preliminary review.", "PENDING", { taskId: firstTask.id });

  applications.set(applicationRef, appRecord);
  return appRecord;
}

// Complete a User Task
async function completeTask(taskId, taskVariables) {
  const task = userTasks.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  if (task.state === "COMPLETED") {
    throw new Error(`Task ${taskId} has already been completed`);
  }

  const app = applications.get(task.applicationRef);
  if (!app) {
    throw new Error(`Application ${task.applicationRef} not found for task ${taskId}`);
  }

  // Mark task completed
  task.state = "COMPLETED";
  task.completedAt = new Date().toISOString();
  task.completionVariables = taskVariables;

  // Merge task variables
  app.variables = { ...app.variables, ...taskVariables };
  app.updatedAt = new Date().toISOString();

  // Route depending on task type
  const taskDefId = task.taskDefinitionId;

  if (taskDefId === "Activity_0xiv2pn") {
    // FA and AA completed -> Move to HOD
    addTimelineEvent(app, "COMMITTEE", "FA and AA Review Completed", taskVariables.stepRemarks ? `Remarks: ${taskVariables.stepRemarks}` : "Reviewed and endorsed by FA and AA.");
    app.activeNodeId = "HOD";
    app.activeNodeName = "Endorse application (HOD)";
    const nextTask = createUserTask(app, {
      id: "HOD",
      name: "Endorse application (HOD)",
      stage: "HOD Endorsement",
      formId: "committee-step-form",
      role: "HOD"
    });
    addTimelineEvent(app, "COMMITTEE", "Review Task Created: HOD Endorsement", "Awaiting Head of Department endorsement.", "PENDING", { taskId: nextTask.id });

  } else if (taskDefId === "HOD") {
    // HOD completed -> Move to Chair
    addTimelineEvent(app, "COMMITTEE", "HOD Endorsement Completed", taskVariables.stepRemarks ? `Remarks: ${taskVariables.stepRemarks}` : "Endorsed by Head of Department.");
    app.activeNodeId = "Chair";
    app.activeNodeName = "Committee chairperson";
    const nextTask = createUserTask(app, {
      id: "Chair",
      name: "Committee Chairperson Decision",
      stage: "Chairperson Decision",
      formId: "chair-decision-form",
      role: "CHAIRPERSON"
    });
    addTimelineEvent(app, "COMMITTEE", "Decision Task Created: Committee Chairperson", "Awaiting final decision (Approve / Reject) by Committee Chairperson.", "PENDING", { taskId: nextTask.id });

  } else if (taskDefId === "Chair") {
    // Chair decision: APPROVED or REJECTED
    const decision = taskVariables.committeeDecision || "APPROVED";
    const remarks = taskVariables.chairRemarks || "";
    app.variables.committeeDecision = decision;
    app.variables.chairRemarks = remarks;

    addTimelineEvent(app, "COMMITTEE", `Chairperson Decision: ${decision}`, remarks ? `Remarks: ${remarks}` : `Chairperson decided to ${decision.toLowerCase()} the application.`, "COMPLETED", { decision, remarks });

    if (decision === "REJECTED") {
      // Rejection path
      app.status = "REJECTED";
      app.currentStage = "REJECTED";
      app.activeNodeId = "NotifyRej";
      app.activeNodeName = "Notify student: rejected";
      app.activeTaskId = null;
      app.activeTaskName = null;
      app.activeTaskRole = null;

      const notif = await dispatchNotification("REJECTED", app.variables);
      addTimelineEvent(app, "NOTIFICATION", "Rejection Notification Sent", remarks ? `Remarks sent to student: ${remarks}` : "Student notified of rejection.", "COMPLETED", { notificationId: notif?.notificationId });

      app.activeNodeId = "EndRej";
      app.activeNodeName = "Application rejected";
      app.isCompleted = true;

    } else {
      // Approved path -> Move to VC Sign-off
      app.activeNodeId = "VC";
      app.activeNodeName = "Sign-off by Vice-Chancellor";
      const nextTask = createUserTask(app, {
        id: "VC",
        name: "Sign-off by Vice-Chancellor",
        stage: "VC Sign-off",
        formId: "committee-step-form",
        role: "VICE_CHANCELLOR"
      });
      addTimelineEvent(app, "COMMITTEE", "Review Task Created: Vice-Chancellor Sign-off", "Chairperson approved. Awaiting Vice-Chancellor sign-off.", "PENDING", { taskId: nextTask.id });
    }

  } else if (taskDefId === "VC") {
    // VC completed -> Move to Chancellor
    addTimelineEvent(app, "COMMITTEE", "Vice-Chancellor Sign-off Completed", taskVariables.stepRemarks ? `Remarks: ${taskVariables.stepRemarks}` : "Signed off by Vice-Chancellor.");
    app.activeNodeId = "Activity_0x10378";
    app.activeNodeName = "Sign off by Chancellor";
    const nextTask = createUserTask(app, {
      id: "Activity_0x10378",
      name: "Sign off by Chancellor",
      stage: "Chancellor Sign-off",
      formId: "committee-step-form",
      role: "CHANCELLOR"
    });
    addTimelineEvent(app, "COMMITTEE", "Review Task Created: Chancellor Sign-off", "Awaiting Chancellor final executive sign-off.", "PENDING", { taskId: nextTask.id });

  } else if (taskDefId === "Activity_0x10378") {
    // Chancellor completed -> Committee Review Done! Proceed to Disbursement!
    addTimelineEvent(app, "COMMITTEE", "Chancellor Sign-off Completed", taskVariables.stepRemarks ? `Remarks: ${taskVariables.stepRemarks}` : "Signed off by Chancellor. All committee approvals achieved.");
    
    app.activeTaskId = null;
    app.activeTaskName = null;
    app.activeTaskRole = null;
    app.currentStage = "DISBURSEMENT";
    app.activeNodeId = "Post";
    app.activeNodeName = "Post disbursement request to accounts";

    await executeDisbursement(app);

  } else if (taskDefId === "Resolve") {
    // Finance Officer resolution
    const action = taskVariables.retryDisbursement || "RETRY";
    const remarks = taskVariables.accountsRemarks || "";
    app.variables.retryDisbursement = action;
    app.variables.accountsRemarks = remarks;

    addTimelineEvent(app, "EXCEPTION", `Disbursement Exception Resolved: ${action}`, remarks ? `Accounts remarks: ${remarks}` : `Finance Officer chose to ${action === "RETRY" ? "retry disbursement" : "give up and escalate manually"}.`, "COMPLETED", { action, remarks });

    if (action === "RETRY") {
      // Retry disbursement
      app.activeTaskId = null;
      app.activeTaskName = null;
      app.activeTaskRole = null;
      app.activeNodeId = "Post";
      app.activeNodeName = "Post disbursement request to accounts";
      await executeDisbursement(app);
    } else {
      // Give up -> Escalate to manual disbursement
      app.status = "DISBURSEMENT_DELAYED";
      app.currentStage = "MANUAL_ESCALATION";
      app.activeNodeId = "NotifyDel";
      app.activeNodeName = "Notify student: disbursement delayed";
      app.activeTaskId = null;
      app.activeTaskName = null;
      app.activeTaskRole = null;

      const notif = await dispatchNotification("DISBURSEMENT_DELAYED", app.variables);
      addTimelineEvent(app, "NOTIFICATION", "Disbursement Delayed Notification Sent", "Student informed that manual processing by the Accounts Office has been initiated.", "COMPLETED", { notificationId: notif?.notificationId });

      app.activeNodeId = "EndEsc";
      app.activeNodeName = "Escalated to manual disbursement";
      app.isCompleted = true;
    }
  }

  return { app, task };
}

// Execute Disbursement REST Connector logic
async function executeDisbursement(app) {
  const disbPayload = {
    studentId: app.variables.studentId,
    studentName: app.variables.studentName,
    amount: app.variables.eligibilityDecision.scholarshipAmount,
    category: app.variables.eligibilityDecision.scholarshipCategory,
    approvedBy: "Scholarship Committee",
    remarks: app.variables.chairRemarks || "Approved by all committee members"
  };

  addTimelineEvent(app, "DISBURSEMENT", "Calling Accounts API", `Posting disbursement request for ₹${disbPayload.amount.toLocaleString("en-IN")} (${disbPayload.category})`);

  const disbResult = await dispatchDisbursement(disbPayload);

  if (disbResult.ok && disbResult.status === 201) {
    // Success!
    const disbData = disbResult.data;
    app.disbursement = disbData;
    app.variables.disbursementId = disbData.disbursementId;
    app.variables.disbursementStatus = disbData.status;
    app.variables.transactionRef = disbData.transactionRef;

    addTimelineEvent(app, "DISBURSEMENT", "Disbursement Processed Successfully", `Disbursement ID: ${disbData.disbursementId} | Transaction Ref: ${disbData.transactionRef} (Status: ${disbData.status})`, "COMPLETED", disbData);

    // Notify student: APPROVED
    app.activeNodeId = "NotifyAppr";
    app.activeNodeName = "Notify student: the approval and the disbursed amount";
    const notif = await dispatchNotification("APPROVED", app.variables);
    addTimelineEvent(app, "NOTIFICATION", "Approval Notification Sent", `Disbursement reference: ${disbData.disbursementId}`, "COMPLETED", { notificationId: notif?.notificationId });

    app.status = "APPROVED";
    app.currentStage = "COMPLETED";
    app.activeNodeId = "EndDisb";
    app.activeNodeName = "Scholarship disbursed";
    app.isCompleted = true;

  } else {
    // Failure! Boundary Error Event "Err" (Accounts API error: ACCOUNTS_API_ERROR)
    const errMessage = disbResult.data?.error || (disbResult.status === 503 ? "Accounts system unavailable" : "Disbursement HTTP error");
    addTimelineEvent(app, "EXCEPTION", "Accounts API Error Caught (ACCOUNTS_API_ERROR)", `HTTP ${disbResult.status}: ${errMessage}. Error boundary event triggered.`, "ERROR", { status: disbResult.status, error: errMessage });

    app.status = "DISBURSEMENT_EXCEPTION";
    app.currentStage = "EXCEPTION_HANDLING";
    app.activeNodeId = "Resolve";
    app.activeNodeName = "Resolve disbursement failure";

    const resolveTask = createUserTask(app, {
      id: "Resolve",
      name: "Resolve disbursement failure",
      stage: "Finance Exception Handling",
      formId: "disbursement-failure-form",
      role: "FINANCE_OFFICER"
    });

    addTimelineEvent(app, "EXCEPTION", "Task Created: Resolve Disbursement Failure", "Finance Officer must decide whether to Retry or Give Up and process manually.", "PENDING", { taskId: resolveTask.id });
  }
}

// Queries
function getApplications() {
  return Array.from(applications.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getApplicationByRef(ref) {
  if (!ref) return null;
  const cleanRef = ref.trim().toUpperCase();
  // match by applicationRef or studentId
  for (const app of applications.values()) {
    if (app.applicationRef.toUpperCase() === cleanRef || app.studentId.toUpperCase() === cleanRef) {
      return app;
    }
  }
  return null;
}

function getUserTasks(filter = {}) {
  let list = Array.from(userTasks.values());
  if (filter.state) {
    list = list.filter(t => t.state === filter.state);
  }
  if (filter.role && filter.role !== "ALL") {
    list = list.filter(t => t.requiredRole === filter.role);
  }
  if (filter.studentId) {
    list = list.filter(t => t.studentId === filter.studentId);
  }
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getTaskById(taskId) {
  return userTasks.get(taskId) || null;
}

function resetEngine() {
  applications.clear();
  userTasks.clear();
  taskCounter = 2000;
  instanceCounter = 5000;
}

module.exports = {
  startProcess,
  completeTask,
  getApplications,
  getApplicationByRef,
  getUserTasks,
  getTaskById,
  resetEngine
};
