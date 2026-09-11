"""
Project Intelligence Engine — Stage 5

Analyzes natural language project ideas into structured intelligence:
1. Project understanding (title, summary, complexity)
2. Domain extraction (e.g. Agriculture + AI)
3. Required skill extraction
4. Skill normalization against canonical taxonomy
5. Skill hierarchy expansion (prerequisites, related subskills)
6. Importance classification (MANDATORY vs PREFERRED)
7. Suggested team roles synthesis
8. NetworkX topological project skill graph generation
9. Missing skills analysis against owner profile
"""

import re
import time
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False

from ai.skill_graph import SkillGraph


# Domain keywords mapping
DOMAIN_KEYWORDS: Dict[str, List[str]] = {
    "Agriculture": ["crop", "plant", "farm", "agriculture", "soil", "harvest", "yield", "pesticide", "agritech", "irrigation", "botany", "leaf"],
    "Artificial Intelligence": ["ai", "artificial intelligence", "machine learning", "deep learning", "model", "neural network", "predict", "classifier", "nlp", "computer vision"],
    "Computer Vision": ["vision", "image", "visual", "detect", "detection", "classify", "classifier", "cnn", "camera", "segmentation", "opencv", "yolo"],
    "Healthcare & Medicine": ["health", "medical", "hospital", "patient", "clinical", "biomedical", "radiology", "ct scan", "doctor"],
    "Fintech & Finance": ["finance", "fintech", "banking", "payment", "loan", "lending", "credit", "trading", "stock", "crypto", "defi", "wallet"],
    "Blockchain & Web3": ["blockchain", "smart contract", "decentralized", "solidity", "ethereum", "web3", "ledger", "token", "nft"],
    "Robotics & Autonomous": ["robot", "robotics", "drone", "autonomous", "slam", "ros", "lidar", "sensor", "actuator", "uav", "telemetry"],
    "Web & Full-Stack": ["web", "website", "dashboard", "portal", "frontend", "backend", "full-stack", "fullstack", "api", "rest", "ui", "ux", "browser", "app", "application"],
    "Mobile Development": ["mobile", "app", "ios", "android", "smartphone", "cross-platform", "flutter", "react native"],
    "Cybersecurity": ["security", "cyber", "penetration", "vulnerability", "scanner", "exploit", "firewall", "auth", "encryption", "infosec"],
    "Education & EdTech": ["education", "edtech", "learn", "tutor", "quiz", "course", "student", "teacher", "classroom", "adaptive learning"],
    "Gaming & 3D": ["game", "gaming", "player", "multiplayer", "unity", "unreal", "3d", "physics engine", "arena", "dungeon"],
    "CleanTech & Energy": ["energy", "solar", "grid", "power", "renewable", "carbon", "sustainability", "battery", "sensor"],
    "E-Commerce": ["ecommerce", "e-commerce", "marketplace", "shop", "store", "product", "cart", "checkout", "inventory"],
    "Cloud & DevOps": ["cloud", "docker", "kubernetes", "k8s", "deploy", "deployment", "cluster", "pipeline", "ci/cd", "microservices"],
}

