// Starts both external workers. Connection settings come from environment variables / .env (see ../README.md).
require("dotenv").config();
const { Camunda8 } = require("@camunda8/sdk");
const { extractHandler, notificationHandler } = require("./handlers");

const zeebe = new Camunda8().getZeebeGrpcApiClient();

zeebe.createWorker({ taskType: "extract-application-details", taskHandler: extractHandler, timeout: 30000 });
zeebe.createWorker({ taskType: "send-notification", taskHandler: notificationHandler, timeout: 30000 });

console.log("Workers running: extract-application-details, send-notification (Ctrl+C to stop)");
