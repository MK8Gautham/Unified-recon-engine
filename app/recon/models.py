"""
Reconciliation models and utilities.
"""
import logging
from datetime import datetime, timedelta
from config.database import execute_query
from config.constants import (
    LOG_RECON, RECON_MATCH_TOLERANCE, DATE_TOLERANCE_DAYS,
    TRANSACTION_STATUS_PENDING, TRANSACTION_STATUS_MATCHED, 
    TRANSACTION_STATUS_ANOMALY, ANOMALY_AMOUNT_MISMATCH,
    ANOMALY_MISSING_INTERNAL, ANOMALY_MISSING_MPR, 
    ANOMALY_MISSING_BANK, ANOMALY_DUPLICATE
)

class ReconciliationEngine:
    def __init__(self):
        self.match_tolerance = RECON_MATCH_TOLERANCE
        self.date_tolerance_days = DATE_TOLERANCE_DAYS
    
    def run_reconciliation(self, date_filter=None):
        """Run complete reconciliation process."""
        try:
            logging.info("Starting reconciliation process", 
                        extra={'category': LOG_RECON})
            
            # Clear previous reconciliation results for the date
            if date_filter:
                self._clear_reconciliation_results(date_filter)
            
            # Step 1: Match MPR with Internal Data
            mpr_internal_matches = self._match_mpr_with_internal(date_filter)
            
            # Step 2: Match with Bank Statements
            bank_matches = self._match_with_bank_statements(date_filter)
            
            # Step 3: Identify anomalies
            anomalies = self._identify_anomalies(date_filter)
            
            # Step 4: Create reconciliation results
            results = self._create_reconciliation_results(
                mpr_internal_matches, bank_matches, anomalies
            )
            
            logging.info(f"Reconciliation completed: {len(results)} results created", 
                        extra={'category': LOG_RECON})
            
            return results
            
        except Exception as e:
            logging.error(f"Reconciliation process failed: {str(e)}", 
                         extra={'category': LOG_RECON})
            return []
    
    def _match_mpr_with_internal(self, date_filter=None):
        """Match MPR transactions with internal data."""
        try:
            # Get MPR transactions
            mpr_query = """
                SELECT m.id, m.transaction_id, m.amount, m.transaction_time, m.utr
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                WHERE u.status = 'COMPLETED'
            """
            
            # Get internal transactions
            internal_query = """
                SELECT i.id, i.transaction_id, i.amount, i.transaction_time
                FROM internal_transactions i
                JOIN internal_uploads u ON i.upload_id = u.id
                WHERE u.status = 'COMPLETED'
            """
            
            if date_filter:
                date_condition = " AND CAST(m.transaction_time AS DATE) = ?"
                mpr_query += date_condition
                internal_query += " AND CAST(i.transaction_time AS DATE) = ?"
                
                mpr_transactions = execute_query(mpr_query, (date_filter,), fetch='all')
                internal_transactions = execute_query(internal_query, (date_filter,), fetch='all')
            else:
                mpr_transactions = execute_query(mpr_query, fetch='all')
                internal_transactions = execute_query(internal_query, fetch='all')
            
            matches = []
            
            # Match by transaction_id first (exact match)
            for mpr in mpr_transactions:
                mpr_id, mpr_txn_id, mpr_amount, mpr_time, mpr_utr = mpr
                
                for internal in internal_transactions:
                    int_id, int_txn_id, int_amount, int_time = internal
                    
                    # Exact transaction ID match
                    if mpr_txn_id and int_txn_id and mpr_txn_id == int_txn_id:
                        # Check amount tolerance
                        if abs(float(mpr_amount) - float(int_amount)) <= self.match_tolerance:
                            matches.append({
                                'mpr_id': mpr_id,
                                'internal_id': int_id,
                                'match_type': 'EXACT_ID',
                                'confidence': 1.0
                            })
                            break
            
            # Match by amount and date (fuzzy match)
            matched_mpr_ids = {m['mpr_id'] for m in matches}
            matched_internal_ids = {m['internal_id'] for m in matches}
            
            for mpr in mpr_transactions:
                mpr_id, mpr_txn_id, mpr_amount, mpr_time, mpr_utr = mpr
                
                if mpr_id in matched_mpr_ids:
                    continue
                
                for internal in internal_transactions:
                    int_id, int_txn_id, int_amount, int_time = internal
                    
                    if int_id in matched_internal_ids:
                        continue
                    
                    # Amount match within tolerance
                    if abs(float(mpr_amount) - float(int_amount)) <= self.match_tolerance:
                        # Date match within tolerance (if both have dates)
                        date_match = True
                        if mpr_time and int_time:
                            try:
                                mpr_date = datetime.fromisoformat(str(mpr_time).replace('Z', '+00:00'))
                                int_date = datetime.fromisoformat(str(int_time).replace('Z', '+00:00'))
                                date_diff = abs((mpr_date - int_date).days)
                                date_match = date_diff <= self.date_tolerance_days
                            except:
                                date_match = True  # If date parsing fails, assume match
                        
                        if date_match:
                            matches.append({
                                'mpr_id': mpr_id,
                                'internal_id': int_id,
                                'match_type': 'AMOUNT_DATE',
                                'confidence': 0.8
                            })
                            matched_mpr_ids.add(mpr_id)
                            matched_internal_ids.add(int_id)
                            break
            
            logging.info(f"MPR-Internal matching completed: {len(matches)} matches found", 
                        extra={'category': LOG_RECON})
            
            return matches
            
        except Exception as e:
            logging.error(f"Error in MPR-Internal matching: {str(e)}", 
                         extra={'category': LOG_RECON})
            return []
    
    def _match_with_bank_statements(self, date_filter=None):
        """Match transactions with bank statements."""
        try:
            # Get bank transactions (credits only for settlement matching)
            bank_query = """
                SELECT b.id, b.amount, b.utr, b.transaction_date, b.description
                FROM bank_transactions b
                JOIN bank_statement_uploads u ON b.upload_id = u.id
                WHERE u.status = 'COMPLETED' AND b.amount > 0
            """
            
            if date_filter:
                bank_query += " AND CAST(b.transaction_date AS DATE) = ?"
                bank_transactions = execute_query(bank_query, (date_filter,), fetch='all')
            else:
                bank_transactions = execute_query(bank_query, fetch='all')
            
            # Get existing MPR-Internal matches
            existing_matches_query = """
                SELECT mpr_transaction_id, internal_transaction_id
                FROM reconciliation_results
                WHERE mpr_transaction_id IS NOT NULL AND internal_transaction_id IS NOT NULL
            """
            existing_matches = execute_query(existing_matches_query, fetch='all')
            
            matches = []
            
            for match in existing_matches:
                mpr_id, internal_id = match
                
                # Get MPR transaction details
                mpr_query = "SELECT amount, utr FROM mpr_transactions WHERE id = ?"
                mpr_result = execute_query(mpr_query, (mpr_id,), fetch='one')
                
                if not mpr_result:
                    continue
                
                mpr_amount, mpr_utr = mpr_result
                
                # Find matching bank transaction
                for bank in bank_transactions:
                    bank_id, bank_amount, bank_utr, bank_date, bank_desc = bank
                    
                    # UTR match (highest confidence)
                    if mpr_utr and bank_utr and mpr_utr == bank_utr:
                        matches.append({
                            'mpr_id': mpr_id,
                            'internal_id': internal_id,
                            'bank_id': bank_id,
                            'match_type': 'UTR',
                            'confidence': 1.0
                        })
                        break
                    
                    # Amount match within tolerance
                    elif abs(float(mpr_amount) - float(bank_amount)) <= self.match_tolerance:
                        matches.append({
                            'mpr_id': mpr_id,
                            'internal_id': internal_id,
                            'bank_id': bank_id,
                            'match_type': 'AMOUNT',
                            'confidence': 0.7
                        })
                        break
            
            logging.info(f"Bank statement matching completed: {len(matches)} matches found", 
                        extra={'category': LOG_RECON})
            
            return matches
            
        except Exception as e:
            logging.error(f"Error in bank statement matching: {str(e)}", 
                         extra={'category': LOG_RECON})
            return []
    
    def _identify_anomalies(self, date_filter=None):
        """Identify transaction anomalies."""
        try:
            anomalies = []
            
            # Find unmatched MPR transactions
            unmatched_mpr_query = """
                SELECT m.id, m.transaction_id, m.amount
                FROM mpr_transactions m
                JOIN mpr_uploads u ON m.upload_id = u.id
                WHERE u.status = 'COMPLETED'
                AND m.id NOT IN (
                    SELECT mpr_transaction_id FROM reconciliation_results 
                    WHERE mpr_transaction_id IS NOT NULL
                )
            """
            
            # Find unmatched internal transactions
            unmatched_internal_query = """
                SELECT i.id, i.transaction_id, i.amount
                FROM internal_transactions i
                JOIN internal_uploads iu ON i.upload_id = iu.id
                WHERE iu.status = 'COMPLETED'
                AND i.id NOT IN (
                    SELECT internal_transaction_id FROM reconciliation_results 
                    WHERE internal_transaction_id IS NOT NULL
                )
            """
            
            if date_filter:
                date_condition = " AND CAST(m.transaction_time AS DATE) = ?"
                unmatched_mpr_query += date_condition
                unmatched_internal_query += " AND CAST(i.transaction_time AS DATE) = ?"
                
                unmatched_mpr = execute_query(unmatched_mpr_query, (date_filter,), fetch='all')
                unmatched_internal = execute_query(unmatched_internal_query, (date_filter,), fetch='all')
            else:
                unmatched_mpr = execute_query(unmatched_mpr_query, fetch='all')
                unmatched_internal = execute_query(unmatched_internal_query, fetch='all')
            
            # MPR transactions without internal match
            for mpr in unmatched_mpr:
                mpr_id, mpr_txn_id, mpr_amount = mpr
                anomalies.append({
                    'mpr_id': mpr_id,
                    'internal_id': None,
                    'bank_id': None,
                    'anomaly_type': ANOMALY_MISSING_INTERNAL,
                    'description': f'MPR transaction {mpr_txn_id} has no matching internal record'
                })
            
            # Internal transactions without MPR match
            for internal in unmatched_internal:
                int_id, int_txn_id, int_amount = internal
                anomalies.append({
                    'mpr_id': None,
                    'internal_id': int_id,
                    'bank_id': None,
                    'anomaly_type': ANOMALY_MISSING_MPR,
                    'description': f'Internal transaction {int_txn_id} has no matching MPR record'
                })
            
            # Check for amount mismatches in existing matches
            amount_mismatch_query = """
                SELECT r.mpr_transaction_id, r.internal_transaction_id, 
                       m.amount as mpr_amount, i.amount as internal_amount
                FROM reconciliation_results r
                JOIN mpr_transactions m ON r.mpr_transaction_id = m.id
                JOIN internal_transactions i ON r.internal_transaction_id = i.id
                WHERE r.status = 'MATCHED'
                AND ABS(m.amount - i.amount) > ?
            """
            
            mismatches = execute_query(amount_mismatch_query, (self.match_tolerance,), fetch='all')
            
            for mismatch in mismatches:
                mpr_id, int_id, mpr_amount, int_amount = mismatch
                anomalies.append({
                    'mpr_id': mpr_id,
                    'internal_id': int_id,
                    'bank_id': None,
                    'anomaly_type': ANOMALY_AMOUNT_MISMATCH,
                    'description': f'Amount mismatch: MPR ₹{mpr_amount} vs Internal ₹{int_amount}'
                })
            
            logging.info(f"Anomaly detection completed: {len(anomalies)} anomalies found", 
                        extra={'category': LOG_RECON})
            
            return anomalies
            
        except Exception as e:
            logging.error(f"Error in anomaly detection: {str(e)}", 
                         extra={'category': LOG_RECON})
            return []
    
    def _create_reconciliation_results(self, mpr_internal_matches, bank_matches, anomalies):
        """Create reconciliation result records."""
        try:
            results = []
            
            # Create matched results
            for match in bank_matches:
                query = """
                    INSERT INTO reconciliation_results 
                    (mpr_transaction_id, internal_transaction_id, bank_transaction_id, status)
                    VALUES (?, ?, ?, ?)
                """
                execute_query(query, (
                    match['mpr_id'], 
                    match['internal_id'], 
                    match['bank_id'], 
                    TRANSACTION_STATUS_MATCHED
                ))
                results.append(match)
            
            # Create MPR-Internal only matches (no bank match yet)
            matched_mpr_ids = {m['mpr_id'] for m in bank_matches}
            
            for match in mpr_internal_matches:
                if match['mpr_id'] not in matched_mpr_ids:
                    query = """
                        INSERT INTO reconciliation_results 
                        (mpr_transaction_id, internal_transaction_id, status)
                        VALUES (?, ?, ?)
                    """
                    execute_query(query, (
                        match['mpr_id'], 
                        match['internal_id'], 
                        TRANSACTION_STATUS_PENDING
                    ))
                    results.append(match)
            
            # Create anomaly results
            for anomaly in anomalies:
                query = """
                    INSERT INTO reconciliation_results 
                    (mpr_transaction_id, internal_transaction_id, bank_transaction_id, 
                     status, anomaly_type)
                    VALUES (?, ?, ?, ?, ?)
                """
                execute_query(query, (
                    anomaly.get('mpr_id'),
                    anomaly.get('internal_id'),
                    anomaly.get('bank_id'),
                    TRANSACTION_STATUS_ANOMALY,
                    anomaly['anomaly_type']
                ))
                results.append(anomaly)
            
            return results
            
        except Exception as e:
            logging.error(f"Error creating reconciliation results: {str(e)}", 
                         extra={'category': LOG_RECON})
            return []
    
    def _clear_reconciliation_results(self, date_filter):
        """Clear existing reconciliation results for a date."""
        try:
            query = """
                DELETE FROM reconciliation_results 
                WHERE created_at >= ? AND created_at < ?
            """
            start_date = datetime.strptime(date_filter, '%Y-%m-%d')
            end_date = start_date + timedelta(days=1)
            
            execute_query(query, (start_date, end_date))
            
        except Exception as e:
            logging.error(f"Error clearing reconciliation results: {str(e)}", 
                         extra={'category': LOG_RECON})

