"""
Upload routes and views.
"""
from flask import Blueprint, render_template
from app.auth.utils import login_required

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/mpr')
@login_required
def mpr():
    """MPR file upload page."""
    # TODO: Implement MPR upload
    return render_template('uploads/mpr.html')

@uploads_bp.route('/internal')
@login_required
def internal():
    """Internal data upload page."""
    # TODO: Implement internal data upload
    return render_template('uploads/internal.html')

@uploads_bp.route('/bank-statement')
@login_required
def bank_statement():
    """Bank statement upload page."""
    # TODO: Implement bank statement upload
    return render_template('uploads/bank_statement.html')