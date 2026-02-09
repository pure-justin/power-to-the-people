import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Sun,
  MapPin,
  Zap,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Calculator,
  Home,
  Battery,
  CreditCard,
  Check,
  Loader2,
} from "lucide-react";

const STEPS = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "usage", label: "Usage", icon: Zap },
  { key: "equipment", label: "Equipment", icon: Sun },
  { key: "financing", label: "Financing", icon: CreditCard },
  { key: "result", label: "Result", icon: Calculator },
];

const PANEL_OPTIONS = [
  { label: "Standard (400W)", watts: 400, pricePerWatt: 2.5 },
  { label: "Premium (425W)", watts: 425, pricePerWatt: 2.8 },
  { label: "US-Made FEOC (410W)", watts: 410, pricePerWatt: 3.1 },
];

const INVERTER_OPTIONS = [
  { label: "String Inverter", type: "string", adder: 0 },
  { label: "Microinverters", type: "micro", adder: 0.3 },
  { label: "Optimizers + String", type: "optimizer", adder: 0.15 },
];

const BATTERY_OPTIONS = [
  { label: "No Battery", capacity: 0, price: 0 },
  { label: "10 kWh Battery", capacity: 10, price: 8000 },
  { label: "15 kWh Battery", capacity: 15, price: 11500 },
  { label: "20 kWh Battery", capacity: 20, price: 15000 },
];

