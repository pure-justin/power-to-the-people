import { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Users,
  TrendingUp,
  DollarSign,
  Loader2,
  Check,
  X,
  BarChart3,
} from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../services/firebase";

const functions = getFunctions(app, "us-central1");

export default function SmsNotificationPanel() {
  const [activeTab, setActiveTab] = useState("send");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stats, setStats] = useState(null);

  // Single SMS
  const [singlePhone, setSinglePhone] = useState("");

  // Bulk SMS
  const [bulkPhones, setBulkPhones] = useState("");
  const [bulkResult, setBulkResult] = useState(null);

  // Load SMS stats
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const getSmsStats = httpsCallable(functions, "getSmsStats");
      const result = await getSmsStats();
      setStats(result.data);
    } catch (error) {
      console.error("Error loading SMS stats:", error);
    }
  };

  const sendSingleSMS = async () => {
    if (!singlePhone || !message) {
      setError("Phone number and message are required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const sendCustomSMS = httpsCallable(functions, "sendCustomSMS");
      const result = await sendCustomSMS({
        phone: singlePhone,
        message,
      });

      if (result.data.success) {
        setSuccess(`SMS sent successfully to ${singlePhone}`);
        setSinglePhone("");
        setMessage("");
        loadStats(); // Refresh stats
      } else {
        setError("Failed to send SMS");
      }
    } catch (error) {
      setError(error.message || "Failed to send SMS");
    } finally {
      setLoading(false);
    }
  };

  const sendBulkSMS = async () => {
    if (!bulkPhones || !message) {
      setError("Phone numbers and message are required");
      return;
    }

    // Parse phone numbers (comma or newline separated)
    const phones = bulkPhones
      .split(/[\n,]/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (phones.length === 0) {
      setError("No valid phone numbers found");
      return;
    }

    if (phones.length > 100) {
      setError("Maximum 100 recipients per batch");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setBulkResult(null);

    try {
      const sendBulkSMSFunc = httpsCallable(functions, "sendBulkSMS");
      const result = await sendBulkSMSFunc({
        recipients: phones,
        message,
      });

      setBulkResult(result.data);
      setSuccess(
        `Sent ${result.data.successful} of ${result.data.total} messages successfully`,
      );
      setBulkPhones("");
      setMessage("");
      loadStats(); // Refresh stats
    } catch (error) {
      setError(error.message || "Failed to send bulk SMS");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            SMS Notifications
          </h2>
        </div>

        {stats && (
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.successful}
              </div>
              <div className="text-gray-600">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.failed}
              </div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${stats.estimatedCost}
              </div>
              <div className="text-gray-600">Cost (30d)</div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("send")}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === "send"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send Single
          </div>
        </button>

        <button
          onClick={() => setActiveTab("bulk")}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === "bulk"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Bulk Send
          </div>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === "templates"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Templates
          </div>
        </button>

        <button
          onClick={() => setActiveTab("stats")}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === "stats"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Statistics
          </div>
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Send Single SMS Tab */}
      {activeTab === "send" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={singlePhone}
              onChange={(e) => setSinglePhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Format: +1 (area) number or 10-digit number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
              placeholder="Your message here (max 160 characters)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              {message.length}/160 characters
            </p>
          </div>

          <button
            onClick={sendSingleSMS}
            disabled={loading || !singlePhone || !message}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send SMS
              </>
            )}
          </button>
        </div>
      )}

      {/* Bulk SMS Tab */}
      {activeTab === "bulk" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Numbers (one per line or comma-separated)
            </label>
            <textarea
              value={bulkPhones}
              onChange={(e) => setBulkPhones(e.target.value)}
              rows={6}
              placeholder="+1 (555) 123-4567&#10;+1 (555) 234-5678&#10;+1 (555) 345-6789"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              {bulkPhones.split(/[\n,]/).filter((p) => p.trim()).length} phone
              numbers • Max 100 per batch
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
              placeholder="Your message here (max 160 characters)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              {message.length}/160 characters
            </p>
          </div>

          {bulkResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                Bulk Send Results
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {bulkResult.total}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {bulkResult.successful}
                  </div>
                  <div className="text-sm text-gray-600">Success</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {bulkResult.failed}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={sendBulkSMS}
            disabled={loading || !bulkPhones || !message}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Bulk...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Send Bulk SMS
              </>
            )}
          </button>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="grid gap-4">
            <TemplateCard
              title="Enrollment Confirmation"
              description="Sent when a customer completes enrollment"
              template="Hi {name}! Thanks for enrolling. Track your application at: {link}"
              onUse={(tmpl) => setMessage(tmpl)}
            />
            <TemplateCard
              title="Application Approved"
              description="Sent when solar application is approved"
              template="Great news {name}! Your solar application is approved. Save ~${amount}/month. Installer will contact you within 48 hours."
              onUse={(tmpl) => setMessage(tmpl)}
            />
            <TemplateCard
              title="Referral Reward"
              description="Sent when customer earns referral reward"
              template="{name}, you earned ${amount}! {friend} enrolled using your code. Payment processing within 7 days."
              onUse={(tmpl) => setMessage(tmpl)}
            />
            <TemplateCard
              title="Installation Scheduled"
              description="Sent when installation date is confirmed"
              template="{name}, your solar installation is scheduled for {date} with {installer}. They'll contact you 24hrs before."
              onUse={(tmpl) => setMessage(tmpl)}
            />
            <TemplateCard
              title="Payment Reminder"
              description="Sent for upcoming payments"
              template="Hi {name}, reminder: ${amount} payment due {date}. Pay at: {link}"
              onUse={(tmpl) => setMessage(tmpl)}
            />
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === "stats" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={MessageSquare}
              label="Total Sent"
              value={stats.total}
              color="blue"
            />
            <StatCard
              icon={Check}
              label="Successful"
              value={stats.successful}
              color="green"
            />
            <StatCard
              icon={X}
              label="Failed"
              value={stats.failed}
              color="red"
            />
            <StatCard
              icon={DollarSign}
              label="Est. Cost"
              value={`$${stats.estimatedCost}`}
              color="purple"
            />
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-4">
              SMS Notification Types
            </h3>
            <div className="space-y-3">
              <NotificationTypeRow
                type="Enrollment Confirmations"
                status="Active"
                trigger="On project creation"
              />
              <NotificationTypeRow
                type="Status Updates"
                status="Active"
                trigger="On status change"
              />
              <NotificationTypeRow
                type="Referral Rewards"
                status="Active"
                trigger="On reward earned"
              />
              <NotificationTypeRow
                type="Payment Reminders"
                status="Active"
                trigger="Daily at 9 AM"
              />
              <NotificationTypeRow
                type="Installation Scheduling"
                status="Active"
                trigger="On date confirmed"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
            <p className="font-medium text-blue-900 mb-2">Cost Information</p>
            <ul className="space-y-1">
              <li>• SMS cost: ~$0.0075 per message</li>
              <li>• Average monthly usage: {stats.total} messages</li>
              <li>• Period: {stats.period}</li>
              <li>
                • Success rate:{" "}
                {((stats.successful / stats.total) * 100).toFixed(1)}%
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ title, description, template, onUse }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <button
          onClick={() => onUse(template)}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
        >
          Use
        </button>
      </div>
      <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 font-mono">
        {template}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div
        className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function NotificationTypeRow({ type, status, trigger }) {
  return (
    <div className="flex justify-between items-center py-2">
      <div>
        <div className="font-medium text-gray-900">{type}</div>
        <div className="text-sm text-gray-600">{trigger}</div>
      </div>
      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
        {status}
      </span>
    </div>
  );
}
