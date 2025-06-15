import React, { useState, useRef } from 'react';
import { 
  BarChart3, Upload, Database, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, DollarSign, Activity, Settings, Users, FileText, PieChart,
  Download, Play, RefreshCw, Eye, X, Check, AlertCircle
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadedFiles, setUploadedFiles] = useState<{
    mpr?: File;
    internal?: File;
    bank?: File;
  }>({});
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const mprFileRef = useRef<HTMLInputElement>(null);
  const internalFileRef = useRef<HTMLInputElement>(null);
  const bankFileRef = useRef<HTMLInputElement>(null);

  const downloadSampleFile = (type: 'mpr' | 'internal' | 'bank') => {
    let content = '';
    let filename = '';
    
    switch (type) {
      case 'mpr':
        content = sampleMPRData;
        filename = 'sample_mpr_data.csv';
        break;
      case 'internal':
        content = sampleInternalData;
        filename = 'sample_internal_data.csv';
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

  const performReconciliation = async () => {
    if (!uploadedFiles.mpr || !uploadedFiles.internal) {
      alert('Please upload both MPR and Internal data files to perform reconciliation');
      return;
    }

    setIsReconciling(true);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const mprContent = await uploadedFiles.mpr.text();
      const internalContent = await uploadedFiles.internal.text();
      const bankContent = uploadedFiles.bank ? await uploadedFiles.bank.text() : '';

      const mprData = parseCSV(mprContent);
      const internalData = parseCSV(internalContent);
      const bankData = bankContent ? parseCSV(bankContent) : [];

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
          timestamp: mprTxn.timestamp,
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
            timestamp: intTxn.timestamp,
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
    } catch (error) {
      alert('Error processing files. Please check the file format.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleFileUpload = (type: 'mpr' | 'internal' | 'bank', file: File) => {
    setUploadedFiles(prev => ({ ...prev, [type]: file }));
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
          <p className="text-gray-600 mt-1">Upload files and perform real-time reconciliation</p>
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
          <p className="text-blue-100 mb-6">Upload your MPR and Internal data files to begin reconciliation</p>
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
        <p className="text-gray-600 mt-1">Upload your data files and perform real-time reconciliation</p>
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
            <button
              onClick={() => downloadSampleFile('mpr')}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download Sample</span>
            </button>
            
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
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>{uploadedFiles.mpr.name}</span>
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
            <button
              onClick={() => downloadSampleFile('internal')}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">Download Sample</span>
            </button>
            
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
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>{uploadedFiles.internal.name}</span>
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
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>{uploadedFiles.bank.name}</span>
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
                ? 'All required files uploaded. Click to start reconciliation.' 
                : 'Upload MPR and Internal data files to begin.'}
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

      {/* File Format Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">File Format Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-blue-600 mb-2">MPR Data Format</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• transaction_id (required)</li>
              <li>• amount (required)</li>
              <li>• utr (optional)</li>
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
            <h4 className="font-medium text-purple-600 mb-2">Bank Data Format</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• transaction_date (optional)</li>
              <li>• amount (required)</li>
              <li>• utr (optional)</li>
              <li>• description (optional)</li>
            </ul>
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
            <p className="text-gray-600 mt-1">Detailed analysis of your reconciliation</p>
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
    </div>
  );
}

export default App;