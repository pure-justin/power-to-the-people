import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "../../services/firebase";
import {
  FileText,
  DollarSign,
  Clock,
  Search,
  Filter,
  Eye,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ban,
} from "lucide-react";

const INVOICE_STATUSES = [
  {
    value: "draft",
    label: "Draft",
    color: "bg-gray-100 text-gray-700",
    icon: FileText,
  },
  {
    value: "sent",
    label: "Sent",
    color: "bg-blue-100 text-blue-700",
    icon: Send,
  },
  {
    value: "paid",
    label: "Paid",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
  {
    value: "overdue",
    label: "Overdue",
    color: "bg-red-100 text-red-700",
    icon: AlertTriangle,
  },
  {
    value: "canceled",
    label: "Canceled",
    color: "bg-gray-100 text-gray-500",
    icon: Ban,
  },
];

function InvoiceDrawer({ invoice, onClose }) {
  if (!invoice) return null;

  const status = INVOICE_STATUSES.find((s) => s.value === invoice.status);
  const StatusIcon = status?.icon || FileText;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Invoice Details
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Invoice #</p>
              <p className="text-lg font-semibold text-gray-900">
                {invoice.invoiceNumber ||
                  invoice.mercuryInvoiceId ||
                  invoice.id}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${status?.color || "bg-gray-100 text-gray-700"}`}
            >
              <StatusIcon className="h-4 w-4" />
              {status?.label || invoice.status}
            </span>
          </div>

          <div className="space-y-3 rounded-lg bg-gray-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">
                {invoice.customerName || "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount</span>
              <span className="font-bold text-gray-900">
                $
                {(invoice.amount || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Due Date</span>
              <span className="text-gray-900">
                {invoice.dueDate?.toDate
                  ? invoice.dueDate.toDate().toLocaleDateString()
                  : invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString()
                    : "N/A"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900">
                {invoice.createdAt?.toDate
                  ? invoice.createdAt.toDate().toLocaleDateString()
                  : invoice.createdAt
                    ? new Date(invoice.createdAt).toLocaleDateString()
                    : "N/A"}
              </span>
            </div>
            {invoice.paidAt && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Paid</span>
                <span className="text-green-600 font-medium">
                  {invoice.paidAt?.toDate
                    ? invoice.paidAt.toDate().toLocaleDateString()
                    : new Date(invoice.paidAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {invoice.description && (
            <div>
              <p className="text-sm font-medium text-gray-700">Description</p>
              <p className="mt-1 text-sm text-gray-600">
                {invoice.description}
              </p>
            </div>
          )}

          {invoice.lineItems && invoice.lineItems.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Line Items
              </p>
              <div className="space-y-2">
                {invoice.lineItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span className="text-gray-600">{item.description}</span>
                    <span className="font-medium text-gray-900">
                      $
                      {(item.amount || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function DashboardInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "invoices"),
          where("createdBy", "==", user.uid),
          limit(500),
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Sort by createdAt descending
        data.sort((a, b) => {
          const aTime = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAt || 0);
          const bTime = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAt || 0);
          return bTime - aTime;
        });
        setInvoices(data);
        setFilteredInvoices(data);
      } catch (err) {
        console.error("Failed to load invoices:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  useEffect(() => {
    let filtered = invoices;
    if (statusFilter !== "all") {
      filtered = filtered.filter((inv) => inv.status === statusFilter);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          (inv.customerName || "").toLowerCase().includes(s) ||
          (inv.invoiceNumber || "").toLowerCase().includes(s) ||
          (inv.mercuryInvoiceId || "").toLowerCase().includes(s),
      );
    }
    setFilteredInvoices(filtered);
  }, [invoices, search, statusFilter]);

  const getStatusStyle = (status) => {
    const found = INVOICE_STATUSES.find((s) => s.value === status);
    return found?.color || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status) => {
    const found = INVOICE_STATUSES.find((s) => s.value === status);
    return found?.label || status || "Unknown";
  };

  // Summary stats
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const overdueCount = invoices.filter(
    (inv) => inv.status === "overdue",
  ).length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-10 w-64 rounded-lg bg-gray-100" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-padded">
          <p className="text-sm text-gray-500">Total Invoiced</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-padded">
          <p className="text-sm text-gray-500">Collected</p>
          <p className="mt-1 text-xl font-bold text-green-600">
            ${paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="card-padded">
          <p className="text-sm text-gray-500">Overdue</p>
          <p
            className={`mt-1 text-xl font-bold ${overdueCount > 0 ? "text-red-600" : "text-gray-900"}`}
          >
            {overdueCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {filteredInvoices.length} invoices
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Due Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {invoice.customerName || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    $
                    {(invoice.amount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(invoice.status)}`}
                    >
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {invoice.dueDate?.toDate
                      ? invoice.dueDate.toDate().toLocaleDateString()
                      : invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString()
                        : "N/A"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedInvoice(invoice)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {search || statusFilter !== "all"
                      ? "No invoices match your filters"
                      : "No invoices yet"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selectedInvoice && (
        <InvoiceDrawer
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
