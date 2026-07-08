import { getIdToken } from "./authService.js";

const BASE = "https://drivo1.elmoroj.com/api";

async function authHeaders(json = false) {
  const token = await getIdToken();
  const h = { Accept: "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function parseResponse(res) {
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

export async function fetchRewardSettings() {
  const res = await fetch(`${BASE}/reward-settings`, { headers: await authHeaders() });
  const data = await parseResponse(res);
  return data?.data ?? data;
}

export async function updateRewardSettings(payload) {
  const res = await fetch(`${BASE}/admin/rewards/settings/update`, {
    method: "POST",
    headers: await authHeaders(true),
    body: JSON.stringify(payload),
  });
  const data = await parseResponse(res);
  return data?.data ?? data;
}
