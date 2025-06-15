"""
Configuration module tests.
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

def test_channels_page_requires_auth(client):
    """Test channels page requires authentication."""
    response = client.get('/config/channels')
    assert response.status_code == 302  # Redirect to login

def test_channels_page_loads_when_authenticated(client):
    """Test channels page loads when authenticated."""
    # Login first
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/config/channels')
    assert response.status_code == 200
    assert b'Channel Configuration' in response.data