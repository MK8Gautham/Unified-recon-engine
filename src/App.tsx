import React, { useState, useRef } from 'react';
import { 
  BarChart3, Upload, Database, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, DollarSign, Activity, Settings, Users, FileText, PieChart,
  Download, Play, RefreshCw, Eye, X, Check, AlertCircle, MapPin,
  CreditCard, ArrowUpCircle, ArrowDownCircle, Minus, Plus
} from 'lucide-react';

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  utr?: string;
  timestamp: string;
  status: 'matched' | 'unmatched' | 'anomaly' | 'refunded' | 'credit_adjusted';
  source: 'mpr' | 'internal' | 'bank';
  matchedWith?: string[];
  anomalyReason?: string;
  bankAmount?: number;
  settlementStatus?: 'settled' | 'pending' | 'failed' | 'refunded' | 'adjusted';
}

interface BankReconciliationSummary {
  totalBankCredits: number;
  totalBankDebits: number;
  totalMPRAmount: number;
  totalInternalAmount: number;
  successfulSettlements: number;
  refundedTransactions: number;
  creditAdjustments: number;
  pendingSettlements: number;
  settlementVariance: number;
  netSettlement: number;
}

interface ReconciliationResult {
  totalTransactions: number;
  matchedCount: number;
  unmatchedCount: number;
  anomalyCount: number;
  matchRate: number;
  bankReconciliation: BankReconciliationSummary;
  anomalies: Array<{
    id: string;
    type: 'amount_mismatch' | 'missing_internal' | 'missing_mpr' | 'duplicate' | 'settlement_mismatch';
    description: string;
    mprAmount?: number;
    internalAmount?: number;
    bankAmount?: number;
    transactionId: string;
  }>;
  transactions: Transaction[];
}

interface FieldMapping {
  [key: string]: string;
}

interface FileConfig {
  columns: string[];
  mapping: FieldMapping;
  preview: any[];
}

// Enhanced sample data with bank reconciliation scenarios
const sampleMPRData = `transaction_id,amount,utr,timestamp,reference_id
TXN001,1000.00,UTR123456789,2024-01-15 10:30:00,REF001
TXN002,2500.50,UTR123456790,2024-01-15 11:45:00,REF002
TXN003,750.25,UTR123456791,2024-01-15 12:15:00,REF003
TXN004,3200.00,UTR123456792,2024-01-15 13:30:00,REF004
TXN005,1850.75,UTR123456793,2024-01-15 14:20:00,REF005
TXN006,950.00,UTR123456794,2024-01-15 15:10:00,REF006
TXN007,4500.00,UTR123456795,2024-01-15 16:45:00,REF007
TXN008,1200.00,UTR123456796,2024-01-15 17:30:00,REF008
TXN009,800.00,UTR123456797,2024-01-15 18:15:00,REF009
TXN010,2200.00,UTR123456798,2024-01-15 19:00:00,REF010`;

const sampleInternalData = `transaction_id,amount,timestamp,reference_id
TXN001,1000.00,2024-01-15 10:30:00,REF001
TXN002,2450.50,2024-01-15 11:45:00,REF002
TXN003,750.25,2024-01-15 12:15:00,REF003
TXN004,3200.00,2024-01-15 13:30:00,REF004
TXN005,1850.75,2024-01-15 14:20:00,REF005
TXN008,1200.00,2024-01-15 17:30:00,REF008
TXN009,800.00,2024-01-15 18:15:00,REF009
TXN010,2200.00,2024-01-15 19:00:00,REF010`;

