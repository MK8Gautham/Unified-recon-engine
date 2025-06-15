"""
Database connection and utilities.
"""
import pyodbc
import logging
import json
from datetime import datetime
from config.settings import Config

class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'module': record.module,
            'function': record.funcName,
            'message': record.getMessage(),
        }
        
        # Add user context if available
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'category'):
            log_entry['category'] = record.category
            
        return json.dumps(log_entry)

def setup_logging():
    """Setup structured logging configuration."""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Remove default handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Add JSON formatter
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    
    return logger

def get_db_connection():
    """Get database connection with error handling."""
    try:
        config = Config()
        connection = pyodbc.connect(config.DATABASE_CONNECTION_STRING)
        return connection
    except Exception as e:
        logging.error(f"Database connection failed: {str(e)}", extra={'category': 'SYSTEM'})
        raise

def execute_query(query, params=None, fetch=False):
    """Execute database query with proper error handling."""
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor()
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if fetch:
            if fetch == 'one':
                result = cursor.fetchone()
            else:
                result = cursor.fetchall()
            return result
        else:
            connection.commit()
            return cursor.rowcount
            
    except Exception as e:
        if connection:
            connection.rollback()
        logging.error(f"Query execution failed: {str(e)}", extra={'category': 'SYSTEM'})
        raise
    finally:
        if cursor:
            cursor.close()
        if connection:
            connection.close()