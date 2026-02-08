import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Settings,
  Webhook,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

const INTEGRATIONS = [
  {
    name: "Stripe",
    description: "Payment processing",
    status: "connected",
    icon: "💳",
  },
  {
    name: "Twilio",
    description: "SMS notifications",
    status: "connected",
    icon: "📱",
  },
  {
    name: "Mercury",
    description: "ACH banking",
    status: "connected",
    icon: "🏦",
  },
];

export default function AdminConfig() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* System Settings Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings size={20} className="text-gray-500" />
          System Configuration
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">
            Configuration editor coming soon
          </p>
        </div>
      </div>

      {/* Webhook Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Webhook size={20} className="text-blue-500" />
          Webhook Status
        </h3>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{integration.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {integration.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {integration.description}
                  </p>
                </div>
              </div>
              <span
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                  integration.status === "connected"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {integration.status === "connected" ? (
                  <CheckCircle size={14} />
                ) : (
                  <XCircle size={14} />
                )}
                {integration.status === "connected"
                  ? "Connected"
                  : "Disconnected"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Integration Health Checker Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <RefreshCw size={20} className="text-purple-500" />
          Integration Health Checker
        </h3>
        <div className="h-32 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Health checker coming soon</p>
        </div>
      </div>
    </div>
  );
}
