/**
 * AI Skill Exchange - Frontend API Client
 */

export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
export type SkillDirection = "TEACH" | "LEARN";
export type GoalStatus = "NOT_STARTED" | "IN_PROGRESS" | "ACHIEVED";
export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export interface SkillSummary {
  id: string;
  name: string;
  category: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string | null;
  aliases: string[] | null;
  parent_skill_id: string | null;
  sub_skills?: SkillSummary[];
}

export interface StudentSkill {
  id: string;
  student_id: string;
  skill_id: string;
  skill_name: string | null;
  skill_category: string | null;
  direction: SkillDirection;
  proficiency_level: ProficiencyLevel;
  years_experience: number;
  description: string | null;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string;
  department: string;
  year_of_study: string;
  bio: string | null;
  raw_project_experience: string | null;
  interests: string | null;
  project_interests: string | null;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  credit_balance: number;
  created_at: string;
  updated_at: string;
  skills: StudentSkill[];
}

export interface ProfileSummary {
  id: string;
  user_id: string;
  full_name: string;
  department: string;
  year_of_study: string;
  avatar_url: string | null;
  credit_balance: number;
  teach_skills_count: number;
  learn_skills_count: number;
}

export interface LearningGoal {
  id: string;
  student_id: string;
  skill_id: string;
  skill_name: string | null;
  skill_category: string | null;
  target_proficiency: ProficiencyLevel;
  target_date: string | null;
  description: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id: string;
  student_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  timezone: string;
  is_active: boolean;
}

export type CreditTransactionType =
  | "TEACHING_REWARD"
  | "LEARNING_COST"
  | "BONUS"
  | "ADMIN_ADJUSTMENT"
  | "REFUND"
  | "INITIAL_GRANT"
  | "SESSION_TRANSFER";

export type SessionStatusType = "REQUESTED" | "ACCEPTED" | "COMPLETED" | "CANCELLED" | "SCHEDULED";

export interface CreditTransaction {
  id: string;
  student_id?: string | null;
  student_name?: string | null;
  student?: string | null;
  from_student_id?: string | null;
  from_student_name?: string | null;
  to_student_id?: string | null;
  to_student_name?: string | null;
  amount: number;
  type: CreditTransactionType;
  transaction_type?: CreditTransactionType;
  reason?: string | null;
  description?: string | null;
  timestamp: string;
  created_at?: string;
  session_id?: string | null;
  related_session_id?: string | null;
}

export interface CreditBalanceInfo {
  student_id: string;
  student_name: string;
  credit_balance: number;
  total_earned: number;
  total_spent: number;
  allow_negative_balance?: boolean;
  recent_transactions: CreditTransaction[];
}

export interface SkillDemandIndexItem {
  skill_id: string;
  skill_name: string;
  category: string;
  learners_count: number;
  teachers_count: number;
  demand_index: number;
  is_high_demand: boolean;
  status: "HIGH_DEMAND" | "BALANCED" | "SURPLUS" | "CRITICAL_SHORTAGE";
  recommended_reward_multiplier: number;
}

export interface SkillDemandIndexResponse {
  skills: SkillDemandIndexItem[];
  high_demand_count: number;
  total_skills: number;
  average_demand_index: number;
}

export interface LearningSessionLogItem {
  id: string;
  session_id: string;
  student_id: string;
  rating: number | null;
  feedback: string | null;
  learned_summary: string | null;
  completed_at: string | null;
}

export interface TeachingSessionItem {
  id: string;
  teacher_student_id: string;
  teacher_name: string | null;
  learner_student_id: string;
  learner_name: string | null;
  skill_id: string;
  skill_name: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: SessionStatusType;
  credit_amount: number;
  meeting_link: string | null;
  notes: string | null;
  verification_notes?: string | null;
  completed_at?: string | null;
  created_at: string;
  learning_log?: LearningSessionLogItem | null;
}

// Stage 8: Campus Skill Intelligence Types
export interface CampusOverviewMetrics {
  total_students: number;
  total_skills: number;
  total_teaching_capacity: number;
  total_learning_demand: number;
  average_demand_index: number;
  critical_shortages_count: number;
  high_demand_count: number;
  emerging_skills_count: number;
  campus_teaching_capacity_hours: number;
}

