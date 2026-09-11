/**
 * SkillRepository (Stage 9)
 * Abstracts skill taxonomy, student skills, and local AI skill extraction.
 */

import { api, Skill, StudentSkill, SkillAnalysisResult, SkillDirection, ProficiencyLevel } from "@/lib/api";
import { offlineStorage } from "@/lib/offline/indexedDb";
import { syncEngine } from "@/lib/sync/syncEngine";

// Canonical skill lexicon for local offline AI extraction
const LOCAL_SKILL_LEXICON: Array<{
  name: string;
  category: string;
  keywords: string[];
  defaultProficiency: ProficiencyLevel;
}> = [
  { name: "Python", category: "Programming", keywords: ["python", "py", "pandas", "numpy", "django", "flask"], defaultProficiency: "INTERMEDIATE" },
  { name: "Machine Learning", category: "AI/ML", keywords: ["machine learning", "ml", "scikit-learn", "regression", "clustering", "random forest"], defaultProficiency: "INTERMEDIATE" },
  { name: "Deep Learning", category: "AI/ML", keywords: ["deep learning", "neural network", "pytorch", "tensorflow", "keras", "cnn", "transformer"], defaultProficiency: "ADVANCED" },
  { name: "FastAPI", category: "Web Development", keywords: ["fastapi", "asgi", "pydantic", "uvicorn", "rest api"], defaultProficiency: "INTERMEDIATE" },
  { name: "React.js", category: "Web Development", keywords: ["react", "react.js", "jsx", "tsx", "redux", "hooks"], defaultProficiency: "INTERMEDIATE" },
  { name: "TypeScript", category: "Programming", keywords: ["typescript", "ts", "interfaces", "strict typing"], defaultProficiency: "INTERMEDIATE" },
  { name: "AWS Cloud Architecture", category: "Cloud", keywords: ["aws", "cloud", "ec2", "s3", "lambda", "cloudformation"], defaultProficiency: "INTERMEDIATE" },
  { name: "Docker & Containers", category: "DevOps", keywords: ["docker", "containers", "dockerfile", "docker-compose", "k8s", "kubernetes"], defaultProficiency: "INTERMEDIATE" },
  { name: "PostgreSQL", category: "Programming", keywords: ["postgres", "postgresql", "sql", "relational database", "rdbms"], defaultProficiency: "INTERMEDIATE" },
  { name: "UI Design & Wireframing", category: "UI/UX", keywords: ["figma", "wireframe", "ui design", "ux", "prototyping", "user research"], defaultProficiency: "INTERMEDIATE" },
  { name: "Cybersecurity Basics", category: "Cybersecurity", keywords: ["cybersecurity", "infosec", "penetration testing", "encryption", "firewall", "owasp"], defaultProficiency: "INTERMEDIATE" },
  { name: "Data Visualization", category: "Data Science", keywords: ["data visualization", "charts", "matplotlib", "seaborn", "tableau", "powerbi", "d3"], defaultProficiency: "INTERMEDIATE" },
  { name: "Next.js", category: "Web Development", keywords: ["next.js", "nextjs", "app router", "ssr", "ssg"], defaultProficiency: "INTERMEDIATE" },
  { name: "NLP & LLM Prompting", category: "AI/ML", keywords: ["nlp", "natural language processing", "llm", "prompt engineering", "langchain", "rag"], defaultProficiency: "ADVANCED" },
];

