/**
 * StudentRepository (Stage 9)
 * Abstracts student profile operations across online API and offline IndexedDB.
 */

import { api, StudentProfile, ProfileSummary } from "@/lib/api";
import { offlineStorage } from "@/lib/offline/indexedDb";
import { syncEngine } from "@/lib/sync/syncEngine";

export class StudentRepository {
  /**
   * List student profiles (network-first, falling back to IndexedDB)
   */
  public async list(params?: { department?: string; search?: string; limit?: number }): Promise<ProfileSummary[]> {
    try {
      const remote = await api.profiles.list(params);
      // Cache remote profiles in IndexedDB for offline use
      if (Array.isArray(remote)) {
        for (const p of remote) {
          await offlineStorage.put("profiles", p);
        }
      }
      return remote;
    } catch (err) {
      console.warn("[StudentRepository] Remote fetch failed, serving from IndexedDB:", err);
      let local = await offlineStorage.getAll<any>("profiles");
      if (params?.department) {
        local = local.filter((p) => p.department?.toLowerCase() === params.department?.toLowerCase());
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        local = local.filter(
          (p) =>
            p.full_name?.toLowerCase().includes(q) ||
            p.department?.toLowerCase().includes(q) ||
            p.bio?.toLowerCase().includes(q)
        );
      }
      if (params?.limit) {
        local = local.slice(0, params.limit);
      }
      return local as ProfileSummary[];
    }
  }

  /**
   * Get student profile by ID
   */
  public async get(profileId: string): Promise<StudentProfile | null> {
    try {
      const remote = await api.profiles.get(profileId);
      if (remote) {
        await offlineStorage.put("profiles", remote);
      }
      return remote;
    } catch (err) {
      console.warn(`[StudentRepository] Remote get for ${profileId} failed, fetching from IndexedDB:`, err);
      const local = await offlineStorage.get<StudentProfile>("profiles", profileId);
      return local;
    }
  }

  /**
   * Update student profile (saves locally and queues sync if offline)
   */
  public async update(profileId: string, data: Partial<StudentProfile>): Promise<StudentProfile> {
    try {
      const remote = await api.profiles.update(profileId, data);
      await offlineStorage.put("profiles", remote);
      return remote;
    } catch (err) {
      console.warn(`[StudentRepository] Offline update for ${profileId}. Saving locally:`, err);
      const existing = (await offlineStorage.get<StudentProfile>("profiles", profileId)) || ({} as StudentProfile);
      const updated: StudentProfile = {
        ...existing,
        ...data,
        id: profileId,
        updated_at: new Date().toISOString(),
      };
      await offlineStorage.put("profiles", updated);

      // Queue sync via Stage 10 Sync Engine
      await syncEngine.enqueueOperation("UPDATE_PROFILE", profileId, data);

      return updated;
    }
  }

  /**
   * Create new profile (offline-capable)
   */
  public async create(data: Partial<StudentProfile>): Promise<StudentProfile> {
    const id = data.id || `prof-${Date.now()}`;
    const newProfile: StudentProfile = {
      id,
      user_id: data.user_id || `user-${Date.now()}`,
      email: data.email || null,
      full_name: data.full_name || "Anonymous Student",
      department: data.department || "General",
      year_of_study: data.year_of_study || "Freshman",
      bio: data.bio || null,
      raw_project_experience: data.raw_project_experience || null,
      interests: data.interests || null,
      project_interests: data.project_interests || null,
      avatar_url: data.avatar_url || null,
      github_url: data.github_url || null,
      linkedin_url: data.linkedin_url || null,
      portfolio_url: data.portfolio_url || null,
      credit_balance: data.credit_balance ?? 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      skills: data.skills || [],
    };

    await offlineStorage.put("profiles", newProfile);
    await offlineStorage.put("credits", {
      student_id: id,
      credit_balance: newProfile.credit_balance,
      total_earned: 0,
      total_spent: 0,
      allow_negative_balance: false,
    });

    // Queue sync via Stage 10 Sync Engine
    await syncEngine.enqueueOperation("CREATE_PROFILE", id, newProfile);

    return newProfile;
  }
}

export const studentRepository = new StudentRepository();