// Enhanced bank data with various transaction types
const sampleBankData = `transaction_date,amount,utr,description,type
2024-01-15,1000.00,UTR123456789,NEFT Credit - Customer Payment,CREDIT
2024-01-15,2450.50,UTR123456790,IMPS Credit - Bill Payment,CREDIT
2024-01-15,750.25,UTR123456791,UPI Credit - Mobile Recharge,CREDIT
2024-01-15,3200.00,UTR123456792,RTGS Credit - Bulk Payment,CREDIT
2024-01-15,1850.75,UTR123456793,NEFT Credit - Utility Payment,CREDIT
2024-01-15,950.00,UTR123456794,UPI Credit - Online Purchase,CREDIT
2024-01-15,-500.00,UTR123456799,Refund - Failed Transaction,DEBIT
2024-01-15,1200.00,UTR123456796,NEFT Credit - Service Payment,CREDIT
2024-01-15,800.00,UTR123456797,UPI Credit - Subscription,CREDIT
2024-01-15,2200.00,UTR123456798,RTGS Credit - Invoice Payment,CREDIT
2024-01-15,-150.00,,Bank Charges - Processing Fee,DEBIT
2024-01-15,75.00,,Credit Adjustment - Cashback,CREDIT`;

const sampleMPRDataAlt = `TXN_ID,AMOUNT,UTR_NUMBER,TXN_TIME,REF_NUMBER
TXN001,1000.00,UTR123456789,2024-01-15 10:30:00,REF001
TXN002,2500.50,UTR123456790,2024-01-15 11:45:00,REF002
TXN003,750.25,UTR123456791,2024-01-15 12:15:00,REF003
TXN004,3200.00,UTR123456792,2024-01-15 13:30:00,REF004
TXN005,1850.75,UTR123456793,2024-01-15 14:20:00,REF005
TXN006,950.00,UTR123456794,2024-01-15 15:10:00,REF006
TXN007,4500.00,UTR123456795,2024-01-15 16:45:00,REF007`;

