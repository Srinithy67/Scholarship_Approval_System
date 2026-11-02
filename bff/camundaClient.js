require("dotenv").config();
const { Camunda8 } = require("@camunda8/sdk");

let c8Instance = null;
let camundaRestClient = null;

function getCamundaClient() {
  if (!camundaRestClient) {
    try {
      c8Instance = new Camunda8();
      camundaRestClient = c8Instance.getCamundaRestClient();
    } catch (err) {
      console.warn("[CamundaClient] Could not initialize Camunda8 SDK:", err.message);
    }
  }
  return { c8: c8Instance, rest: camundaRestClient };
}

async function checkCamundaHealth() {
  const start = Date.now();
  const oauthUrl = process.env.CAMUNDA_OAUTH_URL || "https://login.cloud.camunda.io/oauth/token";
  const clientId = process.env.ZEEBE_CLIENT_ID;
  const clientSecret = process.env.ZEEBE_CLIENT_SECRET;
  const restAddress = process.env.ZEEBE_REST_ADDRESS;

  if (!clientId || !clientSecret || clientId === "your_zeebe_client_id") {
    return {
      status: "CONFIG_MISSING",
      connected: false,
      message: "Camunda credentials not configured in .env",
      latencyMs: Date.now() - start
    };
  }

  try {
    // 1. Check OAuth Token
    const tokenRes = await fetch(oauthUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        audience: "zeebe.camunda.io",
        client_id: clientId,
        client_secret: clientSecret
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!tokenRes.ok) {
      return {
        status: "AUTH_FAILED",
        connected: false,
        httpStatus: tokenRes.status,
        message: `OAuth authentication failed with HTTP ${tokenRes.status}`,
        latencyMs: Date.now() - start
      };
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Check Zeebe REST Topology / Health
    const topologyUrl = `${restAddress}/v2/topology`;
    const topoRes = await fetch(topologyUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(6000)
    });

    const latency = Date.now() - start;

    if (topoRes.ok) {
      const topoData = await topoRes.json();
      return {
        status: "ONLINE",
        connected: true,
        httpStatus: topoRes.status,
        topology: topoData,
        message: "Connected to Camunda 8 SaaS Cluster",
        latencyMs: latency
      };
    } else if (topoRes.status === 503) {
      return {
        status: "HIBERNATED",
        connected: false,
        httpStatus: 503,
        message: "Camunda 8 SaaS cluster is hibernating / inactive (503 Service Unavailable). Standby workflow engine active.",
        latencyMs: latency
      };
    } else {
      return {
        status: "DEGRADED",
        connected: false,
        httpStatus: topoRes.status,
        message: `Camunda API returned HTTP ${topoRes.status}`,
        latencyMs: latency
      };
    }
  } catch (err) {
    return {
      status: "OFFLINE",
      connected: false,
      message: `Failed to connect to Camunda: ${err.message}`,
      latencyMs: Date.now() - start
    };
  }
}

async function startCamundaProcessInstance(variables) {
  const { rest } = getCamundaClient();
  if (!rest) throw new Error("Camunda client not available");
  
  const res = await rest.createProcessInstance({
    processDefinitionId: "ScholarshipProcess",
    variables
  });
  return res;
}

async function searchCamundaTasks(filter = {}) {
  const { rest } = getCamundaClient();
  if (!rest) return [];
  try {
    return await rest.searchUserTasks(filter);
  } catch (err) {
    console.warn("[CamundaClient] searchUserTasks failed:", err.message);
    return [];
  }
}

async function completeCamundaTask(userTaskKey, variables = {}) {
  const { rest } = getCamundaClient();
  if (!rest) throw new Error("Camunda client not available");
  return await rest.completeUserTask({
    userTaskKey,
    variables
  });
}

module.exports = {
  getCamundaClient,
  checkCamundaHealth,
  startCamundaProcessInstance,
  searchCamundaTasks,
  completeCamundaTask
};
