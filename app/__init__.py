"""
Flask application factory and configuration.
"""
import os
from flask import Flask
from config.settings import Config
from config.database import setup_logging

def create_app():
    """Create and configure Flask application."""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Setup logging
    setup_logging()
    
    # Ensure upload directory exists
    upload_dir = app.config['UPLOAD_FOLDER']
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    # Register blueprints
    from app.auth.routes import auth_bp
    from app.dashboard.routes import dashboard_bp
    from app.config.routes import config_bp
    from app.uploads.routes import uploads_bp
    from app.recon.routes import recon_bp
    from app.analytics.routes import analytics_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(config_bp, url_prefix='/config')
    app.register_blueprint(uploads_bp, url_prefix='/uploads')
    app.register_blueprint(recon_bp, url_prefix='/recon')
    app.register_blueprint(analytics_bp, url_prefix='/analytics')
    
    return app