"""
Channel configuration models and utilities.
"""
import json
import logging
from config.database import execute_query
from config.constants import LOG_SYSTEM

class Channel:
    def __init__(self, id, name, description, created_at=None):
        self.id = id
        self.name = name
        self.description = description
        self.created_at = created_at
    
    @staticmethod
    def get_all():
        """Get all channels."""
        try:
            query = "SELECT id, name, description, created_at FROM channels ORDER BY name"
            results = execute_query(query, fetch='all')
            
            channels = []
            if results:
                for row in results:
                    channels.append(Channel(row[0], row[1], row[2], row[3]))
            
            return channels
            
        except Exception as e:
            logging.error(f"Error fetching channels: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return []
    
    @staticmethod
    def get_by_id(channel_id):
        """Get channel by ID."""
        try:
            query = "SELECT id, name, description, created_at FROM channels WHERE id = ?"
            result = execute_query(query, (channel_id,), fetch='one')
            
            if result:
                return Channel(result[0], result[1], result[2], result[3])
            return None
            
        except Exception as e:
            logging.error(f"Error fetching channel: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return None
    
    @staticmethod
    def create(name, description):
        """Create new channel."""
        try:
            query = "INSERT INTO channels (name, description) VALUES (?, ?)"
            execute_query(query, (name, description))
            
            logging.info(f"Channel created: {name}", 
                        extra={'category': LOG_SYSTEM})
            return True
            
        except Exception as e:
            logging.error(f"Error creating channel: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return False
    
    @staticmethod
    def update(channel_id, name, description):
        """Update channel."""
        try:
            query = "UPDATE channels SET name = ?, description = ? WHERE id = ?"
            execute_query(query, (name, description, channel_id))
            
            logging.info(f"Channel updated: {channel_id}", 
                        extra={'category': LOG_SYSTEM})
            return True
            
        except Exception as e:
            logging.error(f"Error updating channel: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return False
    
    @staticmethod
    def delete(channel_id):
        """Delete channel."""
        try:
            query = "DELETE FROM channels WHERE id = ?"
            execute_query(query, (channel_id,))
            
            logging.info(f"Channel deleted: {channel_id}", 
                        extra={'category': LOG_SYSTEM})
            return True
            
        except Exception as e:
            logging.error(f"Error deleting channel: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return False

class ChannelConfig:
    def __init__(self, id, channel_id, field_mappings, file_format, created_at=None):
        self.id = id
        self.channel_id = channel_id
        self.field_mappings = field_mappings
        self.file_format = file_format
        self.created_at = created_at
    
    @staticmethod
    def get_by_channel_id(channel_id):
        """Get channel configuration by channel ID."""
        try:
            query = """
                SELECT id, channel_id, field_mappings_json, file_format, created_at 
                FROM channel_configs WHERE channel_id = ?
            """
            result = execute_query(query, (channel_id,), fetch='one')
            
            if result:
                field_mappings = json.loads(result[2])
                return ChannelConfig(result[0], result[1], field_mappings, result[3], result[4])
            return None
            
        except Exception as e:
            logging.error(f"Error fetching channel config: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return None
    
    @staticmethod
    def create_or_update(channel_id, field_mappings, file_format):
        """Create or update channel configuration."""
        try:
            field_mappings_json = json.dumps(field_mappings)
            
            # Check if config exists
            existing = ChannelConfig.get_by_channel_id(channel_id)
            
            if existing:
                query = """
                    UPDATE channel_configs 
                    SET field_mappings_json = ?, file_format = ? 
                    WHERE channel_id = ?
                """
                execute_query(query, (field_mappings_json, file_format, channel_id))
            else:
                query = """
                    INSERT INTO channel_configs (channel_id, field_mappings_json, file_format) 
                    VALUES (?, ?, ?)
                """
                execute_query(query, (channel_id, field_mappings_json, file_format))
            
            logging.info(f"Channel config updated: {channel_id}", 
                        extra={'category': LOG_SYSTEM})
            return True
            
        except Exception as e:
            logging.error(f"Error saving channel config: {str(e)}", 
                         extra={'category': LOG_SYSTEM})
            return False