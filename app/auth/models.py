"""
Authentication models and utilities.
"""
import hashlib
import logging
from config.database import execute_query
from config.constants import LOG_AUTH

class User:
    def __init__(self, id, username):
        self.id = id
        self.username = username
    
    @staticmethod
    def authenticate(username, password):
        """Authenticate user with username and password."""
        try:
            # Hash password for comparison
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            query = "SELECT id, username FROM users WHERE username = ? AND password_hash = ?"
            result = execute_query(query, (username, password_hash), fetch='one')
            
            if result:
                logging.info(f"Successful login for user: {username}", 
                           extra={'category': LOG_AUTH, 'user_id': result[0]})
                return User(result[0], result[1])
            else:
                logging.warning(f"Failed login attempt for user: {username}", 
                              extra={'category': LOG_AUTH})
                return None
                
        except Exception as e:
            logging.error(f"Authentication error: {str(e)}", 
                         extra={'category': LOG_AUTH})
            return None
    
    @staticmethod
    def get_by_id(user_id):
        """Get user by ID."""
        try:
            query = "SELECT id, username FROM users WHERE id = ?"
            result = execute_query(query, (user_id,), fetch='one')
            
            if result:
                return User(result[0], result[1])
            return None
            
        except Exception as e:
            logging.error(f"Error fetching user: {str(e)}", 
                         extra={'category': LOG_AUTH})
            return None