"""
Automated Test Suite for Stage 5: Project Intelligence Engine

Validates:
- 10+ diverse natural language project descriptions across multiple domains
- Deterministic extraction and canonical normalization
- Mandatory benchmark: 'I want to build an AI-based crop disease detection application.'
- Importance classification (MANDATORY vs PREFERRED)
- Suggested team roles synthesis
- NetworkX topological graph generation & centrality
- Missing skills calculation
- Pydantic response validation
"""

import pytest
from ai.project_analyzer import ProjectIntelligenceEngine
from app.schemas.ai import ProjectAnalysisResponse, ProjectAnalysisRequest


@pytest.fixture
def engine():
    return ProjectIntelligenceEngine()


# 10 Diverse Project Ideas covering varied domains and architectures
TEST_PROJECT_SCENARIOS = [
    {
        "id": "agriculture_ai_canonical",
        "name": "AI Crop Disease Detection Application",
        "description": "I want to build an AI-based crop disease detection application.",
        "expected_domain_label": "Agriculture + AI",
        "must_have_skills": [
            "Computer Vision",
            "Deep Learning",
            "Python",
            "Machine Learning",
            "Agriculture",
            "Backend",
            "Frontend",
            "Model Deployment",
        ],
        "mandatory_skills": [
            "Computer Vision",
            "Deep Learning",
            "Python",
            "Machine Learning",
            "Agriculture",
            "Backend",
            "Frontend",
        ],
        "preferred_skills": ["Model Deployment"],
    },
    {
        "id": "robotics_autonomous",
        "name": "Autonomous Drone SLAM Navigation",
        "description": "We need an autonomous drone system using visual SLAM, ROS, and onboard sensor telemetry for navigation in GPS-denied environments.",
        "expected_domains": ["Robotics & Autonomous", "Computer Vision"],
        "must_have_skills": ["ROS & Robotics", "C++", "Embedded Systems", "Computer Vision"],
    },
    {
        "id": "blockchain_fintech",
        "name": "Decentralized P2P Lending Protocol",
        "description": "Developing a decentralized peer-to-peer micro-lending protocol using smart contracts in Solidity with automated escrow and financial risk calculations.",
        "expected_domains": ["Blockchain & Web3", "Fintech & Finance"],
        "must_have_skills": ["Smart Contracts & Solidity", "Financial Modeling", "Cryptography", "Python"],
    },
    {
        "id": "healthcare_ai",
        "name": "Pulmonary Nodule Diagnostic Assistant",
        "description": "Building an AI diagnostic assistant to detect and segment pulmonary nodules from volumetric chest CT scans and radiology reports.",
        "expected_domains": ["Healthcare & Medicine"],
        "must_have_skills": ["Biomedical Data Analysis", "Machine Learning", "Cybersecurity"],
    },
    {
        "id": "web_collaborative",
        "name": "Real-Time Collaborative Code Studio",
        "description": "A real-time collaborative web code editor and studio with synchronized cursor tracking, interactive terminal, and Docker container sandbox.",
        "expected_domains": ["Web & Full-Stack", "Cloud & DevOps"],
        "must_have_skills": ["Frontend", "Backend", "Docker"],
    },
    {
        "id": "ecommerce_marketplace",
        "name": "Campus Peer-to-Peer Secondhand Marketplace",
        "description": "Campus second-hand student marketplace web application with product listings, cart checkout, and escrow payment integration.",
        "expected_domains": ["E-Commerce", "Web & Full-Stack"],
        "must_have_skills": ["Frontend", "Backend", "SQL & Relational Databases", "Payment Integration"],
    },
    {
        "id": "devops_cybersecurity",
        "name": "Kubernetes Automated Security Scanner",
        "description": "An automated container security and vulnerability scanner for Kubernetes clusters and microservices infrastructure.",
        "expected_domains": ["Cybersecurity", "Cloud & DevOps"],
        "must_have_skills": ["Cybersecurity", "Penetration Testing", "Docker", "Kubernetes"],
    },
    {
        "id": "edtech_speech_nlp",
        "name": "Adaptive Speech & NLP Language Tutor",
        "description": "An adaptive speech-enabled language learning tutor app with natural language processing, quiz evaluation, and personalized student feedback.",
        "expected_domains": ["Education & EdTech", "Artificial Intelligence"],
        "must_have_skills": ["Natural Language Processing", "Python", "Frontend"],
    },
    {
        "id": "gaming_3d",
        "name": "Multiplayer 3D Dungeon Arena Game",
        "description": "A 3D multiplayer arena combat game built with Unity, C#, physics engine mechanics, and authoritative client-server networking.",
        "expected_domains": ["Gaming & 3D"],
        "must_have_skills": ["Game Development", "C#", "Computer Graphics"],
    },
    {
        "id": "cleantech_iot",
        "name": "Smart Grid Solar Forecasting & Telemetry",
        "description": "Smart grid solar panel telemetry monitoring platform with IoT sensors, solar yield forecasting, and power distribution optimization.",
        "expected_domains": ["CleanTech & Energy"],
        "must_have_skills": ["IoT & Sensor Telemetry", "Data Science", "Cloud Computing", "Python"],
    },
]


