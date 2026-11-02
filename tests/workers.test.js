const test = require("node:test");
const assert = require("node:assert");
const { extractApplicationDetails, buildNotification, ValidationError } = require("../workers/lib");
const { extractHandler, notificationHandler } = require("../workers/handlers");

const base = { studentId: "S1", studentName: "Asha", studentEmail: " Asha@X.in ", familyIncome: 150000, cgpa: 8.9, attendancePercent: 92, activeBacklogs: 0 };

test("extract: slab and academic check", () => {
  const cases = [
    [{}, "LOW", true], [{ familyIncome: 200000 }, "LOW", true], [{ familyIncome: 200001 }, "MIDDLE", true],
    [{ familyIncome: 500000 }, "MIDDLE", true], [{ familyIncome: 500001 }, "HIGH", true],
    [{ cgpa: 7.49 }, "LOW", false], [{ attendancePercent: 74 }, "LOW", false], [{ activeBacklogs: 1 }, "LOW", false],
    [{ cgpa: 7.5, attendancePercent: 75 }, "LOW", true],
  ];
  for (const [o, slab, ok] of cases) {
    const r = extractApplicationDetails({ ...base, ...o });
    assert.strictEqual(r.validation.incomeSlab, slab, JSON.stringify(o));
    assert.strictEqual(r.validation.academicCriteriaMet, ok, JSON.stringify(o));
  }
});
test("extract: normalises email, builds applicationRef", () => {
  const r = extractApplicationDetails(base);
  assert.strictEqual(r.studentEmail, "asha@x.in"); assert.strictEqual(r.applicationRef, "APP-S1");
});
test("extract: invalid input throws ValidationError", () => {
  assert.throws(() => extractApplicationDetails({ ...base, cgpa: 11 }), ValidationError);
  assert.throws(() => extractApplicationDetails({ ...base, studentId: "" }), ValidationError);
  assert.throws(() => extractApplicationDetails({ ...base, familyIncome: "150000" }), ValidationError);
});
test("notification templates", () => {
  const v = { ...base, studentEmail: "a@x.in", eligibilityDecision: { decisionReason: "Family income above the scholarship limit", scholarshipCategory: "PARTIAL_C", scholarshipAmount: 25000 }, disbursementId: "DSB-1001", chairRemarks: "Incomplete" };
  assert.match(buildNotification("INELIGIBLE", v).message, /income above/);
  assert.match(buildNotification("APPROVED", v).message, /DSB-1001/);
  assert.match(buildNotification("REJECTED", v).message, /Incomplete/);
  assert.match(buildNotification("DISBURSEMENT_DELAYED", v).message, /manually/);
  assert.throws(() => buildNotification("NOPE", v), ValidationError);
});
const fakeJob = (variables, customHeaders = {}) => { const j = { variables, customHeaders, done: null }; j.complete = async (x) => { j.done = ["complete", x]; }; j.fail = async (x) => { j.done = ["fail", x]; }; return j; };
test("extractHandler completes valid job, fails invalid job with retries 0", async () => {
  const ok = fakeJob(base); await extractHandler(ok); assert.strictEqual(ok.done[0], "complete"); assert.ok(ok.done[1].validation);
  const bad = fakeJob({ ...base, cgpa: -1 }); await extractHandler(bad); assert.strictEqual(bad.done[0], "fail"); assert.strictEqual(bad.done[1].retries, 0);
});
test("notificationHandler posts to the API and completes; API error fails with retry", async () => {
  const calls = [];
  const good = async (url, opts) => { calls.push([url, JSON.parse(opts.body)]); return { ok: true, status: 202, json: async () => ({ notificationId: "NTF-1" }) }; };
  const j = fakeJob({ ...base, eligibilityDecision: { decisionReason: "r" } }, { notificationType: "INELIGIBLE" });
  await notificationHandler(j, good);
  assert.strictEqual(j.done[0], "complete"); assert.match(calls[0][0], /\/api\/notifications$/); assert.strictEqual(calls[0][1].type, "INELIGIBLE");
  const j2 = fakeJob({ ...base, eligibilityDecision: { decisionReason: "r" } }, { notificationType: "INELIGIBLE" });
  await notificationHandler(j2, async () => ({ ok: false, status: 503 }));
  assert.strictEqual(j2.done[0], "fail"); assert.strictEqual(j2.done[1].retries, undefined);
});
