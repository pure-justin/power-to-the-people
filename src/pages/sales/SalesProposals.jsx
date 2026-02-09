import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  db,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "../../services/firebase";
import {
  FileText,
  DollarSign,
  Sun,
  Battery,
  Zap,
  Home,
  ChevronRight,
  Calculator,
  X,
  Check,
  CreditCard,
  Search,
} from "lucide-react";

const SYSTEM_SIZES = [
  { kw: 4, label: "4 kW", panels: 10, description: "Small home" },
  { kw: 6, label: "6 kW", panels: 15, description: "Medium home" },
  { kw: 8, label: "8 kW", panels: 20, description: "Large home" },
  { kw: 10, label: "10 kW", panels: 25, description: "Very large home" },
  { kw: 12, label: "12 kW", panels: 30, description: "Estate / high usage" },
  { kw: 15, label: "15 kW", panels: 38, description: "Maximum residential" },
];

const FINANCING_OPTIONS = [
  {
    id: "cash",
    label: "Cash Purchase",
    icon: DollarSign,
    description: "Lowest total cost, immediate ownership",
  },
  {
    id: "loan",
    label: "Solar Loan",
    icon: CreditCard,
    description: "Own the system, fixed monthly payments",
  },
  {
    id: "lease",
    label: "Solar Lease",
    icon: Home,
    description: "No upfront cost, fixed monthly payment",
  },
  {
    id: "ppa",
    label: "PPA",
    icon: Zap,
    description: "Pay per kWh generated, no upfront cost",
  },
];

