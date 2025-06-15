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

class InternalUpload:
    def __init__(self, id, filename, upload_date, 
                 total_transactions=0, total_amount=0, status='PENDING'):
        self.id = id
        self.filename = filename
        self.upload_date = upload_date
        self.total_transactions = total_transactions
        self.total_amount = total_amount
        self.status = status
    
    @staticmethod
    def create(filename, total_transactions=0, total_amount=0):
        """Create new internal upload record."""
        try:
            query = """
                INSERT INTO internal_uploads (filename, total_transactions, total_amount) 
                VALUES (?, ?, ?)
            """
            execute_query(query, (filename, total_transactions, total_amount))
            
            # Get the inserted ID
            query = "SELECT SCOPE_IDENTITY()"
            result = execute_query(query, fetch='one')
            upload_id = int(result[0]) if result else None
            
            logging.info(f"Internal upload created: {filename}", 
                        extra={'category': LOG_UPLOAD})
            return upload_id
            
        except Exception as e:
            logging.error(f"Error creating internal upload: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None
    
    @staticmethod
    def get_recent(limit=10):
        """Get recent internal uploads."""
        try:
            query = """
                SELECT TOP (?) id, filename, upload_date, total_transactions, total_amount
                FROM internal_uploads
                ORDER BY upload_date DESC
            """
            results = execute_query(query, (limit,), fetch='all')
            
            uploads = []
            if results:
                for row in results:
                    uploads.append(InternalUpload(row[0], row[1], row[2], row[3], row[4]))
            
            return uploads
            
        except Exception as e:
            logging.error(f"Error fetching recent internal uploads: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return []

class BankStatementUpload:
    def __init__(self, id, filename, upload_date, 
                 total_credits=0, total_debits=0, status='PENDING'):
        self.id = id
        self.filename = filename
        self.upload_date = upload_date
        self.total_credits = total_credits
        self.total_debits = total_debits
        self.status = status
    
    @staticmethod
    def create(filename, total_credits=0, total_debits=0):
        """Create new bank statement upload record."""
        try:
            query = """
                INSERT INTO bank_statement_uploads (filename, total_credits, total_debits) 
                VALUES (?, ?, ?)
            """
            execute_query(query, (filename, total_credits, total_debits))
            
            # Get the inserted ID
            query = "SELECT SCOPE_IDENTITY()"
            result = execute_query(query, fetch='one')
            upload_id = int(result[0]) if result else None
            
            logging.info(f"Bank statement upload created: {filename}", 
                        extra={'category': LOG_UPLOAD})
            return upload_id
            
        except Exception as e:
            logging.error(f"Error creating bank statement upload: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None
    
    @staticmethod
    def get_recent(limit=10):
        """Get recent bank statement uploads."""
        try:
            query = """
                SELECT TOP (?) id, filename, upload_date, total_credits, total_debits
                FROM bank_statement_uploads
                ORDER BY upload_date DESC
            """
            results = execute_query(query, (limit,), fetch='all')
            
            uploads = []
            if results:
                for row in results:
                    uploads.append(BankStatementUpload(row[0], row[1], row[2], row[3], row[4]))
            
            return uploads
            
        except Exception as e:
            logging.error(f"Error fetching recent bank statement uploads: {str(e)}", 
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

class InternalTransaction:
    @staticmethod
    def create_batch(upload_id, transactions_data):
        """Create batch of internal transactions."""
        try:
            query = """
                INSERT INTO internal_transactions 
                (upload_id, transaction_id, transaction_time, amount, reference_id) 
                VALUES (?, ?, ?, ?, ?)
            """
            
            batch_data = []
            for transaction in transactions_data:
                batch_data.append((
                    upload_id,
                    transaction.get('transaction_id'),
                    transaction.get('transaction_time'),
                    transaction.get('amount'),
                    transaction.get('reference_id')
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
                
                logging.info(f"Batch inserted {len(batch_data)} internal transactions for upload {upload_id}", 
                           extra={'category': LOG_UPLOAD})
                return True
                
            finally:
                if cursor:
                    cursor.close()
                if connection:
                    connection.close()
            
        except Exception as e:
            logging.error(f"Error creating internal transaction batch: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return False

class BankTransaction:
    @staticmethod
    def create_batch(upload_id, transactions_data):
        """Create batch of bank transactions."""
        try:
            query = """
                INSERT INTO bank_transactions 
                (upload_id, transaction_date, amount, utr, description) 
                VALUES (?, ?, ?, ?, ?)
            """
            
            batch_data = []
            for transaction in transactions_data:
                batch_data.append((
                    upload_id,
                    transaction.get('transaction_date'),
                    transaction.get('amount'),
                    transaction.get('utr'),
                    transaction.get('description')
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
                
                logging.info(f"Batch inserted {len(batch_data)} bank transactions for upload {upload_id}", 
                           extra={'category': LOG_UPLOAD})
                return True
                
            finally:
                if cursor:
                    cursor.close()
                if connection:
                    connection.close()
            
        except Exception as e:
            logging.error(f"Error creating bank transaction batch: {str(e)}", 
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

class InternalDataProcessor:
    def __init__(self, upload_folder):
        self.file_handler = FileUploadHandler(upload_folder)
    
    def process_internal_file(self, file):
        """Process uploaded internal data file."""
        try:
            # Save file
            filename = self.file_handler.save_file(file)
            if not filename:
                return None, "Invalid file or file type not allowed"
            
            # Parse file
            filepath = os.path.join(self.upload_folder, filename)
            df = self.file_handler.parse_file(filepath)
            
            if df is None:
                return None, "Error parsing file"
            
            # Expected columns for internal data
            required_columns = ['transaction_id', 'amount']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return None, f"Missing required columns: {', '.join(missing_columns)}"
            
            # Process transactions
            transactions_data = self._process_internal_transactions(df)
            
            if not transactions_data:
                return None, "No valid transactions found in file"
            
            # Calculate totals
            total_transactions = len(transactions_data)
            total_amount = sum(float(t.get('amount', 0)) for t in transactions_data if t.get('amount'))
            
            # Create upload record
            upload_id = InternalUpload.create(filename, total_transactions, total_amount)
            
            if not upload_id:
                return None, "Error creating upload record"
            
            # Create transaction records
            if InternalTransaction.create_batch(upload_id, transactions_data):
                # Update upload status
                query = "UPDATE internal_uploads SET status = 'COMPLETED' WHERE id = ?"
                execute_query(query, (upload_id,))
                
                logging.info(f"Internal data file processed successfully: {filename}", 
                           extra={'category': LOG_UPLOAD})
                return upload_id, "File processed successfully"
            else:
                return None, "Error saving transaction data"
            
        except Exception as e:
            logging.error(f"Error processing internal data file: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None, f"Processing error: {str(e)}"
    
    def _process_internal_transactions(self, df):
        """Process internal transaction data."""
        transactions = []
        
        for _, row in df.iterrows():
            transaction = {}
            
            # Map standard fields
            transaction['transaction_id'] = str(row.get('transaction_id', ''))
            
            # Handle amount
            if 'amount' in df.columns and pd.notna(row['amount']):
                try:
                    transaction['amount'] = float(row['amount'])
                except (ValueError, TypeError):
                    transaction['amount'] = 0.0
            else:
                transaction['amount'] = 0.0
            
            # Handle optional fields
            if 'transaction_time' in df.columns and pd.notna(row['transaction_time']):
                try:
                    if isinstance(row['transaction_time'], str):
                        transaction['transaction_time'] = pd.to_datetime(row['transaction_time']).isoformat()
                    else:
                        transaction['transaction_time'] = row['transaction_time'].isoformat() if hasattr(row['transaction_time'], 'isoformat') else str(row['transaction_time'])
                except:
                    transaction['transaction_time'] = str(row['transaction_time'])
            
            if 'reference_id' in df.columns and pd.notna(row['reference_id']):
                transaction['reference_id'] = str(row['reference_id'])
            
            # Only include transactions with required fields
            if transaction.get('transaction_id') and transaction.get('amount'):
                transactions.append(transaction)
        
        return transactions

class BankStatementProcessor:
    def __init__(self, upload_folder):
        self.file_handler = FileUploadHandler(upload_folder)
    
    def process_bank_statement_file(self, file):
        """Process uploaded bank statement file."""
        try:
            # Save file
            filename = self.file_handler.save_file(file)
            if not filename:
                return None, "Invalid file or file type not allowed"
            
            # Parse file
            filepath = os.path.join(self.upload_folder, filename)
            df = self.file_handler.parse_file(filepath)
            
            if df is None:
                return None, "Error parsing file"
            
            # Expected columns for bank statement
            required_columns = ['amount']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return None, f"Missing required columns: {', '.join(missing_columns)}"
            
            # Process transactions
            transactions_data = self._process_bank_transactions(df)
            
            if not transactions_data:
                return None, "No valid transactions found in file"
            
            # Calculate totals
            total_credits = sum(float(t.get('amount', 0)) for t in transactions_data if float(t.get('amount', 0)) > 0)
            total_debits = sum(abs(float(t.get('amount', 0))) for t in transactions_data if float(t.get('amount', 0)) < 0)
            
            # Create upload record
            upload_id = BankStatementUpload.create(filename, total_credits, total_debits)
            
            if not upload_id:
                return None, "Error creating upload record"
            
            # Create transaction records
            if BankTransaction.create_batch(upload_id, transactions_data):
                # Update upload status
                query = "UPDATE bank_statement_uploads SET status = 'COMPLETED' WHERE id = ?"
                execute_query(query, (upload_id,))
                
                logging.info(f"Bank statement file processed successfully: {filename}", 
                           extra={'category': LOG_UPLOAD})
                return upload_id, "File processed successfully"
            else:
                return None, "Error saving transaction data"
            
        except Exception as e:
            logging.error(f"Error processing bank statement file: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
            return None, f"Processing error: {str(e)}"
    
    def _process_bank_transactions(self, df):
        """Process bank transaction data."""
        transactions = []
        
        for _, row in df.iterrows():
            transaction = {}
            
            # Handle amount (required)
            if 'amount' in df.columns and pd.notna(row['amount']):
                try:
                    transaction['amount'] = float(row['amount'])
                except (ValueError, TypeError):
                    continue  # Skip invalid amounts
            else:
                continue  # Skip rows without amount
            
            # Handle optional fields
            if 'transaction_date' in df.columns and pd.notna(row['transaction_date']):
                try:
                    if isinstance(row['transaction_date'], str):
                        transaction['transaction_date'] = pd.to_datetime(row['transaction_date']).isoformat()
                    else:
                        transaction['transaction_date'] = row['transaction_date'].isoformat() if hasattr(row['transaction_date'], 'isoformat') else str(row['transaction_date'])
                except:
                    transaction['transaction_date'] = str(row['transaction_date'])
            
            if 'utr' in df.columns and pd.notna(row['utr']):
                transaction['utr'] = str(row['utr'])
            
            if 'description' in df.columns and pd.notna(row['description']):
                transaction['description'] = str(row['description'])
            
            transactions.append(transaction)
        
        return transactions