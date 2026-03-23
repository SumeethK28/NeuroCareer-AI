import type {
  ApplicationInsightsResponse,
  CareerGrowthSuggestion,
  Reflection,
  ResumeUploadResponse,
  ApplicationLogResponse,
  SkillTreeResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";
const BACKEND_URL = "http://localhost:8000/api/v1"; // Direct backend URL

// Helper to get token from localStorage
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

// Helper to set token in localStorage
export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
}

// Helper to clear token
export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
}

// Helper to parse error message from API response
function parseErrorMessage(text: string): string {
  try {
    const json = JSON.parse(text);
    if (json.detail) {
      return typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
    }
    return text || "An error occurred";
  } catch {
    return text || "An error occurred";
  }
}

// Auth functions hit backend directly to bypass NextAuth
export async function signup(
  email: string,
  password: string,
  display_name: string
): Promise<{ access_token: string; token_type: string; user: any }> {
  const res = await fetch(`${BACKEND_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name }),
  });

  if (!res.ok) {
    const text = await res.text();
    const errorMessage = parseErrorMessage(text);
    throw new Error(errorMessage);
  }

  const data = await res.json();
  
  // Store token in localStorage
  if (data.access_token) {
    setToken(data.access_token);
  }
  
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<{ access_token: string; token_type: string; user: any }> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    const errorMessage = parseErrorMessage(text);
    throw new Error(errorMessage);
  }

  const data = await res.json();
  
  // Store token in localStorage
  if (data.access_token) {
    setToken(data.access_token);
  }
  
  return data;
}

export async function logout(): Promise<void> {
  clearToken();
}

async function apiFetch<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const finalToken = token || getToken();
  
  if (!finalToken || typeof finalToken !== 'string') {
    console.error("apiFetch: No token found or invalid token type!");
    throw new Error("Not authenticated");
  }
  
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${finalToken}`,
  };
  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const fullUrl = `${API_BASE}${path}`;
  console.log(`apiFetch: ${init?.method || 'GET'} ${fullUrl}`);
  console.log(`apiFetch: Token length: ${finalToken.length}, first 20 chars: ${finalToken.substring(0, 20)}...`);

  const res = await fetch(fullUrl, {
    ...init,
    headers,
    cache: "no-store",
  });

  console.log(`apiFetch: Response status: ${res.status} for ${fullUrl}`);

  if (!res.ok) {
    const message = await res.text();
    console.error(`apiFetch: Error - ${res.status} ${fullUrl}`, message);
    throw new Error(message || "Request failed");
  }
  return (await res.json()) as T;
}

export async function fetchSkillTree(token?: string): Promise<SkillTreeResponse> {
  return apiFetch("/skills/tree", token);
}

export async function fetchGhostingInsights(token?: string): Promise<ApplicationInsightsResponse> {
  return apiFetch("/applications/ghosting", token);
}

export async function fetchApplications(token?: string): Promise<ApplicationLogResponse> {
  return apiFetch("/applications/", token);
}

export async function fetchLatestReflection(token?: string): Promise<Reflection | null> {
  return apiFetch("/memory/reflections/latest", token);
}

export async function triggerCareerGrowth(token?: string): Promise<CareerGrowthSuggestion> {
  return apiFetch("/settings/career-growth/trigger", token, { method: "POST" });
}

export async function clearCareerMemory(token?: string): Promise<{ message: string }> {
  return apiFetch("/memory/clear", token, { method: "POST" });
}

export async function logApplication(payload: unknown, token?: string) {
  return apiFetch("/applications", token, { method: "POST", body: JSON.stringify(payload) });
}

export async function agentChat<T extends Record<string, unknown>>(payload: T, token?: string) {
  return apiFetch("/agent/chat", token, { method: "POST", body: JSON.stringify(payload) });
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated - no token found");
  }

  // Use the Next.js API proxy route instead of calling backend directly
  const response = await fetch("/api/resume/upload", {
    method: "POST",
    body: form,
    credentials: "include",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Resume upload failed");
  }

  return (await response.json()) as ResumeUploadResponse;
}

export async function fetchLatestResume(token?: string): Promise<ResumeUploadResponse | null> {
  return apiFetch("/resume", token).catch(() => null);
}

export async function fetchCareerRadar(token?: string): Promise<unknown> {
  return apiFetch("/applications/radar/analyze", token);
}

export async function fetchSmartApplicationAnalysis(token?: string): Promise<any> {
  return apiFetch("/applications/smart/analysis", token);
}

export async function updateApplication(
  appId: number,
  payload: unknown,
  token?: string
): Promise<{ message: string }> {
  return apiFetch(`/applications/${appId}`, token, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteApplication(
  appId: number,
  token?: string
): Promise<{ message: string }> {
  return apiFetch(`/applications/${appId}`, token, {
    method: "DELETE",
  });
}

export async function fetchCurrentUser(
  token?: string
): Promise<{ id: number; email: string; display_name: string | null }> {
  const finalToken = token || getToken();
  
  console.log("fetchCurrentUser - Token from localStorage:", finalToken ? "EXISTS" : "MISSING");
  
  if (!finalToken) {
    throw new Error("Not authenticated - no token found");
  }
  
  console.log("fetchCurrentUser - Making request with token:", finalToken.substring(0, 20) + "...");
  
  // Use backend directly with Authorization header
  const res = await fetch(`${BACKEND_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${finalToken}`,
    },
  });

  console.log("fetchCurrentUser - Response status:", res.status);
  
  if (!res.ok) {
    const text = await res.text();
    console.log("fetchCurrentUser - Error response:", text);
    throw new Error("Failed to fetch current user");
  }

  return res.json();
}

