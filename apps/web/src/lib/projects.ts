/**
 * KV-backed Pro-tier project workspaces.
 *
 * Keys:
 *   project:<id>              → full Project JSON (single value, capped ~256KB)
 *   owner:<sid>:projects      → JSON array of project IDs owned by sid
 *
 * All writes go through this lib so the owner index stays consistent.
 */
import type {
  Project,
  ProjectInput,
} from "@/core";

interface KV {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete?: (key: string) => Promise<void>;
}

const MAX_PROJECT_BYTES = 240 * 1024; // KV value cap is 25MB but we want fast reads

export function newId(prefix = "p"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 14)}`;
}

async function listIds(kv: KV, sid: string): Promise<string[]> {
  const raw = await kv.get(`owner:${sid}:projects`);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeIds(kv: KV, sid: string, ids: string[]): Promise<void> {
  await kv.put(`owner:${sid}:projects`, JSON.stringify(ids));
}

export async function listProjects(kv: KV, sid: string): Promise<Project[]> {
  const ids = await listIds(kv, sid);
  if (ids.length === 0) return [];
  const projects: Project[] = [];
  for (const id of ids) {
    const raw = await kv.get(`project:${id}`);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw) as Project;
      if (p.ownerSid !== sid) continue; // index hygiene
      projects.push(p);
    } catch {
      /* skip */
    }
  }
  return projects.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProject(
  kv: KV,
  sid: string,
  id: string
): Promise<Project | null> {
  const raw = await kv.get(`project:${id}`);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Project;
    if (p.ownerSid !== sid) return null;
    return p;
  } catch {
    return null;
  }
}

export async function createProject(
  kv: KV,
  sid: string,
  name: string
): Promise<Project> {
  const cleanName = name.trim().slice(0, 80) || "Untitled Project";
  const id = newId();
  const project: Project = {
    id,
    ownerSid: sid,
    name: cleanName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    inputs: [],
  };
  await kv.put(`project:${id}`, JSON.stringify(project));
  const ids = await listIds(kv, sid);
  ids.unshift(id);
  await writeIds(kv, sid, ids.slice(0, 100)); // cap the index
  return project;
}

export async function saveProject(kv: KV, project: Project): Promise<void> {
  const next = { ...project, updatedAt: Date.now() };
  const serialized = JSON.stringify(next);
  if (serialized.length > MAX_PROJECT_BYTES) {
    throw new Error(
      `project too large (${serialized.length} bytes > ${MAX_PROJECT_BYTES})`
    );
  }
  await kv.put(`project:${project.id}`, serialized);
}

export async function deleteProject(
  kv: KV,
  sid: string,
  id: string
): Promise<boolean> {
  const p = await getProject(kv, sid, id);
  if (!p) return false;
  if (kv.delete) await kv.delete(`project:${id}`);
  const ids = await listIds(kv, sid);
  await writeIds(kv, sid, ids.filter((x) => x !== id));
  return true;
}

export async function addInput(
  kv: KV,
  sid: string,
  projectId: string,
  input: ProjectInput
): Promise<Project | null> {
  const p = await getProject(kv, sid, projectId);
  if (!p) return null;
  // Cap inputs per project to keep KV value size reasonable.
  if (p.inputs.length >= 30) {
    throw new Error("project has the maximum of 30 inputs");
  }
  const next: Project = {
    ...p,
    inputs: [...p.inputs, input],
    // Adding new inputs invalidates the cached analysis.
    analysis: undefined,
  };
  await saveProject(kv, next);
  return next;
}

export async function removeInput(
  kv: KV,
  sid: string,
  projectId: string,
  inputId: string
): Promise<Project | null> {
  const p = await getProject(kv, sid, projectId);
  if (!p) return null;
  const next: Project = {
    ...p,
    inputs: p.inputs.filter((i) => i.id !== inputId),
    analysis: undefined,
  };
  await saveProject(kv, next);
  return next;
}
