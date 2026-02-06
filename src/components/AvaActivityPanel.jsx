import { useState, useEffect } from "react";
import {
  Bot,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Cpu,
  Zap,
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
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const activityTypes = status?.activity?.by_type || {};
  const logs = status?.logs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Ava AI Agent</h2>
              <p className="text-purple-200">Autonomous AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-white/30"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Running Status */}
        <div className={`rounded-xl p-5 ${status?.running ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            {status?.running ? (
              <Activity className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium text-gray-600">Status</span>
          </div>
          <p className={`text-xl font-bold ${status?.running ? 'text-green-700' : 'text-red-700'}`}>
            {status?.running ? 'Running' : 'Stopped'}
          </p>
          {status?.uptime && (
            <p className="text-xs text-gray-500 mt-1">Uptime: {status.uptime}</p>
          )}
        </div>

        {/* Tasks */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Tasks</span>
          </div>
          <p className="text-xl font-bold text-blue-700">
            {status?.tasks?.completed || 0} / {status?.tasks?.total || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>

        {/* Activity Today */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Activity</span>
          </div>
          <p className="text-xl font-bold text-purple-700">
            {status?.activity?.total || 0}
          </p>
          <p className="text-xs text-gray-500 mt-1">Actions today</p>
        </div>

        {/* System */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">System</span>
          </div>
          <p className="text-sm font-bold text-gray-700">
            CPU: {status?.cpu || 'N/A'}
          </p>
          <p className="text-sm font-bold text-gray-700">
            MEM: {status?.mem || 'N/A'}
          </p>
        </div>
      </div>

      {/* Activity Breakdown */}
      {Object.keys(activityTypes).length > 0 && (
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
                <span className="font-medium capitalize">{type.replace('_', ' ')}</span>
                <span className="ml-2 font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Recent Logs
        </h3>
        <div className="space-y-1 font-mono text-sm max-h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500">No recent logs available</p>
          ) : (
            logs.slice(-20).map((log, index) => {
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
