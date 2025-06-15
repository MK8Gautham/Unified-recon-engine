"""
Dashboard routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required
from app.uploads.models import MPRUpload
from app.config.models import Channel

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
@login_required
def index():
    """Main dashboard with aggregate view."""
    try:
        # Get recent uploads
        recent_uploads = MPRUpload.get_recent(5)
        
        # Get all channels
        channels = Channel.get_all()
        
        # Calculate totals from recent uploads
        total_transactions = sum(upload.total_transactions for upload in recent_uploads)
        total_amount = sum(upload.total_amount for upload in recent_uploads)
        
        # Prepare channel data with transaction counts
        channel_data = []
        for channel in channels:
            channel_uploads = [u for u in recent_uploads if u.channel_id == channel.id]
            transaction_count = sum(u.total_transactions for u in channel_uploads)
            
            channel_data.append({
                'name': channel.name,
                'transaction_count': transaction_count
            })
        
        dashboard_data = {
            'total_transactions': total_transactions,
            'total_amount': total_amount,
            'channels': channel_data,
            'recent_uploads': recent_uploads
        }
        
        return render_template('dashboard/index.html', data=dashboard_data)
        
    except Exception as e:
        # Fallback to empty data if there's an error
        dashboard_data = {
            'total_transactions': 0,
            'total_amount': 0,
            'channels': [],
            'recent_uploads': []
        }
        
        return render_template('dashboard/index.html', data=dashboard_data)