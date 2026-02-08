import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Bot,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  Clock,
  Cpu,
} from "lucide-react";

const AVA_API = "http://100.124.119.18:5050";

export default function AdminAva() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [avaStatus, setAvaStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAvaHealth();
  }, []);

  const checkAvaHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${AVA_API}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        setAvaStatus(data);
      } else {
        setError(`API returned ${response.status}`);
      }
    } catch (err) {
      setError(
        err.name === "AbortError" ? "Connection timed out" : err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const isConnected = avaStatus && !error;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-40" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div
        className={`rounded-xl border p-6 ${isConnected ? "bg-purple-50 border-purple-200" : "bg-red-50 border-red-200"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConnected ? "bg-purple-100 text-purple-600" : "bg-red-100 text-red-600"}`}
            >
              <Bot size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Ava AI Agent</h3>
              <p className="text-sm text-gray-600">{AVA_API}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                isConnected
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isConnected ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            <button
              onClick={checkAvaHealth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-100 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Status Details */}
      {avaStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Uptime
              </span>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                <Clock size={20} />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-gray-900">
              {avaStatus.uptime || "N/A"}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Model
              </span>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                <Cpu size={20} />
              </div>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {avaStatus.model || "Multi-model"}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Version
              </span>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <Activity size={20} />
              </div>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {avaStatus.version || "N/A"}
            </p>
          </div>
        </div>
      )}

      {/* Task Queue Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={20} className="text-purple-500" />
          Task Queue
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            Fetch from {AVA_API}/coord/tasks
          </p>
        </div>
      </div>

      {/* Message Log Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-500" />
          Message Log
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            Fetch from {AVA_API}/coord/messages
          </p>
        </div>
      </div>

      {/* Performance Metrics Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Cpu size={20} className="text-green-500" />
          Performance Metrics
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            Performance metrics coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
