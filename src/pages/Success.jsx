import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle,
  ArrowRight,
  Zap,
  Sun,
  Battery,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  Shield,
  Leaf,
  AlertTriangle,
  Home,
  Clock,
  Snowflake,
  Power,
  ThermometerSun,
  Heart,
  BatteryCharging,
  Users,
} from "lucide-react";
import RoofVisualizer from "../components/RoofVisualizer";
import { createAccount } from "../services/firebase";

export default function Success() {
  // Get data from session storage
  const projectId = sessionStorage.getItem("projectId");
  const customerName = sessionStorage.getItem("customerName") || "there";
  const customerLastName = sessionStorage.getItem("customerLastName") || "";
  const customerEmail = sessionStorage.getItem("customerEmail") || "";
  const customerAddress = sessionStorage.getItem("customerAddress") || "";
  const latitude = parseFloat(sessionStorage.getItem("latitude")) || null;
  const longitude = parseFloat(sessionStorage.getItem("longitude")) || null;
  const annualUsageKwh =
    parseInt(sessionStorage.getItem("annualUsageKwh")) || 12000;

  // Parse system design and bill data
  const systemDesignStr = sessionStorage.getItem("systemDesign");
  const billDataStr = sessionStorage.getItem("billData");
  let systemDesign = null;
  let billData = null;
  try {
    systemDesign = systemDesignStr ? JSON.parse(systemDesignStr) : null;
    billData = billDataStr ? JSON.parse(billDataStr) : null;
  } catch (e) {
    console.error("Failed to parse data:", e);
  }

  // State for adjustable panel count (user can modify via RoofVisualizer)
  const [adjustedPanelCount, setAdjustedPanelCount] = useState(
    systemDesign?.panels?.count || 0,
  );
  const [adjustedSystemKw, setAdjustedSystemKw] = useState(
    systemDesign?.panels?.systemSizeKw || 0,
  );

  // Handle panel count changes from RoofVisualizer
  const handlePanelCountChange = (newCount, newSystemKw) => {
    setAdjustedPanelCount(newCount);
    setAdjustedSystemKw(newSystemKw);
  };

  // Calculate production based on adjusted panel count
  const panelWattage = systemDesign?.panelDimensions?.capacityWatts || 400;
  const productionPerPanel = systemDesign?.production?.annualKwh
    ? systemDesign.production.annualKwh / (systemDesign.panels?.count || 1)
    : 1500; // ~1500 kWh per panel in Texas
  const adjustedAnnualProduction = Math.round(
    adjustedPanelCount * productionPerPanel,
  );

  // Fixed battery specs - 60 kWh Duracell Power Center for all jobs
  // 3 stacks × 4 modules per stack = 12 modules × 5 kWh each = 60 kWh total
  const batterySpecs = {
    stacks: 3,
    modulesPerStack: 4,
    totalModules: 12,
    kwhPerModule: 5,
    brand: "Duracell Power Center",
    totalCapacityKwh: 60,
    peakPowerKw: 25, // 25 kW continuous output
    peakSurgeKw: 50, // 50 kW surge capacity
    backupHours: 24,
    warranty: 15, // 15-year warranty
    cycles: 10000, // 10,000 cycle life
  };

  // Pricing constants
  const SOLAR_RATE = 0.12; // $/kWh
  const SOLAR_ESCALATOR = 0.029; // 2.9% annual
  const UTILITY_ESCALATOR = 0.035; // 3.5% annual
  const SOLAR_DEGRADATION = 0.2; // 20% over 25 years (0.8% per year)
  const YEARS = 25;

  // Get utility rate from bill or use default
  const utilityRate = billData?.ratePerKwh || 0.16;

  // Use adjusted production when user modifies panel count, otherwise use system design
  const annualProduction =
    adjustedPanelCount > 0
      ? adjustedAnnualProduction
      : systemDesign?.production?.annualKwh || annualUsageKwh;

  // Calculate 25-year comparison data
  // With partial offset, customer pays:
  // - Solar rate for what solar produces
  // - Utility rate for the remaining usage (usage - production)
  const comparisonData = useMemo(() => {
    const data = [];
    let cumulativeUtilityOnly = 0; // Cost if staying with utility (no solar)
    let cumulativeWithSolar = 0; // Cost with solar + grid for remainder

    for (let year = 1; year <= YEARS; year++) {
      // Utility rate increases 3.5% per year
      const yearlyUtilityRate =
        utilityRate * Math.pow(1 + UTILITY_ESCALATOR, year - 1);

      // Cost WITHOUT solar (100% from utility)
      const yearlyUtilityOnlyCost = yearlyUtilityRate * annualUsageKwh;

      // Solar: rate increases 2.9%, production degrades ~0.8% per year
      const degradationFactor = 1 - (SOLAR_DEGRADATION / YEARS) * (year - 1);
      const yearlySolarRate =
        SOLAR_RATE * Math.pow(1 + SOLAR_ESCALATOR, year - 1);
      const yearlySolarProduction = annualProduction * degradationFactor;

      // Cost WITH solar:
      // - Pay solar rate for solar production
      // - Pay utility rate for remaining usage (if production < usage)
      const yearlySolarCost = yearlySolarRate * yearlySolarProduction;
      const remainingUsage = Math.max(
        0,
        annualUsageKwh - yearlySolarProduction,
      );
      const yearlyGridCost = yearlyUtilityRate * remainingUsage;
      const yearlyTotalWithSolar = yearlySolarCost + yearlyGridCost;

      cumulativeUtilityOnly += yearlyUtilityOnlyCost;
      cumulativeWithSolar += yearlyTotalWithSolar;

      data.push({
        year,
        utilityAnnual: Math.round(yearlyUtilityOnlyCost),
        solarAnnual: Math.round(yearlyTotalWithSolar),
        solarOnlyPortion: Math.round(yearlySolarCost),
        gridPortion: Math.round(yearlyGridCost),
        utilityCumulative: Math.round(cumulativeUtilityOnly),
        solarCumulative: Math.round(cumulativeWithSolar),
        savings: Math.round(cumulativeUtilityOnly - cumulativeWithSolar),
      });
    }
    return data;
  }, [
    utilityRate,
    annualUsageKwh,
    annualProduction,
    adjustedAnnualProduction,
    adjustedPanelCount,
  ]);

  // Key metrics
  const year1Savings =
    comparisonData[0]?.utilityAnnual - comparisonData[0]?.solarAnnual;
  const totalSavings = comparisonData[YEARS - 1]?.savings || 0;
  const monthlySavings = Math.round(year1Savings / 12);

  // Monthly production vs consumption
  const monthlyData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    // Solar production factors by month (Texas)
    const productionFactors = [
      0.065, 0.07, 0.085, 0.095, 0.1, 0.105, 0.105, 0.1, 0.09, 0.08, 0.06,
      0.045,
    ];
    // Consumption factors (higher in summer for AC)
    const consumptionFactors = [
      0.07, 0.065, 0.07, 0.075, 0.09, 0.11, 0.12, 0.12, 0.1, 0.075, 0.055, 0.05,
    ];

    return months.map((month, i) => ({
      month,
      production: Math.round(annualProduction * productionFactors[i]),
      consumption: Math.round(annualUsageKwh * consumptionFactors[i]),
    }));
  }, [
    annualProduction,
    annualUsageKwh,
    adjustedAnnualProduction,
    adjustedPanelCount,
  ]);

  // Account creation state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [error, setError] = useState("");

  const handleCreateAccount = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      const displayName = `${customerName} ${customerLastName}`.trim();
      await createAccount(customerEmail, password, displayName);
      setAccountCreated(true);
    } catch (err) {
      console.error("Account creation error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else {
        setError(err.message || "Failed to create account");
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Calculate offset percentage dynamically based on adjusted production
  const offsetPercent = Math.round((annualProduction / annualUsageKwh) * 100);

  // Current panel count and system size (adjusted or original)
  const currentPanelCount =
    adjustedPanelCount > 0
      ? adjustedPanelCount
      : systemDesign?.panels?.count || 0;
  const currentSystemKw =
    adjustedSystemKw > 0
      ? adjustedSystemKw
      : systemDesign?.panels?.systemSizeKw || 0;

  return (
    <div className="success-page">
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap"
        rel="stylesheet"
      />

      <style>{`
        .success-page {
          min-height: 100vh;
          background: #0a0a0f;
          position: relative;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .success-page h1, .success-page h2, .success-page h3, .success-page h4 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
        }

        .success-bg {
          position: fixed;
          inset: 0;
          background-image: url('/graffiti-fist-sun.jpg');
          background-size: cover;
          background-position: center;
        }

        .success-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 15, 25, 0.92) 0%,
            rgba(10, 15, 25, 0.88) 100%
          );
        }

        .success-container {
          position: relative;
          z-index: 10;
          padding: 20px 24px 60px;
        }

        .success-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto 20px;
        }

        .success-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          font-weight: 800;
          font-size: 1.1rem;
          text-decoration: none;
          font-family: 'Space Grotesk', sans-serif;
        }

        .success-logo-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #00FFD4, #00B894);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.4);
        }

        .success-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Gradient Text */
        .gradient-text {
          background: linear-gradient(135deg, #00FFD4, #00B894);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Hero Section */
        /* Proposal Header */
        .proposal-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .proposal-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(0, 184, 148, 0.1));
          border: 1px solid rgba(0, 212, 170, 0.4);
          border-radius: 100px;
          color: #00FFD4;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 16px;
        }

        .proposal-title {
          font-size: clamp(1.6rem, 4vw, 2.4rem);
          font-weight: 900;
          color: #fff;
          margin: 0 0 12px;
        }

        .proposal-address {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.95rem;
          margin: 0 0 6px;
        }

        .proposal-name {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          margin: 0;
        }

        .proposal-name .highlight {
          background: linear-gradient(135deg, #00FFD4, #00B894);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }

        /* Backup Hero Section */
        .backup-hero {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(0, 100, 80, 0.15));
          border: 2px solid rgba(0, 212, 170, 0.5);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }

        .backup-hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(0, 212, 170, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .backup-hero-content {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 24px;
        }

        .backup-hero-icon {
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.3), rgba(0, 184, 148, 0.15));
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00FFD4;
        }

        .backup-hero-title {
          font-size: clamp(1.3rem, 3vw, 1.8rem);
          font-weight: 800;
          color: #fff;
          margin: 0 0 8px;
        }

        .backup-highlight {
          color: #00FFD4;
          text-shadow: 0 0 20px rgba(0, 212, 170, 0.5);
        }

        .backup-hero-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }

        .backup-hero-stats {
          display: flex;
          justify-content: space-around;
          gap: 16px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.15);
        }

        .backup-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #00FFD4;
        }

        .backup-stat-value {
          font-size: 1.5rem;
          font-weight: 900;
          color: #fff;
        }

        .backup-stat-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }

        @media (max-width: 600px) {
          .backup-hero-content {
            flex-direction: column;
            text-align: center;
          }
          .backup-hero-stats {
            flex-wrap: wrap;
          }
        }

        /* Texas Grid Warning */
        .grid-warning {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }

        .warning-header {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #ef4444;
          margin-bottom: 20px;
        }

        .warning-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
        }

        .warning-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 700px) {
          .warning-stats {
            grid-template-columns: 1fr;
          }
        }

        .warning-stat {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
        }

        .warning-stat svg {
          flex-shrink: 0;
          color: #fbbf24;
        }

        .warning-stat-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .warning-stat-value {
          font-weight: 700;
          color: #fff;
          font-size: 0.95rem;
        }

        .warning-stat-desc {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.4;
        }

        .warning-cta {
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.95rem;
          line-height: 1.6;
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        /* Map Section */
        .map-section {
          margin-bottom: 32px;
        }

        .section-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: rgba(0, 0, 0, 0.3);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .section-title {
          color: #fff;
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }

        /* Solar Design Section */
        .design-section {
          margin-bottom: 32px;
        }

        .design-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .design-grid {
            grid-template-columns: 1fr;
          }
        }

        .design-map-wrap {
          border-radius: 16px;
          overflow: hidden;
        }

        .design-map-wrap > div,
        .design-map-wrap > div > div {
          width: 100% !important;
          height: auto !important;
          aspect-ratio: 1;
        }

        .design-stats-wrap {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 20px;
        }

        .design-stat-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }

        .design-stat {
          text-align: center;
          padding: 16px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        .design-stat.large {
          padding: 20px 12px;
        }

        .design-stat-value {
          display: block;
          font-size: 1.5rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
        }

        .design-stat.large .design-stat-value {
          font-size: 2rem;
        }

        .design-stat-value.accent {
          color: #00FFD4;
        }

        .design-stat-value.gold {
          color: #fbbf24;
        }

        .design-stat-label {
          display: block;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 6px;
        }

        .design-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 16px 0;
        }

        .design-metric {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .design-metric.highlight {
          background: rgba(0, 212, 170, 0.1);
        }

        .design-metric-value {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }

        .design-metric-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          margin-left: auto;
        }

        /* Production Chart */
        .chart-section {
          margin-bottom: 32px;
        }

        .chart-container {
          padding: 24px;
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 200px;
          gap: 8px;
          padding-bottom: 30px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .chart-bar-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          position: relative;
        }

        .chart-bars-wrapper {
          display: flex;
          gap: 3px;
          align-items: flex-end;
          height: 160px;
          position: relative;
          cursor: pointer;
        }

        .chart-bars-wrapper:hover .chart-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
          pointer-events: auto;
        }

        .chart-bars-wrapper:hover .chart-bar {
          filter: brightness(1.2);
        }

        .chart-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 10px 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.2s ease;
          z-index: 100;
          margin-bottom: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .chart-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: rgba(15, 23, 42, 0.95);
        }

        .tooltip-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          margin-bottom: 4px;
        }

        .tooltip-row:last-child {
          margin-bottom: 0;
        }

        .tooltip-dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }

        .tooltip-dot.production {
          background: #fbbf24;
        }

        .tooltip-dot.consumption {
          background: #3b82f6;
        }

        .tooltip-value {
          font-weight: 700;
          color: #fff;
        }

        .tooltip-label {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
        }

        .chart-bar {
          width: 18px;
          border-radius: 4px 4px 0 0;
          transition: all 0.2s ease;
        }

        .chart-bar.production {
          background: linear-gradient(180deg, #fbbf24, #f59e0b);
        }

        .chart-bar.consumption {
          background: linear-gradient(180deg, #60a5fa, #3b82f6);
        }

        .chart-month {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 8px;
        }

        .chart-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 16px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }

        .legend-dot.production {
          background: #fbbf24;
        }

        .legend-dot.consumption {
          background: #3b82f6;
        }

        /* Battery Featured Section */
        .battery-featured {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.1), rgba(0, 100, 80, 0.08));
          border: 2px solid rgba(0, 212, 170, 0.3);
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        @media (max-width: 800px) {
          .battery-featured {
            grid-template-columns: 1fr;
          }
        }

        .battery-featured-image {
          position: relative;
          min-height: 280px;
        }

        .battery-featured-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .battery-badge {
          position: absolute;
          top: 16px;
          left: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(0, 212, 170, 0.9);
          border-radius: 8px;
          color: #0a1520;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .battery-featured-content {
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .battery-featured-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .battery-featured-header h3 {
          margin: 0;
          color: #fff;
          font-size: 1.3rem;
          font-weight: 800;
        }

        .battery-featured-header p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85rem;
        }

        .backup-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (max-width: 600px) {
          .backup-features {
            grid-template-columns: 1fr;
          }
        }

        .backup-feature {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .backup-feature-icon {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          background: rgba(0, 212, 170, 0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00FFD4;
        }

        .backup-feature-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .backup-feature-text strong {
          color: #fff;
          font-size: 0.85rem;
        }

        .backup-feature-text span {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.75rem;
          line-height: 1.4;
        }

        .backup-quote {
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-left: 3px solid #00FFD4;
          border-radius: 0 8px 8px 0;
        }

        .backup-quote p {
          margin: 0;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.9rem;
          font-style: italic;
          line-height: 1.5;
        }

        /* Duracell Highlight Section */
        .duracell-highlight {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(184, 134, 11, 0.1));
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .highlight-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #d4af37, #b8860b);
          border-radius: 6px;
          color: #0a1520;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .duracell-highlight p {
          margin: 0;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.85rem;
          line-height: 1.6;
        }

        /* Duracell Specs Grid */
        .duracell-specs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
        }

        @media (max-width: 600px) {
          .duracell-specs {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .duracell-specs .spec-item {
          text-align: center;
        }

        .duracell-specs .spec-label {
          display: block;
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .duracell-specs .spec-value {
          display: block;
          font-size: 1rem;
          font-weight: 800;
          color: #00FFD4;
        }

        /* Equipment Section - Solar */
        .equipment-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .solar-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }

        @media (max-width: 700px) {
          .solar-details {
            grid-template-columns: 1fr;
          }
        }

        .solar-image {
          position: relative;
          min-height: 200px;
          background-size: cover;
          background-position: center;
        }

        .solar-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(0, 0, 0, 0.7));
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .solar-spec-large {
          text-align: center;
        }

        .solar-spec-large .spec-value {
          font-size: 4rem;
          font-weight: 900;
          color: #fff;
          display: block;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .solar-spec-large .spec-label {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .solar-specs {
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .spec-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .spec-row:last-child {
          border-bottom: none;
        }

        .spec-row .spec-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }

        .spec-row .spec-value {
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
        }

        /* 25-Year Comparison */
        .comparison-section {
          margin-bottom: 32px;
        }

        .comparison-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02));
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        @media (max-width: 600px) {
          .comparison-summary {
            grid-template-columns: 1fr;
          }
        }

        .summary-item {
          text-align: center;
        }

        .summary-value {
          font-size: 2rem;
          font-weight: 900;
          color: #00FFD4;
        }

        .summary-value.negative {
          color: #ef4444;
        }

        .summary-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 4px;
        }

        .comparison-table-wrap {
          padding: 24px;
          overflow-x: auto;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .comparison-table th {
          text-align: left;
          padding: 12px 8px;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 600;
          font-size: 0.75rem;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .comparison-table td {
          padding: 10px 8px;
          color: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .comparison-table tr:nth-child(5n) td {
          background: rgba(0, 212, 170, 0.05);
          font-weight: 600;
        }

        .comparison-table .savings {
          color: #00FFD4;
          font-weight: 700;
        }

        .comparison-table .negative {
          color: #ef4444;
          font-weight: 700;
        }

        .comparison-table .utility {
          color: #ef4444;
        }

        .comparison-table .solar {
          color: #fbbf24;
        }

        .comparison-note {
          padding: 16px 24px;
          background: rgba(0, 212, 170, 0.1);
          border-left: 3px solid #00FFD4;
        }

        .comparison-note p {
          margin: 0;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.85rem;
          line-height: 1.6;
        }


        /* Compare Installers CTA */
        .compare-installers-cta {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.15), rgba(0, 100, 80, 0.1));
          border: 2px solid rgba(0, 212, 170, 0.4);
          border-radius: 20px;
          padding: 32px;
          margin-bottom: 32px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .compare-installers-cta::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(0, 212, 170, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .compare-cta-content {
          position: relative;
          z-index: 1;
        }

        .compare-cta-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 212, 170, 0.2);
          border: 1px solid rgba(0, 212, 170, 0.4);
          border-radius: 100px;
          color: #00FFD4;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }

        .compare-cta-title {
          font-size: clamp(1.4rem, 3vw, 1.9rem);
          font-weight: 900;
          color: #fff;
          margin: 0 0 12px;
        }

        .compare-cta-desc {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
          margin: 0 0 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .compare-cta-button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 32px;
          background: linear-gradient(135deg, #00FFD4, #00B894);
          border: none;
          border-radius: 12px;
          color: #0a1520;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(0, 212, 170, 0.3);
        }

        .compare-cta-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 30px rgba(0, 212, 170, 0.5);
        }

        /* Why Section */
        .why-section {
          margin-bottom: 40px;
        }

        .why-title {
          font-size: clamp(1.4rem, 3.5vw, 2rem);
          font-weight: 900;
          color: #fff;
          text-align: center;
          margin: 0 0 32px;
        }

        .why-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        @media (max-width: 800px) {
          .why-grid {
            grid-template-columns: 1fr;
          }
        }

        .why-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
        }

        .why-card.featured {
          grid-column: span 2;
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.15), rgba(0, 100, 80, 0.1));
          border: 2px solid rgba(0, 212, 170, 0.4);
        }

        @media (max-width: 800px) {
          .why-card.featured {
            grid-column: span 1;
          }
        }

        .why-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .why-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00FFD4;
        }

        .why-icon.featured {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #00FFD4, #00B894);
          color: #0a1520;
        }

        .why-card h4 {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }

        .why-desc {
          color: rgba(255, 255, 255, 0.75);
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0 0 16px;
        }

        .why-benefits {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .why-benefits li {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.85rem;
          padding: 6px 0;
        }

        .why-benefits li svg {
          color: #00FFD4;
          flex-shrink: 0;
        }

        /* Final Section Styling */
        .final-section {
          background: linear-gradient(180deg, #0a0a0f 0%, #0d1520 100%);
        }

        /* Account Section */
        .account-section {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.1), rgba(0, 184, 148, 0.05));
          border: 1px solid rgba(0, 212, 170, 0.3);
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 24px;
          text-align: center;
        }

        .account-title {
          color: #fff;
          font-size: 1.2rem;
          font-weight: 800;
          margin: 0 0 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .account-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          margin: 0 0 20px;
        }

        .account-form {
          max-width: 360px;
          margin: 0 auto;
        }

        .account-input-group {
          position: relative;
          margin-bottom: 12px;
        }

        .account-input {
          width: 100%;
          padding: 14px 44px 14px 14px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          outline: none;
        }

        .account-input:focus {
          border-color: #00FFD4;
        }

        .account-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .account-toggle {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
        }

        .account-btn {
          width: 100%;
          padding: 14px 28px;
          background: linear-gradient(135deg, #00FFD4, #00B894);
          border: none;
          border-radius: 10px;
          color: #0a1520;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .account-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .account-error {
          color: #ef4444;
          font-size: 0.85rem;
          margin-top: 10px;
          padding: 10px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
        }

        .account-success {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #00FFD4;
          font-weight: 600;
        }

        /* Footer */
        .footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .ref-id {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }

        .ref-id code {
          background: rgba(0, 212, 170, 0.2);
          padding: 4px 10px;
          border-radius: 6px;
          color: #00FFD4;
          font-weight: 600;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #00FFD4, #00B894);
          border: none;
          color: #0a1520;
        }

        .action-btn.secondary {
          background: transparent;
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: #fff;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          animation: spin 1s linear infinite;
        }
      `}</style>

      <div className="success-bg" />
      <div className="success-overlay" />

      <div className="success-container">
        {/* Header */}
        <header className="success-header">
          <Link to="/" className="success-logo">
            <div className="success-logo-icon">
              <Zap size={20} color="#0a1520" />
            </div>
            Power to the People
          </Link>
        </header>

        <div className="success-content">
          {/* Professional Proposal Header */}
          <div className="proposal-header">
            <div className="proposal-badge">
              <CheckCircle size={14} />
              Custom Solar Proposal
            </div>
            <h1 className="proposal-title">
              Your Complete{" "}
              <span className="gradient-text">Solar + Battery</span> System
            </h1>
            <p className="proposal-address">
              <Home size={16} />
              {customerAddress}
            </p>
            <p className="proposal-name">
              Prepared for{" "}
              <span className="gradient-text">
                {customerName} {customerLastName}
              </span>
            </p>
          </div>

          {/* CRITICAL: Backup Protection Hero */}
          <div className="backup-hero">
            <div className="backup-hero-content">
              <div className="backup-hero-icon">
                <Shield size={48} />
              </div>
              <div className="backup-hero-text">
                <h2 className="backup-hero-title">
                  <span className="backup-highlight">24+ Hours</span> of Home
                  Backup Protection
                </h2>
                <p className="backup-hero-subtitle">
                  When the grid fails, your home stays powered. Keep your lights
                  on, AC running, and family safe.
                </p>
              </div>
            </div>
            <div className="backup-hero-stats">
              <div className="backup-stat">
                <BatteryCharging size={24} />
                <span className="backup-stat-value">
                  {batterySpecs.totalCapacityKwh} kWh
                </span>
                <span className="backup-stat-label">Total Capacity</span>
              </div>
              <div className="backup-stat">
                <Power size={24} />
                <span className="backup-stat-value">
                  {batterySpecs.peakPowerKw} kW
                </span>
                <span className="backup-stat-label">Continuous Power</span>
              </div>
              <div className="backup-stat">
                <Zap size={24} />
                <span className="backup-stat-value">
                  {batterySpecs.peakSurgeKw} kW
                </span>
                <span className="backup-stat-label">Surge Capacity</span>
              </div>
              <div className="backup-stat">
                <Clock size={24} />
                <span className="backup-stat-value">
                  {batterySpecs.backupHours}+ hrs
                </span>
                <span className="backup-stat-label">Backup Runtime</span>
              </div>
            </div>
          </div>

          {/* Texas Grid Warning */}
          <div className="grid-warning">
            <div className="warning-header">
              <AlertTriangle size={24} />
              <h3>Texas Grid Reality</h3>
            </div>
            <div className="warning-stats">
              <div className="warning-stat">
                <Snowflake size={32} />
                <div className="warning-stat-content">
                  <span className="warning-stat-value">Winter Storm Uri</span>
                  <span className="warning-stat-desc">
                    4.5 million homes lost power for up to 5 days
                  </span>
                </div>
              </div>
              <div className="warning-stat">
                <ThermometerSun size={32} />
                <div className="warning-stat-content">
                  <span className="warning-stat-value">Summer 2023</span>
                  <span className="warning-stat-desc">
                    ERCOT issued emergency alerts for 30+ days
                  </span>
                </div>
              </div>
              <div className="warning-stat">
                <Heart size={32} />
                <div className="warning-stat-content">
                  <span className="warning-stat-value">Your Family</span>
                  <span className="warning-stat-desc">
                    Deserves reliable power, no matter what
                  </span>
                </div>
              </div>
            </div>
            <p className="warning-cta">
              <strong>Don't wait for the next outage.</strong> With 60 kWh of
              Duracell battery storage, your essential appliances stay running
              while neighbors sit in the dark.
            </p>
          </div>

          {/* Solar Design Section */}
          {systemDesign && latitude && longitude && (
            <div className="design-section">
              <div className="design-grid">
                <div className="design-map-wrap">
                  <RoofVisualizer
                    latitude={latitude}
                    longitude={longitude}
                    panelCount={systemDesign.panels?.count || 0}
                    systemSizeKw={systemDesign.panels?.systemSizeKw || 0}
                    roofData={systemDesign.roof}
                    buildingCenter={systemDesign.buildingCenter}
                    roofSegments={systemDesign.roofSegments}
                    solarPanels={systemDesign.solarPanels}
                    panelDimensions={systemDesign.panelDimensions}
                    showAllPanels={false}
                    onPanelCountChange={handlePanelCountChange}
                    showSidePanel={false}
                  />
                </div>
                <div className="design-stats-wrap">
                  <div className="design-stat-row">
                    <div className="design-stat large">
                      <span className="design-stat-value accent">
                        {offsetPercent}%
                      </span>
                      <span className="design-stat-label">Energy Offset</span>
                    </div>
                    <div className="design-stat large">
                      <span className="design-stat-value">
                        {currentPanelCount}
                      </span>
                      <span className="design-stat-label">Solar Panels</span>
                    </div>
                  </div>
                  <div className="design-stat-row">
                    <div className="design-stat">
                      <span className="design-stat-value">
                        {currentSystemKw.toFixed(1)} kW
                      </span>
                      <span className="design-stat-label">System Size</span>
                    </div>
                    <div className="design-stat">
                      <span className="design-stat-value gold">60 kWh</span>
                      <span className="design-stat-label">Battery</span>
                    </div>
                  </div>
                  <div className="design-divider" />
                  <div className="design-metric">
                    <Sun size={16} color="#fbbf24" />
                    <span className="design-metric-value">
                      {annualProduction.toLocaleString()} kWh
                    </span>
                    <span className="design-metric-label">
                      annual production
                    </span>
                  </div>
                  <div className="design-metric">
                    <Zap size={16} color="#60a5fa" />
                    <span className="design-metric-value">
                      {annualUsageKwh.toLocaleString()} kWh
                    </span>
                    <span className="design-metric-label">annual usage</span>
                  </div>
                  <div className="design-metric highlight">
                    <DollarSign size={16} color="#00FFD4" />
                    <span className="design-metric-value">
                      ${monthlySavings}/mo
                    </span>
                    <span className="design-metric-label">Year 1 savings</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Production Chart */}
          <div className="chart-section">
            <div className="section-card">
              <div className="section-header">
                <TrendingUp size={20} color="#00FFD4" />
                <h3 className="section-title">
                  Monthly Production vs Consumption
                </h3>
              </div>
              <div className="chart-container">
                <div className="chart-bars">
                  {monthlyData.map((data, i) => {
                    const maxVal = Math.max(
                      ...monthlyData.map((d) =>
                        Math.max(d.production, d.consumption),
                      ),
                    );
                    const prodHeight = (data.production / maxVal) * 140;
                    const consHeight = (data.consumption / maxVal) * 140;
                    return (
                      <div key={i} className="chart-bar-group">
                        <div className="chart-bars-wrapper">
                          <div className="chart-tooltip">
                            <div className="tooltip-row">
                              <span className="tooltip-dot production" />
                              <span className="tooltip-value">
                                {data.production.toLocaleString()}
                              </span>
                              <span className="tooltip-label">kWh</span>
                            </div>
                            <div className="tooltip-row">
                              <span className="tooltip-dot consumption" />
                              <span className="tooltip-value">
                                {data.consumption.toLocaleString()}
                              </span>
                              <span className="tooltip-label">kWh</span>
                            </div>
                          </div>
                          <div
                            className="chart-bar production"
                            style={{ height: `${prodHeight}px` }}
                          />
                          <div
                            className="chart-bar consumption"
                            style={{ height: `${consHeight}px` }}
                          />
                        </div>
                        <span className="chart-month">{data.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-dot production" />
                    Solar Production
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot consumption" />
                    Your Usage
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Battery Backup Featured Section */}
          <div className="battery-featured">
            <div className="battery-featured-image">
              <img
                src="/duracell-power-center.jpg"
                alt="Duracell Power Center System"
              />
              <div className="battery-badge">
                <Shield size={16} />
                WHOLE HOME BACKUP
              </div>
            </div>
            <div className="battery-featured-content">
              <div className="battery-featured-header">
                <Battery size={28} color="#00FFD4" />
                <div>
                  <h3>{batterySpecs.brand}</h3>
                  <p>
                    {batterySpecs.stacks} Stacks ×{" "}
                    {batterySpecs.modulesPerStack} Modules ={" "}
                    {batterySpecs.totalModules} × {batterySpecs.kwhPerModule}{" "}
                    kWh
                  </p>
                </div>
              </div>

              <div className="duracell-highlight">
                <div className="highlight-badge">
                  <Shield size={16} />
                  #1 Rated Domestic Battery
                </div>
                <p>
                  The Duracell Power Center is America's most trusted home
                  battery system, featuring LFP (Lithium Iron Phosphate) cells
                  for maximum safety and longevity. With a{" "}
                  {batterySpecs.warranty}-year warranty and{" "}
                  {batterySpecs.cycles.toLocaleString()}-cycle lifespan, it's
                  built to protect your family for decades.
                </p>
              </div>

              <div className="backup-features">
                <div className="backup-feature">
                  <div className="backup-feature-icon">
                    <Home size={20} />
                  </div>
                  <div className="backup-feature-text">
                    <strong>Whole Home Coverage</strong>
                    <span>
                      Powers AC, refrigerator, lights, medical equipment & more
                    </span>
                  </div>
                </div>
                <div className="backup-feature">
                  <div className="backup-feature-icon">
                    <Zap size={20} />
                  </div>
                  <div className="backup-feature-text">
                    <strong>{batterySpecs.peakSurgeKw} kW Surge Power</strong>
                    <span>Handles startup loads for AC and appliances</span>
                  </div>
                </div>
                <div className="backup-feature">
                  <div className="backup-feature-icon">
                    <Sun size={20} />
                  </div>
                  <div className="backup-feature-text">
                    <strong>Solar Recharge</strong>
                    <span>Batteries recharge daily from your solar panels</span>
                  </div>
                </div>
                <div className="backup-feature">
                  <div className="backup-feature-icon">
                    <Shield size={20} />
                  </div>
                  <div className="backup-feature-text">
                    <strong>LFP Safety Technology</strong>
                    <span>No thermal runaway risk, fire-safe chemistry</span>
                  </div>
                </div>
              </div>

              <div className="duracell-specs">
                <div className="spec-item">
                  <span className="spec-label">Total Capacity</span>
                  <span className="spec-value">
                    {batterySpecs.totalCapacityKwh} kWh
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Continuous Output</span>
                  <span className="spec-value">
                    {batterySpecs.peakPowerKw} kW
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Surge Capacity</span>
                  <span className="spec-value">
                    {batterySpecs.peakSurgeKw} kW
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Warranty</span>
                  <span className="spec-value">
                    {batterySpecs.warranty} Years
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Cycle Life</span>
                  <span className="spec-value">
                    {batterySpecs.cycles.toLocaleString()} Cycles
                  </span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Chemistry</span>
                  <span className="spec-value">LFP (Safest)</span>
                </div>
              </div>

              <div className="backup-quote">
                <p>
                  "During Winter Storm Uri, Texans with battery backup were the
                  only ones with heat, lights, and working refrigerators."
                </p>
              </div>
            </div>
          </div>

          {/* Equipment Grid - Solar Panel Details */}
          <div className="equipment-section">
            <div className="section-header">
              <Sun size={20} color="#fbbf24" />
              <h3 className="section-title">Your Solar Array</h3>
            </div>
            <div className="solar-details">
              <div
                className="solar-image"
                style={{ backgroundImage: "url('/graffiti-phoenix.jpg')" }}
              >
                <div className="solar-overlay">
                  <div className="solar-spec-large">
                    <span className="spec-value">{currentPanelCount}</span>
                    <span className="spec-label">Premium Panels</span>
                  </div>
                </div>
              </div>
              <div className="solar-specs">
                <div className="spec-row">
                  <span className="spec-label">System Size</span>
                  <span className="spec-value">
                    {currentSystemKw.toFixed(2)} kW
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Annual Production</span>
                  <span className="spec-value">
                    {annualProduction.toLocaleString()} kWh
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Peak Sun Hours</span>
                  <span className="spec-value">
                    {systemDesign?.roof?.sunshineHoursPerYear?.toLocaleString() ||
                      "1,800"}
                    /year
                  </span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Panel Warranty</span>
                  <span className="spec-value">25 Years</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Performance Guarantee</span>
                  <span className="spec-value">90% at Year 25</span>
                </div>
              </div>
            </div>
          </div>
          {/* 25-Year Comparison */}
          <div className="comparison-section">
            <div className="section-card">
              <div className="section-header">
                <DollarSign size={20} color="#00FFD4" />
                <h3 className="section-title">25-Year Cost Comparison</h3>
              </div>
              <div className="comparison-summary">
                <div className="summary-item">
                  <div className="summary-value negative">
                    $
                    {comparisonData[
                      YEARS - 1
                    ]?.utilityCumulative.toLocaleString()}
                  </div>
                  <div className="summary-label">Utility Cost (25 yrs)</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value" style={{ color: "#fbbf24" }}>
                    $
                    {comparisonData[
                      YEARS - 1
                    ]?.solarCumulative.toLocaleString()}
                  </div>
                  <div className="summary-label">Solar Cost (25 yrs)</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value">
                    ${totalSavings.toLocaleString()}
                  </div>
                  <div className="summary-label">Total Savings</div>
                </div>
              </div>
              <div className="comparison-note">
                <p>
                  <strong>Your {offsetPercent}% offset</strong> means solar
                  covers {annualProduction.toLocaleString()} kWh of your{" "}
                  {annualUsageKwh.toLocaleString()} kWh annual usage. You pay
                  the locked-in solar rate ($0.12/kWh + 2.9%/yr) for solar
                  production, and utility rates (
                  {(utilityRate * 100).toFixed(1)}¢/kWh + 3.5%/yr) for the
                  remaining{" "}
                  {(annualUsageKwh - annualProduction).toLocaleString()} kWh.
                </p>
              </div>
              <div className="comparison-table-wrap">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Without Solar</th>
                      <th>With Solar</th>
                      <th>Annual Savings</th>
                      <th>Cumulative Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row) => (
                      <tr key={row.year}>
                        <td>{row.year}</td>
                        <td className="utility">
                          ${row.utilityAnnual.toLocaleString()}
                        </td>
                        <td className="solar">
                          ${row.solarAnnual.toLocaleString()}
                        </td>
                        <td
                          className={
                            row.utilityAnnual - row.solarAnnual > 0
                              ? "savings"
                              : "negative"
                          }
                        >
                          {row.utilityAnnual - row.solarAnnual > 0 ? "+" : ""}$
                          {(
                            row.utilityAnnual - row.solarAnnual
                          ).toLocaleString()}
                        </td>
                        <td
                          className={row.savings > 0 ? "savings" : "negative"}
                        >
                          {row.savings > 0 ? "+" : ""}$
                          {row.savings.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Compare Installers CTA */}
          <div className="compare-installers-cta">
            <div className="compare-cta-content">
              <div className="compare-cta-badge">
                <Users size={14} />
                Next Step
              </div>
              <h2 className="compare-cta-title">
                Ready to Choose Your{" "}
                <span className="gradient-text">Installer</span>?
              </h2>
              <p className="compare-cta-desc">
                Compare top-rated solar installers side-by-side. See pricing,
                warranties, customer reviews, and installation timelines for
                your {currentSystemKw.toFixed(1)} kW system.
              </p>
              <Link to="/installers" className="compare-cta-button">
                <Users size={20} />
                Compare Installers
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>

          {/* Why Solar + Battery Section */}
          <div className="why-section">
            <h2 className="why-title">
              Why Solar + Battery is Essential for Texas Homes
            </h2>
            <div className="why-grid">
              {/* Backup Card - Emphasized */}
              <div className="why-card featured">
                <div className="why-card-header">
                  <div className="why-icon featured">
                    <Shield size={28} />
                  </div>
                  <h4>Power Outage Protection</h4>
                </div>
                <p className="why-desc">
                  Texas has the most power outages of any state. With 60 kWh of
                  Duracell battery storage, your home stays powered when the
                  grid fails. AC, refrigerator, medical equipment - everything
                  keeps running.
                </p>
                <ul className="why-benefits">
                  <li>
                    <CheckCircle size={14} /> 24+ hours of whole-home backup
                  </li>
                  <li>
                    <CheckCircle size={14} /> Automatic switchover in
                    milliseconds
                  </li>
                  <li>
                    <CheckCircle size={14} /> Solar recharge extends backup
                    indefinitely
                  </li>
                </ul>
              </div>

              {/* Financial Card */}
              <div className="why-card">
                <div className="why-card-header">
                  <div className="why-icon">
                    <DollarSign size={24} />
                  </div>
                  <h4>Financial Protection</h4>
                </div>
                <p className="why-desc">
                  Lock in $0.12/kWh while utility rates climb 3-5% annually.
                  Save ${totalSavings.toLocaleString()} over 25 years.
                </p>
                <ul className="why-benefits">
                  <li>
                    <CheckCircle size={14} /> Fixed rate for 25 years
                  </li>
                  <li>
                    <CheckCircle size={14} /> ${monthlySavings}/month savings
                    (Year 1)
                  </li>
                  <li>
                    <CheckCircle size={14} /> Earn from VPP programs
                  </li>
                </ul>
              </div>

              {/* Independence Card */}
              <div className="why-card">
                <div className="why-card-header">
                  <div className="why-icon">
                    <Power size={24} />
                  </div>
                  <h4>Energy Independence</h4>
                </div>
                <p className="why-desc">
                  Generate and store your own electricity. Never rely on ERCOT
                  or worry about rolling blackouts again.
                </p>
                <ul className="why-benefits">
                  <li>
                    <CheckCircle size={14} /> Self-sufficient power generation
                  </li>
                  <li>
                    <CheckCircle size={14} /> Grid-agnostic operation
                  </li>
                  <li>
                    <CheckCircle size={14} /> Peak shaving during emergencies
                  </li>
                </ul>
              </div>

              {/* Environmental Card */}
              <div className="why-card">
                <div className="why-card-header">
                  <div className="why-icon">
                    <Leaf size={24} />
                  </div>
                  <h4>Clean Energy</h4>
                </div>
                <p className="why-desc">
                  Power your home with 100% clean solar energy. Reduce your
                  carbon footprint while saving money.
                </p>
                <ul className="why-benefits">
                  <li>
                    <CheckCircle size={14} /> Zero emissions electricity
                  </li>
                  <li>
                    <CheckCircle size={14} /> Reduced grid dependence
                  </li>
                  <li>
                    <CheckCircle size={14} /> Sustainable future
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account Creation */}
          <div className="account-section">
            {accountCreated ? (
              <div className="account-success">
                <CheckCircle size={22} />
                <span>Account created! You can now track your project.</span>
              </div>
            ) : (
              <>
                <h2 className="account-title">
                  <Lock size={18} />
                  Create Your Account
                </h2>
                <p className="account-subtitle">
                  Save your design and track your installation progress
                </p>
                <div className="account-form">
                  <div className="account-input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="account-input"
                      placeholder="Create password (min 8 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="account-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="account-input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="account-input"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <button
                    className="account-btn"
                    onClick={handleCreateAccount}
                    disabled={isCreating || !password || !confirmPassword}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={18} className="spinner" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                  {error && <div className="account-error">{error}</div>}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="footer-row">
            {projectId && (
              <p className="ref-id">
                Reference: <code>{projectId}</code>
              </p>
            )}
            <div className="action-buttons">
              <Link to="/" className="action-btn secondary">
                Back to Home
              </Link>
              {projectId && (
                <Link
                  to={`/project/${projectId}`}
                  className="action-btn primary"
                >
                  Track Project
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
