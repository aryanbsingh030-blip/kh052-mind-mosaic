/**
 * Bundled offline seed data snapshot for AI Skill Exchange.
 * Allows the application to initialize with full campus data when offline.
 */

export interface OfflineSeedData {
  skills: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
  }>;
  profiles: Array<{
    id: string;
    user_id: string;
    full_name: string;
    department: string;
    year_of_study: string;
    bio: string;
    credit_balance: number;
  }>;
  student_skills: Array<{
    id: string;
    student_id: string;
    skill_id: string;
    direction: "TEACH" | "LEARN";
    proficiency_level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
    years_experience: number;
  }>;
  projects: Array<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    category: string;
    max_members: number;
    created_at: string;
  }>;
}

export const OFFLINE_SEED_DATA: OfflineSeedData = {
  skills: [
    { id: "sk-1", name: "Python", category: "Programming", description: "General-purpose programming and data scripting" },
    { id: "sk-2", name: "Machine Learning", category: "AI/ML", description: "Supervised and unsupervised learning with scikit-learn" },
    { id: "sk-3", name: "FastAPI", category: "Web Development", description: "High performance asynchronous API development" },
    { id: "sk-4", name: "React.js", category: "Web Development", description: "Modern UI component development" },
    { id: "sk-5", name: "AWS Cloud Architecture", category: "Cloud", description: "Cloud computing, EC2, S3, and serverless" },
    { id: "sk-6", name: "Data Visualization", category: "Data Science", description: "Visualizing analytics with D3, Plotly, and Matplotlib" },
    { id: "sk-7", name: "Deep Learning", category: "AI/ML", description: "Neural networks with PyTorch and TensorFlow" },
    { id: "sk-8", name: "Docker & Containers", category: "DevOps", description: "Containerizing services and multi-stage builds" },
    { id: "sk-9", name: "PostgreSQL", category: "Programming", description: "Relational database management and query tuning" },
    { id: "sk-10", name: "UI Design & Wireframing", category: "UI/UX", description: "User interface design in Figma" },
    { id: "sk-11", name: "TypeScript", category: "Programming", description: "Typed JavaScript development" },
    { id: "sk-12", name: "Cybersecurity Basics", category: "Cybersecurity", description: "Network security and ethical hacking" },
    { id: "sk-13", name: "Next.js", category: "Web Development", description: "Server-side rendering and full-stack React" },
    { id: "sk-14", name: "NLP & LLM Prompting", category: "AI/ML", description: "Natural language processing and prompt engineering" },
    { id: "sk-15", name: "Mobile App Development", category: "Mobile Development", description: "Cross-platform mobile apps with Flutter/React Native" },
  ],
  profiles: [
    {
      id: "prof-aarav",
      user_id: "u-aarav",
      full_name: "Aarav Sharma",
      department: "Computer Science",
      year_of_study: "Senior",
      bio: "Senior CS student focusing on backend architecture, Python, and distributed systems.",
      credit_balance: 140,
    },
    {
      id: "prof-aisha",
      user_id: "u-aisha",
      full_name: "Aisha Traoré",
      department: "Data Science",
      year_of_study: "Junior",
      bio: "Junior Data Science major passionate about AI ethics, predictive modeling, and data pipelines.",
      credit_balance: 110,
    },
    {
      id: "prof-chen",
      user_id: "u-chen",
      full_name: "Chen Wei",
      department: "Human-Computer Interaction",
      year_of_study: "Sophomore",
      bio: "HCI researcher developing intuitive accessible interfaces and UX design systems.",
      credit_balance: 100,
    },
    {
      id: "prof-diana",
      user_id: "u-diana",
      full_name: "Diana Prince",
      department: "Robotics Engineering",
      year_of_study: "Freshman",
      bio: "First-year robotics enthusiast eager to master machine vision and Python algorithms.",
      credit_balance: 100,
    },
    {
      id: "prof-elena",
      user_id: "u-elena",
      full_name: "Elena Rostova",
      department: "Cybersecurity",
      year_of_study: "Masters",
      bio: "Graduate student specializing in cryptography, secure protocols, and threat modeling.",
      credit_balance: 125,
    },
  ],
  student_skills: [
    { id: "ss-1", student_id: "prof-aarav", skill_id: "sk-1", direction: "TEACH", proficiency_level: "EXPERT", years_experience: 3.5 },
    { id: "ss-2", student_id: "prof-aarav", skill_id: "sk-3", direction: "TEACH", proficiency_level: "ADVANCED", years_experience: 2.0 },
    { id: "ss-3", student_id: "prof-aarav", skill_id: "sk-2", direction: "LEARN", proficiency_level: "BEGINNER", years_experience: 0.5 },
    { id: "ss-4", student_id: "prof-aisha", skill_id: "sk-2", direction: "TEACH", proficiency_level: "ADVANCED", years_experience: 2.5 },
    { id: "ss-5", student_id: "prof-aisha", skill_id: "sk-6", direction: "TEACH", proficiency_level: "ADVANCED", years_experience: 2.0 },
    { id: "ss-6", student_id: "prof-aisha", skill_id: "sk-5", direction: "LEARN", proficiency_level: "BEGINNER", years_experience: 0.0 },
    { id: "ss-7", student_id: "prof-chen", skill_id: "sk-10", direction: "TEACH", proficiency_level: "EXPERT", years_experience: 3.0 },
    { id: "ss-8", student_id: "prof-chen", skill_id: "sk-4", direction: "LEARN", proficiency_level: "INTERMEDIATE", years_experience: 1.0 },
    { id: "ss-9", student_id: "prof-diana", skill_id: "sk-1", direction: "LEARN", proficiency_level: "BEGINNER", years_experience: 0.0 },
    { id: "ss-10", student_id: "prof-diana", skill_id: "sk-2", direction: "LEARN", proficiency_level: "BEGINNER", years_experience: 0.0 },
    { id: "ss-11", student_id: "prof-elena", skill_id: "sk-12", direction: "TEACH", proficiency_level: "EXPERT", years_experience: 4.0 },
    { id: "ss-12", student_id: "prof-elena", skill_id: "sk-14", direction: "LEARN", proficiency_level: "BEGINNER", years_experience: 0.5 },
  ],
  projects: [
    {
      id: "proj-1",
      owner_id: "prof-aarav",
      title: "Campus Autonomous Drone Navigation",
      description: "Building an indoor obstacle avoidance system using computer vision and edge AI.",
      category: "Robotics & AI",
      max_members: 4,
      created_at: new Date().toISOString(),
    },
    {
      id: "proj-2",
      owner_id: "prof-aisha",
      title: "Campus Sustainability Carbon Tracker",
      description: "Developing an interactive student carbon footprint dashboard with predictive analytics.",
      category: "Data Science",
      max_members: 3,
      created_at: new Date().toISOString(),
    },
  ],
};
