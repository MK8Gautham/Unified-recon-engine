"""
Application settings and configuration.
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY') or 'dev-secret-key'
    
    # Database configuration
    DATABASE_SERVER = os.environ.get('DATABASE_SERVER', 'localhost')
    DATABASE_NAME = os.environ.get('DATABASE_NAME', 'collection_recon')
    DATABASE_USER = os.environ.get('DATABASE_USER', 'sa')
    DATABASE_PASSWORD = os.environ.get('DATABASE_PASSWORD', '')
    
    # Authentication
    AUTH_USERNAME = os.environ.get('AUTH_USERNAME', 'admin')
    AUTH_PASSWORD = os.environ.get('AUTH_PASSWORD', 'admin123')
    
    # File upload
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'app/static/uploads')
    
    @property
    def DATABASE_CONNECTION_STRING(self):
        return (
            f"DRIVER={{ODBC Driver 18 for SQL Server}};"
            f"SERVER={self.DATABASE_SERVER};"
            f"DATABASE={self.DATABASE_NAME};"
            f"UID={self.DATABASE_USER};"
            f"PWD={self.DATABASE_PASSWORD};"
            f"TrustServerCertificate=yes;"
        )