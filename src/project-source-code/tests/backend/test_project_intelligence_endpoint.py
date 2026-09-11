"""
Backend Integration Tests for Stage 5: Project Intelligence Endpoints
"""

import pytest


@pytest.mark.asyncio
async def test_analyze_project_direct_endpoint(client):
    """Test primary endpoint: POST /ai/analyze-project with canonical crop disease benchmark."""
    payload = {
        "text": "I want to build an AI-based crop disease detection application."
    }
    response = await client.post("/ai/analyze-project", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["domain_label"] == "Agriculture + AI"
    assert "Agriculture" in data["domains"]

    skills = data["required_skills"]
    assert len(skills) >= 8
    skill_names = [s["skill_name"] for s in skills]

    # Required skills from benchmark
    expected_skills = [
        "Computer Vision",
        "Deep Learning",
        "Python",
        "Machine Learning",
        "Agriculture",
        "Backend",
        "Frontend",
        "Model Deployment",
    ]
    for es in expected_skills:
        assert es in skill_names, f"Expected skill '{es}' not found in API response: {skill_names}"

    # Verify NetworkX graph data in response
    graph = data["skill_graph"]
    assert len(graph["nodes"]) >= 8
    assert len(graph["edges"]) >= 8
    assert any(n["node_type"] == "project" for n in graph["nodes"])


@pytest.mark.asyncio
async def test_analyze_project_v1_endpoint(client):
    """Test versioned alias: POST /api/v1/ai/analyze-project."""
    payload = {
        "text": "Developing an autonomous drone system using visual SLAM, ROS, and onboard sensor telemetry."
    }
    response = await client.post("/api/v1/ai/analyze-project", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert any("Robotics" in d for d in data["domains"])
    assert len(data["suggested_roles"]) >= 1


@pytest.mark.asyncio
async def test_analyze_project_with_description_alias(client):
    """Test flexibility when payload uses 'description' key instead of 'text'."""
    payload = {
        "description": "A real-time collaborative code editor with synchronized cursors and Docker sandbox."
    }
    response = await client.post("/ai/analyze-project", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "project_title" in data
    assert len(data["required_skills"]) > 0


@pytest.mark.asyncio
async def test_analyze_project_empty_fails(client):
    """Test that empty description returns HTTP 400 or 422 validation error."""
    payload = {"text": "   "}
    response = await client.post("/ai/analyze-project", json=payload)
    assert response.status_code in [400, 422]
