# Scholarship Approval System - Camunda 8 (executable build)

Built on **your** `scholarship_process_with_committee_subprocess.bpmn` (same layout and element ids) and your DMN.

| Path | What it is |
| --- | --- |
| `bpmn/scholarship_process_executable.bpmn` | Your model, now configured for Camunda 8 (forms, job types, connectors, FEEL) |
| `dmn/scholarship-eligibility.dmn` | Your DMN with hit policy set to FIRST (it was missing, which defaults to UNIQUE and fails) |
| `forms/*.form` | 4 Camunda Forms: application, committee step, chair decision, disbursement failure |
| `workers/` | 2 external job workers (Node.js): `extract-application-details`, `send-notification` |
| `mock-api/` | Mock accounts + notification API on port 4000 |
| `tests/` | Automated tests for the API and the workers |
| `test-data/` | Start-form values for test cases TC01-TC08 |

## 1. What is external worker vs connector vs built in

| Task | How it runs |
| --- | --- |
| Extract details from the application | **External worker** `extract-application-details` (checks input, derives income slab and academic check) |
| Decide eligibility (DMN) | Business Rule Task, decision `scholarship_eligibility` |
| Notify student (4 tasks: approved, not eligible, rejected, delayed) | **External worker** `send-notification` (job header `notificationType` picks the message) |
| Post disbursement request to accounts | **REST Outbound Connector** `io.camunda:http-json:1`, error boundary on failure |
| Remind committee chair (48 h timer) | **REST Outbound Connector** |
| Committee review sub process (FA and AA, HOD, Chair, VC, Chancellor) | 5 user tasks with Camunda Forms |

## 2. Run it

### 2.1 Start the mock API
```
cd mock-api && npm install && npm start      # http://localhost:4000
```

### 2.2 Pick one cluster
- **Camunda 8 Run (local):** easiest for the demo. Connectors and workers both run on your laptop, so `localhost:4000` works everywhere.
- **Camunda SaaS:** connectors run in the cloud and cannot see `localhost`. Run `ngrok http 4000`, then in the BPMN replace `http://localhost:4000` with your ngrok URL in **two** tasks only (`Post` and `Remind`). The workers run on your laptop and connect out to the cluster, so they keep using localhost.

### 2.3 Deploy
Open the BPMN, DMN and all 4 forms in Modeler and deploy **together in one deployment** (Web Modeler: put them in one project and click Deploy).

### 2.4 Start the workers
```
cd workers && npm install
cp .env.example .env     # then edit: Run needs no secrets; SaaS needs the API client values from Console
npm start
```
You should see `Workers running: extract-application-details, send-notification`.

### 2.5 Run a case
Tasklist > Processes > "Scholarship disbursement" > fill the form with a file from `test-data/`. Then open Operate to watch it, and complete tasks in Tasklist.

## 3. Tests
```
cd mock-api && npm test        # 7 API tests
cd workers && npm test         # 6 worker tests
```

## 4. Changes made to your files
1. Removed the Camunda 7 style `camunda:connector` block from "Post disbursement request" (Camunda 8 ignores it) and replaced it with the Camunda 8 REST connector configuration.
2. DMN: added `hitPolicy="FIRST"`.
3. Added: start form, form links on all user tasks, job types, DMN link, gateway conditions and default flows, input/output mappings, error code mapping, subprocess output mapping.
4. Renamed flow labels "Retry successful / Retry unsuccessful" to "Retry / Give up" (the choice is made before the retry happens). Fixed the typo "form" to "from" in the Extract task name.
5. Unchanged: your layout, element ids, task names, sub process structure.

## 5. Assumptions
- Income slabs LOW <= 200000, MIDDLE <= 500000, HIGH above; CGPA >= 7.5, attendance >= 75, no backlogs. The same numbers are in `workers/lib.js` and the DMN. Change both together.
- The Chair decides Approve/Reject. VC and Chancellor sign-offs are confirmations (no reject option), matching your diagram, which has no rejection path from them.
- FA and AA is used as written in your diagram; I did not expand the abbreviation.
- The extract worker replaces the earlier Script Task. If your course still needs a Script Task, tell me and I will add one.
- Notifications are posted to the mock notification API, not real email.
