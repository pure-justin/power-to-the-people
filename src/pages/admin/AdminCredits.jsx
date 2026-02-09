/**
 * Admin Credits -- Platform oversight for tax credit marketplace
 *
 * Admin capabilities:
 *   - View all listings and transactions
 *   - Audit review queue (approve/flag audits)
 *   - Dispute resolution
 *   - Platform revenue dashboard
 *   - Market analytics
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getCreditMarketStats,
  getCreditTransactions,
} from "../../services/taxCreditService";
import {
  db,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
} from "../../services/firebase";
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  FileText,
  ArrowRight,
  BarChart3,
  Users,
  Loader2,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

const VERIFICATION_LABELS = {
  1: { label: "Bronze", color: "text-amber-700 bg-amber-100" },
  2: { label: "Silver", color: "text-gray-600 bg-gray-100" },
  3: { label: "Gold", color: "text-yellow-700 bg-yellow-100" },
  4: { label: "Platinum", color: "text-indigo-700 bg-indigo-100" },
};

export default function AdminCredits() {
  const [listings, setListings] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [marketStats, setMarketStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [listingFilters, setListingFilters] = useState({});
  const [txFilters, setTxFilters] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load market stats
      const statsResult = await getCreditMarketStats();
      setMarketStats(statsResult.stats || null);

      // Load all listings
      const listingsQuery = query(
        collection(db, "tax_credit_listings"),
        orderBy("createdAt", "desc"),
        limit(100),
      );
      const listingsSnap = await getDocs(listingsQuery);
      setListings(listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Load all transactions
      const txResult = await getCreditTransactions({ limit: 100 });
      setTransactions(txResult.transactions || []);
    } catch (err) {
      console.error("Failed to load admin credits data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived stats
  const activeListings = listings.filter(
    (l) => l.status === "active" || l.status === "under_offer",
  );
  const pendingAudits = listings.filter(
    (l) => l.verificationLevel?.level === 1,
  );
  const completedTx = transactions.filter(
    (t) => t.transfer?.status === "completed",
  );
  const platformRevenue = completedTx.reduce(
    (sum, t) => sum + (t.platformFee || 0),
    0,
  );
  const totalVolume = completedTx.reduce(
    (sum, t) => sum + (t.salePrice || 0),
    0,
  );
  const disputedTx = transactions.filter(
    (t) => t.transfer?.status === "disputed",
  );

  // --- Listings: filter defs, filtered data, columns ---
  const listingFilterDefs = useMemo(() => {
    const statuses = [
      ...new Set(listings.map((l) => l.status).filter(Boolean)),
    ].sort();
    const types = [
      ...new Set(listings.map((l) => l.listing?.creditType).filter(Boolean)),
    ].sort();
    return [
      { key: "status", label: "Status", options: statuses },
      {
        key: "creditType",
        label: "Credit Type",
        options: types.map((t) => ({ value: t, label: t.replace(/_/g, " ") })),
      },
    ];
  }, [listings]);

  const filteredListings = useMemo(() => {
    let result = listings;
    if (listingFilters.status)
      result = result.filter((l) => l.status === listingFilters.status);
    if (listingFilters.creditType)
      result = result.filter(
        (l) => l.listing?.creditType === listingFilters.creditType,
      );
    return result;
  }, [listings, listingFilters]);

  const listingColumns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        sortable: true,
        render: (val) => (
          <span className="font-mono text-xs text-gray-500">
            {val?.slice(0, 8)}
          </span>
        ),
      },
      {
        key: "creditType",
        label: "Type",
        sortable: true,
        render: (_val, row) => (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {row.listing?.creditType?.replace(/_/g, " ")}
          </span>
        ),
      },
      {
        key: "creditAmount",
        label: "Amount",
        sortable: true,
        render: (_val, row) => (
          <span className="font-medium">
            ${(row.listing?.creditAmount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "askingPrice",
        label: "Asking",
        sortable: true,
        render: (_val, row) => (
          <span>${(row.listing?.askingPrice || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "verificationLevel",
        label: "Verification",
        sortable: false,
        render: (_val, row) => {
          const verLevel = row.verificationLevel?.level || 1;
          const verConfig =
            VERIFICATION_LABELS[verLevel] || VERIFICATION_LABELS[1];
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${verConfig.color}`}
            >
              <Star className="h-3 w-3 fill-current" />
              {verConfig.label}
            </span>
          );
        },
      },
      {
        key: "offers",
        label: "Offers",
        sortable: false,
        render: (_val, row) => {
          const offerCount = (row.offers || []).length;
          return offerCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {offerCount}
            </span>
          ) : (
            <span className="text-gray-400">0</span>
          );
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              val === "active"
                ? "bg-green-100 text-green-700"
                : val === "under_offer"
                  ? "bg-blue-100 text-blue-700"
                  : val === "sold"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {val?.replace(/_/g, " ")}
          </span>
        ),
      },
    ],
    [],
  );

  // --- Transactions: filter defs, filtered data, columns ---
  const txFilterDefs = useMemo(() => {
    const statuses = [
      ...new Set(transactions.map((t) => t.transfer?.status).filter(Boolean)),
    ].sort();
    return [{ key: "status", label: "Status", options: statuses }];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (txFilters.status)
      result = result.filter((t) => t.transfer?.status === txFilters.status);
    return result;
  }, [transactions, txFilters]);

  const txColumns = useMemo(
    () => [
      {
        key: "id",
        label: "ID",
        sortable: true,
        render: (val) => (
          <span className="font-mono text-xs text-gray-500">
            {val?.slice(0, 8)}
          </span>
        ),
      },
      {
        key: "creditAmount",
        label: "Credit",
        sortable: true,
        render: (val) => (
          <span className="font-medium">${(val || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "salePrice",
        label: "Sale Price",
        sortable: true,
        render: (val) => <span>${(val || 0).toLocaleString()}</span>,
      },
      {
        key: "platformFee",
        label: "Platform Fee",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-emerald-600">
            ${(val || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "sellerNet",
        label: "Seller Net",
        sortable: false,
        render: (_val, row) => (
          <span>${(row.payment?.toSeller?.amount || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "transferStatus",
        label: "Status",
        sortable: true,
        render: (_val, row) => {
          const status = row.transfer?.status;
          return (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "completed"
                  ? "bg-green-100 text-green-700"
                  : status === "disputed"
                    ? "bg-red-100 text-red-700"
                    : status === "initiated"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
              }`}
            >
              {status || "unknown"}
            </span>
          );
        },
      },
    ],
    [],
  );

  // --- Audit queue columns ---
  const auditColumns = useMemo(
    () => [
      {
        key: "creditType",
        label: "Credit",
        sortable: false,
        render: (_val, row) => (
          <span className="font-medium text-gray-900">
            {row.listing?.creditType?.replace(/_/g, " ")} -- $
            {(row.listing?.creditAmount || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "sellerId",
        label: "Seller",
        sortable: false,
        render: (val) => (
          <span className="text-xs text-gray-500">
            {val?.slice(0, 8) || "unknown"}
          </span>
        ),
      },
      {
        key: "state",
        label: "State",
        sortable: false,
        render: (_val, row) => (
          <span className="text-xs text-gray-500">
            {row.projectSummary?.state || "?"}
          </span>
        ),
      },
      {
        key: "verificationLevel",
        label: "Level",
        sortable: false,
        render: () => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_LABELS[1].color}`}
          >
            Bronze -- needs review
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_val, _row) => (
          <div className="flex items-center gap-2">
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              Review Audit
            </button>
            <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">
              Approve
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-64 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Credit Marketplace Admin
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform oversight for IRA Section 6418 credit transfers
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="h-4 w-4 text-green-500" />
            Platform Revenue
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${platformRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BarChart3 className="h-4 w-4 text-blue-500" />
            Total Volume
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${totalVolume.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="h-4 w-4 text-emerald-500" />
            Active Listings
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {activeListings.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Disputes
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {disputedTx.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200">
        {[
          { key: "overview", label: "Overview" },
          { key: "listings", label: `Listings (${listings.length})` },
          {
            key: "transactions",
            label: `Transactions (${transactions.length})`,
          },
          { key: "audits", label: `Audit Queue (${pendingAudits.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Market Stats from Cloud Function */}
          {marketStats && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Market Analytics
                </h2>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-gray-500">Avg Discount Rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marketStats.avgDiscountRate || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Time to Sell</p>
                  <p className="text-xl font-bold text-gray-900">
                    {marketStats.avgDaysToSell || 0} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Credits Listed</p>
                  <p className="text-xl font-bold text-gray-900">
                    ${(marketStats.totalCreditValue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h2>
            </div>
            <div className="divide-y">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    {tx.transfer?.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : tx.transfer?.status === "disputed" ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        ${(tx.creditAmount || 0).toLocaleString()} credit
                        transfer
                      </p>
                      <p className="text-xs text-gray-500">
                        Fee: ${(tx.platformFee || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      tx.transfer?.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : tx.transfer?.status === "disputed"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {tx.transfer?.status || "unknown"}
                  </span>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  No transactions yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "listings" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">All Listings</h3>
            <span className="text-sm text-gray-400">
              {filteredListings.length} results
            </span>
          </div>

          <FilterBar
            filters={listingFilterDefs}
            activeFilters={listingFilters}
            onChange={setListingFilters}
          />

          <DataTable
            columns={listingColumns}
            data={filteredListings}
            emptyMessage="No listings found."
          />
        </div>
      )}

      {tab === "transactions" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              All Transactions
            </h3>
            <span className="text-sm text-gray-400">
              {filteredTransactions.length} results
            </span>
          </div>

          <FilterBar
            filters={txFilterDefs}
            activeFilters={txFilters}
            onChange={setTxFilters}
          />

          <DataTable
            columns={txColumns}
            data={filteredTransactions}
            emptyMessage="No transactions found."
          />
        </div>
      )}

      {tab === "audits" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Audit Review Queue
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Listings with low verification that may need manual review
            </p>
          </div>
          {pendingAudits.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-400" />
              <p className="mt-2 text-sm text-gray-500">
                All audits up to date. No pending reviews.
              </p>
            </div>
          ) : (
            <DataTable
              columns={auditColumns}
              data={pendingAudits}
              emptyMessage="No pending audits."
            />
          )}
        </div>
      )}
    </div>
  );
}