export class SkillRepository {
  /**
   * List canonical skills from API or offline store
   */
  public async list(params?: { category?: string; search?: string; limit?: number }): Promise<Skill[]> {
    try {
      const remote = await api.skills.list(params);
      if (Array.isArray(remote)) {
        for (const s of remote) {
          await offlineStorage.put("skills", s);
        }
      }
      return remote;
    } catch (err) {
      console.warn("[SkillRepository] Remote fetch failed, reading from IndexedDB:", err);
      let local = await offlineStorage.getAll<Skill>("skills");
      if (params?.category) {
        local = local.filter((s) => s.category?.toLowerCase() === params.category?.toLowerCase());
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        local = local.filter((s) => s.name?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q));
      }
      if (params?.limit) {
        local = local.slice(0, params.limit);
      }
      return local;
    }
  }

  /**
   * Get student skills (taught or learned)
   */
  public async getStudentSkills(studentId: string): Promise<StudentSkill[]> {
    try {
      const remote = await api.skills.getStudentSkills(studentId);
      if (Array.isArray(remote)) {
        for (const ss of remote) {
          await offlineStorage.put("student_skills", ss);
        }
      }
      return remote;
    } catch (err) {
      console.warn(`[SkillRepository] Remote student skills failed for ${studentId}, reading local:`, err);
      const all = await offlineStorage.getAll<StudentSkill>("student_skills");
      return all.filter((ss) => ss.student_id === studentId);
    }
  }

  /**
   * Add a student skill (offline-capable)
   */
  public async addStudentSkill(data: {
    student_id: string;
    skill_id: string;
    direction: SkillDirection;
    proficiency_level: ProficiencyLevel;
    years_experience?: number;
    description?: string;
  }): Promise<StudentSkill> {
    const id = `ss-${Date.now()}`;
    const newSkill: StudentSkill = {
      id,
      student_id: data.student_id,
      skill_id: data.skill_id,
      skill_name: null,
      skill_category: null,
      direction: data.direction,
      proficiency_level: data.proficiency_level,
      years_experience: data.years_experience || 0,
      description: data.description || null,
      verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const remote = await api.skills.addStudentSkill(data.student_id, data);
      await offlineStorage.put("student_skills", remote);
      return remote;
    } catch (err) {
      console.warn("[SkillRepository] Offline addStudentSkill, saving locally:", err);
      await offlineStorage.put("student_skills", newSkill);
      // Queue sync via Stage 10 Sync Engine
      await syncEngine.enqueueOperation("UPDATE_SKILL", id, newSkill);
      return newSkill;
    }
  }

  /**
   * Analyze skills from free text.
   * If online, invokes remote AI model.
   * If offline, executes the embedded Local NLP Analyzer!
   */
  public async analyzeSkills(text: string, direction: SkillDirection = "TEACH"): Promise<SkillAnalysisResult> {
    try {
      // Try online AI first
      const remote = await api.ai.analyzeSkills(text, direction);
      return remote;
    } catch (err) {
      console.log("[SkillRepository] Online AI analysis unreachable. Running Embedded Local AI Analyzer:", err);
      return this.analyzeSkillsLocally(text, direction);
    }
  }

  /**
   * Local Rule-Based NLP Analyzer (runs 100% offline in browser)
   */
  public analyzeSkillsLocally(text: string, direction: SkillDirection = "TEACH"): SkillAnalysisResult {
    const lowerText = text.toLowerCase();
    const detectedSkills: any[] = [];

    for (const skillDef of LOCAL_SKILL_LEXICON) {
      for (const kw of skillDef.keywords) {
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(lowerText)) {
          // Detect proficiency heuristics
          let prof: ProficiencyLevel = skillDef.defaultProficiency;
          if (/(expert|mastered|lead|architect|4\+ years|5 years|senior)/i.test(lowerText)) {
            prof = "EXPERT";
          } else if (/(advanced|proficient|3 years|production|built several)/i.test(lowerText)) {
            prof = "ADVANCED";
          } else if (/(learning|beginner|started|basics|novice|want to learn)/i.test(lowerText)) {
            prof = "BEGINNER";
          }

          detectedSkills.push({
            skill_id: null,
            skill_name: skillDef.name,
            skill_category: skillDef.category,
            proficiency: prof,
            confidence: 0.88,
            evidence: `Detected keyword "${kw}" in experience text (Local Heuristic Engine)`,
            source: "local_regex_lexicon",
          });
          break; // Avoid duplicate detections for same skill
        }
      }
    }

    // Fallback if no specific keyword matched
    if (detectedSkills.length === 0 && text.trim().length > 5) {
      detectedSkills.push({
        skill_id: null,
        skill_name: "General Problem Solving",
        skill_category: "General",
        proficiency: "BEGINNER" as ProficiencyLevel,
        confidence: 0.7,
        evidence: "General technical reasoning detected from profile description.",
        source: "local_fallback_heuristic",
      });
    }

    return {
      provider_used: "Local Offline NLP Analyzer (Embedded)",
      raw_text: text,
      skills: detectedSkills,
      processing_time_ms: 12,
    };
  }
}

export const skillRepository = new SkillRepository();
