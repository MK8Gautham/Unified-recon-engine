"""
Reconciliation module tests.
"""
import pytest
from app import create_app
from app.recon.models import ReconciliationEngine, ReconciliationReport

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

def test_recon_dashboard_loads_when_authenticated(client):
    """Test reconciliation dashboard loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/recon/')
    assert response.status_code == 200
    assert b'Reconciliation Dashboard' in response.data

def test_recon_results_page_loads(client):
    """Test reconciliation results page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/recon/results')
    assert response.status_code == 200
    assert b'Reconciliation Results' in response.data

def test_recon_anomalies_page_loads(client):
    """Test reconciliation anomalies page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/recon/anomalies')
    assert response.status_code == 200
    assert b'Reconciliation Anomalies' in response.data

def test_reconciliation_engine_initialization():
    """Test ReconciliationEngine initialization."""
    engine = ReconciliationEngine()
    assert engine.match_tolerance > 0
    assert engine.date_tolerance_days >= 0

def test_reconciliation_report_summary():
    """Test ReconciliationReport.get_summary method."""
    # This would require test database setup
    summary = ReconciliationReport.get_summary()
    assert isinstance(summary, dict)
    assert 'total_matched' in summary
    assert 'total_pending' in summary
    assert 'total_anomalies' in summary
    assert 'anomaly_breakdown' in summary

def test_run_reconciliation_endpoint(client):
    """Test run reconciliation endpoint."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.post('/recon/run')
    assert response.status_code == 302  # Redirect after processing

def test_run_reconciliation_with_date_filter(client):
    """Test run reconciliation with date filter."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.post('/recon/run', data={'date_filter': '2024-01-15'})
    assert response.status_code == 302  # Redirect after processing

def test_run_reconciliation_invalid_date(client):
    """Test run reconciliation with invalid date format."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.post('/recon/run', data={'date_filter': 'invalid-date'})
    assert response.status_code == 302  # Redirect with error

def test_api_summary_endpoint(client):
    """Test API summary endpoint."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/recon/api/summary')
    assert response.status_code == 200
    assert response.content_type == 'application/json'

def test_resolve_anomaly_endpoint(client):
    """Test resolve anomaly endpoint."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # This would require a test anomaly record
    response = client.post('/recon/resolve/999')
    assert response.status_code == 302  # Redirect after processing

def test_reconciliation_engine_methods():
    """Test ReconciliationEngine core methods exist."""
    engine = ReconciliationEngine()
    
    # Test that methods exist and are callable
    assert hasattr(engine, 'run_reconciliation')
    assert hasattr(engine, '_match_mpr_with_internal')
    assert hasattr(engine, '_match_with_bank_statements')
    assert hasattr(engine, '_identify_anomalies')
    assert hasattr(engine, '_create_reconciliation_results')
    
    assert callable(engine.run_reconciliation)
    assert callable(engine._match_mpr_with_internal)
    assert callable(engine._match_with_bank_statements)
    assert callable(engine._identify_anomalies)
    assert callable(engine._create_reconciliation_results)

def test_reconciliation_report_methods():
    """Test ReconciliationReport static methods exist."""
    assert hasattr(ReconciliationReport, 'get_summary')
    assert hasattr(ReconciliationReport, 'get_detailed_results')
    
    assert callable(ReconciliationReport.get_summary)
    assert callable(ReconciliationReport.get_detailed_results)