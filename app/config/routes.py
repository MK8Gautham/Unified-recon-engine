"""
Configuration routes and views.
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from app.auth.utils import login_required
from app.config.models import Channel, ChannelConfig
import logging
from config.constants import LOG_SYSTEM

config_bp = Blueprint('config', __name__)

@config_bp.route('/channels')
@login_required
def channels():
    """Channel configuration page."""
    channels = Channel.get_all()
    return render_template('config/channels.html', channels=channels)

@config_bp.route('/channels/add', methods=['GET', 'POST'])
@login_required
def add_channel():
    """Add new channel."""
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        
        if not name:
            flash('Channel name is required.', 'error')
            return render_template('config/add_channel.html')
        
        if Channel.create(name, description):
            flash(f'Channel "{name}" created successfully.', 'success')
            return redirect(url_for('config.channels'))
        else:
            flash('Error creating channel. Please try again.', 'error')
    
    return render_template('config/add_channel.html')

@config_bp.route('/channels/<int:channel_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_channel(channel_id):
    """Edit channel."""
    channel = Channel.get_by_id(channel_id)
    if not channel:
        flash('Channel not found.', 'error')
        return redirect(url_for('config.channels'))
    
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        description = request.form.get('description', '').strip()
        
        if not name:
            flash('Channel name is required.', 'error')
            return render_template('config/edit_channel.html', channel=channel)
        
        if Channel.update(channel_id, name, description):
            flash(f'Channel "{name}" updated successfully.', 'success')
            return redirect(url_for('config.channels'))
        else:
            flash('Error updating channel. Please try again.', 'error')
    
    return render_template('config/edit_channel.html', channel=channel)

@config_bp.route('/channels/<int:channel_id>/delete', methods=['POST'])
@login_required
def delete_channel(channel_id):
    """Delete channel."""
    channel = Channel.get_by_id(channel_id)
    if not channel:
        flash('Channel not found.', 'error')
        return redirect(url_for('config.channels'))
    
    if Channel.delete(channel_id):
        flash(f'Channel "{channel.name}" deleted successfully.', 'success')
    else:
        flash('Error deleting channel. Please try again.', 'error')
    
    return redirect(url_for('config.channels'))

@config_bp.route('/channels/<int:channel_id>/mapping', methods=['GET', 'POST'])
@login_required
def channel_mapping(channel_id):
    """Configure channel field mapping."""
    channel = Channel.get_by_id(channel_id)
    if not channel:
        flash('Channel not found.', 'error')
        return redirect(url_for('config.channels'))
    
    config = ChannelConfig.get_by_channel_id(channel_id)
    
    if request.method == 'POST':
        file_format = request.form.get('file_format', 'CSV')
        
        # Get field mappings from form
        field_mappings = {
            'utr': request.form.get('utr_field', ''),
            'transaction_id': request.form.get('transaction_id_field', ''),
            'transaction_time': request.form.get('transaction_time_field', ''),
            'reference_id': request.form.get('reference_id_field', ''),
            'amount': request.form.get('amount_field', ''),
            'settlement_account': request.form.get('settlement_account_field', '')
        }
        
        # Validate required fields
        required_fields = ['transaction_id', 'amount']
        missing_fields = [field for field in required_fields if not field_mappings[field]]
        
        if missing_fields:
            flash(f'Required field mappings missing: {", ".join(missing_fields)}', 'error')
            return render_template('config/channel_mapping.html', 
                                 channel=channel, config=config)
        
        if ChannelConfig.create_or_update(channel_id, field_mappings, file_format):
            flash(f'Field mapping for "{channel.name}" saved successfully.', 'success')
            return redirect(url_for('config.channels'))
        else:
            flash('Error saving field mapping. Please try again.', 'error')
    
    return render_template('config/channel_mapping.html', 
                         channel=channel, config=config)