// Pure business logic for the external workers (no network, so it is unit-testable).

// Thresholds are assumptions (see README) and must match the DMN table.
const LOW_INCOME_LIMIT = 200000;
const MIDDLE_INCOME_LIMIT = 500000;
const MIN_CGPA = 7.5;
const MIN_ATTENDANCE = 75;

class ValidationError extends Error {}

function extractApplicationDetails(v) {
  const problems = [];
  const text = (k) => { if (typeof v[k] !== "string" || v[k].trim() === "") problems.push(`${k} is required`); };
  const num = (k, min, max) => {
    if (typeof v[k] !== "number" || Number.isNaN(v[k])) return problems.push(`${k} must be a number`);
    if (v[k] < min || (max !== undefined && v[k] > max)) problems.push(`${k} must be between ${min} and ${max ?? "infinity"}`);
  };
  ["studentId", "studentName", "studentEmail"].forEach(text);
  num("familyIncome", 0); num("cgpa", 0, 10); num("attendancePercent", 0, 100); num("activeBacklogs", 0);
  if (problems.length) throw new ValidationError("Invalid application: " + problems.join("; "));

  const incomeSlab = v.familyIncome <= LOW_INCOME_LIMIT ? "LOW" : v.familyIncome <= MIDDLE_INCOME_LIMIT ? "MIDDLE" : "HIGH";
  const academicCriteriaMet = v.cgpa >= MIN_CGPA && v.attendancePercent >= MIN_ATTENDANCE && v.activeBacklogs === 0;
  return {
    validation: { incomeSlab, academicCriteriaMet },
    applicationRef: `APP-${v.studentId.trim()}`,
    studentEmail: v.studentEmail.trim().toLowerCase(),
  };
}

function buildNotification(type, v) {
  const name = v.studentName, id = v.studentId, d = v.eligibilityDecision || {};
  const t = {
    INELIGIBLE: ["Scholarship application - not eligible",
      `Dear ${name}, your scholarship application (${id}) is not eligible. Reason: ${d.decisionReason}`],
    REJECTED: ["Scholarship application - rejected by committee",
      `Dear ${name}, the scholarship committee has rejected your application (${id}).` + (v.chairRemarks ? ` Remarks: ${v.chairRemarks}` : "")],
    APPROVED: ["Scholarship approved - disbursement initiated",
      `Dear ${name}, your scholarship (${d.scholarshipCategory}, amount ${d.scholarshipAmount} INR) is approved. Disbursement reference: ${v.disbursementId}`],
    DISBURSEMENT_DELAYED: ["Scholarship approved - disbursement delayed",
      `Dear ${name}, your scholarship (${id}) is approved, but the disbursement could not be completed automatically. The accounts office will process it manually.`],
  }[type];
  if (!t) throw new ValidationError(`Unknown notificationType "${type}"`);
  return { to: v.studentEmail, type, subject: t[0], message: t[1] };
}

module.exports = { extractApplicationDetails, buildNotification, ValidationError };