def test_canonical_crop_disease_benchmark(engine):
    """
    Validates the exact user-specified benchmark:
    'I want to build an AI-based crop disease detection application.'
    Domain: Agriculture + AI
    Required skills: Computer Vision, Deep Learning, Python, Machine Learning, Agriculture, Backend, Frontend, Model Deployment
    """
    scenario = TEST_PROJECT_SCENARIOS[0]
    result = engine.analyze_project(scenario["description"])

    # 1. Validate domain
    assert result["domain_label"] == "Agriculture + AI"
    assert "Agriculture" in result["domains"]

    # 2. Extract skill names and importance map
    skill_names = [s["skill_name"] for s in result["required_skills"]]
    importance_map = {s["skill_name"]: s["importance"] for s in result["required_skills"]}

    # Check all required skills exist
    for expected_skill in scenario["must_have_skills"]:
        assert expected_skill in skill_names, f"Expected skill '{expected_skill}' missing from extracted skills: {skill_names}"

    # Check importance levels
    for m_skill in scenario["mandatory_skills"]:
        assert importance_map[m_skill] == "MANDATORY", f"Skill '{m_skill}' should have importance MANDATORY, got {importance_map.get(m_skill)}"

    for p_skill in scenario["preferred_skills"]:
        assert importance_map[p_skill] == "PREFERRED", f"Skill '{p_skill}' should have importance PREFERRED, got {importance_map.get(p_skill)}"

    # 3. Validate Pydantic schema validation
    validated_response = ProjectAnalysisResponse.model_validate(result)
    assert validated_response.domain_label == "Agriculture + AI"
    assert len(validated_response.required_skills) >= 8


@pytest.mark.parametrize("scenario", TEST_PROJECT_SCENARIOS)
def test_all_ten_project_scenarios(engine, scenario):
    """
    Executes and validates the pipeline across all 10 distinct project domains:
    - Structured output
    - Pydantic validation
    - Non-empty domains, skills, roles
    - NetworkX graph generation
    """
    text = scenario["description"]
    result = engine.analyze_project(text)

    # 1. Validate response via Pydantic model
    validated = ProjectAnalysisResponse.model_validate(result)

    assert validated.project_title, f"Project title missing for {scenario['id']}"
    assert validated.project_summary, f"Summary missing for {scenario['id']}"
    assert len(validated.domains) >= 1, f"Domains empty for {scenario['id']}"
    assert validated.domain_label, f"Domain label missing for {scenario['id']}"
    assert validated.complexity in ["INTERMEDIATE", "ADVANCED", "EXPERT"]
    assert validated.suggested_team_size >= 2

    # 2. Validate extracted skills
    extracted_names = [s.skill_name for s in validated.required_skills]
    for required in scenario["must_have_skills"]:
        assert required in extracted_names, f"Skill '{required}' not found for scenario {scenario['id']}. Found: {extracted_names}"

    for skill_item in validated.required_skills:
        assert skill_item.importance in ["MANDATORY", "PREFERRED"]
        assert 0.0 <= skill_item.importance_score <= 1.0
        assert skill_item.required_proficiency in ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]

    # 3. Validate suggested team roles
    assert len(validated.suggested_roles) >= 1
    for role in validated.suggested_roles:
        assert role.role_title
        assert role.description
        assert len(role.associated_skills) >= 1

    # 4. Validate NetworkX graph data
    graph = validated.skill_graph
    assert len(graph.nodes) >= 3  # Hub + at least 1 domain + skills
    assert len(graph.edges) >= 2

    # Verify hub node exists
    hub_nodes = [n for n in graph.nodes if n.node_type == "project"]
    assert len(hub_nodes) == 1
    assert hub_nodes[0].centrality == 1.0

    # Verify centrality values
    for node in graph.nodes:
        assert 0.0 <= node.centrality <= 1.0


def test_missing_skills_calculation(engine):
    """
    Tests gap analysis between project requirements and owner skills.
    """
    text = "I want to build an AI-based crop disease detection application."

    # Owner already knows Python and Machine Learning, but lacks Computer Vision & Agriculture
    owner_skills = [
        {"skill_name": "Python", "proficiency": "ADVANCED"},
        {"skill_name": "Machine Learning", "proficiency": "ADVANCED"},
    ]

    result = engine.analyze_project(text, owner_skills=owner_skills)
    missing = result["missing_skills"]

    # Python should NOT be missing
    assert "Python" not in missing
    # Computer Vision and Agriculture SHOULD be missing
    assert "Computer Vision" in missing
    assert "Agriculture" in missing


def test_custom_title_preservation(engine):
    """Verifies that an explicitly provided custom project title is preserved."""
    result = engine.analyze_project(
        text="I want to build an AI-based crop disease detection application.",
        title="AgriScan Pro Enterprise",
    )
    assert result["project_title"] == "AgriScan Pro Enterprise"
    assert result["skill_graph"]["nodes"][0]["label"] == "AgriScan Pro Enterprise"
