"""
Analytics routes and views for reporting and channel performance.
"""
from flask import Blueprint, render_template, request, jsonify, make_response
from datetime import datetime, timedelta
from app.auth.utils import login_required
from app.analytics.models import TransactionReporting, ChannelAnalytics, ReportExporter
from app.config.models import Channel
import logging
from config.constants import LOG_ANALYTICS

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/transactions')
@login_required
def transactions():
    """Transaction-level reporting with filtering."""
    try:
        # Get filter parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        channel_id = request.args.get('channel_id')
        status_filter = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = 50
        
        # Convert channel_id to int if provided
        if channel_id:
            try:
                channel_id = int(channel_id)
            except ValueError:
                channel_id = None
        
        # Get all channels for filter dropdown
        channels = Channel.get_all()
        
        # Get transaction count for pagination
        total_count = TransactionReporting.get_transaction_count(
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id,
            status_filter=status_filter
        )
        
        # Calculate pagination
        total_pages = (total_count + per_page - 1) // per_page
        offset = (page - 1) * per_page
        
        # Get detailed transactions
        transactions = TransactionReporting.get_detailed_transactions(
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id,
            status_filter=status_filter,
            limit=per_page,
            offset=offset
        )
        
        # Get summary data
        summary_data = TransactionReporting.get_transaction_summary(
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id
        )
        
        return render_template('analytics/transactions.html',
                             transactions=transactions,
                             summary_data=summary_data,
                             channels=channels,
                             filters={
                                 'date_from': date_from,
                                 'date_to': date_to,
                                 'channel_id': channel_id,
                                 'status': status_filter
                             },
                             pagination={
                                 'page': page,
                                 'per_page': per_page,
                                 'total_count': total_count,
                                 'total_pages': total_pages
                             })
        
    except Exception as e:
        logging.error(f"Error in transaction reporting: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return render_template('analytics/transactions.html',
                             transactions=[],
                             summary_data=[],
                             channels=[],
                             filters={},
                             pagination={'page': 1, 'total_pages': 1})