const FINANCING_OPTIONS = [
  {
    label: "Cash Purchase",
    type: "cash",
    term: 0,
    rate: 0,
    description: "Pay upfront, maximize savings",
  },
  {
    label: "Solar Loan (25yr)",
    type: "loan",
    term: 25,
    rate: 5.99,
    description: "Low monthly payments, you own the system",
  },
  {
    label: "Lease/PPA",
    type: "tpo",
    term: 25,
    rate: 0,
    description: "No upfront cost, third-party owns system",
  },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1">
      {STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const isActive = i === currentStep;
        const isComplete = i < currentStep;
        return (
          <div key={step.key} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white"
                  : isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {isComplete ? (
                <Check className="h-4 w-4" />
              ) : (
                <StepIcon className="h-4 w-4" />
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-6 sm:w-10 ${isComplete ? "bg-emerald-300" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardEstimates() {
  useAuth();
  const [step, setStep] = useState(0);
  const [calculating, setCalculating] = useState(false);

  // Form state
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [monthlyUsage, setMonthlyUsage] = useState("");
  const [electricRate, setElectricRate] = useState("0.13");
  const [roofType, setRoofType] = useState("composite");
  const [panelIndex, setPanelIndex] = useState(0);
  const [inverterIndex, setInverterIndex] = useState(0);
  const [batteryIndex, setBatteryIndex] = useState(0);
  const [financingIndex, setFinancingIndex] = useState(0);

  // Calculated results
  const [result, setResult] = useState(null);

  const canAdvance = () => {
    switch (step) {
      case 0:
        return address.trim() && zip.trim();
      case 1:
        return monthlyUsage && Number(monthlyUsage) > 0;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const calculateEstimate = () => {
    setCalculating(true);

    // Simulate calculation delay
    setTimeout(() => {
      const panel = PANEL_OPTIONS[panelIndex];
      const inverter = INVERTER_OPTIONS[inverterIndex];
      const battery = BATTERY_OPTIONS[batteryIndex];
      const financing = FINANCING_OPTIONS[financingIndex];

      const annualUsage = Number(monthlyUsage) * 12;
      const rate = Number(electricRate);

      // Estimate system size (assuming 4.5 peak sun hours average, 80% efficiency)
      const dailyUsage = annualUsage / 365;
      const systemSizeKw = Math.ceil((dailyUsage / (4.5 * 0.8)) * 10) / 10;
      const numberOfPanels = Math.ceil((systemSizeKw * 1000) / panel.watts);
      const actualSystemSize = (numberOfPanels * panel.watts) / 1000;

      // Cost calculation
      const panelCost = actualSystemSize * 1000 * panel.pricePerWatt;
      const inverterAdder = actualSystemSize * 1000 * inverter.adder;
      const batteryCost = battery.price;
      const totalCost = panelCost + inverterAdder + batteryCost;

      // Annual production (assuming 1,400 kWh per kW installed, national average)
      const annualProduction = actualSystemSize * 1400;
      const annualSavings = annualProduction * rate;
      const monthlyPayment =
        financing.type === "loan"
          ? (totalCost * (financing.rate / 100 / 12)) /
            (1 - Math.pow(1 + financing.rate / 100 / 12, -financing.term * 12))
          : financing.type === "tpo"
            ? (annualSavings * 0.8) / 12
            : 0;

      const paybackYears =
        financing.type === "cash"
          ? Math.round((totalCost / annualSavings) * 10) / 10
          : financing.type === "loan"
            ? Math.round((totalCost / annualSavings) * 10) / 10
            : 0;

      const twentyFiveYearSavings = annualSavings * 25;

      setResult({
        systemSize: actualSystemSize,
        numberOfPanels,
        annualProduction: Math.round(annualProduction),
        totalCost: Math.round(totalCost),
        annualSavings: Math.round(annualSavings),
        monthlyPayment: Math.round(monthlyPayment),
        paybackYears,
        twentyFiveYearSavings: Math.round(twentyFiveYearSavings),
        offset: Math.min(
          Math.round((annualProduction / annualUsage) * 100),
          100,
        ),
        panel: panel.label,
        inverter: inverter.label,
        battery: battery.label,
        financing: financing.label,
      });
      setCalculating(false);
      setStep(4);
    }, 1500);
  };

  const handleNext = () => {
    if (step === 3) {
      calculateEstimate();
    } else {
      setStep((s) => Math.min(s + 1, 4));
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleReset = () => {
    setStep(0);
    setResult(null);
    setAddress("");
    setCity("");
    setState("");
    setZip("");
    setMonthlyUsage("");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Solar Estimate</h1>

      <StepIndicator currentStep={step} />

      <div className="card-padded">
        {/* Step 0: Address */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Property Address
              </h2>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Street Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="TX"
                  maxLength={2}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  ZIP Code
                </label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="78701"
                  maxLength={5}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Roof Type
              </label>
              <select
                value={roofType}
                onChange={(e) => setRoofType(e.target.value)}
                className="input-field"
              >
                <option value="composite">Composite Shingle</option>
                <option value="tile">Tile</option>
                <option value="metal">Metal</option>
                <option value="flat">Flat/TPO</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 1: Usage */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Energy Usage
              </h2>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Average Monthly Usage (kWh)
              </label>
              <input
                type="number"
                value={monthlyUsage}
                onChange={(e) => setMonthlyUsage(e.target.value)}
                placeholder="1200"
                className="input-field"
              />
              <p className="mt-1 text-xs text-gray-500">
                Check your utility bill for this number. Average US home uses
                900-1,200 kWh/month.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Electric Rate ($/kWh)
              </label>
              <input
                type="number"
                step="0.01"
                value={electricRate}
                onChange={(e) => setElectricRate(e.target.value)}
                placeholder="0.13"
                className="input-field"
              />
              <p className="mt-1 text-xs text-gray-500">
                National average is ~$0.13/kWh. Check your utility bill for your
                rate.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Equipment */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Equipment Selection
              </h2>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Solar Panels
              </label>
              <div className="space-y-2">
                {PANEL_OPTIONS.map((panel, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                      panelIndex === i
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="panel"
                      checked={panelIndex === i}
                      onChange={() => setPanelIndex(i)}
                      className="sr-only"
                    />
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        panelIndex === i
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300"
                      }`}
                    >
                      {panelIndex === i && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {panel.label}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        ${panel.pricePerWatt}/W
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Inverter Type
              </label>
              <div className="space-y-2">
                {INVERTER_OPTIONS.map((inv, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                      inverterIndex === i
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="inverter"
                      checked={inverterIndex === i}
                      onChange={() => setInverterIndex(i)}
                      className="sr-only"
                    />
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        inverterIndex === i
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300"
                      }`}
                    >
                      {inverterIndex === i && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {inv.label}
                      </span>
                      {inv.adder > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          +${inv.adder}/W
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Battery Storage
              </label>
              <div className="space-y-2">
                {BATTERY_OPTIONS.map((bat, i) => (
                  <label
                    key={i}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                      batteryIndex === i
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="battery"
                      checked={batteryIndex === i}
                      onChange={() => setBatteryIndex(i)}
                      className="sr-only"
                    />
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        batteryIndex === i
                          ? "border-emerald-500 bg-emerald-500"
                          : "border-gray-300"
                      }`}
                    >
                      {batteryIndex === i && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900">
                        {bat.label}
                      </span>
                      {bat.price > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ${bat.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Financing */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Financing Option
              </h2>
            </div>
            <div className="space-y-2">
              {FINANCING_OPTIONS.map((fin, i) => (
                <label
                  key={i}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    financingIndex === i
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="financing"
                    checked={financingIndex === i}
                    onChange={() => setFinancingIndex(i)}
                    className="sr-only"
                  />
                  <div
                    className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                      financingIndex === i
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-gray-300"
                    }`}
                  >
                    {financingIndex === i && (
                      <div className="flex h-full items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      {fin.label}
                    </span>
                    {fin.rate > 0 && (
                      <span className="ml-2 text-xs text-gray-500">
                        {fin.rate}% APR
                      </span>
                    )}
                    <p className="text-xs text-gray-500">{fin.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Your Solar Estimate
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <Sun className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {result.systemSize} kW
                </p>
                <p className="text-xs text-gray-500">
                  {result.numberOfPanels} panels
                </p>
              </div>
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <Zap className="mx-auto h-6 w-6 text-blue-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {result.annualProduction.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">kWh/year</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <DollarSign className="mx-auto h-6 w-6 text-amber-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  ${result.annualSavings.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">annual savings</p>
              </div>
              <div className="rounded-xl bg-purple-50 p-4 text-center">
                <Battery className="mx-auto h-6 w-6 text-purple-600" />
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {result.offset}%
                </p>
                <p className="text-xs text-gray-500">offset</p>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total System Cost</span>
                  <span className="font-medium text-gray-900">
                    ${result.totalCost.toLocaleString()}
                  </span>
                </div>
                {result.monthlyPayment > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Payment</span>
                    <span className="font-medium text-gray-900">
                      ${result.monthlyPayment.toLocaleString()}/mo
                    </span>
                  </div>
                )}
                {result.paybackYears > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payback Period</span>
                    <span className="font-medium text-gray-900">
                      {result.paybackYears} years
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">25-Year Savings</span>
                  <span className="font-bold text-emerald-600">
                    ${result.twentyFiveYearSavings.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 text-xs text-gray-500">
              <p className="font-medium text-gray-700">Equipment Selected</p>
              <p className="mt-1">
                Panels: {result.panel} | Inverter: {result.inverter} | Storage:{" "}
                {result.battery} | Financing: {result.financing}
              </p>
              <p className="mt-2 italic">
                This is a preliminary estimate. Final pricing depends on site
                survey, utility rates, and available incentives. Will integrate
                with solarEstimate API for accurate calculations.
              </p>
            </div>
          </div>
        )}

        {/* Calculating overlay */}
        {calculating && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="mt-3 text-sm text-gray-600">
              Calculating your solar estimate...
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        {!calculating && (
          <div className="mt-6 flex items-center justify-between">
            {step > 0 && step < 4 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : step === 4 ? (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Start Over
              </button>
            ) : (
              <div />
            )}

            {step < 4 && (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="btn-primary flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {step === 3 ? "Calculate" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
