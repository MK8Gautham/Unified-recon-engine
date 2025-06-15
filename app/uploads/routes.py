"""
Upload routes and views.
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from app.auth.utils import login_required
from app.config.models import Channel
from app.uploads.models import MPRProcessor, MPRUpload
import logging
from config.constants import LOG_UPLOAD

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/mpr', methods=['GET', 'POST'])
@login_required
def mpr():
    """MPR file upload page."""
    channels = Channel.get_all()
    
    if request.method == 'POST':
        channel_id = request.form.get('channel_id')
        file = request.files.get('file')
        
        if not channel_id:
            flash('Please select a channel.', 'error')
            return render_template('uploads/mpr.html', channels=channels)
        
        if not file or file.filename == '':
            flash('Please select a file to upload.', 'error')
            return render_template('uploads/mpr.html', channels=channels)
        
        try:
            channel_id = int(channel_id)
            processor = MPRProcessor(current_app.config['UPLOAD_FOLDER'])
            upload_id, message = processor.process_mpr_file(file, channel_id)
            
            if upload_id:
                flash(message, 'success')
                logging.info(f"MPR file uploaded successfully: {file.filename}", 
                           extra={'category': LOG_UPLOAD})
            else:
                flash(f'Upload failed: {message}', 'error')
                logging.error(f"MPR upload failed: {message}", 
                            extra={'category': LOG_UPLOAD})
                
        except ValueError:
            flash('Invalid channel selected.', 'error')
        except Exception as e:
            flash(f'Upload error: {str(e)}', 'error')
            logging.error(f"MPR upload error: {str(e)}", 
                         extra={'category': LOG_UPLOAD})
    
    return render_template('uploads/mpr.html', channels=channels)

@uploads_bp.route('/internal')
@login_required
def internal():
    """Internal data upload page."""
    # TODO: Implement internal data upload
    return render_template('uploads/internal.html')

@uploads_bp.route('/bank-statement')
@login_required
def bank_statement():
    """Bank statement upload page."""
    # TODO: Implement bank statement upload
    return render_template('uploads/bank_statement.html')

@uploads_bp.route('/history')
@login_required
def history():
    """Upload history page."""
    recent_uploads = MPRUpload.get_recent(50)
    return render_template('uploads/history.html', uploads=recent_uploads)