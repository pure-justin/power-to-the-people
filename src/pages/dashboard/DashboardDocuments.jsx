/**
 * DashboardDocuments — Installer document management page
 *
 * Generate proposals, contracts, permit packages, and completion certificates.
 * Track document status, signatures, and send documents to customers.
 *
 * Replaces PandaDoc at $0/month with ESIGN Act compliant e-signatures.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  PenTool,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  generateDocument,
  getDocumentsByProject,
  sendDocument,
  voidDocument,
  getDocumentStats,
  DOCUMENT_TYPES,
  DOCUMENT_STATUS,
} from "../../services/documentService";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const config = DOCUMENT_STATUS[status] || { label: status, color: "gray" };
  const colorMap = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    yellow: "bg-yellow-100 text-yellow-700",
    orange: "bg-orange-100 text-orange-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[config.color] || colorMap.gray}`}
    >
      {config.label}
    </span>
  );
}

// ─── GENERATE MODAL ───────────────────────────────────────────────────────────

function GenerateModal({ onClose, onGenerate, projectId }) {
  const [type, setType] = useState("proposal");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await onGenerate(projectId, type);
      onClose();
    } catch (err) {
      console.error("Generate failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">Generate Document</h3>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Document Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {DOCUMENT_TYPES.map((dt) => (
            <option key={dt.value} value={dt.value}>
              {dt.label}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SEND MODAL ───────────────────────────────────────────────────────────────

function SendModal({ document: doc, onClose, onSend }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    setLoading(true);
    try {
      await onSend(doc.id, [{ email, name, role }]);
      onClose();
    } catch (err) {
      console.error("Send failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">
          Send: {doc.title || doc.type}
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signer Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="customer">Customer</option>
              <option value="installer">Installer</option>
              <option value="engineer">Engineer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !email}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STATS CARDS ──────────────────────────────────────────────────────────────

function StatsCards({ stats }) {
  if (!stats) return null;
  const cards = [
    {
      label: "Total",
      value: stats.total || 0,
      icon: FileText,
      color: "text-gray-600",
    },
    {
      label: "Completed",
      value: stats.byStatus?.completed || 0,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "Pending Signature",
      value:
        (stats.byStatus?.sent || 0) +
        (stats.byStatus?.viewed || 0) +
        (stats.byStatus?.partially_signed || 0),
      icon: Clock,
      color: "text-yellow-600",
    },
    {
      label: "Voided",
      value: stats.byStatus?.voided || 0,
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-1">
            <card.icon className={`w-4 h-4 ${card.color}`} />
            <span className="text-xs text-gray-500">{card.label}</span>
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function DashboardDocuments() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [filters, setFilters] = useState({});
  const [showGenerate, setShowGenerate] = useState(false);
  const [sendDoc, setSendDoc] = useState(null);

  // Load documents for current project context
  const loadDocuments = useCallback(async () => {
    if (!projectId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [docsResult, statsResult] = await Promise.all([
        getDocumentsByProject(projectId),
        getDocumentStats(projectId),
      ]);
      setDocuments(docsResult.documents || []);
      setStats(statsResult.stats || null);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handlers
  const handleGenerate = async (pid, type) => {
    await generateDocument(pid, type);
    await loadDocuments();
  };

  const handleSend = async (documentId, recipients) => {
    await sendDocument(documentId, recipients);
    await loadDocuments();
  };

  const handleVoid = async (documentId) => {
    if (
      !confirm(
        "Are you sure you want to void this document? This cannot be undone.",
      )
    )
      return;
    await voidDocument(documentId, "Voided by installer");
    await loadDocuments();
  };

  // Helper for date formatting (used by columns)
  const formatDate = (ts) => {
    if (!ts) return "\u2014";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  // Filter definitions — dynamically extract unique values from loaded data
  const filterDefs = useMemo(() => {
    const types = [
      ...new Set(documents.map((doc) => doc.type).filter(Boolean)),
    ].sort();
    const statuses = [
      ...new Set(documents.map((doc) => doc.status).filter(Boolean)),
    ].sort();
    return [
      {
        key: "type",
        label: "Type",
        options: types.map((t) => {
          const found = DOCUMENT_TYPES.find((dt) => dt.value === t);
          return { value: t, label: found?.label || t };
        }),
      },
      {
        key: "status",
        label: "Status",
        options: statuses.map((s) => {
          const cfg = DOCUMENT_STATUS[s];
          return { value: s, label: cfg?.label || s };
        }),
      },
    ];
  }, [documents]);

  // Filtered data
  const filtered = useMemo(() => {
    let result = documents;
    if (filters.type) {
      result = result.filter((doc) => doc.type === filters.type);
    }
    if (filters.status) {
      result = result.filter((doc) => doc.status === filters.status);
    }
    return result;
  }, [documents, filters]);

  // DataTable columns
  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Document",
        sortable: true,
        render: (_val, row) => {
          const typeLabel =
            DOCUMENT_TYPES.find((dt) => dt.value === row.type)?.label ||
            row.type;
          return (
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <div>
                <div className="font-medium text-sm">
                  {row.title || typeLabel}
                </div>
                <div className="text-xs text-gray-500">{typeLabel}</div>
              </div>
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => <StatusBadge status={val} />,
      },
      {
        key: "signatures",
        label: "Signatures",
        sortable: false,
        render: (_val, row) => {
          const signedCount = row.signatures
            ? Object.keys(row.signatures).length
            : 0;
          const requiredCount = row.requiredSigners?.length || 0;
          if (requiredCount > 0) {
            return (
              <span className="flex items-center gap-1 text-sm text-gray-600">
                <PenTool className="w-3.5 h-3.5" />
                {signedCount}/{requiredCount}
              </span>
            );
          }
          return <span className="text-sm text-gray-600">{"\u2014"}</span>;
        },
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (val) => (
          <span className="text-sm text-gray-500">{formatDate(val)}</span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_val, row) => (
          <div className="flex items-center gap-2">
            {row.status === "draft" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSendDoc(row);
                }}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
            {["draft", "sent", "viewed"].includes(row.status) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoid(row.id);
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Void"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate proposals, contracts, and permits with e-signatures
          </p>
        </div>
        <button
          onClick={() => setShowGenerate(true)}
          disabled={!projectId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Generate Document
        </button>
      </div>

      {/* Project selector */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Enter project ID to load documents"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={loadDocuments}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Load
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <div className="mb-4">
        <FilterBar
          filters={filterDefs}
          activeFilters={filters}
          onChange={setFilters}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Document Table */}
      {loading ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      ) : !projectId ? (
        <div className="bg-white rounded-lg border overflow-hidden text-center py-12 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p>Enter a project ID above to view documents</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No documents found"
        />
      )}

      {/* Modals */}
      {showGenerate && (
        <GenerateModal
          projectId={projectId}
          onClose={() => setShowGenerate(false)}
          onGenerate={handleGenerate}
        />
      )}
      {sendDoc && (
        <SendModal
          document={sendDoc}
          onClose={() => setSendDoc(null)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
