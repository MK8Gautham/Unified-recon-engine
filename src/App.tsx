import React, { useState, useRef } from 'react';
import { 
  BarChart3, Upload, Database, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, DollarSign, Activity, Settings, Users, FileText, PieChart,
  Download, Play, RefreshCw, Eye, X, Check, AlertCircle, MapPin, 
  ArrowRight, Save, RotateCcw
} from 'lucide-react';

interface Transaction {
  id: string;
  transactionId: string;
  amount: number;
  utr?: string;
  timestamp: string;
  status: 'matched' | 'unmatched' | 'anomaly';
  source: 'mpr' | 'internal' | 'bank';
  matchedWith?: string[];
  anomalyReason?: string;
}

interface FieldMapping {
  systemField: string;
  fileColumn: string;
  required: boolean;
  description: string;
}

interface FileConfig {
  name: string;
  mappings: FieldMapping[];
  sampleData?: any[];
  columns?: string[];
}

interface ReconciliationResult {
  totalTransactions: number;
  matchedCount: number;
  unmatchedCount: number;
  anomalyCount: number;
  matchRate: number;
  anomalies: Array<{
    id: string;
    type: 'amount_mismatch' | 'missing_internal' | 'missing_mpr' | 'duplicate';
    description: string;
    mprAmount?: number;
    internalAmount?: number;
    transactionId: string;
  }>;
  transactions: Transaction[];
}

// Sample data for demonstration
const sampleMPRData = `transaction_id,amount,utr,timestamp,reference_id
TXN001,1000.00,UTR123456789,2024-01-15 10:30:00,REF001
TXN002,2500.50,UTR123456790,2024-01-15 11:45:00,REF002
TXN003,750.25,UTR123456791,2024-01-15 12:15:00,REF003
TXN004,3200.00,UTR123456792,2024-01-15 13:30:00,REF004
TXN005,1850.75,UTR123456793,2024-01-15 14:20:00,REF005
TXN006,950.00,UTR123456794,2024-01-15 15:10:00,REF006
TXN007,4500.00,UTR123456795,2024-01-15 16:45:00,REF007`;

const sampleInternalData = `transaction_id,amount,timestamp,reference_id
TXN001,1000.00,2024-01-15 10:30:00,REF001
TXN002,2450.50,2024-01-15 11:45:00,REF002
TXN003,750.25,2024-01-15 12:15:00,REF003
TXN004,3200.00,2024-01-15 13:30:00,REF004
TXN005,1850.75,2024-01-15 14:20:00,REF005
TXN008,1200.00,2024-01-15 17:30:00,REF008`;

const sampleBankData = `transaction_date,amount,utr,description
2024-01-15,1000.00,UTR123456789,NEFT Credit
2024-01-15,2450.50,UTR123456790,IMPS Credit
2024-01-15,750.25,UTR123456791,UPI Credit
2024-01-15,3200.00,UTR123456792,RTGS Credit
2024-01-15,1850.75,UTR123456793,NEFT Credit
2024-01-15,950.00,UTR123456794,UPI Credit`;

