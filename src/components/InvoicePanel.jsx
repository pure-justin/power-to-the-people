import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  X,
  Loader2,
  FileText,
  ExternalLink,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
} from "lucide-react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import app from "../services/firebase";
import {
  createInvoice,
  listInvoices,
  cancelInvoice,
} from "../services/invoiceService";

const db = getFirestore(app);

const STATUS_COLORS = {
  unpaid: { bg: "#fef3c7", color: "#92400e" },
  processing: { bg: "#dbeafe", color: "#1e40af" },
  paid: { bg: "#d1fae5", color: "#065f46" },
  cancelled: { bg: "#f3f4f6", color: "#6b7280" },
};

const MILESTONE_TYPES = [
  { label: "Full Payment", value: "full", pct: 1.0 },
  { label: "Deposit (30%)", value: "deposit", pct: 0.3 },
  { label: "Equipment (40%)", value: "equipment", pct: 0.4 },
  { label: "Completion (30%)", value: "completion", pct: 0.3 },
];

export default function InvoicePanel() {
  const [invoices, setInvoices] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  // Form state
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", amount: "" }]);
  const [milestone, setMilestone] = useState("full");
  const [baseAmount, setBaseAmount] = useState(0);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [memo, setMemo] = useState("");

  useEffect(() => {
    loadInvoices();
    loadLeads();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listInvoices();
      setInvoices(Array.isArray(data) ? data : data?.invoices || []);
    } catch (err) {
      setError("Failed to load invoices: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const q = query(
        collection(db, "leads"),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      const snapshot = await getDocs(q);
      const leadsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLeads(leadsData);
    } catch (err) {
      console.error("Error loading leads:", err);
    }
  };

  const handleLeadSelect = (leadId) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setCustomerName(lead.customer?.name || lead.name || "");
      setCustomerEmail(lead.customer?.email || lead.email || "");
      const cost = lead.systemDesign?.estimatedCost || 0;
      setBaseAmount(cost);
      const pct = MILESTONE_TYPES.find((m) => m.value === milestone)?.pct || 1;
      setLineItems([
        {
          description: "Solar Installation",
          amount: String(Math.round(cost * pct)),
        },
      ]);
    }
  };

  const handleMilestoneChange = (value) => {
    setMilestone(value);
    const pct = MILESTONE_TYPES.find((m) => m.value === value)?.pct || 1;
    const amt = baseAmount || parseFloat(lineItems[0]?.amount) || 0;
    const source = baseAmount || amt;
    if (source > 0) {
      setLineItems([
        {
          description: lineItems[0]?.description || "Solar Installation",
          amount: String(Math.round(source * pct)),
        },
      ]);
    }
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", amount: "" }]);
  };

  const removeLineItem = (index) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0,
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) {
      setError("Please select a lead/customer");
      return;
    }
    if (totalAmount <= 0) {
      setError("Total amount must be greater than zero");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await createInvoice({
        leadId: selectedLeadId,
        amount: totalAmount,
        lineItems: lineItems.filter((i) => i.description && i.amount),
        dueDate,
        memo,
        customerName,
        customerEmail,
        milestone,
      });
      setSuccess("Invoice created successfully!");
      setShowForm(false);
      resetForm();
      await loadInvoices();
    } catch (err) {
      setError("Failed to create invoice: " + (err.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (invoiceId) => {
    setCancellingId(invoiceId);
    setError("");
    try {
      await cancelInvoice(invoiceId);
      setSuccess("Invoice cancelled.");
      setConfirmCancelId(null);
      await loadInvoices();
    } catch (err) {
      setError("Failed to cancel invoice: " + (err.message || "Unknown error"));
    } finally {
      setCancellingId(null);
    }
  };

  const resetForm = () => {
    setSelectedLeadId("");
    setCustomerName("");
    setCustomerEmail("");
    setLineItems([{ description: "", amount: "" }]);
    setMilestone("full");
    setBaseAmount(0);
    setMemo("");
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setDueDate(d.toISOString().split("T")[0]);
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return "$0.00";
    return (
      "$" +
      num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <style>{`
        .inv-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }

        .inv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .inv-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .inv-create-btn {
          padding: 10px 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .inv-create-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .inv-refresh-btn {
          padding: 8px 14px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #374151;
          transition: all 0.2s;
        }

        .inv-refresh-btn:hover {
          background: #e5e7eb;
        }

        .inv-table {
          width: 100%;
          border-collapse: collapse;
        }

        .inv-table th {
          text-align: left;
          padding: 12px 16px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }

        .inv-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9rem;
        }

        .inv-table tr:hover {
          background: #f9fafb;
        }

        .inv-status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .inv-actions {
          display: flex;
          gap: 8px;
        }

        .inv-action-btn {
          padding: 6px 10px;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .inv-action-btn:hover {
          background: #e5e7eb;
        }

        .inv-action-btn.cancel:hover {
          background: #fef2f2;
          color: #ef4444;
        }

        .inv-empty {
          text-align: center;
          padding: 60px 20px;
        }

        .inv-empty-icon {
          width: 64px;
          height: 64px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: #9ca3af;
        }

        .inv-form-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .inv-form-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .inv-form-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .inv-form-close {
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          padding: 8px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .inv-form-close:hover {
          background: #e5e7eb;
          color: #111827;
        }

        .inv-form-group {
          margin-bottom: 16px;
        }

        .inv-form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .inv-form-input,
        .inv-form-select,
        .inv-form-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .inv-form-input:focus,
        .inv-form-select:focus,
        .inv-form-textarea:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .inv-form-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .inv-line-item {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }

        .inv-line-item input:first-child {
          flex: 2;
        }

        .inv-line-item input:nth-child(2) {
          flex: 1;
        }

        .inv-line-remove {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s;
        }

        .inv-line-remove:hover {
          color: #ef4444;
        }

        .inv-add-line {
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          color: #6b7280;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .inv-add-line:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .inv-total-row {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 16px;
          padding: 12px 0;
          margin-top: 8px;
          border-top: 2px solid #e5e7eb;
          font-weight: 700;
          color: #111827;
          font-size: 1.1rem;
        }

        .inv-milestone-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .inv-milestone-btn {
          padding: 8px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .inv-milestone-btn.active {
          background: #10b981;
          color: white;
          border-color: #10b981;
        }

        .inv-submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          transition: all 0.2s;
        }

        .inv-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .inv-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .inv-alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .inv-alert.error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .inv-alert.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .inv-confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .inv-confirm-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }

        .inv-confirm-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .inv-confirm-text {
          color: #6b7280;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .inv-confirm-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .inv-confirm-cancel {
          padding: 10px 20px;
          background: #f3f4f6;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          color: #374151;
        }

        .inv-confirm-delete {
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .inv-spinner {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 768px) {
          .inv-table {
            display: block;
            overflow-x: auto;
          }

          .inv-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .inv-form-card {
            padding: 20px;
          }

          .inv-milestone-group {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="inv-panel">
        {/* Header */}
        <div className="inv-header">
          <h2 className="inv-title">
            <DollarSign size={22} />
            Invoices
          </h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="inv-refresh-btn"
              onClick={loadInvoices}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "inv-spinner" : ""} />
              Refresh
            </button>
            <button
              className="inv-create-btn"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} />
              Create Invoice
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="inv-alert error">
            <AlertCircle size={16} />
            {error}
            <button
              onClick={() => setError("")}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#991b1b",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {success && (
          <div className="inv-alert success">
            <Check size={16} />
            {success}
            <button
              onClick={() => setSuccess("")}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#166534",
              }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Loader2
              size={32}
              className="inv-spinner"
              style={{
                color: "#10b981",
                margin: "0 auto 12px",
                display: "block",
              }}
            />
            <p style={{ color: "#6b7280" }}>Loading invoices...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && invoices.length === 0 && (
          <div className="inv-empty">
            <div className="inv-empty-icon">
              <FileText size={28} />
            </div>
            <h3
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "#111827",
                marginBottom: 8,
              }}
            >
              No invoices yet
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Create your first invoice to get started.
            </p>
          </div>
        )}

        {/* Invoice Table */}
        {!loading && invoices.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusStyle =
                    STATUS_COLORS[inv.status] || STATUS_COLORS.unpaid;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "#111827" }}>
                          {inv.customerName || "N/A"}
                        </div>
                        {inv.customerEmail && (
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {inv.customerEmail}
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(inv.amount)}
                      </td>
                      <td>
                        <span
                          className="inv-status-badge"
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {inv.status || "unpaid"}
                        </span>
                      </td>
                      <td>{formatDate(inv.createdAt || inv.invoiceDate)}</td>
                      <td>{formatDate(inv.dueDate)}</td>
                      <td>
                        <div className="inv-actions">
                          {inv.mercuryUrl && (
                            <a
                              href={inv.mercuryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inv-action-btn"
                              title="View in Mercury"
                            >
                              <ExternalLink size={14} />
                              View
                            </a>
                          )}
                          {inv.status !== "cancelled" &&
                            inv.status !== "paid" && (
                              <button
                                className="inv-action-btn cancel"
                                onClick={() => setConfirmCancelId(inv.id)}
                                disabled={cancellingId === inv.id}
                                title="Cancel invoice"
                              >
                                {cancellingId === inv.id ? (
                                  <Loader2 size={14} className="inv-spinner" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                Cancel
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      {confirmCancelId && (
        <div
          className="inv-confirm-overlay"
          onClick={() => setConfirmCancelId(null)}
        >
          <div
            className="inv-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="inv-confirm-title">Cancel Invoice?</h3>
            <p className="inv-confirm-text">
              This action cannot be undone. The customer will no longer be able
              to pay this invoice.
            </p>
            <div className="inv-confirm-actions">
              <button
                className="inv-confirm-cancel"
                onClick={() => setConfirmCancelId(null)}
              >
                Keep Invoice
              </button>
              <button
                className="inv-confirm-delete"
                onClick={() => handleCancel(confirmCancelId)}
                disabled={cancellingId === confirmCancelId}
              >
                {cancellingId === confirmCancelId
                  ? "Cancelling..."
                  : "Cancel Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Invoice Form Modal */}
      {showForm && (
        <div className="inv-form-overlay" onClick={() => setShowForm(false)}>
          <div className="inv-form-card" onClick={(e) => e.stopPropagation()}>
            <div className="inv-form-title">
              <span>Create Invoice</span>
              <button
                className="inv-form-close"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Lead Selector */}
              <div className="inv-form-group">
                <label className="inv-form-label">Customer / Lead</label>
                <select
                  className="inv-form-select"
                  value={selectedLeadId}
                  onChange={(e) => handleLeadSelect(e.target.value)}
                  required
                >
                  <option value="">Select a customer...</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.customer?.name ||
                        lead.name ||
                        lead.email ||
                        lead.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-populated fields */}
              {selectedLeadId && (
                <div style={{ display: "flex", gap: "12px", marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label className="inv-form-label">Name</label>
                    <input
                      className="inv-form-input"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="inv-form-label">Email</label>
                    <input
                      className="inv-form-input"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                    />
                  </div>
                </div>
              )}

              {/* Milestone Type */}
              <div className="inv-form-group">
                <label className="inv-form-label">Milestone Type</label>
                <div className="inv-milestone-group">
                  {MILESTONE_TYPES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      className={`inv-milestone-btn ${milestone === m.value ? "active" : ""}`}
                      onClick={() => handleMilestoneChange(m.value)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Items */}
              <div className="inv-form-group">
                <label className="inv-form-label">Line Items</label>
                {lineItems.map((item, idx) => (
                  <div key={idx} className="inv-line-item">
                    <input
                      className="inv-form-input"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(idx, "description", e.target.value)
                      }
                      required
                    />
                    <input
                      className="inv-form-input"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) =>
                        updateLineItem(idx, "amount", e.target.value)
                      }
                      required
                    />
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        className="inv-line-remove"
                        onClick={() => removeLineItem(idx)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className="inv-add-line"
                  onClick={addLineItem}
                >
                  <Plus size={14} />
                  Add Line Item
                </button>

                <div className="inv-total-row">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              {/* Due Date */}
              <div className="inv-form-group">
                <label className="inv-form-label">Due Date</label>
                <input
                  className="inv-form-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              {/* Memo */}
              <div className="inv-form-group">
                <label className="inv-form-label">Memo (optional)</label>
                <textarea
                  className="inv-form-textarea"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Additional notes for the customer..."
                  rows={3}
                />
              </div>

              {/* Submit */}
              <button
                className="inv-submit-btn"
                type="submit"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="inv-spinner" />
                    Creating Invoice...
                  </>
                ) : (
                  <>
                    <DollarSign size={18} />
                    Create Invoice for {formatCurrency(totalAmount)}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
