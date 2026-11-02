// Run with:  cd mock-api && npm test
const test = require("node:test");
const assert = require("node:assert");
const app = require("../mock-api/server.js");

let server, base;
test.before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const post = (path, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("health", async () => {
  const r = await fetch(base + "/health");
  assert.strictEqual(r.status, 200);
});

test("disbursement success returns 201 with disbursementId, status, transactionRef", async () => {
  const r = await post("/api/disbursements", { studentId: "S2026-001", studentName: "A", amount: 100000, category: "FULL_TUITION_WAIVER" });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.match(b.disbursementId, /^DSB-\d+$/);
  assert.strictEqual(b.status, "QUEUED");
  assert.ok(b.transactionRef);
});

test("disbursement validation: missing studentId and bad amount return 400", async () => {
  assert.strictEqual((await post("/api/disbursements", { amount: 10 })).status, 400);
  assert.strictEqual((await post("/api/disbursements", { studentId: "X", amount: 0 })).status, 400);
});

test("FAIL- students always get 503", async () => {
  for (let i = 0; i < 2; i++) assert.strictEqual((await post("/api/disbursements", { studentId: "FAIL-001", amount: 5 })).status, 503);
});

test("FLAKY- students get 503 once, then 201", async () => {
  assert.strictEqual((await post("/api/disbursements", { studentId: "FLAKY-001", amount: 5 })).status, 503);
  assert.strictEqual((await post("/api/disbursements", { studentId: "FLAKY-001", amount: 5 })).status, 201);
});

test("notification accepted (202) and listed; missing fields rejected (400)", async () => {
  const r = await post("/api/notifications", { to: "a@b.c", type: "APPROVED", subject: "s", message: "m" });
  assert.strictEqual(r.status, 202);
  assert.strictEqual((await post("/api/notifications", { to: "a@b.c" })).status, 400);
  const list = await (await fetch(base + "/api/notifications")).json();
  assert.ok(list.length >= 1);
});

test("unknown disbursement returns 404", async () => {
  assert.strictEqual((await fetch(base + "/api/disbursements/DSB-0")).status, 404);
});