// Alternative sample files with different column names
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
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState<'mpr' | 'internal' | 'bank' | null>(null);

  const mprFileRef = useRef<HTMLInputElement>(null);
  const internalFileRef = useRef<HTMLInputElement>(null);
  const bankFileRef = useRef<HTMLInputElement>(null);

  // Default field mappings for different file types
  const defaultMappings = {
    mpr: [
      { systemField: 'transaction_id', fileColumn: '', required: true, description: 'Unique transaction identifier' },
      { systemField: 'amount', fileColumn: '', required: true, description: 'Transaction amount' },
      { systemField: 'utr', fileColumn: '', required: false, description: 'Unique Transaction Reference' },
      { systemField: 'transaction_time', fileColumn: '', required: false, description: 'Transaction timestamp' },
      { systemField: 'reference_id', fileColumn: '', required: false, description: 'External reference ID' },
      { systemField: 'settlement_account', fileColumn: '', required: false, description: 'Settlement account number' }
    ],
    internal: [
      { systemField: 'transaction_id', fileColumn: '', required: true, description: 'Unique transaction identifier' },
      { systemField: 'amount', fileColumn: '', required: true, description: 'Transaction amount' },
      { systemField: 'transaction_time', fileColumn: '', required: false, description: 'Transaction timestamp' },
      { systemField: 'reference_id', fileColumn: '', required: false, description: 'Internal reference ID' }
    ],
    bank: [
      { systemField: 'transaction_date', fileColumn: '', required: false, description: 'Transaction date' },
      { systemField: 'amount', fileColumn: '', required: true, description: 'Transaction amount' },
      { systemField: 'utr', fileColumn: '', required: false, description: 'Unique Transaction Reference' },
      { systemField: 'description', fileColumn: '', required: false, description: 'Transaction description' }
    ]
  };

  const downloadSampleFile = (type: 'mpr' | 'internal' | 'bank', variant: 'standard' | 'alternative' = 'standard') => {
    let content = '';
    let filename = '';
    
    switch (type) {
      case 'mpr':
        content = variant === 'alternative' ? sampleMPRDataAlt : sampleMPRData;
        filename = variant === 'alternative' ? 'sample_mpr_data_alt_columns.csv' : 'sample_mpr_data.csv';
        break;
      case 'internal':
        content = variant === 'alternative' ? sampleInternalDataAlt : sampleInternalData;
        filename = variant === 'alternative' ? 'sample_internal_data_alt_columns.csv' : 'sample_internal_data.csv';
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

  const getCSVColumns = (content: string): string[] => {
    const lines = content.trim().split('\n');
    return lines[0].split(',').map(col => col.trim());
  };

  const handleFileUpload = async (type: 'mpr' | 'internal' | 'bank', file: File) => {
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
    
    // Parse file to get columns for mapping
    try {
      const content = await file.text();
      const columns = getCSVColumns(content);
      const sampleData = parseCSV(content).slice(0, 3); // First 3 rows for preview
      
      // Auto-detect common column mappings
      const mappings = defaultMappings[type].map(mapping => {
        const detectedColumn = columns.find(col => {
          const colLower = col.toLowerCase();
          const fieldLower = mapping.systemField.toLowerCase();
          return colLower.includes(fieldLower) || 
                 fieldLower.includes(colLower) ||
                 (mapping.systemField === 'transaction_id' && (colLower.includes('txn') || colLower.includes('trans'))) ||
                 (mapping.systemField === 'amount' && (colLower.includes('amt') || colLower === 'amount')) ||
                 (mapping.systemField === 'utr' && colLower.includes('utr')) ||
                 (mapping.systemField === 'transaction_time' && (colLower.includes('time') || colLower.includes('date'))) ||
                 (mapping.systemField === 'reference_id' && (colLower.includes('ref') || colLower.includes('reference')));
        });
        
        return {
          ...mapping,
          fileColumn: detectedColumn || ''
        };
      });
      
      setFileConfigs(prev => ({
        ...prev,
        [type]: {
          name: file.name,
          mappings,
          sampleData,
          columns
        }
      }));
      
      // Show field mapping interface
      setShowFieldMapping(type);
    } catch (error) {
      alert('Error reading file. Please ensure it\'s a valid CSV file.');
    }
  };

  const updateFieldMapping = (type: 'mpr' | 'internal' | 'bank', systemField: string, fileColumn: string) => {
    setFileConfigs(prev => ({
      ...prev,
      [type]: {
        ...prev[type]!,
        mappings: prev[type]!.mappings.map(mapping =>
          mapping.systemField === systemField
            ? { ...mapping, fileColumn }
            : mapping
        )
      }
    }));
  };

  const validateMappings = (type: 'mpr' | 'internal' | 'bank'): boolean => {
    const config = fileConfigs[type];
    if (!config) return false;
    
    const requiredMappings = config.mappings.filter(m => m.required);
    return requiredMappings.every(m => m.fileColumn !== '');
  };

  const applyFieldMapping = (data: any[], mappings: FieldMapping[]): any[] => {
    return data.map(row => {
      const mappedRow: any = {};
      mappings.forEach(mapping => {
        if (mapping.fileColumn && row[mapping.fileColumn] !== undefined) {
          mappedRow[mapping.systemField] = row[mapping.fileColumn];
        }
      });
      return mappedRow;
    });
  };

  const performReconciliation = async () => {
    if (!uploadedFiles.mpr || !uploadedFiles.internal) {
      alert('Please upload both MPR and Internal data files to perform reconciliation');
      return;
    }

    if (!validateMappings('mpr') || !validateMappings('internal')) {
      alert('Please configure field mappings for all required fields');
      return;
    }

    setIsReconciling(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const mprContent = await uploadedFiles.mpr.text();
      const internalContent = await uploadedFiles.internal.text();
      const bankContent = uploadedFiles.bank ? await uploadedFiles.bank.text() : '';

      const rawMprData = parseCSV(mprContent);
      const rawInternalData = parseCSV(internalContent);
      const rawBankData = bankContent ? parseCSV(bankContent) : [];

      // Apply field mappings
      const mprData = applyFieldMapping(rawMprData, fileConfigs.mpr!.mappings);
      const internalData = applyFieldMapping(rawInternalData, fileConfigs.internal!.mappings);
      const bankData = uploadedFiles.bank && fileConfigs.bank 
        ? applyFieldMapping(rawBankData, fileConfigs.bank.mappings) 
        : rawBankData;

      // Perform reconciliation logic
      const transactions: Transaction[] = [];
      const anomalies: any[] = [];
      let matchedCount = 0;
      let unmatchedCount = 0;

      // Process MPR transactions
      mprData.forEach(mprTxn => {
        const internalMatch = internalData.find(intTxn => 
          intTxn.transaction_id === mprTxn.transaction_id
        );
        
        const bankMatch = bankData.find(bankTxn => 
          bankTxn.utr === mprTxn.utr
        );

        let status: 'matched' | 'unmatched' | 'anomaly' = 'unmatched';
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

        if (bankMatch) {
          matchedWith.push('bank');
        }

        if (status === 'unmatched' && matchedWith.length === 0) {
          unmatchedCount++;
        }

        transactions.push({
          id: mprTxn.transaction_id,
          transactionId: mprTxn.transaction_id,
          amount: parseFloat(mprTxn.amount),
          utr: mprTxn.utr,
          timestamp: mprTxn.transaction_time,
          status,
          source: 'mpr',
          matchedWith,
          anomalyReason
        });
      });

      // Check for internal transactions without MPR match
      internalData.forEach(intTxn => {
        const mprMatch = mprData.find(mprTxn => 
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
            timestamp: intTxn.transaction_time,
            status: 'anomaly',
            source: 'internal',
            matchedWith: [],
            anomalyReason: 'No matching MPR transaction found'
          });
        }
      });

      const totalTransactions = transactions.length;
      const anomalyCount = anomalies.length;
      const matchRate = totalTransactions > 0 ? (matchedCount / totalTransactions) * 100 : 0;

      const result: ReconciliationResult = {
        totalTransactions,
        matchedCount,
        unmatchedCount,
        anomalyCount,
        matchRate,
        anomalies,
        transactions
      };

      setReconciliationResult(result);
      setShowResults(true);
      setActiveTab('results');
    } catch (error) {
      alert('Error processing files. Please check the file format and field mappings.');
    } finally {
      setIsReconciling(false);
    }
  };

  const FieldMappingModal = ({ type }: { type: 'mpr' | 'internal' | 'bank' }) => {
    const config = fileConfigs[type];
    if (!config) return null;

    const typeLabels = {
      mpr: 'MPR Data',
      internal: 'Internal Data', 
      bank: 'Bank Statement'
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Configure Field Mapping</h3>
                <p className="text-gray-600 mt-1">{typeLabels[type]} - {config.name}</p>
              </div>
              <button
                onClick={() => setShowFieldMapping(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Field Mappings */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                  Field Mappings
                </h4>
                <div className="space-y-4">
                  {config.mappings.map((mapping, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-medium text-gray-900 flex items-center">
                          {mapping.systemField.replace('_', ' ').toUpperCase()}
                          {mapping.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {mapping.fileColumn && (
                          <span className="text-green-600 text-sm flex items-center">
                            <Check className="w-4 h-4 mr-1" />
                            Mapped
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{mapping.description}</p>
                      <select
                        value={mapping.fileColumn}
                        onChange={(e) => updateFieldMapping(type, mapping.systemField, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select column...</option>
                        {config.columns?.map(column => (
                          <option key={column} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* File Preview */}
              <div>
                <h4 className="font-medium text-gray-900 mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2 text-green-600" />
                  File Preview
                </h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">First 3 rows from your file:</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {config.columns?.map(column => (
                            <th key={column} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {config.sampleData?.map((row, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            {config.columns?.map(column => (
                              <td key={column} className="px-3 py-2 text-gray-600">
                                {row[column]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mapping Status */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">Mapping Status</h5>
                  <div className="space-y-2">
                    {config.mappings.filter(m => m.required).map(mapping => (
                      <div key={mapping.systemField} className="flex items-center justify-between">
                        <span className="text-sm text-blue-800">{mapping.systemField.replace('_', ' ').toUpperCase()}</span>
                        {mapping.fileColumn ? (
                          <span className="text-green-600 text-sm flex items-center">
                            <Check className="w-4 h-4 mr-1" />
                            {mapping.fileColumn}
                          </span>
                        ) : (
                          <span className="text-red-600 text-sm flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            Required
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setFileConfigs(prev => ({
                      ...prev,
                      [type]: {
                        ...prev[type]!,
                        mappings: defaultMappings[type]
                      }
                    }));
                  }}
                  className="text-gray-600 hover:text-gray-800 flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Default</span>
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFieldMapping(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (validateMappings(type)) {
                      setShowFieldMapping(null);
                    } else {
                      alert('Please map all required fields before saving.');
                    }
                  }}
                  disabled={!validateMappings(type)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Mapping</span>
                </button>
              </div>
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
          <p className="text-gray-600 mt-1">Upload files and perform real-time reconciliation with custom field mapping</p>
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
      ) : (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
          <Upload className="w-16 h-16 mx-auto mb-4 opacity-80" />
          <h3 className="text-2xl font-bold mb-2">Ready to Start?</h3>
          <p className="text-blue-100 mb-6">Upload your files with custom field mapping to begin reconciliation</p>
          <button 
            onClick={() => setActiveTab('upload')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Upload Files Now
          </button>
        </div>
      )}

      {reconciliationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Processed</span>
                <span className="font-semibold">{reconciliationResult.totalTransactions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Successfully Matched</span>
                <span className="font-semibold text-green-600">{reconciliationResult.matchedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Anomalies Detected</span>
                <span className="font-semibold text-red-600">{reconciliationResult.anomalyCount}</span>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Anomaly Breakdown</h3>
            {reconciliationResult.anomalies.length > 0 ? (
              <div className="space-y-3">
                {reconciliationResult.anomalies.slice(0, 5).map((anomaly, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">{anomaly.type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-xs text-red-600">{anomaly.description}</p>
                    </div>
                  </div>
                ))}
                {reconciliationResult.anomalies.length > 5 && (
                  <button 
                    onClick={() => setActiveTab('results')}
                    className="text-blue-600 text-sm hover:text-blue-700"
                  >
                    View all {reconciliationResult.anomalies.length} anomalies →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">No anomalies detected!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const UploadContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Upload & Reconcile</h2>
        <p className="text-gray-600 mt-1">Upload your data files with custom field mapping and perform real-time reconciliation</p>
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
                onClick={() => downloadSampleFile('mpr', 'alternative')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Alt Columns</span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {validateMappings('mpr') ? 'Mapping configured' : 'Mapping required'}
                    </span>
                    <button
                      onClick={() => setShowFieldMapping('mpr')}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Configure</span>
                    </button>
                  </div>
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
                onClick={() => downloadSampleFile('internal', 'alternative')}
                className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Alt Columns</span>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {validateMappings('internal') ? 'Mapping configured' : 'Mapping required'}
                    </span>
                    <button
                      onClick={() => setShowFieldMapping('internal')}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Configure</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Data Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Bank Data</h3>
              <p className="text-sm text-gray-500">Bank Statement (Optional)</p>
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
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {validateMappings('bank') ? 'Mapping configured' : 'Mapping required'}
                    </span>
                    <button
                      onClick={() => setShowFieldMapping('bank')}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <Settings className="w-3 h-3" />
                      <span>Configure</span>
                    </button>
                  </div>
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
                ? (validateMappings('mpr') && validateMappings('internal')
                   ? 'All files uploaded and mapped. Click to start reconciliation.' 
                   : 'Configure field mappings to proceed.')
                : 'Upload MPR and Internal data files to begin.'}
            </p>
          </div>
          <button
            onClick={performReconciliation}
            disabled={!uploadedFiles.mpr || !uploadedFiles.internal || !validateMappings('mpr') || !validateMappings('internal') || isReconciling}
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

      {/* Field Mapping Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-blue-600" />
          Field Mapping System
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">How It Works</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload Your File</p>
                  <p className="text-xs text-gray-600">System automatically detects columns</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Smart Auto-Mapping</p>
                  <p className="text-xs text-gray-600">AI suggests field mappings based on column names</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Review & Adjust</p>
                  <p className="text-xs text-gray-600">Verify mappings and make corrections if needed</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Process & Reconcile</p>
                  <p className="text-xs text-gray-600">System uses your mappings for accurate reconciliation</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Supported Formats</h4>
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Standard Format</p>
                <p className="text-xs text-gray-600">transaction_id, amount, utr, timestamp</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Alternative Format</p>
                <p className="text-xs text-gray-600">TXN_ID, AMOUNT, UTR_NUMBER, TXN_TIME</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">Custom Format</p>
                <p className="text-xs text-gray-600">Any column names - system will map them</p>
              </div>
            </div>
          </div>
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
            <p className="text-gray-600 mt-1">Detailed analysis of your reconciliation with custom field mapping</p>
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
                    {anomaly.mprAmount && anomaly.internalAmount && (
                      <div className="text-right">
                        <p className="text-sm text-red-700">MPR: ₹{anomaly.mprAmount}</p>
                        <p className="text-sm text-red-700">Internal: ₹{anomaly.internalAmount}</p>
                        <p className="text-xs text-red-600">
                          Diff: ₹{Math.abs(anomaly.mprAmount - anomaly.internalAmount).toFixed(2)}
                        </p>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Matched With</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">UTR</th>
                </tr>
              </thead>
              <tbody>
                {reconciliationResult.transactions.slice(0, 10).map((transaction, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-gray-900">{transaction.transactionId}</td>
                    <td className="py-3 px-4 text-gray-900">₹{transaction.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'matched' ? 'bg-green-100 text-green-800' :
                        transaction.status === 'anomaly' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {transaction.matchedWith?.join(', ') || 'None'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{transaction.utr || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {reconciliationResult.transactions.length > 10 && (
            <p className="text-center text-gray-500 mt-4">
              Showing first 10 of {reconciliationResult.transactions.length} transactions
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
      
      {/* Field Mapping Modal */}
      {showFieldMapping && (
        <FieldMappingModal type={showFieldMapping} />
      )}
    </div>
  );
}

export default App;