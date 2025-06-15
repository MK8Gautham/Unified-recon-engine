"""
Configuration routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required

config_bp = Blueprint('config', __name__)

@config_bp.route('/channels')
@login_required
def channels():
    """Channel configuration page."""
    # TODO: Implement channel configuration
    return render_template('config/channels.html')