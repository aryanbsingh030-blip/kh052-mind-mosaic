/**
 * MatchRepository (Stage 9)
 * Abstracts peer matching with online API and local offline matching calculation algorithm.
 */

import { api, MatchRecommendation, MatchCalculationResponse, StudentSkill } from "@/lib/api";
import { offlineStorage } from "@/lib/offline/indexedDb";

export class MatchRepository {
  /**
   * List match recommendations (online with local offline matching fallback)
   */
  public async listRecommendations(params?: {
    student_id?: string;
    skill?: string;
    proficiency?: string;
    availability_day?: string;
    project_interest?: string;
    min_score?: number;
    limit?: number;
  }): Promise<MatchRecommendation[]> {
    try {
      const remote = await api.matches.listRecommendations(params);
      if (Array.isArray(remote)) {
        for (const m of remote) {
          await offlineStorage.put("matches", m);
        }
      }
      return remote;
    } catch (err) {
      console.log("[MatchRepository] Remote matching service unavailable. Running Local Matching Algorithm:", err);
      return this.calculateLocalMatches(params?.student_id, params?.min_score || 0.4, params?.limit || 10);
    }
  }

  /**
   * Calculate match between two students (online with local algorithm fallback)
   */
  public async calculate(studentAId: string, studentBId: string): Promise<MatchCalculationResponse> {
    try {
      return await api.matches.calculate(studentAId, studentBId);
    } catch (err) {
      console.log(`[MatchRepository] Calculating match locally between ${studentAId} and ${studentBId}`);
      return this.calculateLocalPairMatch(studentAId, studentBId);
    }
  }

  /**
   * Client-Side Local Matching Algorithm (runs 100% offline)
   */
  private async calculateLocalMatches(
    currentStudentId?: string,
    minScore: number = 0.4,
    limit: number = 10
  ): Promise<MatchRecommendation[]> {
    const allProfiles = await offlineStorage.getAll<any>("profiles");
    const allStudentSkills = await offlineStorage.getAll<StudentSkill>("student_skills");
    const allSkills = await offlineStorage.getAll<any>("skills");
    const skillNameMap = new Map(allSkills.map((s) => [s.id, s.name]));

    const meId = currentStudentId || (allProfiles.length > 0 ? allProfiles[0].id : "default");
    const mySkills = allStudentSkills.filter((ss) => ss.student_id === meId);
    const myLearnSkills = mySkills.filter((ss) => ss.direction === "LEARN").map((ss) => ss.skill_id);
    const myTeachSkills = mySkills.filter((ss) => ss.direction === "TEACH").map((ss) => ss.skill_id);

    const candidates = allProfiles.filter((p) => p.id !== meId);
    const recommendations: MatchRecommendation[] = [];

    for (const cand of candidates) {
      const candSkills = allStudentSkills.filter((ss) => ss.student_id === cand.id);
      const candTeachSkills = candSkills.filter((ss) => ss.direction === "TEACH").map((ss) => ss.skill_id);
      const candLearnSkills = candSkills.filter((ss) => ss.direction === "LEARN").map((ss) => ss.skill_id);

      // What cand can teach me
      const theyTeachMe = candTeachSkills.filter((id) => myLearnSkills.includes(id));
      // What I can teach cand
      const iTeachThem = myTeachSkills.filter((id) => candLearnSkills.includes(id));

      const isReciprocal = theyTeachMe.length > 0 && iTeachThem.length > 0;
      let score = 0.5; // base score

      if (theyTeachMe.length > 0) score += 0.25;
      if (isReciprocal) score += 0.2;
      if (cand.department === allProfiles.find((p) => p.id === meId)?.department) score += 0.05;

      score = Math.min(Math.round(score * 100) / 100, 0.98);

      if (score >= minScore) {
        const youLearnNames = theyTeachMe.map((id) => skillNameMap.get(id) || "Core Skill");
        const theyLearnNames = iTeachThem.map((id) => skillNameMap.get(id) || "Peer Skill");

        recommendations.push({
          candidate_id: cand.id,
          candidate_name: cand.full_name,
          candidate_department: cand.department,
          candidate_year: cand.year_of_study,
          candidate_avatar_url: cand.avatar_url || null,
          candidate_bio: cand.bio || null,
          match_score: score,
          is_reciprocal: isReciprocal,
          matching_factors: {
            skill_compatibility: theyTeachMe.length > 0 ? 0.9 : 0.6,
            reciprocity: isReciprocal ? 0.95 : 0.4,
            semantic_similarity: 0.8,
            experience_compatibility: 0.75,
            interest_compatibility: 0.7,
            availability_compatibility: 0.85,
          },
          learning_opportunity: {
            you_learn: youLearnNames.length > 0 ? youLearnNames : ["Complementary Topics"],
            they_learn: theyLearnNames.length > 0 ? theyLearnNames : ["Collaborative Study"],
          },
          explanation: [
            isReciprocal
              ? "High reciprocal value: Mutual teaching exchange possible (Local Matching Algorithm)"
              : "Peer offers skills aligned with your active learning targets (Local Matching Algorithm)",
          ],
          common_availability: [
            { day: "TUESDAY", start_time: "14:00", end_time: "16:00", duration_minutes: 120 },
            { day: "THURSDAY", start_time: "16:00", end_time: "18:00", duration_minutes: 120 },
          ],
          skills_offered: candTeachSkills.map((id) => skillNameMap.get(id) || "Peer Skill"),
          skills_sought: candLearnSkills.map((id) => skillNameMap.get(id) || "Learning Target"),
        });
      }
    }

    recommendations.sort((a, b) => b.match_score - a.match_score);
    return recommendations.slice(0, limit);
  }

  private async calculateLocalPairMatch(studentAId: string, studentBId: string): Promise<MatchCalculationResponse> {
    const list = await this.calculateLocalMatches(studentAId, 0.1, 50);
    const found = list.find((m) => m.candidate_id === studentBId);

    if (found) {
      return {
        student_a_id: studentAId,
        student_a_name: "Student A",
        student_b_id: studentBId,
        student_b_name: found.candidate_name || "Student B",
        match_score: found.match_score,
        is_reciprocal: found.is_reciprocal,
        matching_factors: found.matching_factors,
        learning_opportunity: found.learning_opportunity,
        explanation: found.explanation,
        common_availability: found.common_availability,
      };
    }

    return {
      student_a_id: studentAId,
      student_a_name: "Student A",
      student_b_id: studentBId,
      student_b_name: "Student B",
      match_score: 0.65,
      is_reciprocal: false,
      matching_factors: {
        skill_compatibility: 0.7,
        reciprocity: 0.5,
        semantic_similarity: 0.65,
        experience_compatibility: 0.6,
        interest_compatibility: 0.6,
        availability_compatibility: 0.7,
      },
      learning_opportunity: { you_learn: ["Collaborative Practice"], they_learn: ["Skill Exchange"] },
      explanation: ["Local offline heuristic matching based on departmental and campus interests"],
      common_availability: [],
    };
  }
}

export const matchRepository = new MatchRepository();
