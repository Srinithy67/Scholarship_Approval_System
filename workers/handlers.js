// Job handlers: thin wrappers that call lib.js and complete / fail the job.
const { extractApplicationDetails, buildNotification, ValidationError } = require("./lib");

const API = () => process.env.MOCK_API_URL || "http://localhost:4000";

async function extractHandler(job) {
  try {
    const out = extractApplicationDetails(job.variables);
    console.log(`[extract-application-details] ${job.variables.studentId} -> ${JSON.stringify(out.validation)}`);
    return job.complete(out);
  } catch (e) {
    console.error("[extract-application-details] failed:", e.message);
    // bad input will not fix itself on retry: retries 0 raises an incident in Operate
    return job.fail({ errorMessage: e.message, retries: e instanceof ValidationError ? 0 : undefined, retryBackOff: 5000 });
  }
}

async function notificationHandler(job, fetchImpl) {
  const doFetch = typeof fetchImpl === "function" ? fetchImpl : globalThis.fetch;
  try {
    const type = job.customHeaders.notificationType;
    const body = buildNotification(type, job.variables);
    const res = await doFetch(`${API()}/api/notifications`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Notification API returned HTTP ${res.status}`);
    const sent = await res.json();
    console.log(`[send-notification] ${type} -> ${body.to} (${sent.notificationId})`);
    return job.complete({ [`lastNotification`]: { type, notificationId: sent.notificationId } });
  } catch (e) {
    console.error("[send-notification] failed:", e.message);
    return job.fail({ errorMessage: e.message, retries: e instanceof ValidationError ? 0 : undefined, retryBackOff: 5000 });
  }
}

module.exports = { extractHandler, notificationHandler };