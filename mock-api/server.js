// Mock "accounts system" and "notification service" for the Scholarship Approval process.
// Used by the REST Outbound Connector tasks in scholarship-approval.bpmn.
//
// Failure simulation (for the API-failure test cases):
//   studentId starting with "FAIL"  -> disbursement always returns 503
//   studentId starting with "FLAKY" -> first disbursement call returns 503, later calls succeed
const express = require("express");

const app = express();
app.use(express.json());

const disbursements = new Map();
const notifications = [];
const flakyAttempts = new Map();
let disbCounter = 1000;
let notifCounter = 1;

app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`, Object.keys(req.body || {}).length ? JSON.stringify(req.body) : "");
  next();
});

app.get("/health", (_req, res) => res.json({ status: "UP" }));

// ---- Accounts system -------------------------------------------------------
app.post("/api/disbursements", (req, res) => {
  const { studentId, studentName, amount, category } = req.body || {};
  if (typeof studentId !== "string" || studentId.trim() === "") {
    return res.status(400).json({ error: "studentId is required" });
  }
  if (typeof amount !== "number" || !(amount > 0)) {
    return res.status(400).json({ error: "amount must be a number greater than 0" });
  }
  if (studentId.startsWith("FAIL")) {
    return res.status(503).json({ error: "Accounts system unavailable" });
  }
  if (studentId.startsWith("FLAKY")) {
    const n = (flakyAttempts.get(studentId) || 0) + 1;
    flakyAttempts.set(studentId, n);
    if (n === 1) return res.status(503).json({ error: "Accounts system temporarily unavailable" });
  }
  const disbursementId = `DSB-${++disbCounter}`;
  const record = {
    disbursementId,
    status: "QUEUED",
    transactionRef: `TXN-${Date.now().toString(36).toUpperCase()}-${disbCounter}`,
    studentId, studentName: studentName || null, amount, category: category || null,
    createdAt: new Date().toISOString(),
  };
  disbursements.set(disbursementId, record);
  res.status(201).json(record);
});

app.get("/api/disbursements/:id", (req, res) => {
  const r = disbursements.get(req.params.id);
  if (!r) return res.status(404).json({ error: "Disbursement not found" });
  res.json(r);
});

app.get("/api/disbursements", (_req, res) => res.json([...disbursements.values()]));

// ---- Notification service --------------------------------------------------
app.post("/api/notifications", (req, res) => {
  const { to, type, subject, message } = req.body || {};
  if (!to || !subject || !message) {
    return res.status(400).json({ error: "to, subject and message are required" });
  }
  const n = { notificationId: `NTF-${notifCounter++}`, status: "SENT", to, type: type || "GENERAL", subject, message, sentAt: new Date().toISOString() };
  notifications.push(n);
  res.status(202).json(n);
});

app.get("/api/notifications", (_req, res) => res.json(notifications));

// ---- Test helper -----------------------------------------------------------
app.post("/admin/reset", (_req, res) => {
  disbursements.clear(); notifications.length = 0; flakyAttempts.clear();
  res.json({ status: "RESET" });
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`Mock accounts/notification API listening on http://localhost:${port}`));
}