function ProposalBuilder({ lead, onClose, onSave }) {
  const [systemSize, setSystemSize] = useState(8);
  const [addBattery, setAddBattery] = useState(false);
  const [selectedFinancing, setSelectedFinancing] = useState("cash");
  const [customPpw, setCustomPpw] = useState(3.0);
  const [loanTerm, setLoanTerm] = useState(25);
  const [loanRate, setLoanRate] = useState(6.99);
  const [leasePmt, setLeasePmt] = useState(null);
  const [ppaRate, setPpaRate] = useState(0.12);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");

  // Calculations
  const ppw = customPpw;
  const systemCost = systemSize * 1000 * ppw;
  const batteryCost = addBattery ? 12000 : 0;
  const totalCost = systemCost + batteryCost;
  // Note: Residential ITC ended Jan 1, 2026 for homeowner-owned systems
  // TPO (lease/PPA) can still claim commercial ITC
  const itcApplies =
    selectedFinancing === "lease" || selectedFinancing === "ppa";
  const itcAmount = itcApplies ? Math.round(totalCost * 0.3) : 0;
  const netCost = totalCost - itcAmount;

  const annualProduction = systemSize * 1400; // avg kWh per kW
  const monthlyProduction = Math.round(annualProduction / 12);
  const avgRate = 0.13; // $/kWh
  const annualSavings = Math.round(annualProduction * avgRate);
  const monthlySavings = Math.round(annualSavings / 12);

  // Loan calc
  const monthlyLoanPmt =
    selectedFinancing === "loan"
      ? (() => {
          const r = loanRate / 100 / 12;
          const n = loanTerm * 12;
          if (r === 0) return Math.round(netCost / n);
          return Math.round(
            (netCost * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1),
          );
        })()
      : 0;

  // Lease calc
  const monthlyLeasePmt =
    leasePmt || Math.round((totalCost / (25 * 12)) * 0.85);

  // PPA calc
  const monthlyPpaPmt = Math.round(monthlyProduction * ppaRate);

  const paybackYears =
    selectedFinancing === "cash" && annualSavings > 0
      ? Math.round((netCost / annualSavings) * 10) / 10
      : null;

  const twentyFiveYearSavings = annualSavings * 25 - netCost;

  const handleSave = async () => {
    setSaving(true);
    try {
      const proposalData = {
        leadId: lead.id,
        leadName: lead.customerName || lead.name || "Unnamed",
        systemSizeKw: systemSize,
        panelCount:
          SYSTEM_SIZES.find((s) => s.kw === systemSize)?.panels ||
          Math.round(systemSize / 0.4),
        addBattery,
        financingType: selectedFinancing,
        pricePerWatt: ppw,
        systemCost,
        batteryCost,
        totalCost,
        itcAmount,
        netCost,
        annualProduction,
        annualSavings,
        monthlyPayment:
          selectedFinancing === "loan"
            ? monthlyLoanPmt
            : selectedFinancing === "lease"
              ? monthlyLeasePmt
              : selectedFinancing === "ppa"
                ? monthlyPpaPmt
                : 0,
        loanTerm: selectedFinancing === "loan" ? loanTerm : null,
        loanRate: selectedFinancing === "loan" ? loanRate : null,
        ppaRate: selectedFinancing === "ppa" ? ppaRate : null,
        paybackYears,
        notes,
        status: "draft",
        createdAt: serverTimestamp(),
        createdBy: lead.assignedTo,
      };

      await addDoc(collection(db, "proposals"), proposalData);

      // Update lead status if still in early stages
      if (
        ["new", "contacted", "qualified", "site_survey"].includes(lead.status)
      ) {
        const leadRef = doc(db, "leads", lead.id);
        await updateDoc(leadRef, {
          status: "proposal",
          updatedAt: serverTimestamp(),
        });
      }

      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error("Failed to save proposal:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Build Proposal
            </h2>
            <p className="text-sm text-gray-500">
              {lead.customerName || lead.name || "Lead"}
              {lead.address ? ` - ${lead.address}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* System Size */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Sun className="h-4 w-4 text-amber-500" /> System Size
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {SYSTEM_SIZES.map((size) => (
                <button
                  key={size.kw}
                  onClick={() => setSystemSize(size.kw)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    systemSize === size.kw
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {size.label}
                  </p>
                  <p className="text-xs text-gray-500">{size.panels} panels</p>
                  <p className="text-xs text-gray-400">{size.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Battery */}
          <div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50">
              <input
                type="checkbox"
                checked={addBattery}
                onChange={(e) => setAddBattery(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Battery className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Add Battery Storage
                </p>
                <p className="text-xs text-gray-500">
                  Home battery backup (+$12,000)
                </p>
              </div>
            </label>
          </div>

          {/* Price Per Watt */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Price Per Watt ($/W)
            </label>
            <input
              type="number"
              step="0.10"
              min="1.50"
              max="5.00"
              value={customPpw}
              onChange={(e) => setCustomPpw(parseFloat(e.target.value) || 3.0)}
              className="input-field w-32"
            />
          </div>

          {/* Financing Options */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CreditCard className="h-4 w-4 text-blue-500" /> Financing
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {FINANCING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedFinancing(opt.id)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selectedFinancing === opt.id
                      ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <opt.icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Financing-specific fields */}
            {selectedFinancing === "loan" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Loan Term (years)
                  </label>
                  <select
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(parseInt(e.target.value))}
                    className="input-field"
                  >
                    <option value={10}>10 years</option>
                    <option value={15}>15 years</option>
                    <option value={20}>20 years</option>
                    <option value={25}>25 years</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Interest Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={loanRate}
                    onChange={(e) =>
                      setLoanRate(parseFloat(e.target.value) || 6.99)
                    }
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {selectedFinancing === "ppa" && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  PPA Rate ($/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={ppaRate}
                  onChange={(e) =>
                    setPpaRate(parseFloat(e.target.value) || 0.12)
                  }
                  className="input-field w-32"
                />
              </div>
            )}
          </div>

          {/* Proposal Summary */}
          <div className="rounded-xl bg-gray-50 p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Calculator className="h-4 w-4 text-emerald-600" /> Proposal
              Summary
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">System Size</p>
                <p className="font-semibold text-gray-900">{systemSize} kW</p>
              </div>
              <div>
                <p className="text-gray-500">Annual Production</p>
                <p className="font-semibold text-gray-900">
                  {annualProduction.toLocaleString()} kWh
                </p>
              </div>
              <div>
                <p className="text-gray-500">System Cost</p>
                <p className="font-semibold text-gray-900">
                  ${totalCost.toLocaleString()}
                </p>
              </div>
              {itcApplies && (
                <div>
                  <p className="text-gray-500">ITC (30%)</p>
                  <p className="font-semibold text-green-600">
                    -${itcAmount.toLocaleString()}
                  </p>
                </div>
              )}
              {!itcApplies && selectedFinancing === "cash" && (
                <div>
                  <p className="text-gray-500">ITC</p>
                  <p className="text-xs text-amber-600">
                    Residential ITC ended 1/1/2026
                  </p>
                </div>
              )}
              <div>
                <p className="text-gray-500">Net Cost</p>
                <p className="text-lg font-bold text-gray-900">
                  ${netCost.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Annual Savings</p>
                <p className="font-semibold text-emerald-600">
                  ${annualSavings.toLocaleString()}/yr
                </p>
              </div>

              {selectedFinancing === "cash" && paybackYears && (
                <div>
                  <p className="text-gray-500">Payback Period</p>
                  <p className="font-semibold text-gray-900">
                    {paybackYears} years
                  </p>
                </div>
              )}
              {selectedFinancing === "loan" && (
                <div>
                  <p className="text-gray-500">Monthly Payment</p>
                  <p className="font-semibold text-gray-900">
                    ${monthlyLoanPmt}/mo
                  </p>
                </div>
              )}
              {selectedFinancing === "lease" && (
                <div>
                  <p className="text-gray-500">Monthly Lease</p>
                  <p className="font-semibold text-gray-900">
                    ${monthlyLeasePmt}/mo
                  </p>
                </div>
              )}
              {selectedFinancing === "ppa" && (
                <div>
                  <p className="text-gray-500">Estimated Monthly</p>
                  <p className="font-semibold text-gray-900">
                    ${monthlyPpaPmt}/mo
                  </p>
                </div>
              )}

              <div className="col-span-2 border-t border-gray-200 pt-3">
                <p className="text-gray-500">25-Year Net Savings</p>
                <p
                  className={`text-lg font-bold ${twentyFiveYearSavings > 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  ${twentyFiveYearSavings.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this proposal..."
              rows={3}
              className="input-field"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 justify-center gap-2"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save Proposal
                </>
              )}
            </button>
            <button onClick={onClose} className="btn-secondary px-6">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SalesProposals() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buildingFor, setBuildingFor] = useState(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch leads assigned to me
      const leadsQ = query(
        collection(db, "leads"),
        where("assignedTo", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(500),
      );
      const leadsSnap = await getDocs(leadsQ);
      setLeads(leadsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Fetch proposals I created
      try {
        const proposalsQ = query(
          collection(db, "proposals"),
          where("createdBy", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(200),
        );
        const proposalsSnap = await getDocs(proposalsQ);
        setProposals(
          proposalsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      } catch {
        // proposals collection may not exist yet
        setProposals([]);
      }
    } catch (err) {
      console.error("Failed to load proposals data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLeads = search
    ? leads.filter(
        (l) =>
          (l.customerName || l.name || "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (l.email || "").toLowerCase().includes(search.toLowerCase()),
      )
    : leads;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Build and manage solar proposals for your leads.
          </p>
        </div>
      </div>

      {/* Existing Proposals */}
      {proposals.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Recent Proposals
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {proposals.map((p) => (
              <div key={p.id} className="card-padded">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {p.leadName || "Unnamed"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.systemSizeKw} kW system
                      {p.addBattery ? " + battery" : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "sent"
                        ? "bg-blue-100 text-blue-700"
                        : p.status === "accepted"
                          ? "bg-green-100 text-green-700"
                          : p.status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.status || "draft"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Net Cost</span>
                    <p className="font-semibold text-gray-700">
                      ${(p.netCost || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Financing</span>
                    <p className="font-semibold capitalize text-gray-700">
                      {p.financingType || "--"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Annual Savings</span>
                    <p className="font-semibold text-emerald-600">
                      ${(p.annualSavings || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Created</span>
                    <p className="font-semibold text-gray-700">
                      {p.createdAt?.toDate
                        ? p.createdAt.toDate().toLocaleDateString()
                        : "--"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Select Lead for New Proposal */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Create New Proposal
        </h2>
        <p className="mb-3 text-sm text-gray-500">
          Select a lead to build a proposal for.
        </p>
        <div className="relative mb-4 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="input-field pl-9"
          />
        </div>
        {filteredLeads.length === 0 ? (
          <div className="card-padded py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">
              {search
                ? "No leads match your search."
                : "No leads assigned to you yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.slice(0, 12).map((lead) => (
              <button
                key={lead.id}
                onClick={() => setBuildingFor(lead)}
                className="card-padded flex items-center gap-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                  <Home className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {lead.customerName || lead.name || "Unnamed"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {lead.address || lead.email || "No address"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Proposal Builder Drawer */}
      {buildingFor && (
        <ProposalBuilder
          lead={buildingFor}
          onClose={() => setBuildingFor(null)}
          onSave={() => loadData()}
        />
      )}
    </div>
  );
}