export interface SkillDemandSupplyItem {
  skill_id: string;
  skill_name: string;
  category: string;
  learners_count: number;
  teachers_count: number;
  demand_index: number;
  supply_index: number;
  skill_gap_score: number;
  gap_percentage: number;
  status: "CRITICAL_SHORTAGE" | "HIGH_DEMAND" | "BALANCED" | "OVERSUPPLIED";
  is_shortage: boolean;
  is_emerging: boolean;
  callout_text: string;
}

export interface CategoryDistributionItem {
  category: string;
  total_skills: number;
  learners_count: number;
  teachers_count: number;
  demand_index: number;
  learner_share_percentage: number;
  teacher_share_percentage: number;
}

export interface SkillNetworkNode {
  id: string;
  name: string;
  category: string;
  demand_index: number;
  total_mentions: number;
  size: number;
}

export interface SkillNetworkEdge {
  source: string;
  target: string;
  source_name: string;
  target_name: string;
  weight: number;
  category: string;
}

export interface SkillNetworkResponse {
  nodes: SkillNetworkNode[];
  edges: SkillNetworkEdge[];
  total_clusters: number;
}

export interface NarrativeInsightItem {
  id: string;
  type: "SHORTAGE_ALERT" | "EMERGING_TREND" | "CAPACITY_WARNING" | "TEACHING_OPPORTUNITY";
  headline: string;
  description: string;
  metric_label: string;
  metric_value: string;
  target_audience: "STUDENT" | "FACULTY" | "ADMINISTRATOR" | "ALL";
  action_recommendation: string;
}

export interface CampusFilterOptions {
  categories: string[];
  departments: string[];
  years_of_study: string[];
  time_periods: string[];
}

export interface CampusIntelligenceResponse {
  overview: CampusOverviewMetrics;
  top_demanded_skills: SkillDemandSupplyItem[];
  top_supplied_skills: SkillDemandSupplyItem[];
  skill_shortages: SkillDemandSupplyItem[];
  emerging_skills: SkillDemandSupplyItem[];
  category_distribution: CategoryDistributionItem[];
  narrative_insights: NarrativeInsightItem[];
  filter_options: CampusFilterOptions;
}

export interface CampusFilterParams {
  category?: string;
  department?: string;
  year_of_study?: string;
  time_period?: string;
  sort_by?: string;
  limit?: number;
}

export interface SyncOperationRequest {
  operation_id: string;
  type: string;
  client_timestamp: string;
  entity_id?: string | null;
  payload: Record<string, any>;
  client_version?: number;
}

export interface SyncOperationAck {
  operation_id: string;
  type: string;
  status: "SUCCESS" | "CONFLICT_RESOLVED" | "REJECTED" | "ERROR";
  server_timestamp: string;
  message: string;
  entity_id?: string | null;
  authoritative_state?: Record<string, any> | null;
}

export interface SyncBatchRequest {
  client_id: string;
  operations: SyncOperationRequest[];
}

export interface SyncBatchResponse {
  batch_id: string;
  processed_count: number;
  success_count: number;
  conflict_count: number;
  rejected_count: number;
  error_count: number;
  server_timestamp: string;
  acknowledgements: SyncOperationAck[];
  authoritative_balances?: Record<string, number> | null;
}

export interface SyncStatusResponse {
  status: string;
  server_time: string;
  version: string;
  supported_operations: string[];
}

export interface ActivityEventItem {
  id: string;
  student_id: string | null;
  student_name: string | null;
  event_type: string;
  title: string;
  description: string;
  created_at: string;
}

export interface AnalyzedSkillItem {
  skill_id: string | null;
  skill_name: string;
  skill_category: string | null;
  proficiency: ProficiencyLevel;
  confidence: number;
  evidence: string;
  source: string;
}

export interface SkillAnalysisResult {
  provider_used: string;
  skills: AnalyzedSkillItem[];
  raw_text: string;
  processing_time_ms: number;
}

export interface ProjectRequiredSkillItem {
  skill_id: string | null;
  skill_name: string;
  skill_category: string | null;
  required_proficiency: ProficiencyLevel;
  importance: "MANDATORY" | "PREFERRED";
  importance_score: number;
  rationale: string | null;
}

export interface SuggestedTeamRoleItem {
  role_title: string;
  description: string;
  associated_skills: string[];
}

export interface ProjectGraphNode {
  id: string;
  label: string;
  node_type: "project" | "domain" | "skill";
  category: string | null;
  importance: string;
  centrality: number;
}

