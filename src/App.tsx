import React, { useState } from 'react';
import { BarChart3, Upload, Database, TrendingUp, AlertTriangle, CheckCircle, Clock, DollarSign, Activity, Settings, Users, FileText, PieChart } from 'lucide-react';

interface DashboardData {
  totalTransactions: number;
  totalAmount: number;
  matchedTransactions: number;
  anomalies: number;
  matchRate: number;
  channels: Array<{
    name: string;
    transactions: number;
    amount: number;
    matchRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'upload' | 'reconciliation' | 'anomaly';
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
}

const mockData: DashboardData = {
  totalTransactions: 15847,
  totalAmount: 2847593.50,
  matchedTransactions: 14923,
  anomalies: 127,
  matchRate: 94.2,
  channels: [
    { name: 'BBPS', transactions: 8934, amount: 1547832.20, matchRate: 96.1 },
    { name: 'Payment Gateway', transactions: 4521, amount: 892341.80, matchRate: 92.8 },
    { name: 'WhatsApp Pay', transactions: 2392, amount: 407419.50, matchRate: 89.3 }
  ],
  recentActivity: [
    {
      id: '1',
      type: 'upload',
      description: 'MPR file uploaded for BBPS channel',
      timestamp: '2 minutes ago',
      status: 'success'
    },
    {
      id: '2',
      type: 'reconciliation',
      description: 'Reconciliation completed for 1,247 transactions',
      timestamp: '15 minutes ago',
      status: 'success'
    },
    {
      id: '3',
      type: 'anomaly',
      description: '12 new anomalies detected in Payment Gateway',
      timestamp: '1 hour ago',
      status: 'warning'
    }
  ]
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data] = useState<DashboardData>(mockData);

  const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: string;
    color?: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">
              <TrendingUp className="inline w-4 h-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const Sidebar = () => (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Collection Recon</h1>
            <p className="text-sm text-gray-500">Analytics Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-6">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
          { id: 'uploads', label: 'File Uploads', icon: Upload },
          { id: 'reconciliation', label: 'Reconciliation', icon: CheckCircle },
          { id: 'analytics', label: 'Analytics', icon: PieChart },
          { id: 'channels', label: 'Channels', icon: Database },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-6 py-3 text-left hover:bg-gray-50 transition-colors ${
              activeTab === item.id ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-600' : 'text-gray-700'
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600 mt-1">Real-time reconciliation insights and analytics</p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Run Reconciliation</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Transactions"
          value={data.totalTransactions.toLocaleString()}
          icon={FileText}
          trend="+12% from last month"
          color="blue"
        />
        <StatCard
          title="Total Amount"
          value={`₹${(data.totalAmount / 100000).toFixed(1)}L`}
          icon={DollarSign}
          trend="+8% from last month"
          color="green"
        />
        <StatCard
          title="Match Rate"
          value={`${data.matchRate}%`}
          icon={CheckCircle}
          trend="+2.1% improvement"
          color="emerald"
        />
        <StatCard
          title="Anomalies"
          value={data.anomalies}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Channel Performance */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Channel Performance</h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
          </div>
          <div className="space-y-4">
            {data.channels.map((channel, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{channel.name}</h4>
                    <p className="text-sm text-gray-500">{channel.transactions.toLocaleString()} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₹{(channel.amount / 100000).toFixed(1)}L</p>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${channel.matchRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{channel.matchRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {data.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.status === 'success' ? 'bg-green-100' :
                  activity.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                }`}>
                  {activity.type === 'upload' && <Upload className="w-4 h-4 text-green-600" />}
                  {activity.type === 'reconciliation' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {activity.type === 'anomaly' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold mb-2">Ready to reconcile?</h3>
            <p className="text-blue-100">Upload your latest MPR files and bank statements to get started.</p>
          </div>
          <div className="flex space-x-3">
            <button className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium">
              Upload MPR
            </button>
            <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition-colors font-medium">
              Upload Bank Statement
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const UploadContent = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">File Uploads</h2>
        <p className="text-gray-600 mt-1">Upload MPR files, internal data, and bank statements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: 'MPR Files',
            description: 'Upload Merchant Payment Reports from payment channels',
            icon: FileText,
            color: 'blue'
          },
          {
            title: 'Internal Data',
            description: 'Upload internal transaction records for reconciliation',
            icon: Database,
            color: 'green'
          },
          {
            title: 'Bank Statements',
            description: 'Upload bank statements for settlement verification',
            icon: DollarSign,
            color: 'purple'
          }
        ].map((item, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 bg-${item.color}-100 rounded-lg flex items-center justify-center mb-4`}>
              <item.icon className={`w-6 h-6 text-${item.color}-600`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{item.description}</p>
            <button className={`w-full bg-${item.color}-600 text-white py-2 px-4 rounded-lg hover:bg-${item.color}-700 transition-colors flex items-center justify-center space-x-2`}>
              <Upload className="w-4 h-4" />
              <span>Upload Files</span>
            </button>
          </div>
        ))}
      </div>

      {/* Upload History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Uploads</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">File Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Upload Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Records</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'BBPS_MPR_20240115.csv', type: 'MPR', time: '2 hours ago', status: 'Completed', records: '1,247' },
                { name: 'internal_data_20240115.xlsx', type: 'Internal', time: '3 hours ago', status: 'Completed', records: '1,198' },
                { name: 'bank_statement_jan.csv', type: 'Bank', time: '5 hours ago', status: 'Processing', records: '892' }
              ].map((upload, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-gray-900">{upload.name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      upload.type === 'MPR' ? 'bg-blue-100 text-blue-800' :
                      upload.type === 'Internal' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {upload.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{upload.time}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      upload.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {upload.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{upload.records}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardContent />;
      case 'uploads':
        return <UploadContent />;
      case 'reconciliation':
        return (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Reconciliation Engine</h3>
            <p className="text-gray-600">Advanced reconciliation features coming soon</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="text-center py-12">
            <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
            <p className="text-gray-600">Detailed reporting and insights coming soon</p>
          </div>
        );
      case 'channels':
        return (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Channel Management</h3>
            <p className="text-gray-600">Configure payment channels and field mappings</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h3>
            <p className="text-gray-600">Configure system preferences and user management</p>
          </div>
        );
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