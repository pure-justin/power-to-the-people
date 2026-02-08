import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "../../services/firebase";
import {
  Bot,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  Clock,
  Cpu,
  Search,
  ChevronRight,
  Zap,
  ListTodo,
  AlertTriangle,
} from "lucide-react";

const AVA_API = "http://100.124.119.18:5050";

export default function AdminAva() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [avaStatus, setAvaStatus] = useState(null);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [coordMessages, setCoordMessages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("conversations");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check Ava health
      try {
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
      }

      // Load conversations from Firestore
      try {
        const convoRef = collection(db, "ava_conversations");
        const convoSnap = await getDocs(
          query(convoRef, orderBy("updatedAt", "desc"), limit(50)),
        );
        setConversations(
          convoSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      } catch (e) {
        // Try without orderBy in case updatedAt doesn't exist
        try {
          const convoRef = collection(db, "ava_conversations");
          const convoSnap = await getDocs(query(convoRef, limit(50)));
          setConversations(
            convoSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          );
        } catch (e2) {
          setConversations([]);
        }
      }

      // Fetch task queue from Ava API
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${AVA_API}/coord/tasks`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          setTasks(Array.isArray(data) ? data : data.tasks || []);
        }
      } catch (e) {
        setTasks([]);
      }

      // Fetch coordinator messages
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${AVA_API}/coord/messages`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          setCoordMessages(Array.isArray(data) ? data : data.messages || []);
        }
      } catch (e) {
        setCoordMessages([]);
      }
    } catch (err) {
      console.error("Error loading Ava data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (convoId) => {
    try {
      setSelectedConvo(convoId);
      const msgsRef = collection(db, "ava_conversations", convoId, "messages");
      const msgsSnap = await getDocs(
        query(msgsRef, orderBy("timestamp", "asc"), limit(100)),
      );
      setMessages(msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      // Try without orderBy
      try {
        const msgsRef = collection(
          db,
          "ava_conversations",
          convoId,
          "messages",
        );
        const msgsSnap = await getDocs(query(msgsRef, limit(100)));
        setMessages(msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e2) {
        setMessages([]);
      }
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "N/A";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isConnected = avaStatus && !error;

  const taskStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "done") return "bg-green-100 text-green-700";
    if (s === "in_progress" || s === "running")
      return "bg-blue-100 text-blue-700";
    if (s === "failed" || s === "error") return "bg-red-100 text-red-700";
    if (s === "pending" || s === "queued") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  };

  const filteredConvos = conversations.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (c.title || "").toLowerCase().includes(term) ||
      (c.topic || "").toLowerCase().includes(term) ||
      (c.id || "").toLowerCase().includes(term)
    );
  });

  const activeTasks = tasks.filter(
    (t) =>
      (t.status || "").toLowerCase() === "in_progress" ||
      (t.status || "").toLowerCase() === "running",
  );
  const pendingTasks = tasks.filter(
    (t) =>
      (t.status || "").toLowerCase() === "pending" ||
      (t.status || "").toLowerCase() === "queued",
  );
  const completedTasks = tasks.filter(
    (t) =>
      (t.status || "").toLowerCase() === "completed" ||
      (t.status || "").toLowerCase() === "done",
  );

  const metricCards = [
    {
      label: "Status",
      value: isConnected ? "Online" : "Offline",
      icon: isConnected ? CheckCircle : XCircle,
      color: isConnected
        ? "bg-green-50 text-green-600"
        : "bg-red-50 text-red-600",
    },
    {
      label: "Conversations",
      value: conversations.length,
      icon: MessageSquare,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Active Tasks",
      value: activeTasks.length,
      icon: Zap,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Pending Tasks",
      value: pendingTasks.length,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-40" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Banner */}
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
            {avaStatus && (
              <div className="hidden md:flex items-center gap-4 text-sm text-gray-600">
                {avaStatus.uptime && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {avaStatus.uptime}
                  </span>
                )}
                {avaStatus.model && (
                  <span className="flex items-center gap-1">
                    <Cpu size={14} />
                    {avaStatus.model}
                  </span>
                )}
                {avaStatus.version && (
                  <span className="flex items-center gap-1">
                    <Activity size={14} />v{avaStatus.version}
                  </span>
                )}
              </div>
            )}
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
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-100 rounded-lg">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle size={14} />
              {error}
            </p>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {m.label}
              </span>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color}`}
              >
                <m.icon size={20} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-gray-900">
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: "conversations", label: "Conversations", icon: MessageSquare },
          { key: "tasks", label: "Task Queue", icon: ListTodo },
          { key: "messages", label: "Coordinator Messages", icon: Activity },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h3 className="text-lg font-bold text-gray-900">
              Ava Conversations
            </h3>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Conversation List */}
            <div className="lg:col-span-1 space-y-2 max-h-[500px] overflow-y-auto">
              {filteredConvos.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare
                    size={32}
                    className="mx-auto text-gray-300 mb-2"
                  />
                  <p className="text-gray-500 text-sm">
                    No conversations found
                  </p>
                </div>
              ) : (
                filteredConvos.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadConversationMessages(c.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedConvo === c.id
                        ? "bg-purple-50 border-purple-300 ring-2 ring-purple-200"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.title || c.topic || c.id.slice(0, 20)}
                      </p>
                      <ChevronRight size={14} className="text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(c.updatedAt || c.createdAt)}
                    </p>
                    {c.messageCount && (
                      <p className="text-xs text-gray-400">
                        {c.messageCount} messages
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Message Panel */}
            <div className="lg:col-span-2 border border-gray-100 rounded-lg">
              {selectedConvo ? (
                <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare
                        size={32}
                        className="mx-auto text-gray-300 mb-2"
                      />
                      <p className="text-gray-500 text-sm">
                        No messages in this conversation
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAva =
                        (msg.role || "").toLowerCase() === "assistant" ||
                        (msg.from || "").toLowerCase() === "ava";
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isAva ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-3 ${
                              isAva
                                ? "bg-purple-50 border border-purple-100"
                                : "bg-gray-100 border border-gray-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-600">
                                {isAva ? "Ava" : msg.role || msg.from || "User"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(msg.timestamp || msg.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {msg.content || msg.text || msg.message || ""}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Bot size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">
                    Select a conversation
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Click a conversation to view messages
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Queue Tab */}
      {activeTab === "tasks" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ListTodo size={20} className="text-purple-500" />
            Task Queue
            <span className="text-sm font-normal text-gray-400">
              ({tasks.length} total)
            </span>
          </h3>

          {tasks.length === 0 ? (
            <div className="text-center py-16">
              <ListTodo size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No tasks in queue</p>
              <p className="text-sm text-gray-400 mt-1">
                {isConnected
                  ? "Task queue is empty"
                  : "Unable to fetch tasks - Ava is offline"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Task
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Type
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Priority
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Assigned
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tasks.map((task, idx) => (
                    <tr
                      key={task.id || idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 max-w-xs truncate">
                        {task.description ||
                          task.title ||
                          task.name ||
                          "Unnamed task"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">
                          {task.type || "general"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">
                        {task.priority || "N/A"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${taskStatusBadge(task.status)}`}
                        >
                          {task.status || "pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {task.assigned_to || task.assignedTo || "Unassigned"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {task.created_at
                          ? new Date(task.created_at).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Coordinator Messages Tab */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Activity size={20} className="text-blue-500" />
            Coordinator Messages
            <span className="text-sm font-normal text-gray-400">
              ({coordMessages.length} recent)
            </span>
          </h3>

          {coordMessages.length === 0 ? (
            <div className="text-center py-16">
              <Activity size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">
                No coordinator messages
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {isConnected
                  ? "No recent inter-agent messages"
                  : "Unable to fetch messages - Ava is offline"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {coordMessages.slice(0, 30).map((msg, idx) => (
                <div
                  key={msg.id || idx}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
                    <MessageSquare size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {msg.from || "Unknown"}
                      </span>
                      <ChevronRight size={12} className="text-gray-400" />
                      <span className="text-xs font-semibold text-gray-700">
                        {msg.to || "Unknown"}
                      </span>
                      {msg.type && (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                          {msg.type}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {msg.message || msg.content || "No content"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Performance Summary */}
      {avaStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Cpu size={20} className="text-green-500" />
            System Info
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(avaStatus)
              .filter(([k]) => !["status"].includes(k))
              .map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium capitalize">
                    {k.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm font-bold text-gray-900 mt-1 truncate">
                    {typeof v === "object"
                      ? JSON.stringify(v)
                      : String(v ?? "N/A")}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
