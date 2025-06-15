"""
Reconciliation module tests.
"""
import pytest
from app import create_app

@pytest.fixture
def app():
    """Create test Flask application."""
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()

def test_recon_page_requires_auth(client):
    """Test reconciliation page requires authentication."""
    response = client.get('/recon/')
    assert response.status_code == 302  # Redirect to login