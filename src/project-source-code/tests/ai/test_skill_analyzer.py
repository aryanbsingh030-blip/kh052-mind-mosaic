"""
Automated Tests for Stage 3: AI Skill Intelligence Engine
Covers multi-domain extraction benchmarks, proficiency estimation,
hierarchy inference, and offline/fallback resilience.
"""

import pytest
from ai.engine import SkillIntelligenceEngine
from ai.providers.base import AIProvider, ExtractedSkillItem
from ai.providers.rule_based import RuleBasedFallbackProvider
from ai.providers.local_ai import LocalAIProvider
from ai.providers.online_ai import OnlineAIProvider
from ai.pipeline import SkillNormalizationPipeline


@pytest.fixture
def engine():
    return SkillIntelligenceEngine()


@pytest.mark.asyncio
async def test_aiml_plant_disease_benchmark(engine):
    """
    Test the canonical AI/ML benchmark:
    'I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask.'
    Expected:
    - Python -> ADVANCED
    - TensorFlow -> INTERMEDIATE
    - Deep Learning -> INTERMEDIATE
    - CNN / Convolutional Neural Networks -> INTERMEDIATE
    - Computer Vision -> INTERMEDIATE
    - Machine Learning -> INTERMEDIATE
    - Flask -> INTERMEDIATE
    - Model Deployment -> BEGINNER
    """
    text = "I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask."
    res = await engine.analyze_skills(text)
    skills = res["skills"]
    skill_map = {s.skill_name: s for s in skills}

    # Verify all expected skills are present
    assert "Python" in skill_map
    assert skill_map["Python"].proficiency == "ADVANCED"
    assert skill_map["Python"].confidence >= 0.85

    assert "TensorFlow" in skill_map
    assert skill_map["TensorFlow"].proficiency == "INTERMEDIATE"

    assert "Convolutional Neural Networks" in skill_map
    assert skill_map["Convolutional Neural Networks"].proficiency == "INTERMEDIATE"

    assert "Deep Learning" in skill_map
    assert skill_map["Deep Learning"].source == "hierarchy_inferred"

    assert "Computer Vision" in skill_map
    assert skill_map["Computer Vision"].source == "hierarchy_inferred"

    assert "Machine Learning" in skill_map
    assert skill_map["Machine Learning"].source == "hierarchy_inferred"

    assert "Flask" in skill_map
    assert skill_map["Flask"].proficiency == "INTERMEDIATE"

    assert "Model Deployment" in skill_map
    assert skill_map["Model Deployment"].proficiency == "BEGINNER"

    # Verify all skills have evidence and confidence
    for s in skills:
        assert s.evidence is not None and len(s.evidence) > 0
        assert 0.0 <= s.confidence <= 1.0


@pytest.mark.asyncio
async def test_web_development_domain(engine):
    """Test extraction across web development and full-stack stack."""
    text = "Developed a responsive full-stack e-commerce web app using React, TypeScript, Next.js, Node.js, and PostgreSQL with Tailwind CSS."
    res = await engine.analyze_skills(text)
    skill_names = {s.skill_name for s in res["skills"]}

    assert "React" in skill_names
    assert "TypeScript" in skill_names
    assert "Next.js" in skill_names
    assert "Node.js Backend Architecture" in skill_names or any("Node" in s for s in skill_names)
    assert "PostgreSQL Database Design" in skill_names or any("Postgre" in s for s in skill_names)
    assert "Tailwind CSS" in skill_names


@pytest.mark.asyncio
async def test_cybersecurity_domain(engine):
    """Test extraction across cybersecurity, penetration testing, and network analysis."""
    text = "Conducted network penetration testing using Wireshark, Metasploit, and Linux to identify CVE vulnerabilities and secure firewalls."
    res = await engine.analyze_skills(text)
    skill_names = {s.skill_name for s in res["skills"]}

    assert any("Penetration Testing" in s for s in skill_names)
    assert any("Ethical Hacking" in s for s in skill_names)
    assert any("Network Security" in s for s in skill_names)
    assert any("Linux" in s for s in skill_names)
    assert any("Vulnerability" in s for s in skill_names)


