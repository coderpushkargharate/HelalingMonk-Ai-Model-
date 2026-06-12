// Frontend auth client for the Express + MongoDB API.
// Stores the JWT in localStorage and exposes typed helpers.

export type Role = 'admin' | 'doctor' | 'reception' | 'patient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string;
}

export interface AuthResult {
  token: string;
  user: AuthUser;
  permissions: string[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'hm_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(result.token);
  return result;
}

export async function register(name: string, email: string, password: string): Promise<AuthResult> {
  const result = await request<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  setToken(result.token);
  return result;
}

export async function fetchMe(): Promise<{ user: AuthUser; permissions: string[] }> {
  return request('/auth/me');
}

export function logout() {
  setToken(null);
}

// ---- Admin: user management ----

export async function listUsers(role?: Role): Promise<{ users: AuthUser[] }> {
  const q = role ? `?role=${role}` : '';
  return request(`/users${q}`);
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: Role;
}): Promise<{ user: AuthUser; permissions: string[] }> {
  return request('/users', { method: 'POST', body: JSON.stringify(payload) });
}

export async function setUserActive(id: string, active: boolean): Promise<{ user: AuthUser }> {
  return request(`/users/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

// ---- Patients ----

export interface Patient {
  id: string;
  patientId: string; // human-readable, e.g. HM-000001
  name: string;
  age: number | null;
  gender: string;
  mobile: string;
  email: string;
  painAreas: string[];
  complaint: string;
  height: number | null;
  weight: number | null;
  assignedDoctor: { id: string; name: string } | string | null;
  createdAt?: string;
}

export interface NewPatient {
  name: string;
  age?: string | number;
  gender?: string;
  mobile?: string;
  email?: string;
  painAreas?: string[];
  complaint?: string;
  height?: string | number;
  weight?: string | number;
  assignedDoctor?: string | null;
}

export async function listPatients(opts: { q?: string; scope?: 'all' | 'mine' } = {}): Promise<{ patients: Patient[] }> {
  const params = new URLSearchParams();
  if (opts.q) params.set('q', opts.q);
  if (opts.scope === 'all') params.set('scope', 'all');
  const qs = params.toString();
  return request(`/patients${qs ? `?${qs}` : ''}`);
}

export async function createPatient(payload: NewPatient): Promise<{ patient: Patient }> {
  return request('/patients', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getPatient(id: string): Promise<{ patient: Patient }> {
  return request(`/patients/${id}`);
}

export async function assignDoctor(id: string, doctorId: string | null): Promise<{ patient: Patient }> {
  return request(`/patients/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ doctorId }),
  });
}

// ---- Reports ----

export interface ReportFinding {
  assessmentId: string;
  name: string;
  bodyRegion: string;
  measurementName: string;
  value: number | null;
  unit: string;
  severity: 'normal' | 'mild' | 'moderate' | 'severe' | null;
  painArea: string;
  painCorrelation: string;
}

export interface ReportExercise {
  name: string;
  sets: string;
  reps: string;
  frequency: string;
  forFinding?: string;
}

export interface Report {
  id: string;
  patient: string;
  doctor: { id: string; name: string } | string;
  painAreas: string[];
  overallScore: number | null;
  findingsCount: number;
  flaggedCount: number;
  findings: ReportFinding[];
  suggestedExercises: ReportExercise[];
  doctorNotes: string;
  createdAt?: string;
}

export interface NewReport {
  patientId: string;
  painAreas?: string[];
  overallScore?: number;
  findings: ReportFinding[];
  suggestedExercises?: ReportExercise[];
  doctorNotes?: string;
}

export async function listPatientReports(patientId: string): Promise<{ reports: Report[] }> {
  return request(`/patients/${patientId}/reports`);
}

export async function createReport(payload: NewReport): Promise<{ report: Report }> {
  return request('/reports', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateReportNotes(id: string, doctorNotes: string): Promise<{ report: Report }> {
  return request(`/reports/${id}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ doctorNotes }),
  });
}
