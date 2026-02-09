/**
 * Portal Credits -- Buyer (homeowner/business) dashboard for tax credit purchases
 *
 * Allows buyers to:
 *   - Browse marketplace (link out)
 *   - View active offers they've made
 *   - Track purchased credits and transfer status
 *   - Download transfer documents
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getCreditTransactions } from "../../services/taxCreditService";
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
  DollarSign,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileText,
  ExternalLink,
  RefreshCw,
  Star,
  TrendingDown,
  AlertTriangle,
  Package,
} from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import FilterBar from "../../components/ui/FilterBar";

const VERIFICATION_LABELS = {
  1: { label: "Bronze", color: "text-amber-700 bg-amber-100" },
  2: { label: "Silver", color: "text-gray-600 bg-gray-100" },
  3: { label: "Gold", color: "text-yellow-700 bg-yellow-100" },
  4: { label: "Platinum", color: "text-indigo-700 bg-indigo-100" },
};

export default function PortalCredits() {
  const { user } = useAuth();

  const [offers, setOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalPurchased: 0,
    activeOffers: 0,
    pendingTransfers: 0,
    totalSaved: 0,
  });

  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);

    try {
      // Load listings where user has made offers
      const listingsQuery = query(
        collection(db, "tax_credit_listings"),
        where("offerBuyerIds", "array-contains", user.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      const listingsSnap = await getDocs(listingsQuery);
      const offerData = listingsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setOffers(offerData);

      // Load transactions where user is buyer
      const txResult = await getCreditTransactions({
        buyerId: user.uid,
        limit: 50,
      });
      setTransactions(txResult.transactions || []);

      // Compute stats
      const completedTx = (txResult.transactions || []).filter(
        (t) => t.transfer?.status === "completed",
      );
      const totalPurchased = completedTx.reduce(
        (sum, t) => sum + (t.creditAmount || 0),
        0,
      );
      const totalSaved = completedTx.reduce(
        (sum, t) =>
          sum + ((t.creditAmount || 0) - (t.payment?.fromBuyer?.amount || 0)),
        0,
      );

      const activeOffers = offerData.reduce(
        (sum, l) =>
          sum +
          (l.offers || []).filter(
            (o) => o.buyerId === user.uid && o.status === "pending",
          ).length,
        0,
      );
      const pendingTransfers = (txResult.transactions || []).filter(
        (t) =>
          t.transfer?.status === "initiated" ||
          t.transfer?.status === "in_escrow",
      ).length;

      setStats({ totalPurchased, activeOffers, pendingTransfers, totalSaved });
    } catch (err) {
      console.error("Failed to load portal credits data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [offerFilters, setOfferFilters] = useState({});
  const [txFilters, setTxFilters] = useState({});

  // Flatten offers: one row per listing with the user's latest offer extracted
  const offerRows = useMemo(() => {
    return offers.map((listing) => {
      const myOffers = (listing.offers || []).filter(
        (o) => o.buyerId === user?.uid,
      );
      const latestOffer = myOffers[myOffers.length - 1];
      const verLevel = listing.verificationLevel?.level || 1;
      return {
        id: listing.id,
        creditType:
          listing.listing?.creditType?.replace(/_/g, " ") || "unknown",
        creditAmount: listing.listing?.creditAmount || 0,
        offerAmount: latestOffer?.amount || 0,
        verificationLevel: verLevel,
        offerStatus: latestOffer?.status || "unknown",
      };
    });
  }, [offers, user?.uid]);

  // Filter definitions for offers table
  const offerFilterDefs = useMemo(() => {
    const statuses = [...new Set(offerRows.map((r) => r.offerStatus))].sort();
    const verLevels = [
      ...new Set(offerRows.map((r) => r.verificationLevel)),
    ].sort();
    return [
      {
        key: "offerStatus",
        label: "Status",
        options: statuses.map((s) => ({ value: s, label: s })),
      },
      {
        key: "verificationLevel",
        label: "Verification",
        options: verLevels.map((v) => ({
          value: String(v),
          label: VERIFICATION_LABELS[v]?.label || `Level ${v}`,
        })),
      },
    ];
  }, [offerRows]);

  // Filtered offers
  const filteredOffers = useMemo(() => {
    return offerRows.filter((row) => {
      if (
        offerFilters.offerStatus &&
        row.offerStatus !== offerFilters.offerStatus
      )
        return false;
      if (
        offerFilters.verificationLevel &&
        String(row.verificationLevel) !== offerFilters.verificationLevel
      )
        return false;
      return true;
    });
  }, [offerRows, offerFilters]);

  // Columns for offers table
  const offerColumns = useMemo(
    () => [
      {
        key: "creditType",
        label: "Credit",
        sortable: true,
        render: (val) => (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {val}
          </span>
        ),
      },
      {
        key: "creditAmount",
        label: "Amount",
        sortable: true,
        render: (val) => (
          <span className="font-medium">${(val || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "offerAmount",
        label: "Your Offer",
        sortable: true,
        render: (val) => <span>${(val || 0).toLocaleString()}</span>,
      },
      {
        key: "verificationLevel",
        label: "Verification",
        sortable: true,
        render: (val) => {
          const verConfig = VERIFICATION_LABELS[val] || VERIFICATION_LABELS[1];
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
        key: "offerStatus",
        label: "Status",
        sortable: true,
        render: (val) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              val === "accepted"
                ? "bg-green-100 text-green-700"
                : val === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : val === "countered"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {val}
          </span>
        ),
      },
      {
        key: "id",
        label: "",
        sortable: false,
        render: (val) => (
          <Link
            to={`/marketplace/credits/${val}`}
            className="text-emerald-600 hover:underline"
          >
            View <ArrowRight className="inline h-3 w-3" />
          </Link>
        ),
      },
    ],
    [],
  );

  // Flatten transactions: one row per tx with computed savings
  const txRows = useMemo(() => {
    return transactions.map((tx) => {
      const paid = tx.payment?.fromBuyer?.amount || 0;
      const creditVal = tx.creditAmount || 0;
      return {
        id: tx.id,
        creditAmount: creditVal,
        paid,
        savings: creditVal - paid,
        transferStatus: tx.transfer?.status || "unknown",
        documentUrl: tx.documents?.transferElection || null,
      };
    });
  }, [transactions]);

  // Filter definitions for transactions table
  const txFilterDefs = useMemo(() => {
    const statuses = [...new Set(txRows.map((r) => r.transferStatus))].sort();
    return [
      {
        key: "transferStatus",
        label: "Transfer Status",
        options: statuses.map((s) => ({
          value: s,
          label: s.replace(/_/g, " "),
        })),
      },
    ];
  }, [txRows]);

  // Filtered transactions
  const filteredTx = useMemo(() => {
    return txRows.filter((row) => {
      if (
        txFilters.transferStatus &&
        row.transferStatus !== txFilters.transferStatus
      )
        return false;
      return true;
    });
  }, [txRows, txFilters]);

  // Columns for transactions table
  const txColumns = useMemo(
    () => [
      {
        key: "creditAmount",
        label: "Credit Value",
        sortable: true,
        render: (val) => (
          <span className="font-medium">${(val || 0).toLocaleString()}</span>
        ),
      },
      {
        key: "paid",
        label: "You Paid",
        sortable: true,
        render: (val) => <span>${(val || 0).toLocaleString()}</span>,
      },
      {
        key: "savings",
        label: "Savings",
        sortable: true,
        render: (val) => (
          <span className="font-medium text-emerald-600">
            ${(val || 0).toLocaleString()}
          </span>
        ),
      },
      {
        key: "transferStatus",
        label: "Transfer Status",
        sortable: true,
        render: (val) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              val === "completed"
                ? "bg-green-100 text-green-700"
                : val === "initiated"
                  ? "bg-blue-100 text-blue-700"
                  : val === "in_escrow"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-gray-100 text-gray-600"
            }`}
          >
            {val?.replace(/_/g, " ") || "unknown"}
          </span>
        ),
      },
      {
        key: "documentUrl",
        label: "Documents",
        sortable: false,
        render: (val, row) =>
          row.transferStatus === "completed" && val ? (
            <a
              href={val}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Form 3800
            </a>
          ) : (
            <span className="text-xs text-gray-400">Pending</span>
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
        <div className="h-64 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Credits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Purchase transferable clean energy tax credits at a discount
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/marketplace/credits"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Browse Marketplace
            <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            onClick={loadData}
            className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="h-4 w-4 text-green-500" />
            Credits Purchased
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            ${stats.totalPurchased.toLocaleString()}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingDown className="h-4 w-4 text-emerald-500" />
            Total Savings
          </div>
          <p className="mt-1 text-2xl font-bold text-emerald-600">
            ${stats.totalSaved.toLocaleString()}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Active Offers
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.activeOffers}
          </p>
        </div>
        <div className="card-padded">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4 text-blue-500" />
            Pending Transfers
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {stats.pendingTransfers}
          </p>
        </div>
      </div>

      {/* Active Offers */}
      {offers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Your Offers
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                Credits you've made offers on
              </p>
            </div>
          </div>
          <FilterBar
            filters={offerFilterDefs}
            activeFilters={offerFilters}
            onChange={setOfferFilters}
          />
          <DataTable
            columns={offerColumns}
            data={filteredOffers}
            emptyMessage="No offers match the selected filters."
          />
        </div>
      )}

      {/* Completed Purchases / Transfer Tracking */}
      {transactions.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Purchased Credits
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Track transfer status and download documents
            </p>
          </div>
          <FilterBar
            filters={txFilterDefs}
            activeFilters={txFilters}
            onChange={setTxFilters}
          />
          <DataTable
            columns={txColumns}
            data={filteredTx}
            emptyMessage="No purchased credits match the selected filters."
          />
        </div>
      ) : (
        offers.length === 0 && (
          <div className="card">
            <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No credits yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Browse the marketplace to find transferable tax credits at a
                discount.
              </p>
              <Link
                to="/marketplace/credits"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Browse Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )
      )}

      {/* How it Works */}
      <div className="card">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            How Credit Transfers Work
          </h2>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              1
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Browse</p>
            <p className="mt-1 text-xs text-gray-500">
              Find verified credits in the marketplace
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              2
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Offer</p>
            <p className="mt-1 text-xs text-gray-500">
              Make an offer below face value
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              3
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Escrow</p>
            <p className="mt-1 text-xs text-gray-500">
              Funds held securely until transfer
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
              4
            </div>
            <p className="mt-2 text-sm font-medium text-gray-900">Claim</p>
            <p className="mt-1 text-xs text-gray-500">
              IRS transfer election filed, credit is yours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
