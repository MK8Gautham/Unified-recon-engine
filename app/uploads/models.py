"""
Upload models and utilities.
"""
import os
import pandas as pd
import logging
from datetime import datetime
from werkzeug.utils import secure_filename
from config.database import execute_query
from config.constants import (
    LOG_UPLOAD, ALLOWED_EXTENSIONS, MAX_FILE_SIZE,
    FILE_FORMAT_CSV, FILE_FORMAT_EXCEL
)
from app.config.models import ChannelConfig

class FileUploadHandler:
    def __init__(self, upload_folder):
        self.upload_folder = upload_folder
    
    def allowed_file(self, filename):
        """Check if file extension is allowed."""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    
    def save_file(self, file):
        """Save uploaded file and return filename."""
        if not file or file.filename == '':
            return None
        
        if not self.allowed_file(file.filename):
            return None
        
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}_{filename}"
        
        filepath = os.path.join(self.upload_folder, filename)
        file.save(filepath)
        
        return filename
    
    def parse_file(self, filepath, file_format='CSV'):
        """Parse uploaded file and return DataFrame."""
        try:
            if file_format == FILE_FORMAT_EXCEL:
                df = pd.read_excel(filepath)
            else:
                df = pd.read_csv(filepath)
            
            return df
            
        except Exception as e:
            logging.error(f"Error parsing file {filepath}: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None

class MPRUpload:
    def __init__(self, id, channel_id, filename, upload_date, 
                 total_transactions=0, total_amount=0, status='PENDING'):
        self.id = id
        self.channel_id = channel_id
        self.filename = filename
        self.upload_date = upload_date
        self.total_transactions = total_transactions
        self.total_amount = total_amount
        self.status = status
    
    @staticmethod
    def create(channel_id, filename, total_transactions=0, total_amount=0):
        """Create new MPR upload record."""
        try:
            query = """
                INSERT INTO mpr_uploads (channel_id, filename, total_transactions, total_amount) 
                VALUES (?, ?, ?, ?)
            """
            execute_query(query, (channel_id, filename, total_transactions, total_amount))
            
            # Get the inserted ID
            query = "SELECT SCOPE_IDENTITY()"
            result = execute_query(query, fetch='one')
            upload_id = int(result[0]) if result else None
            
            logging.info(f"MPR upload created: {filename}", 
                        extra={'category': LOG_UPLOAD})
            return upload_id
            
        except Exception as e:
            logging.error(f"Error creating MPR upload: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None
    
    @staticmethod
    def get_recent(limit=10):
        """Get recent MPR uploads."""
        try:
            query = """
                SELECT TOP (?) u.id, u.channel_id, u.filename, u.upload_date, 
                       u.total_transactions, u.total_amount, u.status, c.name as channel_name
                FROM mpr_uploads u
                JOIN channels c ON u.channel_id = c.id
                ORDER BY u.upload_date DESC
            """
            results = execute_query(query, (limit,), fetch='all')
            
            uploads = []
            if results:
                for row in results:
                    upload = MPRUpload(row[0], row[1], row[2], row[3], row[4], row[5], row[6])
                    upload.channel_name = row[7]
                    uploads.append(upload)
            
            return uploads
            
        except Exception as e:
            logging.error(f"Error fetching recent uploads: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return []

class MPRTransaction:
    @staticmethod
    def create_batch(upload_id, transactions_data):
        """Create batch of MPR transactions."""
        try:
            query = """
                INSERT INTO mpr_transactions 
                (upload_id, utr, transaction_id, transaction_time, reference_id, amount, settlement_account) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """
            
            batch_data = []
            for transaction in transactions_data:
                batch_data.append((
                    upload_id,
                    transaction.get('utr'),
                    transaction.get('transaction_id'),
                    transaction.get('transaction_time'),
                    transaction.get('reference_id'),
                    transaction.get('amount'),
                    transaction.get('settlement_account')
                ))
            
            # Execute batch insert
            connection = None
            cursor = None
            try:
                from config.database import get_db_connection
                connection = get_db_connection()
                cursor = connection.cursor()
                
                cursor.executemany(query, batch_data)
                connection.commit()
                
                logging.info(f"Batch inserted {len(batch_data)} transactions for upload {upload_id}", 
                           extra={'category': LOG_UPLOAD})
                return True
                
            finally:
                if cursor:
                    cursor.close()
                if connection:
                    connection.close()
            
        except Exception as e:
            logging.error(f"Error creating transaction batch: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return False

class MPRProcessor:
    def __init__(self, upload_folder):
        self.file_handler = FileUploadHandler(upload_folder)
    
    def process_mpr_file(self, file, channel_id):
        """Process uploaded MPR file."""
        try:
            # Get channel configuration
            config = ChannelConfig.get_by_channel_id(channel_id)
            if not config:
                logging.error(f"No configuration found for channel {channel_id}", 
                            extra={'category': LOG_UPLOAD})
                return None, "Channel configuration not found"
            
            # Save file
            filename = self.file_handler.save_file(file)
            if not filename:
                return None, "Invalid file or file type not allowed"
            
            # Parse file
            filepath = os.path.join(self.upload_folder, filename)
            df = self.file_handler.parse_file(filepath, config.file_format)
            
            if df is None:
                return None, "Error parsing file"
            
            # Map fields according to configuration
            transactions_data = self._map_transactions(df, config.field_mappings)
            
            if not transactions_data:
                return None, "No valid transactions found in file"
            
            # Calculate totals
            total_transactions = len(transactions_data)
            total_amount = sum(float(t.get('amount', 0)) for t in transactions_data if t.get('amount'))
            
            # Create upload record
            upload_id = MPRUpload.create(channel_id, filename, total_transactions, total_amount)
            
            if not upload_id:
                return None, "Error creating upload record"
            
            # Create transaction records
            if MPRTransaction.create_batch(upload_id, transactions_data):
                # Update upload status
                query = "UPDATE mpr_uploads SET status = 'COMPLETED' WHERE id = ?"
                execute_query(query, (upload_id,))
                
                logging.info(f"MPR file processed successfully: {filename}", 
                           extra={'category': LOG_UPLOAD})
                return upload_id, "File processed successfully"
            else:
                return None, "Error saving transaction data"
            
        except Exception as e:
            logging.error(f"Error processing MPR file: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None, f"Processing error: {str(e)}"
    
    def _map_transactions(self, df, field_mappings):
        """Map DataFrame columns to transaction fields."""
        transactions = []
        
        for _, row in df.iterrows():
            transaction = {}
            
            for field, column_name in field_mappings.items():
                if column_name and column_name in df.columns:
                    value = row[column_name]
                    
                    # Handle different data types
                    if field == 'amount' and pd.notna(value):
                        try:
                            transaction[field] = float(value)
                        except (ValueError, TypeError):
                            transaction[field] = 0.0
                    elif field == 'transaction_time' and pd.notna(value):
                        try:
                            if isinstance(value, str):
                                transaction[field] = pd.to_datetime(value).isoformat()
                            else:
                                transaction[field] = value.isoformat() if hasattr(value, 'isoformat') else str(value)
                        except:
                            transaction[field] = str(value)
                    else:
                        transaction[field] = str(value) if pd.notna(value) else None
            
            # Only include transactions with required fields
            if transaction.get('transaction_id') and transaction.get('amount'):
                transactions.append(transaction)
        
        return transactions