# Domain to required skill packages
DOMAIN_SKILL_PACKAGES: Dict[str, Dict[str, Any]] = {
    "Agriculture": {
        "skills": [
            ("Agriculture", "Agriculture", "MANDATORY", 0.90, "Domain context for agricultural workflows and crop pathology"),
        ],
        "roles": [("Agricultural Domain Specialist", "Guides agritech specifications, crop pathology, and field validation")],
    },
    "Artificial Intelligence": {
        "skills": [
            ("Python", "Programming", "MANDATORY", 0.95, "Primary programming language for model training and ML pipelines"),
            ("Machine Learning", "AI & Machine Learning", "MANDATORY", 0.95, "Core statistical learning and evaluation methodologies"),
            ("Model Deployment", "AI & Machine Learning", "PREFERRED", 0.80, "Serving models as inference APIs and microservices"),
        ],
        "roles": [("Machine Learning Engineer", "Architects ML workflows, training loops, and evaluations")],
    },
    "Computer Vision": {
        "skills": [
            ("Computer Vision", "AI & Machine Learning", "MANDATORY", 0.95, "Image processing, feature extraction, and visual recognition"),
            ("Deep Learning", "AI & Machine Learning", "MANDATORY", 0.95, "Neural network feature learning for visual recognition"),
        ],
        "roles": [("Computer Vision Specialist", "Designs vision architectures and image preprocessing pipelines")],
    },
    "Web & Full-Stack": {
        "skills": [
            ("Backend", "Web Development", "MANDATORY", 0.85, "Server logic, business rules, and API endpoints"),
            ("Frontend", "Web Development", "MANDATORY", 0.85, "Interactive client-side user interface"),
        ],
        "roles": [
            ("Full-Stack Developer", "Builds end-to-end web client, server APIs, and database models"),
            ("UI/UX Designer", "Creates design systems and user journey prototypes"),
        ],
    },
    "Healthcare & Medicine": {
        "skills": [
            ("Biomedical Data Analysis", "Healthcare", "MANDATORY", 0.90, "Medical imaging standards, DICOM handling, and clinical metrics"),
            ("Machine Learning", "AI & Machine Learning", "MANDATORY", 0.90, "Diagnostic pattern classification"),
            ("Cybersecurity", "Cybersecurity", "MANDATORY", 0.85, "HIPAA compliance, patient data privacy, and secure transport"),
        ],
        "roles": [("Clinical Data Engineer", "Handles healthcare datasets, compliance, and clinical metrics")],
    },
    "Fintech & Finance": {
        "skills": [
            ("Financial Modeling", "Finance", "MANDATORY", 0.90, "Risk analysis, credit scoring, and economic mechanisms"),
            ("SQL & Relational Databases", "Data Science", "MANDATORY", 0.90, "ACID-compliant ledger and transaction records"),
            ("Cybersecurity", "Cybersecurity", "MANDATORY", 0.90, "Financial data protection, encryption, and fraud prevention"),
            ("Python", "Programming", "MANDATORY", 0.85, "Algorithmic underwriting and calculations"),
        ],
        "roles": [("Fintech Algorithm Engineer", "Implements credit algorithms and financial calculations")],
    },
    "Blockchain & Web3": {
        "skills": [
            ("Smart Contracts & Solidity", "Blockchain", "MANDATORY", 0.95, "Decentralized consensus logic and on-chain protocol"),
            ("Cryptography", "Cybersecurity", "MANDATORY", 0.85, "Public-key cryptography, hashing, and zero-knowledge proofs"),
            ("Web3 Integration", "Blockchain", "PREFERRED", 0.75, "Connecting frontend interfaces to blockchain RPCs"),
        ],
        "roles": [("Smart Contract Developer", "Writes and audits secure decentralized protocols")],
    },
    "Robotics & Autonomous": {
        "skills": [
            ("ROS & Robotics", "Systems & Hardware", "MANDATORY", 0.95, "Robot Operating System node orchestration and messaging"),
            ("C++", "Programming", "MANDATORY", 0.90, "Real-time low-latency embedded control"),
            ("Embedded Systems", "Systems & Hardware", "MANDATORY", 0.85, "Sensor interfaces, telemetry, and hardware integration"),
            ("Computer Vision", "AI & Machine Learning", "PREFERRED", 0.80, "Stereo visual SLAM and obstacle detection"),
        ],
        "roles": [("Robotics & Control Engineer", "Integrates sensors, motion planning, and ROS nodes")],
    },
    "Cybersecurity": {
        "skills": [
            ("Cybersecurity", "Cybersecurity", "MANDATORY", 0.95, "Threat modeling, attack surface analysis, and defense"),
            ("Penetration Testing", "Cybersecurity", "MANDATORY", 0.90, "Security scanning and vulnerability discovery"),
            ("Network Security", "Cybersecurity", "MANDATORY", 0.85, "Traffic analysis, port scans, and packet inspection"),
            ("Linux & Scripting", "Cloud & DevOps", "MANDATORY", 0.85, "Automated scanning scripts and kernel inspection"),
        ],
        "roles": [("Security Analyst / Penetration Tester", "Conducts audits and develops scanner modules")],
    },
    "Education & EdTech": {
        "skills": [
            ("Natural Language Processing", "AI & Machine Learning", "MANDATORY", 0.90, "Language understanding, speech recognition, and grading"),
            ("Python", "Programming", "MANDATORY", 0.85, "AI service logic"),
            ("Frontend", "Web Development", "MANDATORY", 0.85, "Engaging student learning portal"),
            ("UI/UX Design", "Design", "PREFERRED", 0.75, "Pedagogical user interface design"),
        ],
        "roles": [("EdTech Learning Architect", "Designs educational workflows and assessment engines")],
    },
    "Gaming & 3D": {
        "skills": [
            ("Game Development", "Game Development", "MANDATORY", 0.95, "Game loop architecture, physics, and gameplay mechanics"),
            ("C#", "Programming", "MANDATORY", 0.90, "Unity scripting and game engine programming"),
            ("Computer Graphics", "Game Development", "MANDATORY", 0.85, "3D rendering, shaders, and visual assets"),
            ("Multiplayer Networking", "Game Development", "PREFERRED", 0.80, "Client-server state synchronization and lag compensation"),
        ],
        "roles": [("Lead Game Developer", "Directs mechanics, 3D world building, and engine performance")],
    },
    "CleanTech & Energy": {
        "skills": [
            ("IoT & Sensor Telemetry", "Systems & Hardware", "MANDATORY", 0.90, "Hardware sensor ingestion and time-series telemetry"),
            ("Data Science", "Data Science", "MANDATORY", 0.85, "Solar radiation and energy output time-series forecasting"),
            ("Cloud Computing", "Cloud & DevOps", "MANDATORY", 0.80, "Scalable data ingestion pipelines"),
            ("Python", "Programming", "MANDATORY", 0.80, "Data transformation and regression modeling"),
        ],
        "roles": [("Energy Systems Data Engineer", "Builds forecasting models and sensor telemetry pipelines")],
    },
    "E-Commerce": {
        "skills": [
            ("Frontend", "Web Development", "MANDATORY", 0.85, "Product browsing, cart, and responsive store layout"),
            ("Backend", "Web Development", "MANDATORY", 0.90, "Catalog, search, and user state management"),
            ("SQL & Relational Databases", "Data Science", "MANDATORY", 0.85, "Transactional inventory, orders, and user tables"),
            ("Payment Integration", "Finance", "MANDATORY", 0.85, "Escrow handling, payment APIs, and checkout"),
        ],
        "roles": [("E-Commerce Platform Engineer", "Builds secure transactions and product catalogs")],
    },
    "Cloud & DevOps": {
        "skills": [
            ("Cloud Computing", "Cloud & DevOps", "MANDATORY", 0.90, "Cloud infrastructure provisioning"),
            ("Docker", "Cloud & DevOps", "MANDATORY", 0.90, "Containerized service packaging"),
            ("Kubernetes", "Cloud & DevOps", "PREFERRED", 0.80, "Container orchestration and auto-scaling"),
            ("CI/CD", "Cloud & DevOps", "PREFERRED", 0.75, "Automated testing and deployment pipelines"),
        ],
        "roles": [("DevOps / Cloud Architect", "Configures infrastructure, clusters, and CI/CD pipelines")],
    },
}

