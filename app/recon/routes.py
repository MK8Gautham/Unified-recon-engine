"""
Reconciliation routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required

recon_bp = Blueprint('recon', __name__)

@recon_bp.route('/')
@login_required
def index():
    """Reconciliation dashboard."""
    # TODO: Implement reconciliation dashboard
    return render_template('recon/index.html')