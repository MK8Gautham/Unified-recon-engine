-- Collection Reconciliation System - Initial Schema
-- Creates all core tables with proper relationships and constraints

-- Users table for authentication
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Channels table (BBPS, PG, WhatsApp, etc.)
CREATE TABLE channels (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETUTCDATE()
);

-- Channel configurations for field mappings
CREATE TABLE channel_configs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    channel_id INT NOT NULL,
    field_mappings_json NVARCHAR(MAX) NOT NULL,
    file_format NVARCHAR(20) NOT NULL,
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

-- MPR file uploads
CREATE TABLE mpr_uploads (
    id INT IDENTITY(1,1) PRIMARY KEY,
    channel_id INT NOT NULL,
    filename NVARCHAR(255) NOT NULL,
    upload_date DATETIME2 DEFAULT GETUTCDATE(),
    total_transactions INT DEFAULT 0,
    total_amount DECIMAL(18,2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'PENDING',
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);

-- Individual MPR transactions
CREATE TABLE mpr_transactions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    upload_id INT NOT NULL,
    utr NVARCHAR(50),
    transaction_id NVARCHAR(100),
    transaction_time DATETIME2,
    reference_id NVARCHAR(100),
    amount DECIMAL(18,2),
    settlement_account NVARCHAR(50),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (upload_id) REFERENCES mpr_uploads(id)
);

-- Internal transaction data uploads
CREATE TABLE internal_uploads (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL,
    upload_date DATETIME2 DEFAULT GETUTCDATE(),
    total_transactions INT DEFAULT 0,
    total_amount DECIMAL(18,2) DEFAULT 0
);

-- Internal transactions
CREATE TABLE internal_transactions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    upload_id INT NOT NULL,
    transaction_id NVARCHAR(100),
    transaction_time DATETIME2,
    amount DECIMAL(18,2),
    reference_id NVARCHAR(100),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (upload_id) REFERENCES internal_uploads(id)
);

-- Bank statement uploads
CREATE TABLE bank_statement_uploads (
    id INT IDENTITY(1,1) PRIMARY KEY,
    filename NVARCHAR(255) NOT NULL,
    upload_date DATETIME2 DEFAULT GETUTCDATE(),
    total_credits DECIMAL(18,2) DEFAULT 0,
    total_debits DECIMAL(18,2) DEFAULT 0
);

-- Bank transactions
CREATE TABLE bank_transactions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    upload_id INT NOT NULL,
    transaction_date DATETIME2,
    amount DECIMAL(18,2),
    utr NVARCHAR(50),
    description NVARCHAR(500),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    FOREIGN KEY (upload_id) REFERENCES bank_statement_uploads(id)
);

-- Reconciliation results
CREATE TABLE reconciliation_results (
    id INT IDENTITY(1,1) PRIMARY KEY,
    mpr_transaction_id INT,
    internal_transaction_id INT,
    bank_transaction_id INT,
    status NVARCHAR(20) DEFAULT 'PENDING',
    anomaly_type NVARCHAR(50),
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    resolved_at DATETIME2,
    FOREIGN KEY (mpr_transaction_id) REFERENCES mpr_transactions(id),
    FOREIGN KEY (internal_transaction_id) REFERENCES internal_transactions(id),
    FOREIGN KEY (bank_transaction_id) REFERENCES bank_transactions(id)
);

-- Create indexes for performance
CREATE INDEX IX_mpr_transactions_utr ON mpr_transactions(utr);
CREATE INDEX IX_mpr_transactions_transaction_id ON mpr_transactions(transaction_id);
CREATE INDEX IX_mpr_transactions_upload_id ON mpr_transactions(upload_id);
CREATE INDEX IX_internal_transactions_transaction_id ON internal_transactions(transaction_id);
CREATE INDEX IX_bank_transactions_utr ON bank_transactions(utr);
CREATE INDEX IX_reconciliation_results_status ON reconciliation_results(status);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password_hash) 
VALUES ('admin', 'pbkdf2:sha256:260000$salt$hash'); -- This will be properly hashed in the app

-- Insert default channels
INSERT INTO channels (name, description) VALUES 
('BBPS', 'Bharat Bill Payment System'),
('Payment Gateway', 'Online Payment Gateway'),
('WhatsApp', 'WhatsApp Bill Payments');