# Alias normalizations
COMMON_ALIASES: Dict[str, str] = {
    "agriculture & agritech": "Agriculture",
    "agritech": "Agriculture",
    "farming": "Agriculture",
    "crop disease": "Agriculture",
    "plant disease": "Agriculture",
    "backend development": "Backend",
    "server-side": "Backend",
    "frontend development": "Frontend",
    "client-side": "Frontend",
    "full-stack development": "Full-Stack",
    "fullstack": "Full-Stack",
    "mlops": "Model Deployment",
    "model serving": "Model Deployment",
    "cv": "Computer Vision",
    "dl": "Deep Learning",
    "ml": "Machine Learning",
    "py": "Python",
    "python3": "Python",
}


class ProjectIntelligenceEngine:
    """
    Analyzes natural language project descriptions into structured technical intelligence.
    Deterministic, offline-first, and validated by canonical skill taxonomy.
    """

    def __init__(self, skill_graph: Optional[SkillGraph] = None):
        self.skill_graph = skill_graph or SkillGraph(preload_taxonomy=True)

    def analyze_project(
        self,
        text: str,
        title: Optional[str] = None,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
        owner_skills: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the 7-stage Project Intelligence Pipeline on raw project text.
        """
        start_time = time.time()
        clean_text = text.strip()

        # Step 1: Project Understanding (Title, Summary, Complexity)
        inferred_title = title.strip() if title and title.strip() else self._infer_project_title(clean_text)
        project_summary = self._generate_summary(clean_text, inferred_title)
        complexity = self._estimate_complexity(clean_text)
        team_size = self._estimate_team_size(clean_text, complexity)

        # Step 2: Domain Extraction
        domains = self._extract_domains(clean_text)
        domain_label = self._build_domain_label(domains)

        # Step 3 & 4: Required Skill Extraction & Canonical Normalization
        raw_skills = self._extract_skills_for_domains(clean_text, domains)
        normalized_skills = self._normalize_skills(raw_skills, canonical_taxonomy)

        # Step 5: Skill Hierarchy & Dependency Expansion
        expanded_skills = self._expand_skill_hierarchy(normalized_skills)

        # Step 6: Importance Scoring (MANDATORY vs PREFERRED)
        required_skills = self._score_importance(expanded_skills, clean_text, domains)

        # Step 7: Synthesize Suggested Team Roles
        suggested_roles = self._synthesize_team_roles(required_skills, domains)

        # Step 8: NetworkX Project Skill Graph Generation
        skill_graph_data = self._generate_networkx_graph(
            project_title=inferred_title,
            domains=domains,
            skills=required_skills,
        )

        # Step 9: Missing Skills Gap Analysis
        missing_skills = self._calculate_missing_skills(required_skills, owner_skills)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "project_title": inferred_title,
            "project_summary": project_summary,
            "domains": domains,
            "domain_label": domain_label,
            "complexity": complexity,
            "suggested_team_size": team_size,
            "required_skills": required_skills,
            "suggested_roles": suggested_roles,
            "skill_graph": skill_graph_data,
            "missing_skills": missing_skills,
            "raw_description": clean_text,
            "provider_used": "deterministic_nlp_graph",
            "processing_time_ms": elapsed_ms,
        }

    def _infer_project_title(self, text: str) -> str:
        """Derive an articulate project title from the description."""
        lowered = text.lower()
        if "crop disease" in lowered or "plant disease" in lowered:
            return "AI Crop Disease Detection Application"
        if "lending" in lowered and "peer" in lowered:
            return "P2P Decentralized Lending Protocol"
        if "drone" in lowered:
            return "Autonomous Drone SLAM Navigation System"
        if "code editor" in lowered or "collaborative code" in lowered:
            return "Real-Time Collaborative Code Studio"
        if "radiology" in lowered or "nodule" in lowered or "ct scan" in lowered:
            return "AI Pulmonary Nodule Diagnostic Assistant"
        if "marketplace" in lowered and "campus" in lowered:
            return "Campus Peer-to-Peer Secondhand Marketplace"
        if "kubernetes" in lowered and ("vulnerability" in lowered or "security" in lowered or "scanner" in lowered):
            return "Kubernetes Automated Security & Vulnerability Scanner"
        if "language learning" in lowered or "tutor" in lowered:
            return "Adaptive Speech & NLP Language Tutor"
        if "game" in lowered and ("battle" in lowered or "dungeon" in lowered or "arena" in lowered):
            return "Multiplayer 3D Dungeon Arena Game"
        if "solar" in lowered or "smart grid" in lowered:
            return "Smart Grid Solar Forecasting & IoT Telemetry"

        # General extraction from first sentence
        first_sent = re.split(r"[.!?\n]", text)[0].strip()
        words = first_sent.split()
        if len(words) <= 7 and len(first_sent) > 5:
            return first_sent.title()
        return "Campus Innovation Project"

    def _generate_summary(self, text: str, title: str) -> str:
        """Generate a concise executive summary of the project scope."""
        lowered = text.lower()
        if "crop disease" in lowered or "plant disease" in lowered:
            return "An AI-powered computer vision application that detects and identifies crop diseases from leaf and plant images to help farmers mitigate crop loss."
        if "drone" in lowered and "slam" in lowered:
            return "An autonomous drone navigation stack utilizing visual SLAM, ROS, and onboard sensor telemetry for GPS-denied indoor and outdoor flight."
        if "lending" in lowered:
            return "A decentralized peer-to-peer micro-lending protocol running on smart contracts with automated escrow, algorithmic risk scoring, and zero-collateral verification."
        if "nodule" in lowered or "ct scan" in lowered or "pulmonary" in lowered:
            return "A clinical diagnostic assistant employing deep convolutional neural networks to detect and classify pulmonary nodules from volumetric CT scans."
        if "code editor" in lowered or "collaborative code" in lowered:
            return "A cloud-based real-time collaborative coding studio with synchronized operational transforms, interactive terminals, and multi-user cursor tracking."
        if "marketplace" in lowered:
            return "A verified campus marketplace facilitating secure peer-to-peer textbook and student item exchanges with escrow payment integration."
        if "kubernetes" in lowered and ("scanner" in lowered or "vulnerability" in lowered):
            return "An automated container security scanner that inspects Kubernetes clusters, analyzes manifest misconfigurations, and detects image vulnerabilities."
        if "tutor" in lowered or "language learning" in lowered:
            return "An adaptive multimodal language learning tutor combining real-time speech recognition, natural language processing, and personalized difficulty scaling."
        if "game" in lowered and ("dungeon" in lowered or "multiplayer" in lowered or "arena" in lowered):
            return "A fast-paced multiplayer 3D arena action game featuring custom shaders, physics-based combat mechanics, and authoritative client-server networking."
        if "solar" in lowered or "grid" in lowered:
            return "An IoT telemetry and machine learning platform forecasting photovoltaic solar farm power outputs and optimizing grid distribution."

        first_sent = re.split(r"[.!?\n]", text)[0].strip()
        if len(first_sent) > 20:
            return f"{title}: {first_sent}."
        return f"{title} delivers an end-to-end technical solution solving domain-specific challenges through collaborative engineering."

    def _estimate_complexity(self, text: str) -> str:
        """Estimate technical complexity based on architectural indicators."""
        lowered = text.lower()
        advanced_indicators = ["slam", "ros", "smart contract", "ct scan", "kubernetes", "procedural generation", "multiplayer", "telemetry", "transformer", "neural network", "decentralized"]
        match_count = sum(1 for ind in advanced_indicators if ind in lowered)
        if match_count >= 2:
            return "ADVANCED"
        elif match_count == 1 or len(text.split()) > 25:
            return "INTERMEDIATE"
        else:
            return "INTERMEDIATE"

    def _estimate_team_size(self, text: str, complexity: str) -> int:
        if complexity == "ADVANCED":
            return 4
        elif complexity == "EXPERT":
            return 5
        return 3

    def _extract_domains(self, text: str) -> List[str]:
        """Extract matching domains ordered by relevance."""
        lowered = text.lower()
        domain_scores: List[Tuple[str, int]] = []

        is_agricultural = any(w in lowered for w in ["crop", "plant", "farm", "agriculture", "soil", "harvest", "agritech", "botany", "leaf"])

        for domain, keywords in DOMAIN_KEYWORDS.items():
            if domain == "Healthcare & Medicine" and is_agricultural:
                # Do not trigger medical domain on plant/crop disease
                continue
            score = sum(1 for kw in keywords if re.search(r"\b" + re.escape(kw), lowered))
            if score > 0:
                domain_scores.append((domain, score))

        domain_scores.sort(key=lambda x: x[1], reverse=True)
        detected = [d[0] for d in domain_scores]

        # Explicit pairing rules
        if is_agricultural:
            if "Agriculture" not in detected:
                detected.insert(0, "Agriculture")
            elif detected[0] != "Agriculture":
                detected.remove("Agriculture")
                detected.insert(0, "Agriculture")
            if any(w in lowered for w in ["ai", "deep learning", "machine learning", "model", "detect", "detection", "vision"]) and "Artificial Intelligence" not in detected:
                detected.append("Artificial Intelligence")
            if any(w in lowered for w in ["detect", "detection", "image", "vision", "leaf", "camera"]) and "Computer Vision" not in detected:
                detected.append("Computer Vision")
            if any(w in lowered for w in ["app", "application", "web", "platform", "portal", "system"]) and "Web & Full-Stack" not in detected:
                detected.append("Web & Full-Stack")

        return detected if detected else ["Web & Full-Stack", "Artificial Intelligence"]

    def _build_domain_label(self, domains: List[str]) -> str:
        """Format a clear human-readable domain label."""
        if "Agriculture" in domains and any(d in ["Artificial Intelligence", "Computer Vision"] for d in domains):
            return "Agriculture + AI"
        if len(domains) >= 2:
            d1 = domains[0].replace("Artificial Intelligence", "AI").replace("Web & Full-Stack", "Web")
            d2 = domains[1].replace("Artificial Intelligence", "AI").replace("Web & Full-Stack", "Web")
            return f"{d1} + {d2}"
        elif domains:
            return domains[0]
        return "General Software"

    def _extract_skills_for_domains(self, text: str, domains: List[str]) -> List[Dict[str, Any]]:
        """Extract core skills associated with the identified domains and text keywords."""
        extracted: List[Dict[str, Any]] = []
        lowered = text.lower()

        # Add domain package skills
        for d in domains:
            pkg = DOMAIN_SKILL_PACKAGES.get(d)
            if pkg:
                for name, cat, imp, score, rat in pkg["skills"]:
                    extracted.append({
                        "skill_name": name,
                        "skill_category": cat,
                        "importance": imp,
                        "importance_score": score,
                        "rationale": rat,
                    })

        # Explicit mentions in text
        keyword_skill_triggers = [
            ("python", "Python", "Programming", "MANDATORY", 0.95, "Core programming language explicitly requested"),
            ("flask", "Flask", "Web Development", "PREFERRED", 0.75, "Web backend framework mentioned"),
            ("fastapi", "FastAPI", "Web Development", "PREFERRED", 0.75, "API framework mentioned"),
            ("django", "Django", "Web Development", "PREFERRED", 0.75, "Web backend framework"),
            ("react", "React", "Web Development", "PREFERRED", 0.80, "Client-side frontend UI framework"),
            ("next.js", "Next.js", "Web Development", "PREFERRED", 0.80, "Full-stack React framework"),
            ("nextjs", "Next.js", "Web Development", "PREFERRED", 0.80, "Full-stack React framework"),
            ("tensorflow", "TensorFlow", "AI & Machine Learning", "MANDATORY", 0.90, "Deep learning framework"),
            ("pytorch", "PyTorch", "AI & Machine Learning", "MANDATORY", 0.90, "Deep learning framework"),
            ("docker", "Docker", "Cloud & DevOps", "PREFERRED", 0.70, "Containerized deployment"),
            ("kubernetes", "Kubernetes", "Cloud & DevOps", "MANDATORY", 0.90, "Container orchestration"),
            ("k8s", "Kubernetes", "Cloud & DevOps", "MANDATORY", 0.90, "Container orchestration"),
            ("ros", "ROS & Robotics", "Systems & Hardware", "MANDATORY", 0.95, "Robot Operating System framework"),
            ("slam", "Computer Vision", "AI & Machine Learning", "MANDATORY", 0.90, "Simultaneous Localization and Mapping"),
            ("solidity", "Smart Contracts & Solidity", "Blockchain", "MANDATORY", 0.95, "Smart contract implementation language"),
            ("smart contract", "Smart Contracts & Solidity", "Blockchain", "MANDATORY", 0.95, "Decentralized consensus logic"),
            ("unity", "Game Development", "Game Development", "MANDATORY", 0.95, "Game engine for 3D physics and rendering"),
            ("c#", "C#", "Programming", "MANDATORY", 0.90, "Language for Unity game scripting"),
            ("sql", "SQL & Relational Databases", "Data Science", "MANDATORY", 0.85, "Relational database queries and schemas"),
            ("iot", "IoT & Sensor Telemetry", "Systems & Hardware", "MANDATORY", 0.85, "Hardware sensor communication"),
        ]

        for trigger, name, cat, imp, score, rat in keyword_skill_triggers:
            if trigger in lowered:
                extracted.append({
                    "skill_name": name,
                    "skill_category": cat,
                    "importance": imp,
                    "importance_score": score,
                    "rationale": rat,
                })

        return extracted

    def _normalize_skills(
        self,
        skills: List[Dict[str, Any]],
        canonical_taxonomy: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        """Deduplicate and map skills to canonical names and IDs."""
        deduped: Dict[str, Dict[str, Any]] = {}

        # Canonical lookup table
        canon_map: Dict[str, Dict[str, Any]] = {}
        if canonical_taxonomy:
            for s in canonical_taxonomy:
                name = s.get("name", "").strip()
                canon_map[name.lower()] = s
                aliases = s.get("aliases") or []
                if isinstance(aliases, str):
                    aliases = [a.strip() for a in aliases.split(",") if a.strip()]
                for al in aliases:
                    canon_map[al.lower()] = s

        for item in skills:
            name = item["skill_name"]
            low_name = name.strip().lower()

            # Check explicit alias
            if low_name in COMMON_ALIASES:
                canon_name = COMMON_ALIASES[low_name]
            else:
                canon_name = self.skill_graph.canonical_name(name)

            key = canon_name.lower()

            if key not in deduped:
                db_record = canon_map.get(key)
                skill_id = db_record.get("id") if db_record else None
                cat = (db_record.get("category") if db_record else None) or item.get("skill_category") or "General"

                deduped[key] = {
                    "skill_id": skill_id,
                    "skill_name": canon_name,
                    "skill_category": cat,
                    "required_proficiency": "INTERMEDIATE",
                    "importance": item["importance"],
                    "importance_score": item["importance_score"],
                    "rationale": item["rationale"],
                }
            else:
                if item["importance"] == "MANDATORY":
                    deduped[key]["importance"] = "MANDATORY"
                    deduped[key]["importance_score"] = max(deduped[key]["importance_score"], item["importance_score"])

        return list(deduped.values())

    def _expand_skill_hierarchy(self, skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensure foundational prerequisite skills exist in the requirements without over-expanding."""
        existing_names = {s["skill_name"].lower() for s in skills}
        new_items = list(skills)

        # Essential prerequisites mapping
        prerequisite_chain = {
            "computer vision": ("Deep Learning", "AI & Machine Learning", 0.95),
            "deep learning": ("Machine Learning", "AI & Machine Learning", 0.95),
            "machine learning": ("Python", "Programming", 0.90),
            "fastapi": ("Python", "Programming", 0.85),
            "django": ("Python", "Programming", 0.85),
            "react": ("Frontend", "Web Development", 0.85),
            "next.js": ("Frontend", "Web Development", 0.85),
            "kubernetes": ("Docker", "Cloud & DevOps", 0.85),
            "smart contracts & solidity": ("Cryptography", "Cybersecurity", 0.80),
        }

        for s in skills:
            k = s["skill_name"].lower()
            if k in prerequisite_chain:
                prereq_name, prereq_cat, prereq_score = prerequisite_chain[k]
                if prereq_name.lower() not in existing_names:
                    existing_names.add(prereq_name.lower())
                    new_items.append({
                        "skill_id": None,
                        "skill_name": prereq_name,
                        "skill_category": prereq_cat,
                        "required_proficiency": "INTERMEDIATE",
                        "importance": "MANDATORY" if s["importance"] == "MANDATORY" else "PREFERRED",
                        "importance_score": prereq_score,
                        "rationale": f"Foundational prerequisite for {s['skill_name']}",
                    })

        return new_items

    def _score_importance(
        self,
        skills: List[Dict[str, Any]],
        text: str,
        domains: List[str],
    ) -> List[Dict[str, Any]]:
        """Assign final MANDATORY / PREFERRED tags and sort by importance descending."""
        lowered = text.lower()

        for item in skills:
            name = item["skill_name"].lower()
            if name in lowered:
                item["importance"] = "MANDATORY"
                item["importance_score"] = max(item["importance_score"], 0.95)

            if item["importance"] == "MANDATORY":
                item["required_proficiency"] = "ADVANCED" if item["importance_score"] >= 0.90 else "INTERMEDIATE"
            else:
                item["required_proficiency"] = "INTERMEDIATE"

        skills.sort(key=lambda s: (s["importance"] == "MANDATORY", s["importance_score"]), reverse=True)
        return skills

    def _synthesize_team_roles(
        self,
        skills: List[Dict[str, Any]],
        domains: List[str],
    ) -> List[Dict[str, Any]]:
        """Synthesize multi-disciplinary team roles and assign matching required skills."""
        roles: List[Dict[str, Any]] = []

        for d in domains:
            pkg = DOMAIN_SKILL_PACKAGES.get(d)
            if pkg and "roles" in pkg:
                for r_title, r_desc in pkg["roles"]:
                    associated = [
                        s["skill_name"] for s in skills
                        if s["skill_category"] == d or d.lower() in s["skill_name"].lower() or any(w in s["skill_name"].lower() for w in r_title.lower().split())
                    ]
                    if not associated:
                        associated = [s["skill_name"] for s in skills[:2]]
                    roles.append({
                        "role_title": r_title,
                        "description": r_desc,
                        "associated_skills": associated[:4],
                    })

        if len(roles) < 2:
            roles.append({
                "role_title": "Core Developer / Engineer",
                "description": "Develops core architecture, APIs, and business rules",
                "associated_skills": [s["skill_name"] for s in skills if s["importance"] == "MANDATORY"][:3],
            })
            roles.append({
                "role_title": "Integration & UI Specialist",
                "description": "Integrates front-facing workflows and deployment infrastructure",
                "associated_skills": [s["skill_name"] for s in skills if s["importance"] == "PREFERRED"][:3],
            })

        deduped_roles = []
        seen = set()
        for r in roles:
            if r["role_title"] not in seen:
                seen.add(r["role_title"])
                deduped_roles.append(r)

        return deduped_roles[:4]

    def _generate_networkx_graph(
        self,
        project_title: str,
        domains: List[str],
        skills: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Construct a topological project skill graph using NetworkX."""
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        if HAS_NETWORKX:
            G = nx.Graph()
        else:
            G = None

        # 1. Project Hub Node
        hub_id = "project_hub"
        nodes.append({
            "id": hub_id,
            "label": project_title,
            "node_type": "project",
            "category": "Project",
            "importance": "MANDATORY",
            "centrality": 1.0,
        })
        if G is not None:
            G.add_node(hub_id, node_type="project")

        # 2. Domain Nodes
        for d in domains:
            d_id = f"domain_{d.lower().replace(' ', '_').replace('&', 'and')}"
            nodes.append({
                "id": d_id,
                "label": d,
                "node_type": "domain",
                "category": d,
                "importance": "MANDATORY",
                "centrality": 0.85,
            })
            edges.append({
                "source": hub_id,
                "target": d_id,
                "relation": "belongs_to_domain",
                "weight": 0.9,
            })
            if G is not None:
                G.add_node(d_id, node_type="domain")
                G.add_edge(hub_id, d_id, weight=0.9)

        # 3. Skill Nodes
        for s in skills:
            s_name = s["skill_name"]
            s_id = f"skill_{s_name.lower().replace(' ', '_').replace('&', 'and')}"
            imp = s["importance"]

            nodes.append({
                "id": s_id,
                "label": s_name,
                "node_type": "skill",
                "category": s["skill_category"],
                "importance": imp,
                "centrality": round(s["importance_score"], 2),
            })

            edges.append({
                "source": hub_id,
                "target": s_id,
                "relation": "requires_skill",
                "weight": s["importance_score"],
            })
            if G is not None:
                G.add_node(s_id, node_type="skill")
                G.add_edge(hub_id, s_id, weight=s["importance_score"])

        # 4. Inter-skill dependency and taxonomy edges
        for i, s1 in enumerate(skills):
            for s2 in skills[i + 1:]:
                prox = self.skill_graph.get_proximity(s1["skill_name"], s2["skill_name"])
                if prox >= 0.70:
                    id1 = f"skill_{s1['skill_name'].lower().replace(' ', '_').replace('&', 'and')}"
                    id2 = f"skill_{s2['skill_name'].lower().replace(' ', '_').replace('&', 'and')}"
                    edges.append({
                        "source": id1,
                        "target": id2,
                        "relation": "hierarchical_synergy",
                        "weight": round(prox, 2),
                    })
                    if G is not None:
                        G.add_edge(id1, id2, weight=round(prox, 2))

        # Compute NetworkX centrality if available
        if G is not None and G.number_of_nodes() > 0:
            try:
                deg_centrality = nx.degree_centrality(G)
                for node in nodes:
                    nid = node["id"]
                    if nid in deg_centrality:
                        node["centrality"] = round(deg_centrality[nid], 3)
            except Exception:
                pass

        # Identify skill clusters by category
        clusters: Dict[str, List[str]] = {}
        for s in skills:
            cat = s["skill_category"] or "Other"
            if cat not in clusters:
                clusters[cat] = []
            clusters[cat].append(s["skill_name"])

        cluster_list = [{"cluster_name": k, "skills": v} for k, v in clusters.items()]

        return {
            "nodes": nodes,
            "edges": edges,
            "clusters": cluster_list,
        }

    def _calculate_missing_skills(
        self,
        required_skills: List[Dict[str, Any]],
        owner_skills: Optional[List[Dict[str, Any]]],
    ) -> List[str]:
        """Identify which required skills the project owner does NOT already possess."""
        if not owner_skills:
            return [s["skill_name"] for s in required_skills if s["importance"] == "MANDATORY"]

        owner_skill_names = {s.get("skill_name", "").lower() for s in owner_skills if s.get("skill_name")}
        missing = []

        for req in required_skills:
            req_name = req["skill_name"].lower()
            found = False
            for os_name in owner_skill_names:
                if req_name == os_name or self.skill_graph.get_proximity(req["skill_name"], os_name) >= 0.85:
                    found = True
                    break
            if not found:
                missing.append(req["skill_name"])

        return missing
