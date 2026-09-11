"""
Tests for the health check endpoint.
"""

import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Health endpoint should return healthy status."""
    response = await client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert data["database"]["status"] == "healthy"
    assert data["database"]["type"] == "sqlite"
    assert data["ai"]["provider"] == "mock"


@pytest.mark.asyncio
async def test_root_endpoint(client):
    """Root endpoint should return app info."""
    response = await client.get("/")
    assert response.status_code == 200

    data = response.json()
    assert data["name"] == "AI Skill Exchange"
    assert "docs" in data
