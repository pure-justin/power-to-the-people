import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Sun,
  DollarSign,
  TrendingUp,
  Leaf,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Shield,
  Calculator,
  BarChart3,
  PiggyBank,
  TreePine,
  Car,
  Home,
  MapPin,
  Download,
  Target,
  Share2,
  Check,
  AlertTriangle,
  Activity,
  Clock,
  Percent,
  LineChart,
  Shuffle,
} from "lucide-react";
import {
  calculateAdvancedROI,
  ROI_DEFAULTS,
  STATE_UTILITY_RATES,
  STATE_SUNSHINE_HOURS,
  runMonteCarloSimulation,
  generateRateForecast,
  generateScenarioComparison,
  encodeProjectionParams,
  decodeProjectionParams,
} from "../services/roiProjection";

const fmt = (n) =>
  "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtRate = (n) => "$" + n.toFixed(3);
const fmtPct = (n) => (n != null ? n.toFixed(1) + "%" : "N/A");

const STATE_NAMES = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "Washington DC",
};

export default function RoiProjection() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Decode shared params from URL
  const sharedParams = useMemo(() => {
    const encoded = searchParams.get("p");
    if (encoded) return decodeProjectionParams(encoded);
    return null;
  }, []);

  const [monthlyBill, setMonthlyBill] = useState(
    sharedParams?.monthlyBill ?? 200,
  );
  const [utilityRate, setUtilityRate] = useState(
    sharedParams?.utilityRate ?? 0.16,
  );
  const [systemSizeKw, setSystemSizeKw] = useState(
    sharedParams?.systemSizeKw ?? 0,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [solarRate, setSolarRate] = useState(
    sharedParams?.solarRate ?? ROI_DEFAULTS.solarRate,
  );
  const [solarEscalator, setSolarEscalator] = useState(
    sharedParams?.solarEscalator ?? ROI_DEFAULTS.solarEscalator,
  );
  const [utilityEscalator, setUtilityEscalator] = useState(
    sharedParams?.utilityEscalator ?? ROI_DEFAULTS.utilityEscalator,
  );
  const [viewMode, setViewMode] = useState("lease");
  const [hoveredYear, setHoveredYear] = useState(null);
  const [selectedState, setSelectedState] = useState(
    sharedParams?.selectedState ?? "TX",
  );
  const [homeValue, setHomeValue] = useState(sharedParams?.homeValue ?? 300000);
  const [activeSection, setActiveSection] = useState("cumulative");
  const [showTable, setShowTable] = useState(false);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [shareTooltip, setShareTooltip] = useState(false);
  const [showMonteCarlo, setShowMonteCarlo] = useState(false);
  const printRef = useRef(null);

  // Sync state when shared URL is loaded
  useEffect(() => {
    if (
      sharedParams?.selectedState &&
      STATE_UTILITY_RATES[sharedParams.selectedState]
    ) {
      setUtilityRate(STATE_UTILITY_RATES[sharedParams.selectedState]);
    }
  }, []);

  const handleStateChange = useCallback((e) => {
    const state = e.target.value;
    setSelectedState(state);
    if (STATE_UTILITY_RATES[state]) {
      setUtilityRate(STATE_UTILITY_RATES[state]);
    }
  }, []);

  const projection = useMemo(() => {
    const sunshineHours =
      STATE_SUNSHINE_HOURS[selectedState] || ROI_DEFAULTS.sunshineHoursPerYear;
    const annualUsageKwh = (monthlyBill / utilityRate) * 12;
    const effectiveSize = systemSizeKw > 0 ? systemSizeKw : undefined;
    const panelCount = effectiveSize
      ? Math.ceil((effectiveSize * 1000) / ROI_DEFAULTS.panelWattage)
      : undefined;

    return calculateAdvancedROI({
      systemSizeKw: effectiveSize,
      panelCount,
      annualUsageKwh,
      utilityRate,
      solarRate,
      solarEscalator,
      utilityEscalator,
      sunshineHoursPerYear: sunshineHours,
      homeValue,
    });
  }, [
    monthlyBill,
    utilityRate,
    systemSizeKw,
    solarRate,
    solarEscalator,
    utilityEscalator,
    selectedState,
    homeValue,
  ]);

  // Monte Carlo (computed lazily)
  const monteCarlo = useMemo(() => {
    if (!showMonteCarlo) return null;
    const sunshineHours =
      STATE_SUNSHINE_HOURS[selectedState] || ROI_DEFAULTS.sunshineHoursPerYear;
    const annualUsageKwh = (monthlyBill / utilityRate) * 12;
    return runMonteCarloSimulation(
      {
        annualUsageKwh,
        utilityRate,
        solarRate,
        solarEscalator,
        utilityEscalator,
        sunshineHoursPerYear: sunshineHours,
        homeValue,
      },
      500,
    );
  }, [
    showMonteCarlo,
    monthlyBill,
    utilityRate,
    solarRate,
    solarEscalator,
    utilityEscalator,
    selectedState,
    homeValue,
  ]);

  // Rate forecast
  const rateForecast = useMemo(() => {
    return generateRateForecast({
      utilityRate,
      solarRate,
      solarEscalator,
      utilityEscalator,
    });
  }, [utilityRate, solarRate, solarEscalator, utilityEscalator]);

  // Scenario comparison
  const scenarios = useMemo(() => {
    const sunshineHours =
      STATE_SUNSHINE_HOURS[selectedState] || ROI_DEFAULTS.sunshineHoursPerYear;
    const annualUsageKwh = (monthlyBill / utilityRate) * 12;
    return generateScenarioComparison({
      annualUsageKwh,
      utilityRate,
      solarRate,
      solarEscalator,
      utilityEscalator,
      sunshineHoursPerYear: sunshineHours,
      homeValue,
    });
  }, [
    monthlyBill,
    utilityRate,
    solarRate,
    solarEscalator,
    utilityEscalator,
    selectedState,
    homeValue,
  ]);

  const { system, costs, metrics, environmental, yearlyData, advanced } =
    projection;

  // ---- Share URL ----
  const handleShare = useCallback(() => {
    const encoded = encodeProjectionParams({
      monthlyBill,
      utilityRate,
      systemSizeKw,
      solarRate,
      solarEscalator,
      utilityEscalator,
      homeValue,
      selectedState,
    });
    const url = `${window.location.origin}/roi?p=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareTooltip(true);
      setTimeout(() => setShareTooltip(false), 2000);
    });
  }, [
    monthlyBill,
    utilityRate,
    systemSizeKw,
    solarRate,
    solarEscalator,
    utilityEscalator,
    homeValue,
    selectedState,
  ]);

  // ---- Cumulative Cost Chart ----
  const chartWidth = 800;
  const chartHeight = 300;
  const chartPadding = { top: 20, right: 30, bottom: 40, left: 70 };
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  const maxCumulative = Math.max(...yearlyData.map((d) => d.utilityCumulative));
  const xScale = (year) => chartPadding.left + ((year - 1) / 24) * plotWidth;
  const yScale = (val) =>
    chartPadding.top + plotHeight - (val / maxCumulative) * plotHeight;

  const utilityPath = yearlyData
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.utilityCumulative)}`,
    )
    .join(" ");
  const solarPath = yearlyData
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(viewMode === "lease" ? d.leaseCumulative : d.purchaseCumulative)}`,
    )
    .join(" ");
  const savingsArea =
    yearlyData
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${xScale(d.year)} ${yScale(d.utilityCumulative)}`,
      )
      .join(" ") +
    " " +
    yearlyData
      .slice()
      .reverse()
      .map(
        (d) =>
          `L ${xScale(d.year)} ${yScale(viewMode === "lease" ? d.leaseCumulative : d.purchaseCumulative)}`,
      )
      .join(" ") +
    " Z";

  const yTicks = [0, 1, 2, 3, 4, 5].map(
    (i) => Math.round((maxCumulative * i) / 5 / 1000) * 1000,
  );

  // ---- Cash Flow Bar Chart ----
  const barChartHeight = 260;
  const barPadding = { top: 20, right: 20, bottom: 40, left: 60 };
  const barPlotW = chartWidth - barPadding.left - barPadding.right;
  const barPlotH = barChartHeight - barPadding.top - barPadding.bottom;
  const cashFlowData = advanced.annualCashFlow;
  const maxSavings = Math.max(
    ...cashFlowData.map((d) =>
      Math.abs(viewMode === "lease" ? d.leaseSavings : d.purchaseSavings),
    ),
  );
  const minSavings = Math.min(
    ...cashFlowData.map((d) =>
      viewMode === "lease" ? d.leaseSavings : d.purchaseSavings,
    ),
  );
  const barRange = Math.max(maxSavings, Math.abs(minSavings));
  const barW = barPlotW / 25 - 4;
  const barZeroY =
    barPadding.top +
    (barRange > 0 && minSavings < 0
      ? (barRange / (barRange * 2)) * barPlotH
      : barPlotH);
  const barYScale = (val) => {
    if (barRange === 0) return barZeroY;
    if (minSavings >= 0)
      return barPadding.top + barPlotH - (val / barRange) * barPlotH;
    return barPadding.top + barPlotH / 2 - (val / barRange) * (barPlotH / 2);
  };

  // ---- Sensitivity Chart ----
  const sensData = advanced.sensitivityUtilityEsc;
  const sensChartH = 220;
  const sensPad = { top: 20, right: 20, bottom: 40, left: 70 };
  const sensPlotW = chartWidth - sensPad.left - sensPad.right;
  const sensPlotH = sensChartH - sensPad.top - sensPad.bottom;
  const sensMaxSavings = Math.max(
    ...sensData.map((d) =>
      viewMode === "lease" ? d.totalSavingsLease : d.totalSavingsPurchase,
    ),
  );
  const sensMinSavings = Math.min(
    ...sensData.map((d) =>
      viewMode === "lease" ? d.totalSavingsLease : d.totalSavingsPurchase,
    ),
  );
  const sensRange = sensMaxSavings - sensMinSavings || 1;
  const sensXScale = (i) =>
    sensPad.left + (i / (sensData.length - 1)) * sensPlotW;
  const sensYScale = (val) =>
    sensPad.top + sensPlotH - ((val - sensMinSavings) / sensRange) * sensPlotH;
  const sensPath = sensData
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${sensXScale(i)} ${sensYScale(viewMode === "lease" ? d.totalSavingsLease : d.totalSavingsPurchase)}`,
    )
    .join(" ");
  const currentEscIdx = sensData.findIndex(
    (d) => Math.abs(d.paramValue - utilityEscalator) < 0.001,
  );

  // ---- Rate Forecast Chart ----
  const rateChartH = 240;
  const ratePad = { top: 20, right: 30, bottom: 40, left: 60 };
  const ratePlotW = chartWidth - ratePad.left - ratePad.right;
  const ratePlotH = rateChartH - ratePad.top - ratePad.bottom;
  const rateMax = Math.max(...rateForecast.map((d) => d.utilityRate));
  const rateXScale = (yr) => ratePad.left + (yr / 25) * ratePlotW;
  const rateYScale = (val) =>
    ratePad.top + ratePlotH - (val / rateMax) * ratePlotH;
  const utilityRatePath = rateForecast
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${rateXScale(d.year)} ${rateYScale(d.utilityRate)}`,
    )
    .join(" ");
  const solarRatePath = rateForecast
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${rateXScale(d.year)} ${rateYScale(d.solarRate)}`,
    )
    .join(" ");
  const rateSpreadArea =
    rateForecast
      .map(
        (d, i) =>
          `${i === 0 ? "M" : "L"} ${rateXScale(d.year)} ${rateYScale(d.utilityRate)}`,
      )
      .join(" ") +
    " " +
    rateForecast
      .slice()
      .reverse()
      .map((d) => `L ${rateXScale(d.year)} ${rateYScale(d.solarRate)}`)
      .join(" ") +
    " Z";

  // ---- Monte Carlo Chart ----
  const mcChartH = 280;
  const mcPad = { top: 20, right: 30, bottom: 40, left: 70 };
  const mcPlotW = chartWidth - mcPad.left - mcPad.right;
  const mcPlotH = mcChartH - mcPad.top - mcPad.bottom;

  const totalSavings =
    viewMode === "lease"
      ? metrics.totalSavingsLease
      : metrics.totalSavingsPurchase;
  const monthlySavings =
    viewMode === "lease"
      ? metrics.monthlySavingsLease
      : metrics.monthlySavingsPurchase;
  const paybackYear =
    viewMode === "lease"
      ? metrics.leasePaybackYear
      : metrics.purchasePaybackYear;

  const handleExportCSV = useCallback(() => {
    const header =
      "Year,Production (kWh),Utility Rate,Utility Cost,Solar Cost (Lease),Lease Savings,Lease Cumulative,Purchase Cost,Purchase Savings,Purchase Cumulative\n";
    const rows = yearlyData
      .map(
        (d) =>
          `${d.year},${d.production},${d.utilityRate},${d.utilityOnlyCost},${d.leaseYearlyCost},${d.leaseSavings},${d.leaseCumulativeSavings},${d.purchaseYearlyCost},${d.purchaseSavings},${d.purchaseCumulativeSavings}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solar-roi-projection-${selectedState}-${system.sizeKw}kw.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [yearlyData, selectedState, system.sizeKw]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="page" ref={printRef}>
      <style>{`
        .roi-page { background: linear-gradient(180deg, #f0fdf4 0%, #f9fafb 30%); min-height: 100vh; padding-bottom: 80px; }
        .roi-hero { background: linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%); padding: 48px 0 56px; color: white; text-align: center; position: relative; overflow: hidden; }
        .roi-hero::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 50%, rgba(16,185,129,0.15) 0%, transparent 50%); pointer-events: none; }
        .roi-hero-title { font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 800; margin-bottom: 12px; line-height: 1.15; position: relative; }
        .roi-hero-subtitle { font-size: 1.1rem; color: rgba(255,255,255,0.8); max-width: 600px; margin: 0 auto; position: relative; }
        .roi-hero-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 999px; font-size: 0.82rem; font-weight: 600; margin-bottom: 16px; backdrop-filter: blur(10px); position: relative; }
        .roi-content { max-width: 1100px; margin: -32px auto 0; padding: 0 20px; position: relative; z-index: 2; }
        .roi-input-card { background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); padding: 32px; margin-bottom: 28px; }
        .roi-input-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
        .roi-input-group { display: flex; flex-direction: column; gap: 6px; }
        .roi-input-label { font-size: 0.85rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 6px; }
        .roi-slider-row { display: flex; align-items: center; gap: 12px; }
        .roi-slider { flex: 1; -webkit-appearance: none; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #d1fae5 0%, #10b981 100%); outline: none; }
        .roi-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #10b981; cursor: pointer; box-shadow: 0 2px 6px rgba(16,185,129,0.4); border: 3px solid white; }
        .roi-slider-value { min-width: 60px; text-align: right; font-weight: 700; color: #064e3b; font-size: 1rem; }
        .roi-select { width: 100%; padding: 12px 14px; font-size: 0.95rem; font-weight: 600; border: 2px solid #e5e7eb; border-radius: 10px; background: #f9fafb; font-family: inherit; cursor: pointer; color: #064e3b; }
        .roi-select:focus { outline: none; border-color: #10b981; background: white; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
        .roi-advanced-toggle { display: flex; align-items: center; gap: 6px; padding: 10px 0 0; font-size: 0.85rem; font-weight: 600; color: #6b7280; cursor: pointer; border: none; background: none; }
        .roi-advanced-toggle:hover { color: #10b981; }
        .roi-advanced-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f3f4f6; }
        .roi-advanced-label { font-size: 0.78rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; }
        .roi-advanced-input { width: 100%; padding: 10px 12px; font-size: 0.9rem; border: 1.5px solid #e5e7eb; border-radius: 8px; background: #f9fafb; font-family: inherit; }
        .roi-advanced-input:focus { outline: none; border-color: #10b981; }
        .roi-summary-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 28px; }
        .roi-summary-card { background: white; border-radius: 14px; padding: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); text-align: center; border: 1px solid #f3f4f6; transition: transform 0.2s, box-shadow 0.2s; }
        .roi-summary-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .roi-summary-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
        .roi-summary-value { font-size: 1.4rem; font-weight: 800; color: #111827; line-height: 1.2; }
        .roi-summary-label { font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-top: 3px; }
        .roi-tabs { display: flex; gap: 4px; background: #f3f4f6; border-radius: 10px; padding: 4px; max-width: 320px; }
        .roi-tab { flex: 1; padding: 10px 20px; font-size: 0.85rem; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; background: transparent; color: #6b7280; transition: all 0.2s; }
        .roi-tab.active { background: white; color: #064e3b; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .roi-chart-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); padding: 28px; margin-bottom: 28px; border: 1px solid #f3f4f6; }
        .roi-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .roi-chart-title { font-size: 1.15rem; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }
        .roi-chart-svg { width: 100%; max-width: ${chartWidth}px; margin: 0 auto; display: block; }
        .roi-chart-legend { display: flex; justify-content: center; gap: 28px; margin-top: 12px; flex-wrap: wrap; }
        .roi-legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 500; color: #374151; }
        .roi-legend-dot { width: 12px; height: 12px; border-radius: 3px; }
        .roi-tooltip { position: absolute; background: #1f2937; color: white; padding: 12px 16px; border-radius: 10px; font-size: 0.8rem; pointer-events: none; z-index: 10; min-width: 180px; box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
        .roi-tooltip-title { font-weight: 700; margin-bottom: 6px; font-size: 0.85rem; }
        .roi-tooltip-row { display: flex; justify-content: space-between; gap: 16px; padding: 2px 0; }
        .roi-tooltip-label { color: #9ca3af; }
        .roi-tooltip-value { font-weight: 600; }
        .roi-tooltip-savings { color: #34d399; }
        .roi-table-wrapper { overflow-x: auto; border-radius: 12px; border: 1px solid #e5e7eb; }
        .roi-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .roi-table th { background: #f9fafb; padding: 10px 14px; text-align: right; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
        .roi-table th:first-child { text-align: center; width: 56px; }
        .roi-table td { padding: 9px 14px; text-align: right; border-bottom: 1px solid #f3f4f6; color: #4b5563; white-space: nowrap; }
        .roi-table td:first-child { text-align: center; font-weight: 700; color: #111827; }
        .roi-table tr:hover td { background: #f0fdf4; }
        .roi-table .savings-cell { color: #059669; font-weight: 600; }
        .roi-table .negative-cell { color: #dc2626; }
        .roi-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 28px; }
        .roi-env-card { background: linear-gradient(135deg, #064e3b, #047857); border-radius: 16px; padding: 28px; color: white; }
        .roi-env-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .roi-env-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .roi-env-item { text-align: center; padding: 16px; background: rgba(255,255,255,0.1); border-radius: 12px; }
        .roi-env-value { font-size: 1.6rem; font-weight: 800; }
        .roi-env-label { font-size: 0.78rem; color: rgba(255,255,255,0.7); margin-top: 4px; }
        .roi-env-icon { margin-bottom: 6px; opacity: 0.8; }
        .roi-cta-card { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; display: flex; flex-direction: column; justify-content: center; }
        .roi-cta-title { font-size: 1.3rem; font-weight: 700; color: #111827; margin-bottom: 12px; }
        .roi-cta-text { color: #6b7280; font-size: 0.95rem; line-height: 1.6; margin-bottom: 24px; }
        .roi-cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 16px 32px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 999px; font-size: 1rem; font-weight: 700; cursor: pointer; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 14px rgba(16,185,129,0.4); }
        .roi-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16,185,129,0.5); }
        .roi-system-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: #f0fdf4; color: #064e3b; border-radius: 999px; font-size: 0.82rem; font-weight: 600; margin-bottom: 16px; border: 1px solid #bbf7d0; }
        .roi-nav { background: white; border-bottom: 1px solid #e5e7eb; padding: 14px 0; }
        .roi-nav-content { max-width: 1100px; margin: 0 auto; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; }
        .roi-nav-logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.15rem; color: #1e293b; text-decoration: none; }
        .roi-nav-logo-icon { width: 34px; height: 34px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; }
        .roi-nav-links { display: flex; align-items: center; gap: 24px; }
        .roi-nav-link { color: #6b7280; text-decoration: none; font-weight: 500; font-size: 0.9rem; transition: color 0.2s; }
        .roi-nav-link:hover { color: #10b981; }
        .roi-section-tabs { display: flex; gap: 4px; background: #f3f4f6; border-radius: 10px; padding: 4px; margin-bottom: 20px; }
        .roi-section-tab { flex: 1; padding: 10px 16px; font-size: 0.82rem; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; background: transparent; color: #6b7280; transition: all 0.2s; text-align: center; }
        .roi-section-tab.active { background: white; color: #064e3b; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
        .roi-metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
        .roi-metric-card { background: white; border-radius: 14px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; }
        .roi-metric-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 0.85rem; font-weight: 600; color: #374151; }
        .roi-metric-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
        .roi-metric-row:last-child { border-bottom: none; }
        .roi-metric-label { font-size: 0.8rem; color: #6b7280; }
        .roi-metric-val { font-size: 0.85rem; font-weight: 700; color: #111827; }
        .roi-metric-val.green { color: #059669; }
        .roi-metric-val.blue { color: #2563eb; }
        .roi-export-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #374151; cursor: pointer; transition: all 0.2s; }
        .roi-export-btn:hover { background: #e5e7eb; }
        .roi-home-value-card { background: linear-gradient(135deg, #1e40af, #3b82f6); border-radius: 16px; padding: 28px; color: white; margin-bottom: 28px; }
        .roi-home-value-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 16px; }
        .roi-home-value-item { text-align: center; padding: 16px; background: rgba(255,255,255,0.12); border-radius: 12px; }
        .roi-home-value-val { font-size: 1.5rem; font-weight: 800; }
        .roi-home-value-label { font-size: 0.78rem; color: rgba(255,255,255,0.7); margin-top: 4px; }
        /* Scenario Comparison */
        .roi-scenario-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
        .roi-scenario-card { border-radius: 16px; padding: 24px; border: 2px solid #e5e7eb; background: white; transition: all 0.2s; position: relative; overflow: hidden; }
        .roi-scenario-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); }
        .roi-scenario-card.highlight { border-color: #10b981; }
        .roi-scenario-card.highlight::before { content: 'RECOMMENDED'; position: absolute; top: 0; right: 0; background: #10b981; color: white; font-size: 0.65rem; font-weight: 800; padding: 4px 12px; border-radius: 0 0 0 10px; letter-spacing: 0.05em; }
        .roi-scenario-name { font-size: 1rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .roi-scenario-price { font-size: 2rem; font-weight: 800; margin-bottom: 4px; }
        .roi-scenario-sub { font-size: 0.78rem; color: #6b7280; margin-bottom: 16px; }
        .roi-scenario-divider { border: none; border-top: 1px solid #f3f4f6; margin: 12px 0; }
        .roi-scenario-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.82rem; }
        .roi-scenario-row-label { color: #6b7280; }
        .roi-scenario-row-val { font-weight: 700; color: #111827; }
        .roi-scenario-row-val.good { color: #059669; }
        .roi-scenario-row-val.bad { color: #dc2626; }
        /* Monte Carlo */
        .roi-mc-card { background: linear-gradient(135deg, #581c87, #7c3aed); border-radius: 16px; padding: 28px; color: white; margin-bottom: 28px; }
        .roi-mc-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 16px; }
        .roi-mc-item { text-align: center; padding: 14px 8px; background: rgba(255,255,255,0.1); border-radius: 12px; }
        .roi-mc-val { font-size: 1.15rem; font-weight: 800; }
        .roi-mc-label { font-size: 0.72rem; color: rgba(255,255,255,0.7); margin-top: 4px; }
        .roi-mc-toggle { display: inline-flex; align-items: center; gap: 6px; padding: 8px 18px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); border-radius: 999px; font-size: 0.82rem; font-weight: 600; color: #7c3aed; cursor: pointer; transition: all 0.2s; margin-bottom: 20px; }
        .roi-mc-toggle:hover { background: rgba(124,58,237,0.25); }
        .roi-mc-toggle.active { background: #7c3aed; color: white; border-color: #7c3aed; }
        /* Breakeven timeline */
        .roi-breakeven { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 1px solid #f3f4f6; margin-bottom: 28px; }
        .roi-breakeven-track { position: relative; height: 60px; background: #f3f4f6; border-radius: 30px; margin: 24px 0 16px; overflow: visible; }
        .roi-breakeven-fill { position: absolute; top: 0; left: 0; height: 100%; border-radius: 30px; transition: width 0.8s ease; }
        .roi-breakeven-marker { position: absolute; top: -8px; transform: translateX(-50%); text-align: center; }
        .roi-breakeven-dot { width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); margin: 0 auto 4px; }
        .roi-breakeven-label { font-size: 0.7rem; font-weight: 700; white-space: nowrap; }
        .roi-breakeven-years { display: flex; justify-content: space-between; font-size: 0.75rem; color: #9ca3af; padding: 0 4px; }
        .roi-share-tooltip { position: absolute; top: -36px; left: 50%; transform: translateX(-50%); background: #1f2937; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; pointer-events: none; }
        @media (max-width: 768px) {
          .roi-input-grid { grid-template-columns: 1fr; }
          .roi-summary-grid { grid-template-columns: 1fr 1fr; }
          .roi-advanced-grid { grid-template-columns: 1fr 1fr; }
          .roi-bottom-grid { grid-template-columns: 1fr; }
          .roi-nav-links { display: none; }
          .roi-chart-card { padding: 16px; }
          .roi-metrics-row { grid-template-columns: 1fr; }
          .roi-home-value-grid { grid-template-columns: 1fr; }
          .roi-section-tabs { flex-wrap: wrap; }
          .roi-scenario-grid { grid-template-columns: 1fr; }
          .roi-mc-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 480px) {
          .roi-summary-grid { grid-template-columns: 1fr; }
          .roi-advanced-grid { grid-template-columns: 1fr; }
          .roi-mc-grid { grid-template-columns: 1fr 1fr; }
        }
        @media print {
          .roi-nav, .roi-advanced-toggle, .roi-export-btn, .roi-cta-btn, .roi-section-tabs, .roi-mc-toggle, .no-print { display: none !important; }
          .roi-page { background: white !important; }
          .roi-chart-card, .roi-input-card { box-shadow: none !important; border: 1px solid #e5e7eb; break-inside: avoid; }
          .roi-scenario-grid, .roi-bottom-grid, .roi-metrics-row { break-inside: avoid; }
          .roi-hero { padding: 24px 0 32px; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="roi-nav no-print">
        <div className="roi-nav-content">
          <Link to="/" className="roi-nav-logo">
            <div className="roi-nav-logo-icon">
              <Sun size={18} />
            </div>
            Power to the People
          </Link>
          <div className="roi-nav-links">
            <Link to="/qualify" className="roi-nav-link">
              Get Started
            </Link>
            <Link to="/savings" className="roi-nav-link">
              Quick Calculator
            </Link>
            <Link to="/installers" className="roi-nav-link">
              Installers
            </Link>
          </div>
        </div>
      </nav>

      <div className="roi-page">
        {/* Hero */}
        <div className="roi-hero">
          <div className="container">
            <div className="roi-hero-badge">
              <Calculator size={14} /> Advanced Financial Analysis
            </div>
            <div className="roi-hero-title">Solar ROI Projection Tool</div>
            <p className="roi-hero-subtitle">
              Complete 25-year financial analysis with Monte Carlo risk
              modeling, scenario comparison, rate forecasting, and shareable
              projections.
            </p>
          </div>
        </div>

        <div className="roi-content">
          {/* Input Card */}
          <div className="roi-input-card">
            <div className="roi-input-grid">
              <div className="roi-input-group">
                <label className="roi-input-label">
                  <MapPin size={14} /> State
                </label>
                <select
                  className="roi-select"
                  value={selectedState}
                  onChange={handleStateChange}
                >
                  {Object.entries(STATE_NAMES)
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([code, name]) => (
                      <option key={code} value={code}>
                        {name} ({fmtRate(STATE_UTILITY_RATES[code])}/kWh)
                      </option>
                    ))}
                </select>
              </div>
              <div className="roi-input-group">
                <label className="roi-input-label">
                  <DollarSign size={14} /> Monthly Electric Bill
                </label>
                <div className="roi-slider-row">
                  <input
                    type="range"
                    className="roi-slider"
                    min={50}
                    max={800}
                    step={10}
                    value={monthlyBill}
                    onChange={(e) => setMonthlyBill(Number(e.target.value))}
                  />
                  <span className="roi-slider-value">{fmt(monthlyBill)}</span>
                </div>
              </div>
              <div className="roi-input-group">
                <label className="roi-input-label">
                  <Zap size={14} /> Utility Rate ($/kWh)
                </label>
                <div className="roi-slider-row">
                  <input
                    type="range"
                    className="roi-slider"
                    min={0.08}
                    max={0.45}
                    step={0.01}
                    value={utilityRate}
                    onChange={(e) => setUtilityRate(Number(e.target.value))}
                  />
                  <span className="roi-slider-value">
                    {fmtRate(utilityRate)}
                  </span>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <button
              className="roi-advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              Advanced Settings
            </button>

            {showAdvanced && (
              <div className="roi-advanced-grid">
                <div>
                  <div className="roi-advanced-label">
                    System Size (kW, 0 = auto)
                  </div>
                  <input
                    type="number"
                    className="roi-advanced-input"
                    value={systemSizeKw}
                    min={0}
                    max={50}
                    step={0.5}
                    onChange={(e) => setSystemSizeKw(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="roi-advanced-label">
                    Solar PPA Rate ($/kWh)
                  </div>
                  <input
                    type="number"
                    className="roi-advanced-input"
                    value={solarRate}
                    min={0.05}
                    max={0.25}
                    step={0.005}
                    onChange={(e) => setSolarRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className="roi-advanced-label">
                    Solar Escalator (%/yr)
                  </div>
                  <input
                    type="number"
                    className="roi-advanced-input"
                    value={(solarEscalator * 100).toFixed(1)}
                    min={0}
                    max={5}
                    step={0.1}
                    onChange={(e) =>
                      setSolarEscalator(Number(e.target.value) / 100)
                    }
                  />
                </div>
                <div>
                  <div className="roi-advanced-label">Home Value ($)</div>
                  <input
                    type="number"
                    className="roi-advanced-input"
                    value={homeValue}
                    min={50000}
                    max={2000000}
                    step={10000}
                    onChange={(e) => setHomeValue(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* System Badge */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <span className="roi-system-badge">
              <Sun size={14} />
              {system.sizeKw} kW System &middot; {system.panelCount} Panels
              &middot; {system.batteryKwh} kWh Battery &middot;{" "}
              {system.offsetPercent}% Offset
            </span>
          </div>

          {/* Summary Cards */}
          <div className="roi-summary-grid">
            <div className="roi-summary-card">
              <div
                className="roi-summary-icon"
                style={{ background: "#dcfce7", color: "#059669" }}
              >
                <PiggyBank size={20} />
              </div>
              <div className="roi-summary-value">{fmt(monthlySavings)}</div>
              <div className="roi-summary-label">Monthly Savings</div>
            </div>
            <div className="roi-summary-card">
              <div
                className="roi-summary-icon"
                style={{ background: "#dbeafe", color: "#2563eb" }}
              >
                <TrendingUp size={20} />
              </div>
              <div className="roi-summary-value">{fmt(totalSavings)}</div>
              <div className="roi-summary-label">25-Year Savings</div>
            </div>
            <div className="roi-summary-card">
              <div
                className="roi-summary-icon"
                style={{ background: "#fef3c7", color: "#d97706" }}
              >
                <Clock size={20} />
              </div>
              <div className="roi-summary-value">Yr {paybackYear}</div>
              <div className="roi-summary-label">Savings Start</div>
            </div>
            <div className="roi-summary-card">
              <div
                className="roi-summary-icon"
                style={{ background: "#ede9fe", color: "#7c3aed" }}
              >
                <Home size={20} />
              </div>
              <div className="roi-summary-value">
                +{fmt(advanced.homeValueImpact.valueIncrease)}
              </div>
              <div className="roi-summary-label">Home Value Boost</div>
            </div>
            <div className="roi-summary-card">
              <div
                className="roi-summary-icon"
                style={{ background: "#fce7f3", color: "#db2777" }}
              >
                <Shield size={20} />
              </div>
              <div className="roi-summary-value">
                {fmtRate(metrics.utilityRateYear25)}
              </div>
              <div className="roi-summary-label">Utility Rate Yr 25</div>
            </div>
          </div>

          {/* ===== SCENARIO COMPARISON ===== */}
          <div className="roi-chart-card">
            <div className="roi-chart-title" style={{ marginBottom: 20 }}>
              <BarChart3 size={20} /> Side-by-Side Scenario Comparison
            </div>
            <div className="roi-scenario-grid">
              {scenarios.scenarios.map((sc, idx) => (
                <div
                  key={sc.name}
                  className={`roi-scenario-card ${idx === 1 ? "highlight" : ""}`}
                >
                  <div className="roi-scenario-name">
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: sc.color,
                      }}
                    />
                    {sc.name}
                  </div>
                  <div
                    className="roi-scenario-price"
                    style={{ color: sc.color }}
                  >
                    {fmt(sc.monthlyCost)}
                  </div>
                  <div className="roi-scenario-sub">
                    /month in year 1
                    {sc.upfrontCost > 0
                      ? ` + ${fmt(sc.upfrontCost)} financed`
                      : ""}
                  </div>
                  <hr className="roi-scenario-divider" />
                  <div className="roi-scenario-row">
                    <span className="roi-scenario-row-label">5-Year Total</span>
                    <span className="roi-scenario-row-val">
                      {fmt(sc.year5Total)}
                    </span>
                  </div>
                  <div className="roi-scenario-row">
                    <span className="roi-scenario-row-label">
                      10-Year Total
                    </span>
                    <span className="roi-scenario-row-val">
                      {fmt(sc.year10Total)}
                    </span>
                  </div>
                  <div className="roi-scenario-row">
                    <span className="roi-scenario-row-label">
                      25-Year Total
                    </span>
                    <span className="roi-scenario-row-val">
                      {fmt(sc.year25Total)}
                    </span>
                  </div>
                  <hr className="roi-scenario-divider" />
                  {sc.savings25yr != null && (
                    <div className="roi-scenario-row">
                      <span className="roi-scenario-row-label">
                        25-Year Savings
                      </span>
                      <span
                        className={`roi-scenario-row-val ${sc.savings25yr >= 0 ? "good" : "bad"}`}
                      >
                        {sc.savings25yr >= 0 ? "+" : ""}
                        {fmt(sc.savings25yr)}
                      </span>
                    </div>
                  )}
                  <div className="roi-scenario-row">
                    <span className="roi-scenario-row-label">
                      Rate in Year 25
                    </span>
                    <span className="roi-scenario-row-val">
                      {sc.rateYear25 === 0
                        ? "Paid Off"
                        : fmtRate(sc.rateYear25) + "/kWh"}
                    </span>
                  </div>
                  <div className="roi-scenario-row">
                    <span className="roi-scenario-row-label">
                      Battery Backup
                    </span>
                    <span
                      className={`roi-scenario-row-val ${sc.hasBackup ? "good" : "bad"}`}
                    >
                      {sc.hasBackup ? "60 kWh" : "None"}
                    </span>
                  </div>
                  <div className="roi-scenario-row">
                    <span className="roi-scenario-row-label">Home Value</span>
                    <span
                      className={`roi-scenario-row-val ${sc.homeValueBoost > 0 ? "good" : ""}`}
                    >
                      {sc.homeValueBoost > 0
                        ? `+${fmt(sc.homeValueBoost)}`
                        : "No Change"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ===== BREAKEVEN TIMELINE ===== */}
          <div className="roi-breakeven">
            <div className="roi-chart-title">
              <Target size={20} /> Breakeven Timeline
            </div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6b7280",
                marginTop: 8,
                marginBottom: 0,
              }}
            >
              Visual timeline showing when solar savings surpass costs for each
              scenario.
            </p>
            <div className="roi-breakeven-track">
              <div
                className="roi-breakeven-fill"
                style={{
                  width: `${Math.min((metrics.leasePaybackYear / 25) * 100, 100)}%`,
                  background: "linear-gradient(90deg, #dcfce7, #10b981)",
                }}
              />
              {/* Year 1 marker */}
              <div
                className="roi-breakeven-marker"
                style={{ left: `${(1 / 25) * 100}%`, top: 14 }}
              >
                <div
                  className="roi-breakeven-dot"
                  style={{ background: "#f59e0b" }}
                />
                <div
                  className="roi-breakeven-label"
                  style={{ color: "#f59e0b" }}
                >
                  Start
                </div>
              </div>
              {/* Lease breakeven marker */}
              <div
                className="roi-breakeven-marker"
                style={{
                  left: `${Math.min((metrics.leasePaybackYear / 25) * 100, 100)}%`,
                  top: 14,
                }}
              >
                <div
                  className="roi-breakeven-dot"
                  style={{ background: "#10b981" }}
                />
                <div
                  className="roi-breakeven-label"
                  style={{ color: "#10b981" }}
                >
                  Lease Yr {metrics.leasePaybackYear}
                </div>
              </div>
              {/* Purchase breakeven marker */}
              {metrics.purchasePaybackYear <= 25 && (
                <div
                  className="roi-breakeven-marker"
                  style={{
                    left: `${(metrics.purchasePaybackYear / 25) * 100}%`,
                    top: 14,
                  }}
                >
                  <div
                    className="roi-breakeven-dot"
                    style={{ background: "#3b82f6" }}
                  />
                  <div
                    className="roi-breakeven-label"
                    style={{ color: "#3b82f6" }}
                  >
                    Purchase Yr {metrics.purchasePaybackYear}
                  </div>
                </div>
              )}
              {/* Year 25 marker */}
              <div
                className="roi-breakeven-marker"
                style={{ left: "100%", top: 14 }}
              >
                <div
                  className="roi-breakeven-dot"
                  style={{ background: "#064e3b" }}
                />
                <div
                  className="roi-breakeven-label"
                  style={{ color: "#064e3b" }}
                >
                  {fmt(totalSavings)} saved
                </div>
              </div>
            </div>
            <div className="roi-breakeven-years">
              {[0, 5, 10, 15, 20, 25].map((yr) => (
                <span key={yr}>Yr {yr}</span>
              ))}
            </div>
          </div>

          {/* Advanced Financial Metrics */}
          <div className="roi-metrics-row">
            <div className="roi-metric-card">
              <div className="roi-metric-header">
                <Target size={16} /> Investment Analysis
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">
                  Net Present Value (NPV)
                </span>
                <span
                  className={`roi-metric-val ${(viewMode === "lease" ? advanced.leaseNPV : advanced.purchaseNPV) >= 0 ? "green" : ""}`}
                >
                  {fmt(
                    viewMode === "lease"
                      ? advanced.leaseNPV
                      : advanced.purchaseNPV,
                  )}
                </span>
              </div>
              {viewMode === "purchase" && advanced.purchaseIRR != null && (
                <div className="roi-metric-row">
                  <span className="roi-metric-label">
                    Internal Rate of Return
                  </span>
                  <span className="roi-metric-val green">
                    {fmtPct(advanced.purchaseIRR)}
                  </span>
                </div>
              )}
              <div className="roi-metric-row">
                <span className="roi-metric-label">Cost Per Watt</span>
                <span className="roi-metric-val">
                  ${advanced.costPerWatt.toFixed(2)}/W
                </span>
              </div>
            </div>

            <div className="roi-metric-card">
              <div className="roi-metric-header">
                <Zap size={16} /> Energy Economics
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">Solar LCOE</span>
                <span className="roi-metric-val green">
                  {fmtRate(
                    viewMode === "lease"
                      ? advanced.leaseLCOE
                      : advanced.purchaseLCOE,
                  )}
                  /kWh
                </span>
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">Utility Rate (Yr 25)</span>
                <span className="roi-metric-val" style={{ color: "#dc2626" }}>
                  {fmtRate(metrics.utilityRateYear25)}/kWh
                </span>
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">Lifetime Production</span>
                <span className="roi-metric-val blue">
                  {advanced.lifetimeProductionMwh} MWh
                </span>
              </div>
            </div>

            <div className="roi-metric-card">
              <div className="roi-metric-header">
                <DollarSign size={16} /> Cost Breakdown
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">Gross System Cost</span>
                <span className="roi-metric-val">
                  {fmt(advanced.grossSystemCost)}
                </span>
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">ITC Credit (30%)</span>
                <span className="roi-metric-val green">
                  -{fmt(costs.itcAmount)}
                </span>
              </div>
              <div className="roi-metric-row">
                <span className="roi-metric-label">Net Cost</span>
                <span className="roi-metric-val">
                  {fmt(advanced.netSystemCost)}
                </span>
              </div>
            </div>
          </div>

          {/* ===== MONTE CARLO RISK ANALYSIS ===== */}
          <div style={{ textAlign: "center" }}>
            <button
              className={`roi-mc-toggle ${showMonteCarlo ? "active" : ""}`}
              onClick={() => setShowMonteCarlo(!showMonteCarlo)}
            >
              <Shuffle size={14} /> {showMonteCarlo ? "Hide" : "Show"} Monte
              Carlo Risk Analysis
            </button>
          </div>

          {showMonteCarlo &&
            monteCarlo &&
            (() => {
              const mc =
                viewMode === "lease" ? monteCarlo.lease : monteCarlo.purchase;
              const bands = monteCarlo.yearBands;
              const mcMax = Math.max(
                ...bands.map((b) =>
                  viewMode === "lease" ? b.lease.p90 : b.purchase.p90,
                ),
              );
              const mcMin = Math.min(
                ...bands.map((b) =>
                  viewMode === "lease" ? b.lease.p10 : b.purchase.p10,
                ),
              );
              const mcRange = mcMax - mcMin || 1;
              const mcXS = (yr) => mcPad.left + ((yr - 1) / 24) * mcPlotW;
              const mcYS = (val) =>
                mcPad.top + mcPlotH - ((val - mcMin) / mcRange) * mcPlotH;

              const bandPath = (pKey) =>
                bands
                  .map((b, i) => {
                    const val =
                      viewMode === "lease" ? b.lease[pKey] : b.purchase[pKey];
                    return `${i === 0 ? "M" : "L"} ${mcXS(b.year)} ${mcYS(val)}`;
                  })
                  .join(" ");

              const p90Path = bandPath("p90");
              const p75Path = bandPath("p75");
              const p50Path = bandPath("p50");
              const p25Path = bandPath("p25");
              const p10Path = bandPath("p10");

              // Area between p10 and p90
              const outerArea =
                p90Path +
                " " +
                bands
                  .slice()
                  .reverse()
                  .map((b) => {
                    const val =
                      viewMode === "lease" ? b.lease.p10 : b.purchase.p10;
                    return `L ${mcXS(b.year)} ${mcYS(val)}`;
                  })
                  .join(" ") +
                " Z";

              // Area between p25 and p75
              const innerArea =
                p75Path +
                " " +
                bands
                  .slice()
                  .reverse()
                  .map((b) => {
                    const val =
                      viewMode === "lease" ? b.lease.p25 : b.purchase.p25;
                    return `L ${mcXS(b.year)} ${mcYS(val)}`;
                  })
                  .join(" ") +
                " Z";

              return (
                <div className="roi-mc-card">
                  <div className="roi-env-title">
                    <Activity size={20} /> Monte Carlo Risk Analysis (
                    {monteCarlo.iterations} Simulations)
                  </div>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.8)",
                      marginTop: -12,
                      marginBottom: 8,
                    }}
                  >
                    Simulates uncertainty in utility rates, solar degradation,
                    and weather patterns. Bands show the range of likely
                    outcomes.
                  </p>

                  <div className="roi-mc-grid">
                    <div className="roi-mc-item">
                      <div className="roi-mc-val" style={{ color: "#fca5a5" }}>
                        {fmt(mc.p10)}
                      </div>
                      <div className="roi-mc-label">Pessimistic (P10)</div>
                    </div>
                    <div className="roi-mc-item">
                      <div className="roi-mc-val" style={{ color: "#fcd34d" }}>
                        {fmt(mc.p25)}
                      </div>
                      <div className="roi-mc-label">Conservative (P25)</div>
                    </div>
                    <div className="roi-mc-item">
                      <div className="roi-mc-val" style={{ color: "#86efac" }}>
                        {fmt(mc.p50)}
                      </div>
                      <div className="roi-mc-label">Expected (P50)</div>
                    </div>
                    <div className="roi-mc-item">
                      <div className="roi-mc-val" style={{ color: "#93c5fd" }}>
                        {fmt(mc.p75)}
                      </div>
                      <div className="roi-mc-label">Optimistic (P75)</div>
                    </div>
                    <div className="roi-mc-item">
                      <div className="roi-mc-val" style={{ color: "#c4b5fd" }}>
                        {fmt(mc.p90)}
                      </div>
                      <div className="roi-mc-label">Best Case (P90)</div>
                    </div>
                  </div>

                  {/* Monte Carlo Confidence Band Chart */}
                  <div
                    style={{
                      marginTop: 20,
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <svg
                      className="roi-chart-svg"
                      viewBox={`0 0 ${chartWidth} ${mcChartH}`}
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {/* Grid */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                        const val = mcMin + pct * mcRange;
                        return (
                          <g key={pct}>
                            <line
                              x1={mcPad.left}
                              x2={chartWidth - mcPad.right}
                              y1={mcYS(val)}
                              y2={mcYS(val)}
                              stroke="rgba(255,255,255,0.1)"
                              strokeWidth="1"
                            />
                            <text
                              x={mcPad.left - 8}
                              y={mcYS(val) + 4}
                              textAnchor="end"
                              fill="rgba(255,255,255,0.5)"
                              fontSize="10"
                              fontWeight="500"
                            >
                              ${(val / 1000).toFixed(0)}k
                            </text>
                          </g>
                        );
                      })}
                      {/* Outer band (P10-P90) */}
                      <path d={outerArea} fill="rgba(139,92,246,0.2)" />
                      {/* Inner band (P25-P75) */}
                      <path d={innerArea} fill="rgba(139,92,246,0.3)" />
                      {/* P50 median line */}
                      <path
                        d={p50Path}
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* X-axis */}
                      {[1, 5, 10, 15, 20, 25].map((yr) => (
                        <text
                          key={yr}
                          x={mcXS(yr)}
                          y={mcChartH - 8}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.5)"
                          fontSize="11"
                          fontWeight="500"
                        >
                          Yr {yr}
                        </text>
                      ))}
                    </svg>
                    <div className="roi-chart-legend">
                      <div
                        className="roi-legend-item"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      >
                        <div
                          className="roi-legend-dot"
                          style={{ background: "rgba(139,92,246,0.2)" }}
                        />{" "}
                        P10-P90 Range
                      </div>
                      <div
                        className="roi-legend-item"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      >
                        <div
                          className="roi-legend-dot"
                          style={{ background: "rgba(139,92,246,0.4)" }}
                        />{" "}
                        P25-P75 (Likely)
                      </div>
                      <div
                        className="roi-legend-item"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                      >
                        <div
                          className="roi-legend-dot"
                          style={{ background: "#a78bfa" }}
                        />{" "}
                        Median (P50)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* Chart Section with Tabs */}
          <div className="roi-chart-card">
            <div className="roi-chart-header">
              <div className="roi-chart-title">
                <BarChart3 size={20} /> Financial Projections
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div className="roi-tabs">
                  <button
                    className={`roi-tab ${viewMode === "lease" ? "active" : ""}`}
                    onClick={() => setViewMode("lease")}
                  >
                    Lease / PPA
                  </button>
                  <button
                    className={`roi-tab ${viewMode === "purchase" ? "active" : ""}`}
                    onClick={() => setViewMode("purchase")}
                  >
                    Purchase
                  </button>
                </div>
                <button className="roi-export-btn" onClick={handleExportCSV}>
                  <Download size={14} /> Export CSV
                </button>
                <div style={{ position: "relative" }}>
                  <button className="roi-export-btn" onClick={handleShare}>
                    <Share2 size={14} /> Share
                  </button>
                  {shareTooltip && (
                    <div className="roi-share-tooltip">
                      <Check size={12} /> Link copied!
                    </div>
                  )}
                </div>
                <button
                  className="roi-export-btn no-print"
                  onClick={handlePrint}
                >
                  <Download size={14} /> Print
                </button>
              </div>
            </div>

            {/* Section tabs */}
            <div className="roi-section-tabs">
              <button
                className={`roi-section-tab ${activeSection === "cumulative" ? "active" : ""}`}
                onClick={() => setActiveSection("cumulative")}
              >
                Cumulative Cost
              </button>
              <button
                className={`roi-section-tab ${activeSection === "cashflow" ? "active" : ""}`}
                onClick={() => setActiveSection("cashflow")}
              >
                Annual Cash Flow
              </button>
              <button
                className={`roi-section-tab ${activeSection === "rates" ? "active" : ""}`}
                onClick={() => setActiveSection("rates")}
              >
                Rate Forecast
              </button>
              <button
                className={`roi-section-tab ${activeSection === "sensitivity" ? "active" : ""}`}
                onClick={() => setActiveSection("sensitivity")}
              >
                Sensitivity
              </button>
            </div>

            {/* === Cumulative Cost Chart === */}
            {activeSection === "cumulative" && (
              <div style={{ position: "relative" }}>
                <svg
                  className="roi-chart-svg"
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  onMouseLeave={() => setHoveredYear(null)}
                >
                  {yTicks.map((tick) => (
                    <g key={tick}>
                      <line
                        x1={chartPadding.left}
                        x2={chartWidth - chartPadding.right}
                        y1={yScale(tick)}
                        y2={yScale(tick)}
                        stroke="#f3f4f6"
                        strokeWidth="1"
                      />
                      <text
                        x={chartPadding.left - 10}
                        y={yScale(tick) + 4}
                        textAnchor="end"
                        fill="#9ca3af"
                        fontSize="11"
                        fontWeight="500"
                      >
                        ${(tick / 1000).toFixed(0)}k
                      </text>
                    </g>
                  ))}
                  {[1, 5, 10, 15, 20, 25].map((yr) => (
                    <text
                      key={yr}
                      x={xScale(yr)}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="11"
                      fontWeight="500"
                    >
                      Yr {yr}
                    </text>
                  ))}
                  <path d={savingsArea} fill="#dcfce7" opacity="0.5" />
                  <path
                    d={utilityPath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={solarPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {yearlyData.map((d) => (
                    <rect
                      key={d.year}
                      x={xScale(d.year) - plotWidth / 50}
                      y={chartPadding.top}
                      width={plotWidth / 25}
                      height={plotHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredYear(d.year)}
                    />
                  ))}
                  {hoveredYear && (
                    <line
                      x1={xScale(hoveredYear)}
                      x2={xScale(hoveredYear)}
                      y1={chartPadding.top}
                      y2={chartPadding.top + plotHeight}
                      stroke="#d1d5db"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  )}
                  {hoveredYear &&
                    (() => {
                      const d = yearlyData[hoveredYear - 1];
                      const solarCum =
                        viewMode === "lease"
                          ? d.leaseCumulative
                          : d.purchaseCumulative;
                      return (
                        <>
                          <circle
                            cx={xScale(d.year)}
                            cy={yScale(d.utilityCumulative)}
                            r="5"
                            fill="#ef4444"
                            stroke="white"
                            strokeWidth="2"
                          />
                          <circle
                            cx={xScale(d.year)}
                            cy={yScale(solarCum)}
                            r="5"
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="2"
                          />
                        </>
                      );
                    })()}
                </svg>
                {hoveredYear &&
                  (() => {
                    const d = yearlyData[hoveredYear - 1];
                    const solarCum =
                      viewMode === "lease"
                        ? d.leaseCumulative
                        : d.purchaseCumulative;
                    const savings =
                      viewMode === "lease"
                        ? d.leaseCumulativeSavings
                        : d.purchaseCumulativeSavings;
                    const leftPct = ((hoveredYear - 1) / 24) * 100;
                    return (
                      <div
                        className="roi-tooltip"
                        style={{ left: `${Math.min(leftPct, 70)}%`, top: 10 }}
                      >
                        <div className="roi-tooltip-title">Year {d.year}</div>
                        <div className="roi-tooltip-row">
                          <span className="roi-tooltip-label">
                            Utility Only:
                          </span>
                          <span className="roi-tooltip-value">
                            {fmt(d.utilityCumulative)}
                          </span>
                        </div>
                        <div className="roi-tooltip-row">
                          <span className="roi-tooltip-label">With Solar:</span>
                          <span className="roi-tooltip-value">
                            {fmt(solarCum)}
                          </span>
                        </div>
                        <div
                          className="roi-tooltip-row"
                          style={{
                            borderTop: "1px solid #374151",
                            marginTop: 4,
                            paddingTop: 4,
                          }}
                        >
                          <span className="roi-tooltip-label">Savings:</span>
                          <span className="roi-tooltip-value roi-tooltip-savings">
                            {fmt(savings)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                <div className="roi-chart-legend">
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#ef4444" }}
                    />{" "}
                    Utility Only
                  </div>
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#10b981" }}
                    />{" "}
                    With Solar + Battery
                  </div>
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#dcfce7" }}
                    />{" "}
                    Your Savings
                  </div>
                </div>
              </div>
            )}

            {/* === Annual Cash Flow Bar Chart === */}
            {activeSection === "cashflow" && (
              <div style={{ position: "relative" }}>
                <svg
                  className="roi-chart-svg"
                  viewBox={`0 0 ${chartWidth} ${barChartHeight}`}
                  preserveAspectRatio="xMidYMid meet"
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {minSavings < 0 && (
                    <line
                      x1={barPadding.left}
                      x2={chartWidth - barPadding.right}
                      y1={barYScale(0)}
                      y2={barYScale(0)}
                      stroke="#9ca3af"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                  )}
                  {cashFlowData.map((d, i) => {
                    const val =
                      viewMode === "lease" ? d.leaseSavings : d.purchaseSavings;
                    const barX = barPadding.left + (i / 25) * barPlotW + 2;
                    const barH =
                      (Math.abs(val) / (barRange || 1)) *
                      (minSavings < 0 ? barPlotH / 2 : barPlotH);
                    const barY = val >= 0 ? barYScale(0) - barH : barYScale(0);
                    return (
                      <rect
                        key={d.year}
                        x={barX}
                        y={barY}
                        width={barW}
                        height={Math.max(barH, 1)}
                        fill={val >= 0 ? "#10b981" : "#ef4444"}
                        rx="2"
                        opacity={hoveredBar === d.year ? 1 : 0.8}
                        onMouseEnter={() => setHoveredBar(d.year)}
                      />
                    );
                  })}
                  {[1, 5, 10, 15, 20, 25].map((yr) => (
                    <text
                      key={yr}
                      x={
                        barPadding.left +
                        ((yr - 1) / 25) * barPlotW +
                        barW / 2 +
                        2
                      }
                      y={barChartHeight - 8}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="11"
                      fontWeight="500"
                    >
                      Yr {yr}
                    </text>
                  ))}
                  {[-barRange, -barRange / 2, 0, barRange / 2, barRange]
                    .filter((v) => minSavings < 0 || v >= 0)
                    .map((val, i) => (
                      <text
                        key={i}
                        x={barPadding.left - 8}
                        y={barYScale(val) + 4}
                        textAnchor="end"
                        fill="#9ca3af"
                        fontSize="10"
                        fontWeight="500"
                      >
                        {val >= 0 ? "" : "-"}${Math.abs(Math.round(val / 1000))}
                        k
                      </text>
                    ))}
                </svg>
                {hoveredBar &&
                  (() => {
                    const d = cashFlowData[hoveredBar - 1];
                    const val =
                      viewMode === "lease" ? d.leaseSavings : d.purchaseSavings;
                    const cum =
                      viewMode === "lease"
                        ? d.cumulativeLease
                        : d.cumulativePurchase;
                    const leftPct = ((hoveredBar - 1) / 24) * 100;
                    return (
                      <div
                        className="roi-tooltip"
                        style={{ left: `${Math.min(leftPct, 70)}%`, top: 10 }}
                      >
                        <div className="roi-tooltip-title">Year {d.year}</div>
                        <div className="roi-tooltip-row">
                          <span className="roi-tooltip-label">
                            Annual Savings:
                          </span>
                          <span
                            className={`roi-tooltip-value ${val >= 0 ? "roi-tooltip-savings" : ""}`}
                          >
                            {val >= 0 ? "+" : "-"}
                            {fmt(val)}
                          </span>
                        </div>
                        <div className="roi-tooltip-row">
                          <span className="roi-tooltip-label">Cumulative:</span>
                          <span
                            className={`roi-tooltip-value ${cum >= 0 ? "roi-tooltip-savings" : ""}`}
                          >
                            {cum >= 0 ? "+" : "-"}
                            {fmt(cum)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                <div className="roi-chart-legend">
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#10b981" }}
                    />{" "}
                    Annual Savings
                  </div>
                  {minSavings < 0 && (
                    <div className="roi-legend-item">
                      <div
                        className="roi-legend-dot"
                        style={{ background: "#ef4444" }}
                      />{" "}
                      Net Cost (Higher Than Utility)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* === Rate Forecast Chart === */}
            {activeSection === "rates" && (
              <div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    marginBottom: 16,
                  }}
                >
                  Projected utility vs. solar rate over 25 years. The shaded
                  area represents your savings per kWh. Utility rate escalates
                  at {(utilityEscalator * 100).toFixed(1)}%/yr, solar at{" "}
                  {(solarEscalator * 100).toFixed(1)}%/yr.
                </p>
                <svg
                  className="roi-chart-svg"
                  viewBox={`0 0 ${chartWidth} ${rateChartH}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Grid */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const val = pct * rateMax;
                    return (
                      <g key={pct}>
                        <line
                          x1={ratePad.left}
                          x2={chartWidth - ratePad.right}
                          y1={rateYScale(val)}
                          y2={rateYScale(val)}
                          stroke="#f3f4f6"
                          strokeWidth="1"
                        />
                        <text
                          x={ratePad.left - 8}
                          y={rateYScale(val) + 4}
                          textAnchor="end"
                          fill="#9ca3af"
                          fontSize="10"
                          fontWeight="500"
                        >
                          ${val.toFixed(2)}
                        </text>
                      </g>
                    );
                  })}
                  {/* Spread area */}
                  <path d={rateSpreadArea} fill="#dcfce7" opacity="0.4" />
                  {/* Utility rate line */}
                  <path
                    d={utilityRatePath}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="6 3"
                  />
                  {/* Solar rate line */}
                  <path
                    d={solarRatePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* X-axis labels */}
                  {[0, 5, 10, 15, 20, 25].map((yr) => (
                    <text
                      key={yr}
                      x={rateXScale(yr)}
                      y={rateChartH - 8}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize="11"
                      fontWeight="500"
                    >
                      Yr {yr}
                    </text>
                  ))}
                  {/* Endpoint labels */}
                  <text
                    x={chartWidth - ratePad.right + 5}
                    y={rateYScale(rateForecast[25].utilityRate) + 4}
                    fill="#ef4444"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {fmtRate(rateForecast[25].utilityRate)}
                  </text>
                  <text
                    x={chartWidth - ratePad.right + 5}
                    y={rateYScale(rateForecast[25].solarRate) + 4}
                    fill="#10b981"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {fmtRate(rateForecast[25].solarRate)}
                  </text>
                </svg>
                <div className="roi-chart-legend">
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#ef4444" }}
                    />{" "}
                    Utility Rate (projected)
                  </div>
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#10b981" }}
                    />{" "}
                    Solar PPA Rate
                  </div>
                  <div className="roi-legend-item">
                    <div
                      className="roi-legend-dot"
                      style={{ background: "#dcfce7" }}
                    />{" "}
                    Savings Per kWh
                  </div>
                </div>
              </div>
            )}

            {/* === Sensitivity Analysis Chart === */}
            {activeSection === "sensitivity" && (
              <div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    marginBottom: 16,
                  }}
                >
                  How your 25-year savings change based on utility rate
                  escalation. The marker shows your current assumption (
                  {(utilityEscalator * 100).toFixed(1)}%/yr).
                </p>
                <svg
                  className="roi-chart-svg"
                  viewBox={`0 0 ${chartWidth} ${sensChartH}`}
                  preserveAspectRatio="xMidYMid meet"
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                    const val = sensMinSavings + pct * sensRange;
                    return (
                      <g key={pct}>
                        <line
                          x1={sensPad.left}
                          x2={chartWidth - sensPad.right}
                          y1={sensYScale(val)}
                          y2={sensYScale(val)}
                          stroke="#f3f4f6"
                          strokeWidth="1"
                        />
                        <text
                          x={sensPad.left - 8}
                          y={sensYScale(val) + 4}
                          textAnchor="end"
                          fill="#9ca3af"
                          fontSize="10"
                          fontWeight="500"
                        >
                          ${(val / 1000).toFixed(0)}k
                        </text>
                      </g>
                    );
                  })}
                  <path
                    d={
                      sensPath +
                      ` L ${sensXScale(sensData.length - 1)} ${sensPad.top + sensPlotH} L ${sensXScale(0)} ${sensPad.top + sensPlotH} Z`
                    }
                    fill="url(#sensGrad)"
                    opacity="0.3"
                  />
                  <defs>
                    <linearGradient id="sensGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={sensPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {sensData.map((d, i) => {
                    const val =
                      viewMode === "lease"
                        ? d.totalSavingsLease
                        : d.totalSavingsPurchase;
                    return (
                      <g key={i}>
                        <circle
                          cx={sensXScale(i)}
                          cy={sensYScale(val)}
                          r={i === currentEscIdx ? 7 : 4}
                          fill={i === currentEscIdx ? "#059669" : "#10b981"}
                          stroke="white"
                          strokeWidth="2"
                        />
                        <text
                          x={sensXScale(i)}
                          y={sensChartH - 8}
                          textAnchor="middle"
                          fill="#9ca3af"
                          fontSize="10"
                          fontWeight="500"
                        >
                          {(d.paramValue * 100).toFixed(1)}%
                        </text>
                      </g>
                    );
                  })}
                  {currentEscIdx >= 0 && (
                    <text
                      x={sensXScale(currentEscIdx)}
                      y={
                        sensYScale(
                          viewMode === "lease"
                            ? sensData[currentEscIdx].totalSavingsLease
                            : sensData[currentEscIdx].totalSavingsPurchase,
                        ) - 14
                      }
                      textAnchor="middle"
                      fill="#059669"
                      fontSize="11"
                      fontWeight="700"
                    >
                      Current
                    </text>
                  )}
                </svg>
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 8,
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  Utility Rate Escalation (%/year)
                </div>
              </div>
            )}
          </div>

          {/* Home Value Impact Card */}
          <div className="roi-home-value-card">
            <div className="roi-env-title">
              <Home size={20} /> Home Value Impact
            </div>
            <p
              style={{
                fontSize: "0.9rem",
                color: "rgba(255,255,255,0.8)",
                marginTop: -8,
                marginBottom: 4,
              }}
            >
              Based on Zillow/NREL research, solar adds approximately $20 per
              kWh of annual production to home value.
            </p>
            <div className="roi-home-value-grid">
              <div className="roi-home-value-item">
                <div className="roi-home-value-val">{fmt(homeValue)}</div>
                <div className="roi-home-value-label">Current Home Value</div>
              </div>
              <div className="roi-home-value-item">
                <div
                  className="roi-home-value-val"
                  style={{ color: "#bbf7d0" }}
                >
                  +{fmt(advanced.homeValueImpact.valueIncrease)}
                </div>
                <div className="roi-home-value-label">
                  Solar Premium (+{advanced.homeValueImpact.percentIncrease}%)
                </div>
              </div>
              <div className="roi-home-value-item">
                <div className="roi-home-value-val">
                  {fmt(advanced.homeValueImpact.newHomeValue)}
                </div>
                <div className="roi-home-value-label">New Home Value</div>
              </div>
            </div>
          </div>

          {/* Year-by-Year Table (Collapsible) */}
          <div className="roi-chart-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="roi-chart-title" style={{ marginBottom: 0 }}>
                <DollarSign size={20} /> Year-by-Year Breakdown
              </div>
              <button
                className="roi-advanced-toggle"
                style={{ padding: 0 }}
                onClick={() => setShowTable(!showTable)}
              >
                {showTable ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {showTable ? "Collapse" : "Expand"}
              </button>
            </div>
            {showTable && (
              <div className="roi-table-wrapper" style={{ marginTop: 16 }}>
                <table className="roi-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Production (kWh)</th>
                      <th>Utility Rate</th>
                      <th>Utility Cost</th>
                      <th>
                        {viewMode === "lease" ? "Solar Cost" : "Loan + Grid"}
                      </th>
                      <th>Annual Savings</th>
                      <th>Cumulative Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.map((d) => {
                      const annualSavings =
                        viewMode === "lease"
                          ? d.leaseSavings
                          : d.purchaseSavings;
                      const cumSavings =
                        viewMode === "lease"
                          ? d.leaseCumulativeSavings
                          : d.purchaseCumulativeSavings;
                      const solarCost =
                        viewMode === "lease"
                          ? d.leaseYearlyCost
                          : d.purchaseYearlyCost;
                      return (
                        <tr key={d.year}>
                          <td>{d.year}</td>
                          <td>{d.production.toLocaleString()}</td>
                          <td>{fmtRate(d.utilityRate)}</td>
                          <td>{fmt(d.utilityOnlyCost)}</td>
                          <td>{fmt(solarCost)}</td>
                          <td
                            className={
                              annualSavings >= 0
                                ? "savings-cell"
                                : "negative-cell"
                            }
                          >
                            {annualSavings >= 0 ? "+" : "-"}
                            {fmt(annualSavings)}
                          </td>
                          <td
                            className={
                              cumSavings >= 0 ? "savings-cell" : "negative-cell"
                            }
                          >
                            {cumSavings >= 0 ? "+" : "-"}
                            {fmt(cumSavings)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bottom Grid: Environmental + CTA */}
          <div className="roi-bottom-grid">
            <div className="roi-env-card">
              <div className="roi-env-title">
                <Leaf size={20} /> Environmental Impact (25 Years)
              </div>
              <div className="roi-env-grid">
                <div className="roi-env-item">
                  <div className="roi-env-icon">
                    <Zap size={22} />
                  </div>
                  <div className="roi-env-value">
                    {Math.round(
                      environmental.lifetimeProductionKwh / 1000,
                    ).toLocaleString()}{" "}
                    MWh
                  </div>
                  <div className="roi-env-label">Clean Energy Produced</div>
                </div>
                <div className="roi-env-item">
                  <div className="roi-env-icon">
                    <Leaf size={22} />
                  </div>
                  <div className="roi-env-value">
                    {environmental.co2OffsetTons.toLocaleString()} tons
                  </div>
                  <div className="roi-env-label">CO2 Offset</div>
                </div>
                <div className="roi-env-item">
                  <div className="roi-env-icon">
                    <TreePine size={22} />
                  </div>
                  <div className="roi-env-value">
                    {environmental.treesEquivalent.toLocaleString()}
                  </div>
                  <div className="roi-env-label">Trees Equivalent</div>
                </div>
                <div className="roi-env-item">
                  <div className="roi-env-icon">
                    <Car size={22} />
                  </div>
                  <div className="roi-env-value">
                    {environmental.carsRemoved}
                  </div>
                  <div className="roi-env-label">Cars Removed (Equiv.)</div>
                </div>
              </div>
            </div>

            <div className="roi-cta-card">
              <div className="roi-cta-title">
                Ready to start saving {fmt(monthlySavings)}/month?
              </div>
              <p className="roi-cta-text">
                Get your personalized solar design using satellite imagery of
                your actual roof. Our {system.sizeKw} kW system with 60 kWh
                Duracell battery storage provides whole-home backup and locks in
                low energy rates for 25 years.
              </p>
              <Link to="/qualify" className="roi-cta-btn">
                Get Your Free Solar Design <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
