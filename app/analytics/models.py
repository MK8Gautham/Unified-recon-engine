"""
Analytics models and utilities for channel performance and reporting.
"""
import logging
from datetime import datetime, timedelta
from config.database import execute_query
from config.constants import LOG_ANALYTICS

class TransactionReporting:
    @staticmethod
    def get_transaction_summary(date_from=None, date_to=None, channel_id=None):
        """Get comprehensive transaction summary with filtering."""
        try:
            base_query = """
                SELECT 
                    c.name as channel_name,
                    COUNT(m.id) as total_transactions,
                    SUM(m.amount) as total_amount,
                    AVG(m.amount) as avg_amount,
                    MIN(m.amount) as min_amount,
                    MAX(m.amount) as max_amount,
                    COUNT(CASE WHEN r.status = 'MATCHED' THEN 1 END) as matched_count,
                    COUNT(CASE WHEN r.status = 'ANOMALY' THEN 1 END) as anomaly_count
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                JOIN channels c ON u.channel_id = c.id
                LEFT JOIN reconciliation_results r ON r.mpr_transaction_id = m.id
                WHERE 1=1
            """
            
            params = []
            
            if date_from:
                base_query += " AND CAST(m.transaction_time AS DATE) >= ?"
                params.append(date_from)
            
            if date_to:
                base_query += " AND CAST(m.transaction_time AS DATE) <= ?"
                params.append(date_to)
            
            if channel_id:
                base_query += " AND u.channel_id = ?"
                params.append(channel_id)
            
            base_query += " GROUP BY c.id, c.name ORDER BY total_amount DESC"
            
            results = execute_query(base_query, params, fetch='all')
            
            summary_data = []
            if results:
                for row in results:
                    summary_data.append({
                        'channel_name': row[0],
                        'total_transactions': row[1] or 0,
                        'total_amount': float(row[2]) if row[2] else 0.0,
                        'avg_amount': float(row[3]) if row[3] else 0.0,
                        'min_amount': float(row[4]) if row[4] else 0.0,
                        'max_amount': float(row[5]) if row[5] else 0.0,
                        'matched_count': row[6] or 0,
                        'anomaly_count': row[7] or 0,
                        'match_rate': (row[6] / row[1] * 100) if row[1] and row[6] else 0
                    })
            
            return summary_data
            
        except Exception as e:
            logging.error(f"Error getting transaction summary: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return []
    
    @staticmethod
    def get_detailed_transactions(date_from=None, date_to=None, channel_id=None, 
                                status_filter=None, limit=1000, offset=0):
        """Get detailed transaction list with filtering and pagination."""
        try:
            base_query = """
                SELECT 
                    m.id,
                    m.transaction_id,
                    m.amount,
                    m.transaction_time,
                    m.utr,
                    m.reference_id,
                    c.name as channel_name,
                    i.transaction_id as internal_txn_id,
                    i.amount as internal_amount,
                    b.amount as bank_amount,
                    b.utr as bank_utr,
                    r.status,
                    r.anomaly_type,
                    r.created_at as recon_date
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                JOIN channels c ON u.channel_id = c.id
                LEFT JOIN reconciliation_results r ON r.mpr_transaction_id = m.id
                LEFT JOIN internal_transactions i ON r.internal_transaction_id = i.id
                LEFT JOIN bank_transactions b ON r.bank_transaction_id = b.id
                WHERE 1=1
            """
            
            params = []
            
            if date_from:
                base_query += " AND CAST(m.transaction_time AS DATE) >= ?"
                params.append(date_from)
            
            if date_to:
                base_query += " AND CAST(m.transaction_time AS DATE) <= ?"
                params.append(date_to)
            
            if channel_id:
                base_query += " AND u.channel_id = ?"
                params.append(channel_id)
            
            if status_filter:
                base_query += " AND r.status = ?"
                params.append(status_filter)
            
            base_query += f" ORDER BY m.transaction_time DESC OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY"
            
            results = execute_query(base_query, params, fetch='all')
            
            transactions = []
            if results:
                for row in results:
                    transactions.append({
                        'id': row[0],
                        'transaction_id': row[1],
                        'amount': float(row[2]) if row[2] else 0.0,
                        'transaction_time': row[3],
                        'utr': row[4],
                        'reference_id': row[5],
                        'channel_name': row[6],
                        'internal_txn_id': row[7],
                        'internal_amount': float(row[8]) if row[8] else None,
                        'bank_amount': float(row[9]) if row[9] else None,
                        'bank_utr': row[10],
                        'status': row[11],
                        'anomaly_type': row[12],
                        'recon_date': row[13]
                    })
            
            return transactions
            
        except Exception as e:
            logging.error(f"Error getting detailed transactions: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return []
    
    @staticmethod
    def get_transaction_count(date_from=None, date_to=None, channel_id=None, status_filter=None):
        """Get total count of transactions matching filters."""
        try:
            base_query = """
                SELECT COUNT(m.id)
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                LEFT JOIN reconciliation_results r ON r.mpr_transaction_id = m.id
                WHERE 1=1
            """
            
            params = []
            
            if date_from:
                base_query += " AND CAST(m.transaction_time AS DATE) >= ?"
                params.append(date_from)
            
            if date_to:
                base_query += " AND CAST(m.transaction_time AS DATE) <= ?"
                params.append(date_to)
            
            if channel_id:
                base_query += " AND u.channel_id = ?"
                params.append(channel_id)
            
            if status_filter:
                base_query += " AND r.status = ?"
                params.append(status_filter)
            
            result = execute_query(base_query, params, fetch='one')
            return result[0] if result else 0
            
        except Exception as e:
            logging.error(f"Error getting transaction count: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return 0

class ChannelAnalytics:
    @staticmethod
    def get_channel_performance(days=30):
        """Get channel performance analytics over time."""
        try:
            query = """
                SELECT 
                    c.name as channel_name,
                    CAST(m.transaction_time AS DATE) as transaction_date,
                    COUNT(m.id) as daily_transactions,
                    SUM(m.amount) as daily_amount,
                    COUNT(CASE WHEN r.status = 'MATCHED' THEN 1 END) as daily_matched,
                    COUNT(CASE WHEN r.status = 'ANOMALY' THEN 1 END) as daily_anomalies
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                JOIN channels c ON u.channel_id = c.id
                LEFT JOIN reconciliation_results r ON r.mpr_transaction_id = m.id
                WHERE m.transaction_time >= DATEADD(day, -?, GETUTCDATE())
                GROUP BY c.id, c.name, CAST(m.transaction_time AS DATE)
                ORDER BY transaction_date DESC, channel_name
            """
            
            results = execute_query(query, (days,), fetch='all')
            
            performance_data = []
            if results:
                for row in results:
                    performance_data.append({
                        'channel_name': row[0],
                        'transaction_date': row[1],
                        'daily_transactions': row[2] or 0,
                        'daily_amount': float(row[3]) if row[3] else 0.0,
                        'daily_matched': row[4] or 0,
                        'daily_anomalies': row[5] or 0,
                        'match_rate': (row[4] / row[2] * 100) if row[2] and row[4] else 0
                    })
            
            return performance_data
            
        except Exception as e:
            logging.error(f"Error getting channel performance: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return []
    
    @staticmethod
    def get_channel_trends(channel_id, days=30):
        """Get detailed trends for a specific channel."""
        try:
            query = """
                SELECT 
                    CAST(m.transaction_time AS DATE) as transaction_date,
                    COUNT(m.id) as transactions,
                    SUM(m.amount) as amount,
                    AVG(m.amount) as avg_amount,
                    COUNT(CASE WHEN r.status = 'MATCHED' THEN 1 END) as matched,
                    COUNT(CASE WHEN r.status = 'ANOMALY' THEN 1 END) as anomalies,
                    COUNT(DISTINCT m.utr) as unique_utrs
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                LEFT JOIN reconciliation_results r ON r.mpr_transaction_id = m.id
                WHERE u.channel_id = ? 
                AND m.transaction_time >= DATEADD(day, -?, GETUTCDATE())
                GROUP BY CAST(m.transaction_time AS DATE)
                ORDER BY transaction_date DESC
            """
            
            results = execute_query(query, (channel_id, days), fetch='all')
            
            trends = []
            if results:
                for row in results:
                    trends.append({
                        'transaction_date': row[0],
                        'transactions': row[1] or 0,
                        'amount': float(row[2]) if row[2] else 0.0,
                        'avg_amount': float(row[3]) if row[3] else 0.0,
                        'matched': row[4] or 0,
                        'anomalies': row[5] or 0,
                        'unique_utrs': row[6] or 0,
                        'match_rate': (row[4] / row[1] * 100) if row[1] and row[4] else 0
                    })
            
            return trends
            
        except Exception as e:
            logging.error(f"Error getting channel trends: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return []

class ReportExporter:
    @staticmethod
    def generate_csv_data(transactions):
        """Generate CSV data from transaction list."""
        try:
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            headers = [
                'Transaction ID', 'Amount', 'Transaction Time', 'UTR', 'Reference ID',
                'Channel', 'Internal Transaction ID', 'Internal Amount', 
                'Bank Amount', 'Bank UTR', 'Status', 'Anomaly Type', 'Reconciliation Date'
            ]
            writer.writerow(headers)
            
            # Write data rows
            for txn in transactions:
                row = [
                    txn.get('transaction_id', ''),
                    txn.get('amount', 0),
                    txn.get('transaction_time', ''),
                    txn.get('utr', ''),
                    txn.get('reference_id', ''),
                    txn.get('channel_name', ''),
                    txn.get('internal_txn_id', ''),
                    txn.get('internal_amount', ''),
                    txn.get('bank_amount', ''),
                    txn.get('bank_utr', ''),
                    txn.get('status', ''),
                    txn.get('anomaly_type', ''),
                    txn.get('recon_date', '')
                ]
                writer.writerow(row)
            
            csv_data = output.getvalue()
            output.close()
            
            return csv_data
            
        except Exception as e:
            logging.error(f"Error generating CSV data: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return None
    
    @staticmethod
    def generate_summary_report(summary_data):
        """Generate summary report in CSV format."""
        try:
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write headers
            headers = [
                'Channel', 'Total Transactions', 'Total Amount', 'Average Amount',
                'Min Amount', 'Max Amount', 'Matched Count', 'Anomaly Count', 'Match Rate %'
            ]
            writer.writerow(headers)
            
            # Write data rows
            for channel in summary_data:
                row = [
                    channel.get('channel_name', ''),
                    channel.get('total_transactions', 0),
                    channel.get('total_amount', 0),
                    channel.get('avg_amount', 0),
                    channel.get('min_amount', 0),
                    channel.get('max_amount', 0),
                    channel.get('matched_count', 0),
                    channel.get('anomaly_count', 0),
                    f"{channel.get('match_rate', 0):.2f}"
                ]
                writer.writerow(row)
            
            csv_data = output.getvalue()
            output.close()
            
            return csv_data
            
        except Exception as e:
            logging.error(f"Error generating summary report: {str(e)}", 
                         extra={'category': LOG_ANALYTICS})
            return None