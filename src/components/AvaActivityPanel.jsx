import { useState, useEffect } from "react";
import {
  Bot,
  Activity,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Cpu,
  HardDrive,
  Zap,
  Code,
  AlertTriangle,
  Package,
  Terminal,
} from "lucide-react";
import { getAvaStatus, getActivityTypeColor } from "../services/avaService";

export default function AvaActivityPanel() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    try {
      const data = await getAvaStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Auto-refresh every 10 seconds if enabled
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchStatus();
  };

  if (isLoading && !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const activityTypes = status?.activity?.by_type || {};
  const logs = status?.logs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-purple-500" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Ava AI Agent</h2>
            <p className="text-sm text-gray-500">Autonomous AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Running Status */}
        <div className={`rounded-xl p-4 ${status?.running ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status?.running ? 'bg-green-100' : 'bg-red-100'}`}>
              {status?.running ? (
                <Activity className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-lg font-bold ${status?.running ? 'text-green-700' : 'text-red-700'}`}>
                {status?.running ? 'Running' : 'Stopped'}
              </p>
            </div>
          </div>
          {status?.uptime && (
            <p className="mt-2 text-sm text-gray-500">Uptime: {status.uptime}</p>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasks Completed</p>
              <p className="text-lg font-bold text-blue-700">
                {status?.tasks?.completed || 0} / {status?.tasks?.total || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Activity Today */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activity Today</p>
              <p className="text-lg font-bold text-purple-700">
                {status?.activity?.total || 0}
              </p>
            </div>
          </div>
        </div>

        {/* System */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Cpu className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">System</p>
              <p className="text-sm font-medium text-gray-700">
                CPU: {status?.cpu || 'N/A'} | MEM: {status?.mem || 'N/A'}
              </p>
            </div>
          </div>
          {status?.pid && (
            <p className="mt-2 text-sm text-gray-500">PID: {status.pid}</p>
          )}
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" />
          Activity Breakdown
        </h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(activityTypes).map(([type, count]) => (
            <div
              key={type}
              className={`px-4 py-2 rounded-lg ${getActivityTypeColor(type)}`}
            >
              <span className="font-medium">{type.replace('_', ' ')}</span>
              <span className="ml-2 font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Recent Logs
        </h3>
        <div className="space-y-1 font-mono text-sm max-h-96 overflow-y-auto">
          {logs.slice(-20).map((log, index) => {
            let textColor = 'text-gray-300';
            if (log.includes('[ERROR]') || log.includes('error')) textColor = 'text-red-400';
            else if (log.includes('[WARNING]')) textColor = 'text-yellow-400';
            else if (log.includes('SUCCESS') || log.includes('✅')) textColor = 'text-green-400';
            else if (log.includes('🎯') || log.includes('Starting')) textColor = 'text-blue-400';
            else if (log.includes('🧠') || log.includes('🏠')) textColor = 'text-purple-400';
            
            return (
              <div key={index} className={`${textColor} break-all`}>
                {log}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
