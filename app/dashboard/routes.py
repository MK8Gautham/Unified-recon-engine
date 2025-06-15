"""
Dashboard routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required
from app.uploads.models import MPRUpload, InternalUpload, BankStatementUpload
from app.config.models import Channel

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
@login_required
def index():
    """Main dashboard with aggregate view."""
    try:
        # Get recent uploads
        recent_mpr_uploads = MPRUpload.get_recent(5)
        recent_internal_uploads = InternalUpload.get_recent(3)
        recent_bank_uploads = BankStatementUpload.get_recent(3)
        
        # Get all channels
        channels = Channel.get_all()
        
        # Calculate totals from recent MPR uploads
        total_transactions = sum(upload.total_transactions for upload in recent_mpr_uploads)
        total_amount = sum(upload.total_amount for upload in recent_mpr_uploads)
        
        # Add internal data totals
        internal_transactions = sum(upload.total_transactions for upload in recent_internal_uploads)
        internal_amount = sum(upload.total_amount for upload in recent_internal_uploads)
        
        # Bank statement totals
        bank_credits = sum(upload.total_credits for upload in recent_bank_uploads)
        bank_debits = sum(upload.total_debits for upload in recent_bank_uploads)
        
        # Prepare channel data with transaction counts
        channel_data = []
        for channel in channels:
            channel_uploads = [u for u in recent_mpr_uploads if u.channel_id == channel.id]
            transaction_count = sum(u.total_transactions for u in channel_uploads)
            
            channel_data.append({
                'name': channel.name,
                'transaction_count': transaction_count
            })
        
        dashboard_data = {
            'total_transactions': total_transactions,
            'total_amount': total_amount,
            'internal_transactions': internal_transactions,
            'internal_amount': internal_amount,
            'bank_credits': bank_credits,
            'bank_debits': bank_debits,
            'channels': channel_data,
            'recent_mpr_uploads': recent_mpr_uploads,
            'recent_internal_uploads': recent_internal_uploads,
            'recent_bank_uploads': recent_bank_uploads
        }
        
        return render_template('dashboard/index.html', data=dashboard_data)
        
    except Exception as e:
        # Fallback to empty data if there's an error
        dashboard_data = {
            'total_transactions': 0,
            'total_amount': 0,
            'internal_transactions': 0,
            'internal_amount': 0,
            'bank_credits': 0,
            'bank_debits': 0,
            'channels': [],
            'recent_mpr_uploads': [],
            'recent_internal_uploads': [],
            'recent_bank_uploads': []
        }
        
        return render_template('dashboard/index.html', data=dashboard_data)