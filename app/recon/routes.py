"""
Reconciliation routes and views.
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app.auth.utils import login_required
from app.recon.models import ReconciliationEngine, ReconciliationReport
from datetime import datetime
import logging
from config.constants import LOG_RECON

recon_bp = Blueprint('recon', __name__)

@recon_bp.route('/')
@login_required
def index():
    """Reconciliation dashboard."""
    try:
        # Get reconciliation summary
        summary = ReconciliationReport.get_summary()
        
        # Get recent reconciliation results
        recent_results = ReconciliationReport.get_detailed_results(limit=10)
        
        return render_template('recon/index.html', 
                             summary=summary, 
                             recent_results=recent_results)
        
    except Exception as e:
        flash(f'Error loading reconciliation data: {str(e)}', 'error')
        return render_template('recon/index.html', 
                             summary={}, 
                             recent_results=[])

@recon_bp.route('/run', methods=['POST'])
@login_required
def run_reconciliation():
    """Run reconciliation process."""
    try:
        date_filter = request.form.get('date_filter')
        
        # Validate date format if provided
        if date_filter:
            try:
                datetime.strptime(date_filter, '%Y-%m-%d')
            except ValueError:
                flash('Invalid date format. Please use YYYY-MM-DD.', 'error')
                return redirect(url_for('recon.index'))
        
        # Run reconciliation
        engine = ReconciliationEngine()
        results = engine.run_reconciliation(date_filter)
        
        if results:
            flash(f'Reconciliation completed successfully. {len(results)} results processed.', 'success')
            logging.info(f"Manual reconciliation completed: {len(results)} results", 
                        extra={'category': LOG_RECON})
        else:
            flash('Reconciliation completed but no results were generated.', 'warning')
        
    except Exception as e:
        flash(f'Reconciliation failed: {str(e)}', 'error')
        logging.error(f"Manual reconciliation failed: {str(e)}", 
                     extra={'category': LOG_RECON})
    
    return redirect(url_for('recon.index'))

@recon_bp.route('/results')
@login_required
def results():
    """Detailed reconciliation results page."""
    try:
        status_filter = request.args.get('status')
        page = int(request.args.get('page', 1))
        per_page = 50
        
        # Get detailed results
        detailed_results = ReconciliationReport.get_detailed_results(
            status_filter=status_filter, 
            limit=per_page * page
        )
        
        # Get summary for filters
        summary = ReconciliationReport.get_summary()
        
        return render_template('recon/results.html', 
                             results=detailed_results,
                             summary=summary,
                             current_status=status_filter,
                             current_page=page)
        
    except Exception as e:
        flash(f'Error loading reconciliation results: {str(e)}', 'error')
        return render_template('recon/results.html', 
                             results=[],
                             summary={},
                             current_status=None,
                             current_page=1)

@recon_bp.route('/anomalies')
@login_required
def anomalies():
    """Anomalies and exceptions page."""
    try:
        # Get anomaly results only
        anomaly_results = ReconciliationReport.get_detailed_results(
            status_filter='ANOMALY', 
            limit=100
        )
        
        # Get summary for anomaly breakdown
        summary = ReconciliationReport.get_summary()
        
        return render_template('recon/anomalies.html', 
                             anomalies=anomaly_results,
                             summary=summary)
        
    except Exception as e:
        flash(f'Error loading anomalies: {str(e)}', 'error')
        return render_template('recon/anomalies.html', 
                             anomalies=[],
                             summary={})

@recon_bp.route('/api/summary')
@login_required
def api_summary():
    """API endpoint for reconciliation summary."""
    try:
        date_filter = request.args.get('date')
        summary = ReconciliationReport.get_summary(date_filter)
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@recon_bp.route('/resolve/<int:result_id>', methods=['POST'])
@login_required
def resolve_anomaly(result_id):
    """Mark anomaly as resolved."""
    try:
        from config.database import execute_query
        from config.constants import TRANSACTION_STATUS_RESOLVED
        
        query = """
            UPDATE reconciliation_results 
            SET status = ?, resolved_at = GETUTCDATE() 
            WHERE id = ?
        """
        execute_query(query, (TRANSACTION_STATUS_RESOLVED, result_id))
        
        flash('Anomaly marked as resolved.', 'success')
        logging.info(f"Anomaly {result_id} marked as resolved", 
                    extra={'category': LOG_RECON})
        
    except Exception as e:
        flash(f'Error resolving anomaly: {str(e)}', 'error')
        logging.error(f"Error resolving anomaly {result_id}: {str(e)}", 
                     extra={'category': LOG_RECON})
    
    return redirect(url_for('recon.anomalies'))