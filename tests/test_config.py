"""
Configuration module tests.
"""
import pytest
from app import create_app
from app.config.models import Channel, ChannelConfig

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

def test_add_channel_page_loads(client):
    """Test add channel page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/config/channels/add')
    assert response.status_code == 200
    assert b'Add New Channel' in response.data

def test_add_channel_form_validation(client):
    """Test add channel form validation."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test empty name
    response = client.post('/config/channels/add', data={
        'name': '',
        'description': 'Test description'
    })
    assert response.status_code == 200
    assert b'Channel name is required' in response.data

def test_channel_mapping_page_loads(client):
    """Test channel mapping page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # This would require a test channel to exist
    # For now, test that it redirects properly for non-existent channel
    response = client.get('/config/channels/999/mapping')
    assert response.status_code == 302  # Redirect due to channel not found

def test_channel_model_structure():
    """Test Channel model structure."""
    channel = Channel(1, 'Test Channel', 'Test Description')
    assert channel.id == 1
    assert channel.name == 'Test Channel'
    assert channel.description == 'Test Description'

def test_channel_config_model_structure():
    """Test ChannelConfig model structure."""
    field_mappings = {
        'transaction_id': 'TXN_ID',
        'amount': 'AMOUNT'
    }
    config = ChannelConfig(1, 1, field_mappings, 'CSV')
    assert config.id == 1
    assert config.channel_id == 1
    assert config.field_mappings == field_mappings
    assert config.file_format == 'CSV'