class ReconciliationReport:
    @staticmethod
    def get_summary(date_filter=None):
        """Get reconciliation summary."""
        try:
            base_query = """
                SELECT 
                    status,
                    COUNT(*) as count,
                    anomaly_type
                FROM reconciliation_results
            """
            
            if date_filter:
                base_query += " WHERE CAST(created_at AS DATE) = ?"
                results = execute_query(base_query + " GROUP BY status, anomaly_type", 
                                      (date_filter,), fetch='all')
            else:
                results = execute_query(base_query + " GROUP BY status, anomaly_type", 
                                      fetch='all')
            
            summary = {
                'total_matched': 0,
                'total_pending': 0,
                'total_anomalies': 0,
                'anomaly_breakdown': {}
            }
            
            for row in results:
                status, count, anomaly_type = row
                
                if status == TRANSACTION_STATUS_MATCHED:
                    summary['total_matched'] += count
                elif status == TRANSACTION_STATUS_PENDING:
                    summary['total_pending'] += count
                elif status == TRANSACTION_STATUS_ANOMALY:
                    summary['total_anomalies'] += count
                    if anomaly_type:
                        summary['anomaly_breakdown'][anomaly_type] = count
            
            return summary
            
        except Exception as e:
            logging.error(f"Error getting reconciliation summary: {str(e)}", 
                         extra={'category': LOG_RECON})
            return {
                'total_matched': 0,
                'total_pending': 0,
                'total_anomalies': 0,
                'anomaly_breakdown': {}
            }
    
    @staticmethod
    def get_detailed_results(status_filter=None, limit=100):
        """Get detailed reconciliation results."""
        try:
            query = """
                SELECT 
                    r.id,
                    r.status,
                    r.anomaly_type,
                    r.created_at,
                    m.transaction_id as mpr_txn_id,
                    m.amount as mpr_amount,
                    i.transaction_id as internal_txn_id,
                    i.amount as internal_amount,
                    b.amount as bank_amount,
                    b.utr as bank_utr,
                    c.name as channel_name
                FROM reconciliation_results r
                LEFT JOIN mpr_transactions m ON r.mpr_transaction_id = m.id
                LEFT JOIN internal_transactions i ON r.internal_transaction_id = i.id
                LEFT JOIN bank_transactions b ON r.bank_transaction_id = b.id
                LEFT JOIN mpr_uploads mu ON m.upload_id = mu.id
                LEFT JOIN channels c ON mu.channel_id = c.id
            """
            
            if status_filter:
                query += " WHERE r.status = ?"
                results = execute_query(query + f" ORDER BY r.created_at DESC LIMIT {limit}", 
                                      (status_filter,), fetch='all')
            else:
                results = execute_query(query + f" ORDER BY r.created_at DESC LIMIT {limit}", 
                                      fetch='all')
            
            detailed_results = []
            for row in results:
                detailed_results.append({
                    'id': row[0],
                    'status': row[1],
                    'anomaly_type': row[2],
                    'created_at': row[3],
                    'mpr_txn_id': row[4],
                    'mpr_amount': row[5],
                    'internal_txn_id': row[6],
                    'internal_amount': row[7],
                    'bank_amount': row[8],
                    'bank_utr': row[9],
                    'channel_name': row[10]
                })
            
            return detailed_results
            
        except Exception as e:
            logging.error(f"Error getting detailed reconciliation results: {str(e)}", 
                         extra={'category': LOG_RECON})
            return []