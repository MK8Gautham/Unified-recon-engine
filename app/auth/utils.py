"""
Authentication utilities and decorators.
"""
from functools import wraps
from flask import session, redirect, url_for, request, flash
import logging
from config.constants import LOG_AUTH

def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            logging.warning(f"Unauthorized access attempt to {request.endpoint}", 
                          extra={'category': LOG_AUTH})
            flash('Please log in to access this page.', 'error')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    """Get current logged-in user."""
    if 'user_id' in session:
        from app.auth.models import User
        return User.get_by_id(session['user_id'])
    return None