@analytics_bp.route('/export/transactions')
@login_required
def export_transactions():
    """Export transaction data as CSV."""
    try:
        # Get filter parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        channel_id = request.args.get('channel_id')
        status_filter = request.args.get('status')
        
        # Convert channel_id to int if provided
        if channel_id:
            try:
                channel_id = int(channel_id)
            except ValueError:
                channel_id = None
        
        # Get all transactions (no pagination for export)
        transactions = TransactionReporting.get_detailed_transactions(
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id,
            status_filter=status_filter,
            limit=10000  # Large limit for export
        )
        
        # Generate CSV data
        csv_data = ReportExporter.generate_csv_data(transactions)
        
        if not csv_data:
            return "Error generating CSV data", 500
        
        # Create response
        response = make_response(csv_data)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=transactions_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        logging.info(f"Transaction export completed: {len(transactions)} records", 
                    extra={'category': LOG_ANALYTICS})
        
        return response
        
    except Exception as e:
        logging.error(f"Error exporting transactions: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return "Export failed", 500

@analytics_bp.route('/export/summary')
@login_required
def export_summary():
    """Export summary data as CSV."""
    try:
        # Get filter parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        channel_id = request.args.get('channel_id')
        
        # Convert channel_id to int if provided
        if channel_id:
            try:
                channel_id = int(channel_id)
            except ValueError:
                channel_id = None
        
        # Get summary data
        summary_data = TransactionReporting.get_transaction_summary(
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id
        )
        
        # Generate CSV data
        csv_data = ReportExporter.generate_summary_report(summary_data)
        
        if not csv_data:
            return "Error generating CSV data", 500
        
        # Create response
        response = make_response(csv_data)
        response.headers['Content-Type'] = 'text/csv'
        response.headers['Content-Disposition'] = f'attachment; filename=summary_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        
        logging.info(f"Summary export completed: {len(summary_data)} channels", 
                    extra={'category': LOG_ANALYTICS})
        
        return response
        
    except Exception as e:
        logging.error(f"Error exporting summary: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return "Export failed", 500

@analytics_bp.route('/channels')
@login_required
def channels():
    """Channel performance analytics."""
    try:
        days = int(request.args.get('days', 30))
        channel_id = request.args.get('channel_id')
        
        # Convert channel_id to int if provided
        if channel_id:
            try:
                channel_id = int(channel_id)
            except ValueError:
                channel_id = None
        
        # Get all channels for dropdown
        all_channels = Channel.get_all()
        
        # Get channel performance data
        performance_data = ChannelAnalytics.get_channel_performance(days)
        
        # Get specific channel trends if channel selected
        channel_trends = []
        selected_channel = None
        if channel_id:
            channel_trends = ChannelAnalytics.get_channel_trends(channel_id, days)
            selected_channel = next((c for c in all_channels if c.id == channel_id), None)
        
        return render_template('analytics/channels.html',
                             performance_data=performance_data,
                             channel_trends=channel_trends,
                             all_channels=all_channels,
                             selected_channel=selected_channel,
                             days=days)
        
    except Exception as e:
        logging.error(f"Error in channel analytics: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return render_template('analytics/channels.html',
                             performance_data=[],
                             channel_trends=[],
                             all_channels=[],
                             selected_channel=None,
                             days=30)

@analytics_bp.route('/api/channel-performance')
@login_required
def api_channel_performance():
    """API endpoint for channel performance data."""
    try:
        days = int(request.args.get('days', 30))
        performance_data = ChannelAnalytics.get_channel_performance(days)
        return jsonify(performance_data)
    except Exception as e:
        logging.error(f"Error in channel performance API: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/api/transaction-summary')
@login_required
def api_transaction_summary():
    """API endpoint for transaction summary data."""
    try:
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        channel_id = request.args.get('channel_id')
        
        if channel_id:
            try:
                channel_id = int(channel_id)
            except ValueError:
                channel_id = None
        
        summary_data = TransactionReporting.get_transaction_summary(
            date_from=date_from,
            date_to=date_to,
            channel_id=channel_id
        )
        return jsonify(summary_data)
    except Exception as e:
        logging.error(f"Error in transaction summary API: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return jsonify({'error': str(e)}), 500

@analytics_bp.route('/dashboard')
@login_required
def dashboard():
    """Analytics dashboard with key metrics."""
    try:
        # Get date range (last 7 days by default)
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=7)
        
        # Get summary metrics
        summary_data = TransactionReporting.get_transaction_summary(
            date_from=start_date.isoformat(),
            date_to=end_date.isoformat()
        )
        
        # Calculate overall metrics
        total_transactions = sum(channel['total_transactions'] for channel in summary_data)
        total_amount = sum(channel['total_amount'] for channel in summary_data)
        total_matched = sum(channel['matched_count'] for channel in summary_data)
        total_anomalies = sum(channel['anomaly_count'] for channel in summary_data)
        
        overall_match_rate = (total_matched / total_transactions * 100) if total_transactions else 0
        
        # Get channel performance
        performance_data = ChannelAnalytics.get_channel_performance(7)
        
        # Group performance data by channel
        channel_performance = {}
        for perf in performance_data:
            channel = perf['channel_name']
            if channel not in channel_performance:
                channel_performance[channel] = {
                    'transactions': 0,
                    'amount': 0,
                    'match_rate': 0,
                    'days': []
                }
            
            channel_performance[channel]['transactions'] += perf['daily_transactions']
            channel_performance[channel]['amount'] += perf['daily_amount']
            channel_performance[channel]['days'].append(perf)
        
        # Calculate average match rates
        for channel in channel_performance:
            days_data = channel_performance[channel]['days']
            if days_data:
                avg_match_rate = sum(day['match_rate'] for day in days_data) / len(days_data)
                channel_performance[channel]['match_rate'] = avg_match_rate
        
        dashboard_data = {
            'total_transactions': total_transactions,
            'total_amount': total_amount,
            'total_matched': total_matched,
            'total_anomalies': total_anomalies,
            'overall_match_rate': overall_match_rate,
            'summary_data': summary_data,
            'channel_performance': channel_performance,
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            }
        }
        
        return render_template('analytics/dashboard.html', data=dashboard_data)
        
    except Exception as e:
        logging.error(f"Error in analytics dashboard: {str(e)}", 
                     extra={'category': LOG_ANALYTICS})
        return render_template('analytics/dashboard.html', data={})