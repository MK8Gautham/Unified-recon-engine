"""
Analytics routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/channels')
@login_required
def channels():
    """Channel performance analytics."""
    # TODO: Implement channel analytics
    return render_template('analytics/channels.html')