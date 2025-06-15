"""
Analytics module tests.
"""
import pytest
from app import create_app
from app.analytics.models import TransactionReporting, ChannelAnalytics, ReportExporter

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

def test_analytics_transactions_page_requires_auth(client):
    """Test analytics transactions page requires authentication."""
    response = client.get('/analytics/transactions')
    assert response.status_code == 302  # Redirect to login

def test_analytics_transactions_page_loads_when_authenticated(client):
    """Test analytics transactions page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/analytics/transactions')
    assert response.status_code == 200
    assert b'Transaction Reporting' in response.data

def test_analytics_channels_page_loads_when_authenticated(client):
    """Test analytics channels page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/analytics/channels')
    assert response.status_code == 200
    assert b'Channel Performance Analytics' in response.data

def test_analytics_dashboard_page_loads_when_authenticated(client):
    """Test analytics dashboard page loads when authenticated."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    response = client.get('/analytics/dashboard')
    assert response.status_code == 200
    assert b'Analytics Dashboard' in response.data

def test_transaction_reporting_summary():
    """Test TransactionReporting.get_transaction_summary method."""
    summary = TransactionReporting.get_transaction_summary()
    assert isinstance(summary, list)

def test_transaction_reporting_detailed_transactions():
    """Test TransactionReporting.get_detailed_transactions method."""
    transactions = TransactionReporting.get_detailed_transactions(limit=10)
    assert isinstance(transactions, list)

def test_transaction_reporting_count():
    """Test TransactionReporting.get_transaction_count method."""
    count = TransactionReporting.get_transaction_count()
    assert isinstance(count, int)
    assert count >= 0

def test_channel_analytics_performance():
    """Test ChannelAnalytics.get_channel_performance method."""
    performance = ChannelAnalytics.get_channel_performance(days=7)
    assert isinstance(performance, list)

def test_channel_analytics_trends():
    """Test ChannelAnalytics.get_channel_trends method."""
    trends = ChannelAnalytics.get_channel_trends(channel_id=1, days=7)
    assert isinstance(trends, list)

def test_report_exporter_csv_generation():
    """Test ReportExporter.generate_csv_data method."""
    test_transactions = [
        {
            'transaction_id': 'TXN001',
            'amount': 1000.0,
            'channel_name': 'Test Channel',
            'status': 'MATCHED'
        }
    ]
    
    csv_data = ReportExporter.generate_csv_data(test_transactions)
    assert csv_data is not None
    assert 'Transaction ID' in csv_data
    assert 'TXN001' in csv_data

def test_report_exporter_summary_generation():
    """Test ReportExporter.generate_summary_report method."""
    test_summary = [
        {
            'channel_name': 'Test Channel',
            'total_transactions': 100,
            'total_amount': 50000.0,
            'match_rate': 95.5
        }
    ]
    
    csv_data = ReportExporter.generate_summary_report(test_summary)
    assert csv_data is not None
    assert 'Channel' in csv_data
    assert 'Test Channel' in csv_data

def test_analytics_api_endpoints(client):
    """Test analytics API endpoints."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test channel performance API
    response = client.get('/analytics/api/channel-performance')
    assert response.status_code == 200
    assert response.content_type == 'application/json'
    
    # Test transaction summary API
    response = client.get('/analytics/api/transaction-summary')
    assert response.status_code == 200
    assert response.content_type == 'application/json'

def test_analytics_export_endpoints(client):
    """Test analytics export endpoints."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test transaction export
    response = client.get('/analytics/export/transactions')
    assert response.status_code == 200
    assert 'text/csv' in response.content_type
    
    # Test summary export
    response = client.get('/analytics/export/summary')
    assert response.status_code == 200
    assert 'text/csv' in response.content_type

def test_analytics_filtering(client):
    """Test analytics filtering functionality."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test with date filters
    response = client.get('/analytics/transactions?date_from=2024-01-01&date_to=2024-01-31')
    assert response.status_code == 200
    
    # Test with channel filter
    response = client.get('/analytics/transactions?channel_id=1')
    assert response.status_code == 200
    
    # Test with status filter
    response = client.get('/analytics/transactions?status=MATCHED')
    assert response.status_code == 200

def test_analytics_pagination(client):
    """Test analytics pagination functionality."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test pagination
    response = client.get('/analytics/transactions?page=1')
    assert response.status_code == 200
    
    response = client.get('/analytics/transactions?page=2')
    assert response.status_code == 200

def test_channel_analytics_time_periods(client):
    """Test channel analytics with different time periods."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test different time periods
    for days in [7, 30, 90]:
        response = client.get(f'/analytics/channels?days={days}')
        assert response.status_code == 200

def test_analytics_error_handling(client):
    """Test analytics error handling."""
    with client.session_transaction() as sess:
        sess['user_id'] = 1
        sess['username'] = 'admin'
    
    # Test with invalid parameters
    response = client.get('/analytics/transactions?channel_id=invalid')
    assert response.status_code == 200  # Should handle gracefully
    
    response = client.get('/analytics/transactions?page=invalid')
    assert response.status_code == 200  # Should default to page 1

def test_analytics_models_error_handling():
    """Test analytics models error handling."""
    # Test with invalid parameters
    summary = TransactionReporting.get_transaction_summary(
        date_from='invalid-date'
    )
    assert isinstance(summary, list)  # Should return empty list on error
    
    performance = ChannelAnalytics.get_channel_performance(days=-1)
    assert isinstance(performance, list)  # Should handle gracefully
    
    trends = ChannelAnalytics.get_channel_trends(
        channel_id='invalid', days=30
    )
    assert isinstance(trends, list)  # Should handle gracefully