@pytest.mark.asyncio
async def test_ui_ux_domain(engine):
    """Test extraction across UI/UX design and prototyping."""
    text = "Designed mobile app wireframes and interactive prototypes in Figma, conducted user research and usability testing."
    res = await engine.analyze_skills(text)
    skill_names = {s.skill_name for s in res["skills"]}

    assert any("Figma" in s for s in skill_names)
    assert any("Wireframing" in s or "UI/UX" in s for s in skill_names)


@pytest.mark.asyncio
async def test_data_science_domain(engine):
    """Test extraction across data science packages and visualization."""
    text = "Analyzed customer churn datasets using Pandas, NumPy, and Scikit-learn, visualized feature distributions with Matplotlib."
    res = await engine.analyze_skills(text)
    skill_names = {s.skill_name for s in res["skills"]}

    assert any("Pandas" in s for s in skill_names)
    assert any("NumPy" in s for s in skill_names)
    assert any("Scikit-Learn" in s for s in skill_names)
    assert any("Matplotlib" in s for s in skill_names)


@pytest.mark.asyncio
async def test_cloud_devops_domain(engine):
    """Test extraction across cloud infrastructure and DevOps."""
    text = "Configured AWS VPC, deployed microservices with Docker and Kubernetes, automated CI/CD pipelines with GitHub Actions."
    res = await engine.analyze_skills(text)
    skill_names = {s.skill_name for s in res["skills"]}

    assert any("AWS" in s for s in skill_names)
    assert any("Docker" in s for s in skill_names)
    assert any("Kubernetes" in s for s in skill_names)
    assert any("CI/CD" in s for s in skill_names)


@pytest.mark.asyncio
async def test_online_ai_unavailable_fallback():
    """Simulate online cloud AI failing/offline; verify rule-based fallback takes over."""
    failing_online_provider = OnlineAIProvider(api_key="sk-test-fake-key")
    pipeline = SkillNormalizationPipeline(fallback_provider=RuleBasedFallbackProvider())

    res = await pipeline.process(
        raw_text="I built a CNN model for plant disease classification using Python and TensorFlow.",
        provider=failing_online_provider,
    )

    assert "rule_based_fallback" in res["provider_used"]
    assert len(res["skills"]) > 0
    skill_names = {s.skill_name for s in res["skills"]}
    assert "Python" in skill_names
    assert "Convolutional Neural Networks" in skill_names


@pytest.mark.asyncio
async def test_local_ai_unavailable_fallback():
    """Simulate local Ollama daemon being down; verify rule-based fallback takes over immediately."""
    offline_local_provider = LocalAIProvider(endpoint="http://127.0.0.1:99999")
    pipeline = SkillNormalizationPipeline(fallback_provider=RuleBasedFallbackProvider())

    res = await pipeline.process(
        raw_text="Deployed microservices with Docker and Kubernetes.",
        provider=offline_local_provider,
    )

    assert "rule_based_fallback" in res["provider_used"]
    assert len(res["skills"]) > 0
    skill_names = {s.skill_name for s in res["skills"]}
    assert any("Docker" in s for s in skill_names)


@pytest.mark.asyncio
async def test_internet_unavailable_offline_operation():
    """Simulate complete internet disconnection; verify fallback functions 100% offline."""
    fallback_provider = RuleBasedFallbackProvider()
    assert await fallback_provider.is_available() is True

    skills = await fallback_provider.extract_skills(
        "I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask."
    )
    assert len(skills) >= 6
    names = {s.skill_name for s in skills}
    assert "Python" in names
    assert "TensorFlow" in names
    assert "Deep Learning" in names


@pytest.mark.asyncio
async def test_ai_api_endpoint(client):
    """Test POST /api/v1/ai/analyze-skills and /ai/analyze-skills via FastAPI."""
    payload = {
        "text": "I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask.",
        "direction": "TEACH"
    }

    # Test /api/v1/ai/analyze-skills
    res_v1 = await client.post("/api/v1/ai/analyze-skills", json=payload)
    assert res_v1.status_code == 200
    data = res_v1.json()
    assert "provider_used" in data
    assert len(data["skills"]) >= 6

    # Test /ai/analyze-skills
    res_direct = await client.post("/ai/analyze-skills", json=payload)
    assert res_direct.status_code == 200

    # Test empty text validation
    empty_res = await client.post("/api/v1/ai/analyze-skills", json={"text": "   "})
    assert empty_res.status_code == 422 or empty_res.status_code == 400