export interface ProjectGraphEdge {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

export interface ProjectSkillCluster {
  cluster_name: string;
  skills: string[];
}

export interface ProjectSkillGraphData {
  nodes: ProjectGraphNode[];
  edges: ProjectGraphEdge[];
  clusters: ProjectSkillCluster[];
}

export interface ProjectAnalysisResponse {
  project_title: string;
  project_summary: string;
  domains: string[];
  domain_label: string;
  complexity: string;
  suggested_team_size: number;
  required_skills: ProjectRequiredSkillItem[];
  suggested_roles: SuggestedTeamRoleItem[];
  skill_graph: ProjectSkillGraphData;
  missing_skills: string[];
  raw_description: string;
  provider_used: string;
  processing_time_ms: number;
}

export interface ProjectAnalysisRequest {
  text?: string;
  description?: string;
  title?: string;
  student_id?: string;
}

export interface ProjectCreatePayload {
  title: string;
  description: string;
  category: string;
  max_members: number;
  requirements: Array<{
    skill_id?: string | null;
    skill_name?: string | null;
    required_proficiency: ProficiencyLevel;
    importance: "MANDATORY" | "PREFERRED";
    description?: string;
  }>;
}

export interface MatchFactors {
  skill_compatibility: number;
  reciprocity: number;
  semantic_similarity: number;
  experience_compatibility: number;
  interest_compatibility: number;
  availability_compatibility: number;
}

export interface LearningOpportunity {
  you_learn: string[];
  they_learn: string[];
}

export interface CommonAvailabilitySlot {
  day: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface MatchRecommendation {
  candidate_id: string;
  candidate_name: string;
  candidate_department: string;
  candidate_year: string;
  candidate_avatar_url: string | null;
  candidate_bio: string | null;
  match_score: number;
  is_reciprocal: boolean;
  matching_factors: MatchFactors;
  learning_opportunity: LearningOpportunity;
  explanation: string[];
  common_availability: CommonAvailabilitySlot[];
  skills_offered: string[];
  skills_sought: string[];
}

export interface MatchCalculationResponse {
  student_a_id: string;
  student_a_name: string;
  student_b_id: string;
  student_b_name: string;
  match_score: number;
  is_reciprocal: boolean;
  matching_factors: MatchFactors;
  learning_opportunity: LearningOpportunity;
  explanation: string[];
  common_availability: CommonAvailabilitySlot[];
}

export class OfflineNetworkError extends Error {
  public isOffline: boolean = true;
  constructor(message: string = "Network request failed. Operating in offline mode.") {
    super(message);
    this.name = "OfflineNetworkError";
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // Network disconnection or fetch failure - wrap gracefully as OfflineNetworkError
    console.warn(`[API] Network failure for ${endpoint}:`, err?.message || err);
    throw new OfflineNetworkError(`Network unreachable for ${endpoint}`);
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === "string" ? errorJson.detail : JSON.stringify(errorJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      return request<{
        access_token: string;
        token_type: string;
        user_id: string;
        email: string;
        role: string;
        profile_id: string | null;
        full_name: string | null;
      }>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    me: async () => {
      return request<{
        id: string;
        email: string;
        role: string;
        is_active: boolean;
        profile: StudentProfile | null;
      }>("/api/v1/auth/me");
    },
  },

  profiles: {
    list: async (params?: { department?: string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.department) query.set("department", params.department);
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<ProfileSummary[]>(`/api/v1/profiles?${query.toString()}`);
    },
    get: async (profileId: string) => {
      return request<StudentProfile>(`/api/v1/profiles/${profileId}`);
    },
    update: async (profileId: string, data: Partial<StudentProfile>) => {
      return request<StudentProfile>(`/api/v1/profiles/${profileId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
  },

  skills: {
    list: async (params?: { category?: string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<Skill[]>(`/api/v1/skills?${query.toString()}`);
    },
    categories: async () => {
      return request<string[]>("/api/v1/skills/categories");
    },
    getStudentSkills: async (studentId: string, direction?: SkillDirection) => {
      const query = direction ? `?direction=${direction}` : "";
      return request<StudentSkill[]>(`/api/v1/skills/student-skills/${studentId}${query}`);
    },
    addStudentSkill: async (
      studentId: string,
      data: {
        skill_id: string;
        direction: SkillDirection;
        proficiency_level: ProficiencyLevel;
        years_experience?: number;
        description?: string;
      }
    ) => {
      return request<StudentSkill>(`/api/v1/skills/student-skills?student_id=${studentId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    deleteStudentSkill: async (studentSkillId: string) => {
      return request<null>(`/api/v1/skills/student-skills/${studentSkillId}`, {
        method: "DELETE",
      });
    },
  },

  goals: {
    list: async (studentId: string) => {
      return request<LearningGoal[]>(`/api/v1/learning-goals/student/${studentId}`);
    },
    create: async (
      studentId: string,
      data: {
        skill_id: string;
        target_proficiency: ProficiencyLevel;
        target_date?: string | null;
        description?: string;
      }
    ) => {
      return request<LearningGoal>(`/api/v1/learning-goals?student_id=${studentId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    update: async (goalId: string, data: Partial<LearningGoal>) => {
      return request<LearningGoal>(`/api/v1/learning-goals/${goalId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    delete: async (goalId: string) => {
      return request<null>(`/api/v1/learning-goals/${goalId}`, {
        method: "DELETE",
      });
    },
  },

  availabilities: {
    list: async (studentId: string) => {
      return request<AvailabilitySlot[]>(`/api/v1/availabilities/student/${studentId}`);
    },
    create: async (
      studentId: string,
      data: {
        day_of_week: DayOfWeek;
        start_time: string;
        end_time: string;
        timezone?: string;
        is_active?: boolean;
      }
    ) => {
      return request<AvailabilitySlot>(`/api/v1/availabilities?student_id=${studentId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    delete: async (availabilityId: string) => {
      return request<null>(`/api/v1/availabilities/${availabilityId}`, {
        method: "DELETE",
      });
    },
  },

  credits: {
    getBalance: async (studentId: string) => {
      return request<CreditBalanceInfo>(`/api/v1/credits/balance/${studentId}`);
    },
    getLedger: async (studentId: string, params?: { type?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.type) query.set("type", params.type);
      if (params?.limit) query.set("limit", params.limit.toString());
      if (params?.offset) query.set("offset", params.offset.toString());
      return request<CreditTransaction[]>(`/api/v1/credits/ledger/${studentId}?${query.toString()}`);
    },
    getDemandIndex: async () => {
      return request<SkillDemandIndexResponse>("/api/v1/credits/demand-index");
    },
    transfer: async (fromStudentId: string, data: { to_student_id: string; amount: number; reason?: string; description?: string }) => {
      return request<CreditTransaction>(`/api/v1/credits/transfer?from_student_id=${fromStudentId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    adminAdjust: async (data: { student_id: string; amount: number; reason: string }) => {
      return request<CreditTransaction>("/api/v1/credits/admin-adjust", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    awardBonus: async (data: { student_id: string; amount: number; reason: string }) => {
      return request<CreditTransaction>("/api/v1/credits/bonus", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  sessions: {
    listByStudent: async (studentId: string, params?: { role?: "teacher" | "learner"; status?: string }) => {
      const query = new URLSearchParams();
      if (params?.role) query.set("role", params.role);
      if (params?.status) query.set("status", params.status);
      return request<TeachingSessionItem[]>(`/api/v1/sessions/student/${studentId}?${query.toString()}`);
    },
    getById: async (sessionId: string) => {
      return request<TeachingSessionItem>(`/api/v1/sessions/${sessionId}`);
    },
    request: async (learnerId: string, data: {
      teacher_student_id: string;
      skill_id: string;
      scheduled_at: string;
      duration_minutes?: number;
      credit_amount?: number;
      notes?: string;
    }) => {
      return request<TeachingSessionItem>(`/api/v1/sessions/request?learner_id=${learnerId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    accept: async (sessionId: string, data?: { meeting_link?: string; scheduled_at?: string; notes?: string }) => {
      return request<TeachingSessionItem>(`/api/v1/sessions/${sessionId}/accept`, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      });
    },
    complete: async (sessionId: string, data?: {
      verification_notes?: string;
      actual_duration_minutes?: number;
      rating?: number;
      learner_feedback?: string;
    }) => {
      return request<TeachingSessionItem>(`/api/v1/sessions/${sessionId}/complete`, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      });
    },
    cancel: async (sessionId: string, reason: string) => {
      return request<TeachingSessionItem>(`/api/v1/sessions/${sessionId}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ reason }),
      });
    },
    submitLearningLog: async (sessionId: string, data: { rating?: number; feedback?: string; learned_summary?: string }) => {
      return request<LearningSessionLogItem>(`/api/v1/sessions/${sessionId}/learning-log`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  activities: {
    getCampus: async (limit: number = 10) => {
      return request<ActivityEventItem[]>(`/api/v1/activities/campus?limit=${limit}`);
    },
  },

  projects: {
    list: async (params?: { category?: string; search?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.search) query.set("search", params.search);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<any[]>(`/api/v1/projects?${query.toString()}`);
    },
    get: async (projectId: string) => {
      return request<any>(`/api/v1/projects/${projectId}`);
    },
    create: async (ownerId: string, data: ProjectCreatePayload) => {
      return request<any>(`/api/v1/projects?owner_id=${ownerId}`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  ai: {
    analyzeSkills: async (text: string, direction: SkillDirection = "TEACH") => {
      return request<SkillAnalysisResult>("/api/v1/ai/analyze-skills", {
        method: "POST",
        body: JSON.stringify({ text, direction }),
      });
    },
    analyzeProject: async (data: ProjectAnalysisRequest) => {
      return request<ProjectAnalysisResponse>("/api/ai/analyze-project", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  matches: {
    listRecommendations: async (params?: {
      student_id?: string;
      skill?: string;
      proficiency?: string;
      availability_day?: string;
      project_interest?: string;
      min_score?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.student_id) query.set("student_id", params.student_id);
      if (params?.skill) query.set("skill", params.skill);
      if (params?.proficiency) query.set("proficiency", params.proficiency);
      if (params?.availability_day) query.set("availability_day", params.availability_day);
      if (params?.project_interest) query.set("project_interest", params.project_interest);
      if (params?.min_score) query.set("min_score", params.min_score.toString());
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<MatchRecommendation[]>(`/matches?${query.toString()}`);
    },
    calculate: async (studentAId: string, studentBId: string) => {
      return request<MatchCalculationResponse>("/matches/calculate", {
        method: "POST",
        body: JSON.stringify({ student_a_id: studentAId, student_b_id: studentBId }),
      });
    },
  },

  teams: {
    getRecommendations: async (projectId: string) => {
      return request<any>(`/teams/recommendations/${projectId}`);
    },
  },

  campusInsights: {
    getFull: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      return request<CampusIntelligenceResponse>(`/api/v1/campus-insights?${query.toString()}`);
    },
    getOverview: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      return request<CampusOverviewMetrics>(`/api/v1/campus-insights/overview?${query.toString()}`);
    },
    getDemandSupply: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      if (params?.sort_by) query.set("sort_by", params.sort_by);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<SkillDemandSupplyItem[]>(`/api/v1/campus-insights/demand-supply?${query.toString()}`);
    },
    getShortages: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<SkillDemandSupplyItem[]>(`/api/v1/campus-insights/shortages?${query.toString()}`);
    },
    getEmerging: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<SkillDemandSupplyItem[]>(`/api/v1/campus-insights/emerging?${query.toString()}`);
    },
    getCategories: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      return request<CategoryDistributionItem[]>(`/api/v1/campus-insights/categories?${query.toString()}`);
    },
    getNetwork: async (params?: { category?: string; limit?: number }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.limit) query.set("limit", params.limit.toString());
      return request<SkillNetworkResponse>(`/api/v1/campus-insights/network?${query.toString()}`);
    },
    getNarrativeInsights: async (params?: CampusFilterParams) => {
      const query = new URLSearchParams();
      if (params?.department) query.set("department", params.department);
      if (params?.year_of_study) query.set("year_of_study", params.year_of_study);
      if (params?.time_period) query.set("time_period", params.time_period);
      return request<NarrativeInsightItem[]>(`/api/v1/campus-insights/narrative-insights?${query.toString()}`);
    },
    getFilters: async () => {
      return request<CampusFilterOptions>("/api/v1/campus-insights/filters");
    },
  },

  sync: {
    status: async () => {
      return request<SyncStatusResponse>("/api/v1/sync/status");
    },
    batch: async (data: SyncBatchRequest) => {
      return request<SyncBatchResponse>("/api/v1/sync/batch", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },
};
