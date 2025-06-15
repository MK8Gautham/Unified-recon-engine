"""
Dashboard routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/')
@dashboard_bp.route('/dashboard')
@login_required
def index():
    """Main dashboard with aggregate view."""
    # TODO: Implement dashboard data aggregation
    dashboard_data = {
        'total_transactions': 0,
        'total_amount': 0,
        'channels': [],
        'recent_uploads': []
    }
    
    return render_template('dashboard/index.html', data=dashboard_data)