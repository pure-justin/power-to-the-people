import { useState, useCallback } from "react";
import {
  Sun,
  Zap,
  DollarSign,
  TrendingUp,
  Battery,
  Leaf,
  TreePine,
  Car,
  ArrowRight,
  Loader2,
  RotateCcw,
  Home,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AddressAutocomplete from "./AddressAutocomplete";
import {
  getBuildingInsights,
  calculateSystemDesign,
  calculateSavings,
} from "../services/solarApi";
import {
  calculateROIProjection,
  quickEstimate,
} from "../services/roiProjection";
import "./SolarSavingsCalculator.css";

// Average utility rates by state ($/kWh)
const STATE_UTILITY_RATES = {
  TX: 0.14,
  CA: 0.3,
  NY: 0.22,
  FL: 0.14,
  AZ: 0.13,
  NV: 0.13,
  CO: 0.14,
  NJ: 0.18,
  MA: 0.28,
  CT: 0.26,
  NH: 0.23,
  RI: 0.24,
  HI: 0.43,
  AK: 0.25,
  GA: 0.13,
  NC: 0.12,
  SC: 0.13,
  VA: 0.13,
  MD: 0.16,
  PA: 0.17,
  OH: 0.14,
  MI: 0.18,
  IL: 0.15,
  WI: 0.16,
  MN: 0.15,
  IA: 0.14,
  MO: 0.12,
  OR: 0.12,
  WA: 0.11,
  UT: 0.11,
  NM: 0.14,
  LA: 0.12,
  AL: 0.14,
  MS: 0.12,
  TN: 0.12,
  KY: 0.12,
  IN: 0.15,
  OK: 0.12,
  KS: 0.14,
  AR: 0.12,
  NE: 0.12,
  SD: 0.13,
  ND: 0.12,
  MT: 0.12,
  WY: 0.11,
  ID: 0.1,
  ME: 0.2,
  VT: 0.2,
  WV: 0.12,
  DE: 0.14,
  DC: 0.15,
};

const DEFAULT_RATE = 0.15;

function SolarSavingsCalculator() {
  const [step, setStep] = useState(1); // 1=address, 2=usage, 3=results
  const [address, setAddress] = useState(null);
  const [monthlyBill, setMonthlyBill] = useState(200);
  const [annualUsage, setAnnualUsage] = useState(null);
  const [utilityRate, setUtilityRate] = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleAddressSelect = useCallback((addressData) => {
    if (!addressData) {
      setAddress(null);
      return;
    }
    setAddress(addressData);
    // Set utility rate based on state
    const rate = STATE_UTILITY_RATES[addressData.state] || DEFAULT_RATE;
    setUtilityRate(rate);
    setError(null);
  }, []);

  const handleContinueToUsage = () => {
    if (!address || !address.lat || !address.lng) {
      setError("Please select an address with a valid location.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleCalculate = async () => {
    if (!address?.lat || !address?.lng) {
      setError("Invalid address. Please go back and re-enter.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate annual usage from monthly bill
      const calculatedAnnualUsage =
        annualUsage || Math.round((monthlyBill / utilityRate) * 12);

      // Fetch real solar data from Google Solar API
      const buildingInsights = await getBuildingInsights(
        address.lat,
        address.lng,
      );
      const systemDesign = calculateSystemDesign(
        buildingInsights,
        calculatedAnnualUsage,
      );
      const savings = calculateSavings(
        systemDesign.production.monthlyKwh,
        utilityRate,
      );

      // Run full ROI projection
      const roi = calculateROIProjection({
        annualUsageKwh: calculatedAnnualUsage,
        systemSizeKw: systemDesign.panels.systemSizeKw,
        panelCount: systemDesign.panels.count,
        utilityRate: utilityRate,
      });

      setResults({
        address,
        systemDesign,
        savings,
        roi,
        annualUsage: calculatedAnnualUsage,
        monthlyBill,
        utilityRate,
      });

      setStep(3);
    } catch (err) {
      console.error("Solar calculation error:", err);
      // Fallback to estimate if Solar API fails
      try {
        const roi = quickEstimate(monthlyBill, utilityRate);
        const calculatedAnnualUsage = Math.round(
          (monthlyBill / utilityRate) * 12,
        );

        setResults({
          address,
          systemDesign: {
            panels: {
              count: roi.system.panelCount,
              wattage: roi.system.panelWattage,
              systemSizeKw: roi.system.sizeKw,
            },
            production: {
              annualKwh: roi.yearlyData[0].production,
              monthlyKwh: Math.round(roi.yearlyData[0].production / 12),
            },
            usage: {
              annualKwh: calculatedAnnualUsage,
              actualOffset: roi.system.offsetPercent,
            },
            batteries: {
              brand: "Duracell PowerCenter Hybrid",
              totalCapacityKwh: 60,
            },
            environmental: {
              carbonOffsetTonsPerYear: roi.environmental.co2OffsetTons / 25,
              treesEquivalent: Math.round(
                roi.environmental.treesEquivalent / 25,
              ),
            },
          },
          savings: {
            monthly: roi.metrics.monthlySavingsLease,
            annual: roi.metrics.year1SavingsLease,
            lifetime25Year: roi.metrics.totalSavingsLease,
          },
          roi,
          annualUsage: calculatedAnnualUsage,
          monthlyBill,
          utilityRate,
          isEstimate: true,
        });
        setStep(3);
      } catch (fallbackErr) {
        setError(
          err.message ||
            "Unable to calculate solar savings. Please try a different address.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setAddress(null);
    setMonthlyBill(200);
    setAnnualUsage(null);
    setUtilityRate(DEFAULT_RATE);
    setResults(null);
    setError(null);
    setShowDetails(false);
  };

  const formatCurrency = (val) => {
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(1)}k`.replace(".0k", "k");
    }
    return `$${Math.round(val).toLocaleString()}`;
  };

  const formatLargeCurrency = (val) => `$${Math.round(val).toLocaleString()}`;

  // ========== STEP 1: Address ==========
  if (step === 1) {
    return (
      <div className="solar-calc">
        <div className="solar-calc-header">
          <div className="solar-calc-icon">
            <Sun size={32} />
          </div>
          <h2>Solar Savings Calculator</h2>
          <p>See how much you could save with solar + battery storage</p>
        </div>

        <div className="solar-calc-steps">
          <div className="step-indicator active">
            <span className="step-num">1</span>
            <span className="step-label">Address</span>
          </div>
          <div className="step-line" />
          <div className="step-indicator">
            <span className="step-num">2</span>
            <span className="step-label">Usage</span>
          </div>
          <div className="step-line" />
          <div className="step-indicator">
            <span className="step-num">3</span>
            <span className="step-label">Results</span>
          </div>
        </div>

        <div className="solar-calc-body">
          <label className="calc-label">
            <Home size={18} />
            Your Home Address
          </label>
          <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            placeholder="Enter your home address"
          />

          {error && <div className="calc-error">{error}</div>}

          <button
            className="calc-btn-primary"
            onClick={handleContinueToUsage}
            disabled={!address}
          >
            Continue
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ========== STEP 2: Usage ==========
  if (step === 2) {
    return (
      <div className="solar-calc">
        <div className="solar-calc-header">
          <div className="solar-calc-icon">
            <Zap size={32} />
          </div>
          <h2>Your Energy Usage</h2>
          <p>{address?.formattedAddress}</p>
        </div>

        <div className="solar-calc-steps">
          <div className="step-indicator completed">
            <span className="step-num">&#10003;</span>
            <span className="step-label">Address</span>
          </div>
          <div className="step-line completed" />
          <div className="step-indicator active">
            <span className="step-num">2</span>
            <span className="step-label">Usage</span>
          </div>
          <div className="step-line" />
          <div className="step-indicator">
            <span className="step-num">3</span>
            <span className="step-label">Results</span>
          </div>
        </div>

        <div className="solar-calc-body">
          <div className="usage-input-group">
            <label className="calc-label">
              <DollarSign size={18} />
              Average Monthly Electric Bill
            </label>
            <div className="bill-input-wrapper">
              <span className="bill-prefix">$</span>
              <input
                type="number"
                className="bill-input"
                value={monthlyBill}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setMonthlyBill(val);
                  setAnnualUsage(null);
                }}
                min={50}
                max={2000}
                step={10}
              />
              <span className="bill-suffix">/month</span>
            </div>

            <div className="bill-slider-wrapper">
              <input
                type="range"
                className="bill-slider"
                value={monthlyBill}
                onChange={(e) => {
                  setMonthlyBill(parseInt(e.target.value));
                  setAnnualUsage(null);
                }}
                min={50}
                max={800}
                step={10}
              />
              <div className="slider-labels">
                <span>$50</span>
                <span>$800</span>
              </div>
            </div>

            <div className="usage-estimate">
              <Zap size={14} />
              Estimated usage:{" "}
              {Math.round(
                (monthlyBill / utilityRate) * 12,
              ).toLocaleString()}{" "}
              kWh/year
              {address?.state && (
                <span className="rate-badge">
                  {address.state} avg: ${utilityRate.toFixed(2)}/kWh
                </span>
              )}
            </div>
          </div>

          {error && <div className="calc-error">{error}</div>}

          <div className="calc-btn-row">
            <button className="calc-btn-secondary" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="calc-btn-primary"
              onClick={handleCalculate}
              disabled={loading || monthlyBill < 50}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Analyzing Your Roof...
                </>
              ) : (
                <>
                  Calculate Savings
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== STEP 3: Results ==========
  if (step === 3 && results) {
    const { systemDesign, savings, roi } = results;

    return (
      <div className="solar-calc solar-calc-results">
        <div className="solar-calc-header results-header">
          <div className="solar-calc-icon success">
            <Sun size={32} />
          </div>
          <h2>Your Solar Savings</h2>
          <p className="results-address">{address?.formattedAddress}</p>
          {results.isEstimate && (
            <span className="estimate-badge">
              Estimate (roof data unavailable)
            </span>
          )}
        </div>

        {/* Hero Savings */}
        <div className="savings-hero">
          <div className="savings-hero-amount">
            <span className="savings-label">Estimated Monthly Savings</span>
            <span className="savings-value">
              {formatLargeCurrency(Math.abs(savings.monthly))}
            </span>
            <span className="savings-sublabel">
              per month with solar + battery
            </span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">
              <TrendingUp size={22} />
            </div>
            <div className="metric-value">
              {formatLargeCurrency(Math.abs(savings.annual))}
            </div>
            <div className="metric-label">Annual Savings</div>
          </div>

          <div className="metric-card highlight">
            <div className="metric-icon">
              <DollarSign size={22} />
            </div>
            <div className="metric-value">
              {formatLargeCurrency(Math.abs(savings.lifetime25Year))}
            </div>
            <div className="metric-label">25-Year Savings</div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <Sun size={22} />
            </div>
            <div className="metric-value">
              {systemDesign.panels.count} panels
            </div>
            <div className="metric-label">
              {systemDesign.panels.systemSizeKw.toFixed(1)} kW System
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">
              <Battery size={22} />
            </div>
            <div className="metric-value">
              {systemDesign.batteries.totalCapacityKwh} kWh
            </div>
            <div className="metric-label">Battery Storage</div>
          </div>
        </div>

        {/* Production vs Usage */}
        <div className="production-section">
          <h3>Energy Production vs Usage</h3>
          <div className="production-bars">
            <div className="bar-item">
              <div className="bar-label">
                <span>Your Usage</span>
                <span>
                  {(
                    systemDesign.usage?.annualKwh || results.annualUsage
                  ).toLocaleString()}{" "}
                  kWh/yr
                </span>
              </div>
              <div className="bar-track">
                <div className="bar-fill usage" style={{ width: "100%" }} />
              </div>
            </div>
            <div className="bar-item">
              <div className="bar-label">
                <span>Solar Production</span>
                <span>
                  {systemDesign.production.annualKwh.toLocaleString()} kWh/yr
                </span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill production"
                  style={{
                    width: `${Math.min((systemDesign.production.annualKwh / (systemDesign.usage?.annualKwh || results.annualUsage)) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="offset-badge">
            <Zap size={16} />
            {systemDesign.usage?.actualOffset ||
              Math.round(
                (systemDesign.production.annualKwh / results.annualUsage) * 100,
              )}
            % Energy Offset
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="env-section">
          <h3>
            <Leaf size={20} />
            Environmental Impact (Annual)
          </h3>
          <div className="env-grid">
            <div className="env-item">
              <Leaf size={28} className="env-icon" />
              <div className="env-value">
                {(
                  systemDesign.environmental?.carbonOffsetTonsPerYear ||
                  roi.environmental.co2OffsetTons / 25
                ).toFixed(1)}
              </div>
              <div className="env-label">Tons CO2 Offset</div>
            </div>
            <div className="env-item">
              <TreePine size={28} className="env-icon" />
              <div className="env-value">
                {systemDesign.environmental?.treesEquivalent ||
                  Math.round(roi.environmental.treesEquivalent / 25)}
              </div>
              <div className="env-label">Trees Equivalent</div>
            </div>
            <div className="env-item">
              <Car size={28} className="env-icon" />
              <div className="env-value">
                {roi.environmental.carsRemoved || 0}
              </div>
              <div className="env-label">Cars Off Road (25yr)</div>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <button
          className="details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {showDetails ? "Hide" : "Show"} Detailed Breakdown
        </button>

        {showDetails && (
          <div className="details-section">
            <h3>25-Year Cost Comparison</h3>
            <div className="comparison-table">
              <div className="comparison-row header">
                <span>Scenario</span>
                <span>25-Year Cost</span>
                <span>vs Utility</span>
              </div>
              <div className="comparison-row">
                <span>
                  <Zap size={14} /> Utility Only
                </span>
                <span className="cost-negative">
                  {formatLargeCurrency(roi.metrics.lifetimeUtilityCost)}
                </span>
                <span>--</span>
              </div>
              <div className="comparison-row highlight">
                <span>
                  <Sun size={14} /> Solar Lease/PPA
                </span>
                <span>
                  {formatLargeCurrency(roi.metrics.lifetimeLeaseCost)}
                </span>
                <span className="cost-positive">
                  Save{" "}
                  {formatLargeCurrency(Math.abs(roi.metrics.totalSavingsLease))}
                </span>
              </div>
              <div className="comparison-row">
                <span>
                  <DollarSign size={14} /> Solar Purchase
                </span>
                <span>
                  {formatLargeCurrency(roi.metrics.lifetimePurchaseCost)}
                </span>
                <span className="cost-positive">
                  Save{" "}
                  {formatLargeCurrency(
                    Math.abs(roi.metrics.totalSavingsPurchase),
                  )}
                </span>
              </div>
            </div>

            <div className="detail-stats">
              <div className="detail-stat">
                <span className="detail-stat-label">Current Utility Rate</span>
                <span className="detail-stat-value">
                  ${results.utilityRate.toFixed(2)}/kWh
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-label">
                  Projected Rate (Year 25)
                </span>
                <span className="detail-stat-value">
                  ${roi.metrics.utilityRateYear25.toFixed(2)}/kWh
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-label">System Size</span>
                <span className="detail-stat-value">
                  {systemDesign.panels.systemSizeKw.toFixed(1)} kW
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-label">Panel Count</span>
                <span className="detail-stat-value">
                  {systemDesign.panels.count} panels
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-label">Year 1 Production</span>
                <span className="detail-stat-value">
                  {systemDesign.production.annualKwh.toLocaleString()} kWh
                </span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-label">
                  Payback Period (Lease)
                </span>
                <span className="detail-stat-value">
                  Year {roi.metrics.leasePaybackYear}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="results-cta">
          <a href="/qualify" className="calc-btn-primary cta-btn">
            Get Your Free Quote
            <ArrowRight size={18} />
          </a>
          <button className="calc-btn-secondary" onClick={handleReset}>
            <RotateCcw size={16} />
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default SolarSavingsCalculator;
