"""
Authentication routes and views.
"""
from flask import Blueprint, render_template, request, redirect, url_for, session, flash
import logging
from app.auth.models import User
from config.constants import LOG_AUTH

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication."""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Username and password are required.', 'error')
            return render_template('auth/login.html')
        
        user = User.authenticate(username, password)
        if user:
            session['user_id'] = user.id
            session['username'] = user.username
            
            logging.info(f"User {username} logged in successfully", 
                        extra={'category': LOG_AUTH, 'user_id': user.id})
            
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard.index'))
        else:
            flash('Invalid username or password.', 'error')
            logging.warning(f"Failed login attempt for username: {username}", 
                          extra={'category': LOG_AUTH})
    
    return render_template('auth/login.html')

@auth_bp.route('/logout')
def logout():
    """Logout and clear session."""
    user_id = session.get('user_id')
    username = session.get('username')
    
    session.clear()
    
    logging.info(f"User {username} logged out", 
                extra={'category': LOG_AUTH, 'user_id': user_id})
    
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('auth.login'))