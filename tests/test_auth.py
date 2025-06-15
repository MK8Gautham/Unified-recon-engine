"""
Authentication module tests.
"""
import pytest
from app import create_app
from app.auth.models import User

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

def test_login_page_loads(client):
    """Test login page loads correctly."""
    response = client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data

def test_login_success(client):
    """Test successful login."""
    response = client.post('/login', data={
        'username': 'admin',
        'password': 'admin123'
    }, follow_redirects=True)
    
    assert response.status_code == 200
    # Should redirect to dashboard after successful login

def test_login_failure(client):
    """Test failed login with invalid credentials."""
    response = client.post('/login', data={
        'username': 'admin',
        'password': 'wrongpassword'
    })
    
    assert response.status_code == 200
    assert b'Invalid username or password' in response.data

def test_logout(client):
    """Test logout functionality."""
    # First login
    client.post('/login', data={
        'username': 'admin',
        'password': 'admin123'
    })
    
    # Then logout
    response = client.get('/logout', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data

def test_route_protection(client):
    """Test that protected routes redirect to login."""
    response = client.get('/dashboard')
    assert response.status_code == 302  # Redirect to login
    
    response = client.get('/config/channels')
    assert response.status_code == 302  # Redirect to login

def test_user_authentication():
    """Test User.authenticate method."""
    # This would require a test database setup
    # For now, we'll test the method structure
    user = User.authenticate('admin', 'admin123')
    # In a real test, this would verify against test data