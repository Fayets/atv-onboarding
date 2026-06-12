const defaultOptions = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail[0]?.msg
          : data.error || 'Error inesperado';
    throw new ApiError(message, res.status);
  }
  return data;
}

export async function login(password) {
  const res = await fetch('/api/auth/login', {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify({ password }),
  });
  return parseResponse(res);
}

export async function getSession() {
  const res = await fetch('/api/auth/session', defaultOptions);
  return parseResponse(res);
}

export async function submitForm(formData) {
  const res = await fetch('/api/onboarding/submit-form', {
    ...defaultOptions,
    method: 'POST',
    body: JSON.stringify(formData),
  });
  return parseResponse(res);
}

export async function joinSkool() {
  const res = await fetch('/api/onboarding/join-skool', {
    ...defaultOptions,
    method: 'POST',
  });
  return parseResponse(res);
}

export async function joinDiscord() {
  const res = await fetch('/api/onboarding/join-discord', {
    ...defaultOptions,
    method: 'POST',
  });
  return parseResponse(res);
}

export async function getDashboard() {
  const res = await fetch('/api/admin/dashboard', defaultOptions);
  return parseResponse(res);
}

export async function getSessionForm(sessionId) {
  const res = await fetch(`/api/admin/sessions/${sessionId}/form`, defaultOptions);
  return parseResponse(res);
}

export async function markCallScheduled(sessionId) {
  const res = await fetch(`/api/admin/sessions/${sessionId}/call-scheduled`, {
    ...defaultOptions,
    method: 'PATCH',
  });
  return parseResponse(res);
}

export async function markCallCompleted(sessionId) {
  const res = await fetch(`/api/admin/sessions/${sessionId}/call-completed`, {
    ...defaultOptions,
    method: 'PATCH',
  });
  return parseResponse(res);
}

export async function updateSessionEstado(sessionId, estado) {
  const res = await fetch(`/api/admin/sessions/${sessionId}/estado`, {
    ...defaultOptions,
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
  return parseResponse(res);
}
