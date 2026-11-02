# Demo runbook and viva notes

## Marks map (15)
| Rubric item | Marks | Show this |
| --- | --- | --- |
| Executable workflow and presentation | 5 | Open the BPMN in Modeler; walk the flow; show forms, DMN call, gateways, sub process, boundary events |
| External workers and REST connectors | 3 | `workers/handlers.js` (two job types), the BPMN properties for the REST task, `errorExpression` |
| Deployment and execution | 3 | Deployment success in Modeler, process listed in Tasklist, instances in Operate |
| Final demonstration | 2 | Scenario A and B below |
| Viva | 2 | Questions below |

## Demo Scenario A: approved and disbursed (TC01)
1. Start the instance with `test-data/TC01-eligible-approved-disbursed.json` values (income 150000, CGPA 8.9, attendance 92, backlogs 0).
2. In Operate: instance passes Extract (worker) then DMN, variables show `validation` and `eligibilityDecision` (FULL_TUITION_WAIVER, 100000).
3. Tasklist: complete **FA and AA**, **HOD**, **Chair** (Approve), **VC**, **Chancellor**. On each, tick "I have reviewed" and submit.
4. Operate: Post disbursement completes, variables show `disbursementId`; notification sent; end event "Scholarship disbursed".
5. Open http://localhost:4000/api/disbursements and /api/notifications to show the outputs.

## Demo Scenario B: pick one
- **Rejected (TC05):** Chair rejects after FA and AA and HOD. Ends at "Application rejected"; no disbursement call.
- **API failure (TC06, best for showing exception handling):** student id `FAIL-001`, Chair approves. The REST call returns 503, the error boundary fires, "Resolve disbursement failure" appears in Tasklist, choose Give up, ends at "Escalated to manual disbursement".
- Extra, if time: TC07 (`FLAKY-001`, choose Retry, second call succeeds) shows the loop.

## Viva questions
1. **What is an external worker?** A separate program that polls the engine for jobs of a given type, does the work, and completes or fails the job. Ours are Node.js programs using the Camunda 8 SDK.
2. **Which tasks use workers and which use connectors?** Extract and the four student notifications use workers; disbursement and the chair reminder use the REST connector.
3. **Worker vs connector?** A connector is a ready-made worker you configure in the model; a worker is code you write. Use a connector for a standard HTTP call, a worker when you need your own logic, such as validating input and building messages.
4. **What is the job type?** The string that links a service task to a worker. `extract-application-details` and `send-notification` are ours; `io.camunda:http-json:1` is the REST connector's.
5. **How does one worker serve four tasks?** The task header `notificationType` is passed as a custom header; the worker reads it to choose the message.
6. **What happens when a worker fails?** `job.fail` lowers retries and the job is retried; with retries 0 an incident appears in Operate. Invalid applications use retries 0 because retrying won't fix bad data.
7. **How is API failure handled?** The connector's `errorExpression` turns any error into BPMN error `ACCOUNTS_API_ERROR`; the error boundary on the task catches it, a person decides to retry or give up.
8. **Why a sub process for committee review?** It groups the five approval steps, lets one non-interrupting 48-hour timer cover the whole review, and its output mapping returns only `committeeDecision` and `chairRemarks`.
9. **Why must the sub process have output mappings?** Variables created inside it are local to it; without the mapping the "Committee decision?" gateway could not see `committeeDecision`.
10. **Why did the DMN need hit policy FIRST?** The rules overlap (the catch-all matches everything), and the default UNIQUE policy fails when more than one rule matches.
11. **What does the REST task send and receive?** POST `/api/disbursements` with student id, amount and category; the response gives `disbursementId`, status and `transactionRef`, which `resultExpression` stores as process variables.
12. **What is FEEL used for here?** Gateway conditions, input/output mappings, request bodies, result and error expressions, and the DMN cells.

## If something goes wrong
| Symptom | Fix |
| --- | --- |
| Instance sits at "Extract details" | Workers are not running, or the .env is wrong. Check the worker terminal. |
| Incident on Post or Remind | Connector cannot reach the URL (SaaS needs ngrok URL). Fix the URL, redeploy, retry. |
| Incident on DMN task | The DMN was not deployed with the BPMN, or an old DMN without FIRST was deployed. |
| Start form missing | Forms were not in the same deployment. |