const sampleInternalDataAlt = `TRANS_ID,AMT,DATETIME,REFERENCE
TXN001,1000.00,2024-01-15 10:30:00,REF001
TXN002,2450.50,2024-01-15 11:45:00,REF002
TXN003,750.25,2024-01-15 12:15:00,REF003
TXN004,3200.00,2024-01-15 13:30:00,REF004
TXN005,1850.75,2024-01-15 14:20:00,REF005
TXN008,1200.00,2024-01-15 17:30:00,REF008`;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadedFiles, setUploadedFiles] = useState<{
    mpr?: File;
    internal?: File;
    bank?: File;
  }>({});
  const [fileConfigs, setFileConfigs] = useState<{
    mpr?: FileConfig;
    internal?: FileConfig;
    bank?: FileConfig;
  }>({});
  const [showMappingModal, setShowMappingModal] = useState<{
    type: 'mpr' | 'internal' | 'bank' | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const mprFileRef = useRef<HTMLInputElement>(null);
  const internalFileRef = useRef<HTMLInputElement>(null);
  const bankFileRef = useRef<HTMLInputElement>(null);

  const downloadSampleFile = (type: 'mpr' | 'internal' | 'bank', variant: 'standard' | 'alt' = 'standard') => {
    let content = '';
    let filename = '';
    
    switch (type) {
      case 'mpr':
        content = variant === 'alt' ? sampleMPRDataAlt : sampleMPRData;
        filename = `sample_mpr_data${variant === 'alt' ? '_alt_columns' : ''}.csv`;
        break;
      case 'internal':
        content = variant === 'alt' ? sampleInternalDataAlt : sampleInternalData;
        filename = `sample_internal_data${variant === 'alt' ? '_alt_columns' : ''}.csv`;
        break;
      case 'bank':
        content = sampleBankData;
        filename = 'sample_bank_data.csv';
        break;
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const parseCSV = (content: string): any[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index]?.trim() || '';
      });
      return obj;
    });
  };

  const detectFieldMapping = (columns: string[]): FieldMapping => {
    const mapping: FieldMapping = {};
    
    const fieldPatterns = {
      transaction_id: ['transaction_id', 'txn_id', 'trans_id', 'id', 'transaction_number'],
      amount: ['amount', 'amt', 'value', 'transaction_amount', 'txn_amount'],
      utr: ['utr', 'utr_number', 'utr_no', 'reference_number', 'bank_ref'],
      timestamp: ['timestamp', 'transaction_time', 'txn_time', 'datetime', 'date_time', 'created_at'],
      reference_id: ['reference_id', 'ref_id', 'reference', 'ref_number', 'ref_no'],
      settlement_account: ['settlement_account', 'account', 'account_number', 'settlement_ac'],
      description: ['description', 'desc', 'narration', 'remarks', 'details'],
      type: ['type', 'transaction_type', 'txn_type', 'category']
    };

    Object.entries(fieldPatterns).forEach(([field, patterns]) => {
      const matchedColumn = columns.find(col => 
        patterns.some(pattern => col.toLowerCase().includes(pattern.toLowerCase()))
      );
      if (matchedColumn) {
        mapping[field] = matchedColumn;
      }
    });

    return mapping;
  };

  const handleFileUpload = async (type: 'mpr' | 'internal' | 'bank', file: File) => {
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    
    try {
      const content = await file.text();
      const data = parseCSV(content);
      const columns = Object.keys(data[0] || {});
      const mapping = detectFieldMapping(columns);
      
      setFileConfigs(prev => ({
        ...prev,
        [type]: {
          columns,
          mapping,
          preview: data.slice(0, 3)
        }
      }));
    } catch (error) {
      console.error('Error parsing file:', error);
    }
  };

  const openMappingModal = (type: 'mpr' | 'internal' | 'bank') => {
    setShowMappingModal({ type, isOpen: true });
  };

  const closeMappingModal = () => {
    setShowMappingModal({ type: null, isOpen: false });
  };

  const updateFieldMapping = (field: string, column: string) => {
    if (!showMappingModal.type) return;
    
    setFileConfigs(prev => ({
      ...prev,
      [showMappingModal.type!]: {
        ...prev[showMappingModal.type!]!,
        mapping: {
          ...prev[showMappingModal.type!]!.mapping,
          [field]: column
        }
      }
    }));
  };

  const performReconciliation = async () => {
    if (!uploadedFiles.mpr || !uploadedFiles.internal) {
      alert('Please upload both MPR and Internal data files to perform reconciliation');
      return;
    }

    setIsReconciling(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const mprContent = await uploadedFiles.mpr.text();
      const internalContent = await uploadedFiles.internal.text();
      const bankContent = uploadedFiles.bank ? await uploadedFiles.bank.text() : '';

      const mprData = parseCSV(mprContent);
      const internalData = parseCSV(internalContent);
      const bankData = bankContent ? parseCSV(bankContent) : [];

      // Apply field mappings
      const mprConfig = fileConfigs.mpr;
      const internalConfig = fileConfigs.internal;
      const bankConfig = fileConfigs.bank;

      const mapData = (data: any[], config?: FileConfig) => {
        if (!config) return data;
        return data.map(row => {
          const mapped: any = {};
          Object.entries(config.mapping).forEach(([field, column]) => {
            if (column && row[column] !== undefined) {
              mapped[field] = row[column];
            }
          });
          return { ...row, ...mapped };
        });
      };

      const mappedMprData = mapData(mprData, mprConfig);
      const mappedInternalData = mapData(internalData, internalConfig);
      const mappedBankData = mapData(bankData, bankConfig);

      // Enhanced reconciliation with bank statement analysis
      const transactions: Transaction[] = [];
      const anomalies: any[] = [];
      let matchedCount = 0;
      let unmatchedCount = 0;

      // Calculate bank reconciliation summary
      const bankCredits = mappedBankData.filter(b => parseFloat(b.amount || '0') > 0);
      const bankDebits = mappedBankData.filter(b => parseFloat(b.amount || '0') < 0);
      
      const totalBankCredits = bankCredits.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0);
      const totalBankDebits = Math.abs(bankDebits.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0));
      const totalMPRAmount = mappedMprData.reduce((sum, m) => sum + parseFloat(m.amount || '0'), 0);
      const totalInternalAmount = mappedInternalData.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);

      let successfulSettlements = 0;
      let refundedTransactions = 0;
      let creditAdjustments = 0;
      let pendingSettlements = 0;

      // Process MPR transactions with enhanced bank matching
      mappedMprData.forEach(mprTxn => {
        const internalMatch = mappedInternalData.find(intTxn => 
          intTxn.transaction_id === mprTxn.transaction_id
        );
        
        const bankMatch = mappedBankData.find(bankTxn => 
          bankTxn.utr === mprTxn.utr && parseFloat(bankTxn.amount || '0') > 0
        );

        let status: Transaction['status'] = 'unmatched';
        let settlementStatus: Transaction['settlementStatus'] = 'pending';
        let anomalyReason = '';
        const matchedWith: string[] = [];

        if (internalMatch) {
          matchedWith.push('internal');
          const mprAmount = parseFloat(mprTxn.amount);
          const internalAmount = parseFloat(internalMatch.amount);
          
          if (Math.abs(mprAmount - internalAmount) > 0.01) {
            status = 'anomaly';
            anomalyReason = 'Amount mismatch between MPR and Internal data';
            anomalies.push({
              id: `anomaly_${mprTxn.transaction_id}`,
              type: 'amount_mismatch',
              description: `Amount mismatch: MPR ₹${mprAmount} vs Internal ₹${internalAmount}`,
              mprAmount,
              internalAmount,
              transactionId: mprTxn.transaction_id
            });
          } else {
            status = 'matched';
            matchedCount++;
          }
        } else {
          status = 'anomaly';
          anomalyReason = 'No matching internal transaction found';
          anomalies.push({
            id: `anomaly_${mprTxn.transaction_id}`,
            type: 'missing_internal',
            description: `MPR transaction ${mprTxn.transaction_id} has no matching internal record`,
            transactionId: mprTxn.transaction_id
          });
        }

        // Enhanced bank matching with settlement analysis
        if (bankMatch) {
          matchedWith.push('bank');
          const bankAmount = parseFloat(bankMatch.amount);
          const mprAmount = parseFloat(mprTxn.amount);
          
          if (Math.abs(bankAmount - mprAmount) <= 0.01) {
            settlementStatus = 'settled';
            successfulSettlements++;
          } else {
            settlementStatus = 'failed';
            anomalies.push({
              id: `settlement_${mprTxn.transaction_id}`,
              type: 'settlement_mismatch',
              description: `Settlement amount mismatch: Expected ₹${mprAmount}, Settled ₹${bankAmount}`,
              mprAmount,
              bankAmount,
              transactionId: mprTxn.transaction_id
            });
          }
        } else {
          // Check for refunds
          const refundMatch = mappedBankData.find(bankTxn => 
            bankTxn.utr === mprTxn.utr && parseFloat(bankTxn.amount || '0') < 0
          );
          
          if (refundMatch) {
            status = 'refunded';
            settlementStatus = 'refunded';
            refundedTransactions++;
            matchedWith.push('bank_refund');
          } else {
            pendingSettlements++;
          }
        }

        if (status === 'unmatched' && matchedWith.length === 0) {
          unmatchedCount++;
        }

        transactions.push({
          id: mprTxn.transaction_id,
          transactionId: mprTxn.transaction_id,
          amount: parseFloat(mprTxn.amount),
          utr: mprTxn.utr,
          timestamp: mprTxn.timestamp,
          status,
          source: 'mpr',
          matchedWith,
          anomalyReason,
          bankAmount: bankMatch ? parseFloat(bankMatch.amount) : undefined,
          settlementStatus
        });
      });

      // Process credit adjustments and bank-only transactions
      mappedBankData.forEach(bankTxn => {
        const amount = parseFloat(bankTxn.amount || '0');
        if (!bankTxn.utr && amount !== 0) {
          if (amount > 0) {
            creditAdjustments++;
            transactions.push({
              id: `bank_credit_${Date.now()}_${Math.random()}`,
              transactionId: `BANK_CREDIT_${creditAdjustments}`,
              amount: amount,
              timestamp: bankTxn.transaction_date || new Date().toISOString(),
              status: 'credit_adjusted',
              source: 'bank',
              matchedWith: [],
              settlementStatus: 'settled'
            });
          } else {
            // Bank charges or fees
            transactions.push({
              id: `bank_charge_${Date.now()}_${Math.random()}`,
              transactionId: `BANK_CHARGE_${Math.abs(amount)}`,
              amount: amount,
              timestamp: bankTxn.transaction_date || new Date().toISOString(),
              status: 'credit_adjusted',
              source: 'bank',
              matchedWith: [],
              settlementStatus: 'settled'
            });
          }
        }
      });

      // Check for internal transactions without MPR match
      mappedInternalData.forEach(intTxn => {
        const mprMatch = mappedMprData.find(mprTxn => 
          mprTxn.transaction_id === intTxn.transaction_id
        );
        
        if (!mprMatch) {
          anomalies.push({
            id: `anomaly_internal_${intTxn.transaction_id}`,
            type: 'missing_mpr',
            description: `Internal transaction ${intTxn.transaction_id} has no matching MPR record`,
            transactionId: intTxn.transaction_id
          });

          transactions.push({
            id: `internal_${intTxn.transaction_id}`,
            transactionId: intTxn.transaction_id,
            amount: parseFloat(intTxn.amount),
            timestamp: intTxn.timestamp,
            status: 'anomaly',
            source: 'internal',
            matchedWith: [],
            anomalyReason: 'No matching MPR transaction found',
            settlementStatus: 'pending'
          });
        }
      });

      const totalTransactions = transactions.length;
      const anomalyCount = anomalies.length;
      const matchRate = totalTransactions > 0 ? (matchedCount / mappedMprData.length) * 100 : 0;
      const settlementVariance = totalBankCredits - totalMPRAmount;
      const netSettlement = totalBankCredits - totalBankDebits;

      const bankReconciliation: BankReconciliationSummary = {
        totalBankCredits,
        totalBankDebits,
        totalMPRAmount,
        totalInternalAmount,
        successfulSettlements,
        refundedTransactions,
        creditAdjustments,
        pendingSettlements,
        settlementVariance,
        netSettlement
      };

      const result: ReconciliationResult = {
        totalTransactions,
        matchedCount,
        unmatchedCount,
        anomalyCount,
        matchRate,
        bankReconciliation,
        anomalies,
        transactions
      };

      setReconciliationResult(result);
      setActiveTab('results');
    } catch (error) {
      alert('Error processing files. Please check the file format.');
    } finally {
      setIsReconciling(false);
    }
  };

  const FieldMappingModal = () => {
    if (!showMappingModal.isOpen || !showMappingModal.type) return null;
    
    const config = fileConfigs[showMappingModal.type];
    if (!config) return null;

    const requiredFields = showMappingModal.type === 'mpr' 
      ? ['transaction_id', 'amount']
      : showMappingModal.type === 'internal'
      ? ['transaction_id', 'amount']
      : ['amount'];

    const optionalFields = showMappingModal.type === 'mpr'
      ? ['utr', 'timestamp', 'reference_id', 'settlement_account']
      : showMappingModal.type === 'internal'
      ? ['timestamp', 'reference_id']
      : ['timestamp', 'utr', 'description', 'type'];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Configure Field Mapping - {showMappingModal.type.toUpperCase()} Data
                </h3>
                <p className="text-gray-600 mt-1">Map your file columns to system fields</p>
              </div>
              <button
                onClick={closeMappingModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">File Preview</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {config.columns.map((col, index) => (
                            <th key={index} className="px-3 py-2 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {config.preview.map((row, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            {config.columns.map((col, colIndex) => (
                              <td key={colIndex} className="px-3 py-2 text-gray-600 border-r border-gray-200 last:border-r-0">
                                {row[col] || '-'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Field Mapping */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Field Mapping</h4>
                <div className="space-y-4">
                  {/* Required Fields */}
                  <div>
                    <h5 className="text-sm font-medium text-red-600 mb-2">Required Fields</h5>
                    {requiredFields.map(field => (
                      <div key={field} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {field.replace('_', ' ')}
                          </span>
                          {config.mapping[field] ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <select
                          value={config.mapping[field] || ''}
                          onChange={(e) => updateFieldMapping(field, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select column...</option>
                          {config.columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Optional Fields */}
                  <div>
                    <h5 className="text-sm font-medium text-blue-600 mb-2">Optional Fields</h5>
                    {optionalFields.map(field => (
                      <div key={field} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {field.replace('_', ' ')}
                          </span>
                          {config.mapping[field] && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <select
                          value={config.mapping[field] || ''}
                          onChange={(e) => updateFieldMapping(field, e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select column...</option>
                          {config.columns.map(col => (
                            <option key={col} value={col}>{col}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={closeMappingModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={closeMappingModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Collection Recon</h1>
            <p className="text-sm text-gray-500">Live Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'upload', label: 'Upload & Reconcile', icon: Upload },
          { id: 'results', label: 'Results', icon: CheckCircle, disabled: !reconciliationResult }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => !item.disabled && setActiveTab(item.id)}
            disabled={item.disabled}
            className={`w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
              activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-600' : 
              item.disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );

  const DashboardContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Reconciliation Dashboard</h2>
          <p className="text-gray-600 mt-1">Upload files and perform real-time reconciliation with bank settlement analysis</p>
        </div>
        <button 
          onClick={() => setActiveTab('upload')}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Upload className="w-5 h-5" />
          <span>Start Reconciliation</span>
        </button>
      </div>

      {reconciliationResult ? (
        <>
          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{reconciliationResult.totalTransactions}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Matched</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{reconciliationResult.matchedCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-50">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Match Rate</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{reconciliationResult.matchRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Anomalies</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{reconciliationResult.anomalyCount}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Reconciliation Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span>Bank Settlement Summary</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <ArrowUpCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Bank Credits</p>
                <p className="text-xl font-bold text-green-600">₹{reconciliationResult.bankReconciliation.totalBankCredits.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <ArrowDownCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Total Bank Debits</p>
                <p className="text-xl font-bold text-red-600">₹{reconciliationResult.bankReconciliation.totalBankDebits.toLocaleString()}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Successful Settlements</p>
                <p className="text-xl font-bold text-blue-600">{reconciliationResult.bankReconciliation.successfulSettlements}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Plus className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Credit Adjustments</p>
                <p className="text-xl font-bold text-purple-600">{reconciliationResult.bankReconciliation.creditAdjustments}</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Settlement Variance</p>
                <p className={`text-lg font-bold ${reconciliationResult.bankReconciliation.settlementVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{reconciliationResult.bankReconciliation.settlementVariance.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Refunded Transactions</p>
                <p className="text-lg font-bold text-orange-600">{reconciliationResult.bankReconciliation.refundedTransactions}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Net Settlement</p>
                <p className="text-lg font-bold text-blue-600">₹{reconciliationResult.bankReconciliation.netSettlement.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Reconciliation Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Reconciliation</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">MPR Amount</span>
                  <span className="font-semibold">₹{reconciliationResult.bankReconciliation.totalMPRAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Internal Amount</span>
                  <span className="font-semibold">₹{reconciliationResult.bankReconciliation.totalInternalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Bank Credits</span>
                  <span className="font-semibold text-green-600">₹{reconciliationResult.bankReconciliation.totalBankCredits.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Match Rate</span>
                    <span className="font-bold text-blue-600">{reconciliationResult.matchRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                      style={{ width: `${reconciliationResult.matchRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Settlement Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Settled</span>
                  </div>
                  <span className="text-green-600 font-bold">{reconciliationResult.bankReconciliation.successfulSettlements}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Minus className="w-5 h-5 text-orange-600" />
                    <span className="text-orange-800 font-medium">Refunded</span>
                  </div>
                  <span className="text-orange-600 font-bold">{reconciliationResult.bankReconciliation.refundedTransactions}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-800 font-medium">Pending</span>
                  </div>
                  <span className="text-yellow-600 font-bold">{reconciliationResult.bankReconciliation.pendingSettlements}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Plus className="w-5 h-5 text-purple-600" />
                    <span className="text-purple-800 font-medium">Adjustments</span>
                  </div>
                  <span className="text-purple-600 font-bold">{reconciliationResult.bankReconciliation.creditAdjustments}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
          <Upload className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h3 className="text-2xl font-bold mb-2">Ready to Start?</h3>
          <p className="text-blue-100 mb-6">Upload your MPR, Internal data, and Bank statement files to begin comprehensive reconciliation</p>
          <button 
            onClick={() => setActiveTab('upload')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Upload Files Now
          </button>
        </div>
      )}
    </div>
  );

  const UploadContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Upload & Reconcile</h2>
        <p className="text-gray-600 mt-1">Upload your data files and perform comprehensive reconciliation with bank settlement analysis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MPR Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">MPR Data</h3>
              <p className="text-sm text-gray-500">Merchant Payment Report</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex space-x-2">
              <button
                onClick={() => downloadSampleFile('mpr', 'standard')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Standard</span>
              </button>
              <button
                onClick={() => downloadSampleFile('mpr', 'alt')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Alt Format</span>
              </button>
            </div>
            
            <input
              ref={mprFileRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileUpload('mpr', e.target.files[0])}
              className="hidden"
            />
            
            <button
              onClick={() => mprFileRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload File</span>
            </button>
            
            {uploadedFiles.mpr && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  <span>{uploadedFiles.mpr.name}</span>
                </div>
                {fileConfigs.mpr && (
                  <button
                    onClick={() => openMappingModal('mpr')}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Configure Mapping</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Internal Data Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Internal Data</h3>
              <p className="text-sm text-gray-500">Internal Transaction Records</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex space-x-2">
              <button
                onClick={() => downloadSampleFile('internal', 'standard')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Standard</span>
              </button>
              <button
                onClick={() => downloadSampleFile('internal', 'alt')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Alt Format</span>
              </button>
            </div>
            
            <input
              ref={internalFileRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileUpload('internal', e.target.files[0])}
              className="hidden"
            />
            
            <button
              onClick={() => internalFileRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload File</span>
            </button>
            
            {uploadedFiles.internal && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  <span>{uploadedFiles.internal.name}</span>
                </div>
                {fileConfigs.internal && (
                  <button
                    onClick={() => openMappingModal('internal')}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Configure Mapping</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Data Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bank Statement</h3>
              <p className="text-sm text-gray-500">Settlement & Refund Analysis</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => downloadSampleFile('bank')}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download Sample</span>
            </button>
            
            <input
              ref={bankFileRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileUpload('bank', e.target.files[0])}
              className="hidden"
            />
            
            <button
              onClick={() => bankFileRef.current?.click()}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm">Upload File</span>
            </button>
            
            {uploadedFiles.bank && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Check className="w-4 h-4" />
                  <span>{uploadedFiles.bank.name}</span>
                </div>
                {fileConfigs.bank && (
                  <button
                    onClick={() => openMappingModal('bank')}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Configure Mapping</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reconciliation Action */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-2">Ready to Reconcile?</h3>
            <p className="text-blue-100">
              {uploadedFiles.mpr && uploadedFiles.internal 
                ? 'All required files uploaded. Bank statement will enhance settlement analysis.' 
                : 'Upload MPR and Internal data files to begin. Bank statement is optional but recommended.'}
            </p>
          </div>
          <button
            onClick={performReconciliation}
            disabled={!uploadedFiles.mpr || !uploadedFiles.internal || isReconciling}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isReconciling ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start Reconciliation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Enhanced File Format Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">File Format Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-blue-600 mb-2">MPR Data Format</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• transaction_id (required)</li>
              <li>• amount (required)</li>
              <li>• utr (recommended)</li>
              <li>• timestamp (optional)</li>
              <li>• reference_id (optional)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-600 mb-2">Internal Data Format</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• transaction_id (required)</li>
              <li>• amount (required)</li>
              <li>• timestamp (optional)</li>
              <li>• reference_id (optional)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-600 mb-2">Bank Statement Format</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• amount (required)</li>
              <li>• transaction_date (optional)</li>
              <li>• utr (recommended)</li>
              <li>• description (optional)</li>
              <li>• type (optional)</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Bank Statement Enhancement:</strong> Including bank statement data enables comprehensive settlement analysis, 
            refund tracking, and credit adjustment identification for complete financial reconciliation.
          </p>
        </div>
      </div>
    </div>
  );

  const ResultsContent = () => {
    if (!reconciliationResult) {
      return (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Available</h3>
          <p className="text-gray-600">Run a reconciliation first to see results here.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Reconciliation Results</h2>
            <p className="text-gray-600 mt-1">Comprehensive analysis with bank settlement details</p>
          </div>
          <button 
            onClick={() => setActiveTab('upload')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Run New Reconciliation</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{reconciliationResult.totalTransactions}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Matched</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{reconciliationResult.matchedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Match Rate</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{reconciliationResult.matchRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Anomalies</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{reconciliationResult.anomalyCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Bank Settlement Analysis */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>Bank Settlement Analysis</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <ArrowUpCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Total Bank Credits</p>
              <p className="text-xl font-bold text-green-600">₹{reconciliationResult.bankReconciliation.totalBankCredits.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <ArrowDownCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Total Bank Debits</p>
              <p className="text-xl font-bold text-red-600">₹{reconciliationResult.bankReconciliation.totalBankDebits.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Successful Settlements</p>
              <p className="text-xl font-bold text-blue-600">{reconciliationResult.bankReconciliation.successfulSettlements}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Plus className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-1">Credit Adjustments</p>
              <p className="text-xl font-bold text-purple-600">{reconciliationResult.bankReconciliation.creditAdjustments}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Settlement Variance</p>
              <p className={`text-lg font-bold ${reconciliationResult.bankReconciliation.settlementVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reconciliationResult.bankReconciliation.settlementVariance >= 0 ? '+' : ''}₹{reconciliationResult.bankReconciliation.settlementVariance.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Bank Credits vs MPR Amount</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Refunded Transactions</p>
              <p className="text-lg font-bold text-orange-600">{reconciliationResult.bankReconciliation.refundedTransactions}</p>
              <p className="text-xs text-gray-500 mt-1">Failed/Reversed Payments</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Net Settlement</p>
              <p className="text-lg font-bold text-blue-600">₹{reconciliationResult.bankReconciliation.netSettlement.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Credits minus Debits</p>
            </div>
          </div>
        </div>

        {/* Anomalies Section */}
        {reconciliationResult.anomalies.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Detected Anomalies</span>
            </h3>
            <div className="space-y-4">
              {reconciliationResult.anomalies.map((anomaly, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-red-800">
                        {anomaly.type.replace('_', ' ').toUpperCase()}
                      </h4>
                      <p className="text-red-600 text-sm mt-1">{anomaly.description}</p>
                      <p className="text-red-500 text-xs mt-1">Transaction ID: {anomaly.transactionId}</p>
                    </div>
                    {(anomaly.mprAmount || anomaly.internalAmount || anomaly.bankAmount) && (
                      <div className="text-right">
                        {anomaly.mprAmount && <p className="text-sm text-red-700">MPR: ₹{anomaly.mprAmount}</p>}
                        {anomaly.internalAmount && <p className="text-sm text-red-700">Internal: ₹{anomaly.internalAmount}</p>}
                        {anomaly.bankAmount && <p className="text-sm text-red-700">Bank: ₹{anomaly.bankAmount}</p>}
                        {anomaly.mprAmount && anomaly.internalAmount && (
                          <p className="text-xs text-red-600">
                            Diff: ₹{Math.abs(anomaly.mprAmount - anomaly.internalAmount).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Transaction ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Settlement</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Bank Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">UTR</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationResult.transactions.slice(0, 15).map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{transaction.transactionId}</td>
                    <td className="py-3 px-4 text-gray-900">₹{transaction.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'matched' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'anomaly' ? 'bg-red-100 text-red-800' :
                        transaction.status === 'refunded' ? 'bg-orange-100 text-orange-800' :
                        transaction.status === 'credit_adjusted' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.settlementStatus === 'settled' ? 'bg-green-100 text-green-800' :
                        transaction.settlementStatus === 'refunded' ? 'bg-orange-100 text-orange-800' :
                        transaction.settlementStatus === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.settlementStatus?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {transaction.bankAmount ? `₹${transaction.bankAmount.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{transaction.utr || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reconciliationResult.transactions.length > 15 && (
            <p className="text-center text-gray-500 mt-4">
              Showing first 15 of {reconciliationResult.transactions.length} transactions
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'upload':
        return <UploadContent />;
      case 'results':
        return <ResultsContent />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="ml-64 p-8">
        {renderContent()}
      </main>
      <FieldMappingModal />
    </div>
  );
}

export default App;