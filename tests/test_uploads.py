"""
Upload module tests.
"""
import pytest
import tempfile
import os
from app import create_app
from app.uploads.models import FileUploadHandler, MPRProcessor

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

def test_mpr_upload_page_loads_when_authenticated(client):
    """Test MPR upload page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/uploads/mpr')
    assert response.status_code == 200
    assert b'MPR File Upload' in response.data

def test_upload_history_page_loads(client):
    """Test upload history page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/uploads/history')
    assert response.status_code == 200
    assert b'Upload History' in response.data

def test_file_upload_handler():
    """Test FileUploadHandler functionality."""
    with tempfile.TemporaryDirectory() as temp_dir:
        handler = FileUploadHandler(temp_dir)
        
        # Test allowed file extensions
        assert handler.allowed_file('test.csv') == True
        assert handler.allowed_file('test.xlsx') == True
        assert handler.allowed_file('test.xls') == True
        assert handler.allowed_file('test.txt') == False
        assert handler.allowed_file('test') == False

def test_mpr_upload_form_validation(client):
    """Test MPR upload form validation."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test missing channel
    response = client.post('/uploads/mpr', data={
        'channel_id': '',
    })
    assert response.status_code == 200
    assert b'Please select a channel' in response.data
    
    # Test missing file
    response = client.post('/uploads/mpr', data={
        'channel_id': '1',
    })
    assert response.status_code == 200
    assert b'Please select a file' in response.data

def test_internal_upload_page_requires_auth(client):
    """Test internal upload page requires authentication."""
    response = client.get('/uploads/internal')
    assert response.status_code == 302  # Redirect to login

def test_bank_statement_upload_page_requires_auth(client):
    """Test bank statement upload page requires authentication."""
    response = client.get('/uploads/bank-statement')
    assert response.status_code == 302  # Redirect to login