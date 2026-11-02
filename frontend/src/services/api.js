// API Client for the Scholarship Approval BFF

const BASE_URL = '/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (typeof data === 'object' && data.error) || data || response.statusText;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // System Health & Diagnostics
  getHealth: () => fetchJson('/health'),

  // Applications
  getApplications: () => fetchJson('/applications'),
  getApplication: (reference) => fetchJson(`/applications/${encodeURIComponent(reference)}`),
  startApplication: (payload) => fetchJson('/process/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Indicative Eligibility Preview
  previewEligibility: (payload) => fetchJson('/eligibility/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Committee Tasks
  getTasks: (params = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.state) query.append('state', params.state);
    if (params.studentId) query.append('studentId', params.studentId);
    return fetchJson(`/tasks?${query.toString()}`);
  },
  getTask: (taskKey) => fetchJson(`/tasks/${encodeURIComponent(taskKey)}`),
  completeTask: (taskKey, variables) => fetchJson(`/tasks/${encodeURIComponent(taskKey)}/complete`, {
    method: 'POST',
    body: JSON.stringify(variables),
  }),

  // Accounts Mock API (Disbursements & Notifications)
  getDisbursements: () => fetchJson('/mock/disbursements'),
  getNotifications: (params = {}) => {
    const query = new URLSearchParams();
    if (params.studentEmail) query.append('studentEmail', params.studentEmail);
    if (params.studentId) query.append('studentId', params.studentId);
    return fetchJson(`/mock/notifications?${query.toString()}`);
  },
  resetSystem: () => fetchJson('/mock/reset', { method: 'POST' }),

  // Test Scenarios
  getScenarios: () => fetchJson('/scenarios'),
  runScenario: (scenarioId, autoAdvance = true) => fetchJson('/scenarios/run', {
    method: 'POST',
    body: JSON.stringify({ scenarioId, autoAdvance }),
  }),
};
