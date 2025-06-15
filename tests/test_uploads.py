"""
Upload module tests.
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

def test_mpr_upload_page_requires_auth(client):
    """Test MPR upload page requires authentication."""
    response = client.get('/uploads/mpr')
    assert response.status_code == 302  # Redirect to login

def test_internal_upload_page_requires_auth(client):
    """Test internal upload page requires authentication."""
    response = client.get('/uploads/internal')
    assert response.status_code == 302  # Redirect to login

def test_bank_statement_upload_page_requires_auth(client):
    """Test bank statement upload page requires authentication."""
    response = client.get('/uploads/bank-statement')
    assert response.status_code == 302  # Redirect to login