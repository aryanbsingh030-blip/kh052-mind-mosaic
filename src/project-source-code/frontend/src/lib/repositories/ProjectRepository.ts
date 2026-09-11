/**
 * ProjectRepository (Stage 9)
 * Abstracts project operations across online API and local IndexedDB.
 */

import { api, ProjectCreatePayload } from "@/lib/api";
import { offlineStorage } from "@/lib/offline/indexedDb";
import { syncEngine } from "@/lib/sync/syncEngine";

export interface ProjectItem {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  max_members: number;
  created_at: string;
  requirements?: any[];
}

export class ProjectRepository {
  /**
   * List projects (online with IndexedDB fallback)
   */
  public async list(params?: { category?: string; search?: string; limit?: number }): Promise<ProjectItem[]> {
    try {
      const remote = await api.projects.list(params);
      if (Array.isArray(remote)) {
        for (const p of remote) {
          await offlineStorage.put("projects", p);
        }
      }
      return remote;
    } catch (err) {
      console.warn("[ProjectRepository] Remote list failed, serving from IndexedDB:", err);
      let local = await offlineStorage.getAll<ProjectItem>("projects");
      if (params?.category) {
        local = local.filter((p) => p.category?.toLowerCase() === params.category?.toLowerCase());
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        local = local.filter(
          (p) => p.title?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        );
      }
      if (params?.limit) {
        local = local.slice(0, params.limit);
      }
      return local;
    }
  }

  /**
   * Get project by ID
   */
  public async get(projectId: string): Promise<ProjectItem | null> {
    try {
      const remote = await api.projects.get(projectId);
      if (remote) {
        await offlineStorage.put("projects", remote);
      }
      return remote;
    } catch (err) {
      console.warn(`[ProjectRepository] Remote get for ${projectId} failed, fetching local:`, err);
      return offlineStorage.get<ProjectItem>("projects", projectId);
    }
  }

  /**
   * Create project (offline-capable)
   */
  public async create(ownerId: string, data: ProjectCreatePayload): Promise<ProjectItem> {
    const id = `proj-${Date.now()}`;
    const newProject: ProjectItem = {
      id,
      owner_id: ownerId,
      title: data.title,
      description: data.description,
      category: data.category,
      max_members: data.max_members,
      created_at: new Date().toISOString(),
      requirements: data.requirements,
    };

    try {
      const remote = await api.projects.create(ownerId, data);
      await offlineStorage.put("projects", remote);
      return remote;
    } catch (err) {
      console.warn("[ProjectRepository] Offline create project, storing locally:", err);
      await offlineStorage.put("projects", newProject);
      await syncEngine.enqueueOperation("CREATE_PROJECT", id, {
        owner_id: ownerId,
        title: data.title,
        description: data.description,
        category: data.category,
        max_members: data.max_members,
        requirements: data.requirements,
      });
      return newProject;
    }
  }
}

export const projectRepository = new ProjectRepository();
