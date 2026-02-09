import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sun,
  ArrowRight,
  ChevronRight,
  Search,
  TrendingUp,
  DollarSign,
  Zap,
  MapPin,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";
import { db } from "../services/firebase";
import { collection, getDocs } from "firebase/firestore";

const ABBREV_TO_SLUG = {
  AL: "alabama",
  AK: "alaska",
  AZ: "arizona",
  AR: "arkansas",
  CA: "california",
  CO: "colorado",
  CT: "connecticut",
  DE: "delaware",
  FL: "florida",
  GA: "georgia",
  HI: "hawaii",
  ID: "idaho",
  IL: "illinois",
  IN: "indiana",
  IA: "iowa",
  KS: "kansas",
  KY: "kentucky",
  LA: "louisiana",
  ME: "maine",
  MD: "maryland",
  MA: "massachusetts",
  MI: "michigan",
  MN: "minnesota",
  MS: "mississippi",
  MO: "missouri",
  MT: "montana",
  NE: "nebraska",
  NV: "nevada",
  NH: "new-hampshire",
  NJ: "new-jersey",
  NM: "new-mexico",
  NY: "new-york",
  NC: "north-carolina",
  ND: "north-dakota",
  OH: "ohio",
  OK: "oklahoma",
  OR: "oregon",
  PA: "pennsylvania",
  RI: "rhode-island",
  SC: "south-carolina",
  SD: "south-dakota",
  TN: "tennessee",
  TX: "texas",
  UT: "utah",
  VT: "vermont",
  VA: "virginia",
  WA: "washington",
  WV: "west-virginia",
  WI: "wisconsin",
  WY: "wyoming",
};

function formatCurrency(val) {
  if (val == null) return "N/A";
  return (
    "$" +
    Number(val).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function SkeletonGrid() {
  return (
    <div className="si-states-grid">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="si-state-card si-skeleton-card">
          <div className="si-skeleton-line wide" />
          <div className="si-skeleton-line medium" />
          <div className="si-skeleton-line narrow" />
        </div>
      ))}
    </div>
  );
}

export default function SolarStatesIndex() {
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    const fetchStates = async () => {
      setLoading(true);
      try {
        const statesSnap = await getDocs(collection(db, "nrel_state_profiles"));
        const statesData = statesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => ABBREV_TO_SLUG[s.id]); // Only include valid US states
        setStates(statesData);
      } catch (err) {
        console.error("Error fetching states:", err);
      }
      setLoading(false);
    };

    fetchStates();
  }, []);

  // Compute rankings
  const rankedStates = [...states]
    .sort(
      (a, b) =>
        (b.production?.annual_kwh || 0) - (a.production?.annual_kwh || 0),
    )
    .map((s, i) => ({ ...s, productionRank: i + 1 }));

  // Search filter
  const filtered = rankedStates.filter((s) => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      (s.name || "").toLowerCase().includes(term) ||
      (s.id || "").toLowerCase().includes(term)
    );
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let aVal, bVal;
    switch (sortBy) {
      case "production":
        aVal = a.production?.annual_kwh || 0;
        bVal = b.production?.annual_kwh || 0;
        break;
      case "savings":
        aVal = a.economics?.annual_savings_est || 0;
        bVal = b.economics?.annual_savings_est || 0;
        break;
      case "rate":
        aVal = a.utility_rates?.residential_rate || 0;
        bVal = b.utility_rates?.residential_rate || 0;
        break;
      case "name":
      default:
        aVal = a.name || "";
        bVal = b.name || "";
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  return (
    <div className="si-page">
      <style>{getStyles()}</style>

      {/* HEADER */}
      <header className="si-header">
        <div className="container">
          <Link to="/" className="si-logo">
            <div className="si-logo-icon">
              <Sun size={20} />
            </div>
            SolarOS
          </Link>
          <nav className="si-nav">
            <Link to="/features" className="si-nav-link">
              Features
            </Link>
            <Link to="/pricing" className="si-nav-link">
              Pricing
            </Link>
            <Link to="/about" className="si-nav-link">
              About
            </Link>
            <Link to="/login" className="si-nav-link">
              Sign In
            </Link>
            <Link to="/get-started" className="si-nav-cta">
              Get Started <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="si-hero">
        <div className="si-hero-bg" />
        <div className="si-hero-content">
          <div className="si-hero-label">
            <MapPin size={14} />
            50-State Solar Data
          </div>
          <h1 className="si-hero-title">
            Solar Energy by <span className="highlight">State</span>
          </h1>
          <p className="si-hero-desc">
            Explore solar production, savings, utility rates, and permitting
            information for all 50 US states. Data sourced from NREL.
          </p>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="si-controls-section">
        <div className="si-container">
          <div className="si-controls">
            <div className="si-search-wrap">
              <Search size={18} />
              <input
                type="text"
                className="si-search-input"
                placeholder="Search states..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="si-sort-buttons">
              <button
                className={`si-sort-btn ${sortBy === "name" ? "active" : ""}`}
                onClick={() => handleSort("name")}
              >
                <ArrowUpDown size={14} /> Name
              </button>
              <button
                className={`si-sort-btn ${sortBy === "production" ? "active" : ""}`}
                onClick={() => handleSort("production")}
              >
                <TrendingUp size={14} /> Production
              </button>
              <button
                className={`si-sort-btn ${sortBy === "savings" ? "active" : ""}`}
                onClick={() => handleSort("savings")}
              >
                <DollarSign size={14} /> Savings
              </button>
              <button
                className={`si-sort-btn ${sortBy === "rate" ? "active" : ""}`}
                onClick={() => handleSort("rate")}
              >
                <Zap size={14} /> Utility Rate
              </button>
            </div>
          </div>
          <div className="si-result-count">
            {loading
              ? "Loading..."
              : `${sorted.length} state${sorted.length !== 1 ? "s" : ""}`}
          </div>
        </div>
      </section>

      {/* STATES GRID */}
      <section className="si-states-section">
        <div className="si-container">
          {loading ? (
            <SkeletonGrid />
          ) : sorted.length === 0 ? (
            <div className="si-no-results">
              <p>No states match "{searchTerm}"</p>
            </div>
          ) : (
            <div className="si-states-grid">
              {sorted.map((state) => {
                const slug = ABBREV_TO_SLUG[state.id];
                if (!slug) return null;
                const annualKwh = state.production?.annual_kwh;
                const savings = state.economics?.annual_savings_est;
                const rate = state.utility_rates?.residential_rate;
                const rank = state.productionRank;

                return (
                  <Link
                    key={state.id}
                    to={`/solar/${slug}`}
                    className="si-state-card"
                  >
                    <div className="si-card-top">
                      <div className="si-state-abbr">{state.id}</div>
                      {rank && rank <= 10 && (
                        <div className="si-rank-badge">#{rank}</div>
                      )}
                    </div>
                    <h3 className="si-state-name">{state.name}</h3>
                    <div className="si-state-stats">
                      <div className="si-stat-row">
                        <span className="si-stat-label">
                          <TrendingUp size={13} /> Annual Production
                        </span>
                        <span className="si-stat-value">
                          {annualKwh
                            ? Number(annualKwh).toLocaleString() + " kWh"
                            : "N/A"}
                        </span>
                      </div>
                      <div className="si-stat-row">
                        <span className="si-stat-label">
                          <DollarSign size={13} /> Annual Savings
                        </span>
                        <span className="si-stat-value">
                          {formatCurrency(savings)}
                        </span>
                      </div>
                      <div className="si-stat-row">
                        <span className="si-stat-label">
                          <Zap size={13} /> Utility Rate
                        </span>
                        <span className="si-stat-value">
                          {rate != null
                            ? (rate * 100).toFixed(1) + "\u00a2/kWh"
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="si-card-cta">
                      View Details <ChevronRight size={14} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="si-cta">
        <div className="si-cta-bg" />
        <div className="si-cta-content">
          <div
            className="si-section-label"
            style={{ justifyContent: "center" }}
          >
            <Zap size={14} />
            Ready to go solar?
          </div>
          <h2 className="si-cta-title">Get a personalized solar estimate</h2>
          <p className="si-cta-desc">
            Enter your address and utility information to see exactly how much
            you could save with solar.
          </p>
          <Link to="/get-started" className="si-btn-primary">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="si-footer">
        <div className="container">
          <div className="si-footer-links">
            <Link to="/">Home</Link>
            <Link to="/solar">Solar by State</Link>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <p className="si-footer-copy">
            &copy; 2026 SolarOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function getStyles() {
  return `
    .si-page {
      background: #0a0a0f;
      min-height: 100vh;
      color: #ffffff;
      overflow-x: hidden;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    /* HEADER */
    .si-header {
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 100;
      padding: 16px 0;
      background: rgba(10, 10, 15, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .si-header .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .si-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 1.25rem;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.02em;
    }

    .si-logo-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
    }

    .si-nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .si-nav-link {
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.3s;
      padding: 8px 16px;
      border-radius: 8px;
    }

    .si-nav-link:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }

    .si-nav-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
      border-radius: 10px;
      text-decoration: none;
      transition: all 0.3s;
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
    }

    .si-nav-cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
    }

    /* HERO */
    .si-hero {
      padding: 160px 40px 80px;
      text-align: center;
      position: relative;
    }

    .si-hero-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
    }

    .si-hero-content {
      max-width: 800px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .si-hero-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 100px;
      font-size: 0.85rem;
      color: #34d399;
      font-weight: 500;
      margin-bottom: 32px;
    }

    .si-hero-title {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 24px;
      letter-spacing: -0.03em;
    }

    .si-hero-title .highlight {
      background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .si-hero-desc {
      font-size: 1.2rem;
      color: rgba(255,255,255,0.55);
      line-height: 1.8;
      max-width: 640px;
      margin: 0 auto;
    }

    /* CONTROLS */
    .si-controls-section {
      padding: 0 0 40px;
      position: relative;
      z-index: 1;
    }

    .si-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 40px;
    }

    .si-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }

    .si-search-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 20px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      flex: 1;
      max-width: 400px;
      transition: border-color 0.3s;
    }

    .si-search-wrap:focus-within {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .si-search-wrap svg {
      color: rgba(255,255,255,0.35);
      flex-shrink: 0;
    }

    .si-search-input {
      background: none;
      border: none;
      outline: none;
      color: #fff;
      font-size: 0.95rem;
      font-family: inherit;
      width: 100%;
    }

    .si-search-input::placeholder {
      color: rgba(255,255,255,0.3);
    }

    .si-sort-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .si-sort-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.5);
      font-size: 0.85rem;
      font-weight: 600;
      font-family: inherit;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .si-sort-btn:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.8);
    }

    .si-sort-btn.active {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.3);
      color: #10b981;
    }

    .si-result-count {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.35);
      margin-top: 16px;
      font-weight: 500;
    }

    .si-section-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #10b981;
      margin-bottom: 16px;
    }

    /* STATES GRID */
    .si-states-section {
      padding: 0 0 100px;
    }

    .si-states-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .si-state-card {
      background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 28px;
      text-decoration: none;
      color: #fff;
      transition: all 0.4s ease;
      display: flex;
      flex-direction: column;
    }

    .si-state-card:hover {
      transform: translateY(-4px);
      border-color: rgba(16, 185, 129, 0.25);
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 40px rgba(16, 185, 129, 0.05);
    }

    .si-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .si-state-abbr {
      font-size: 0.8rem;
      font-weight: 700;
      color: #10b981;
      padding: 4px 10px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 6px;
    }

    .si-rank-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #fbbf24;
      padding: 3px 10px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.2);
      border-radius: 100px;
    }

    .si-state-name {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 16px;
      letter-spacing: -0.01em;
    }

    .si-state-stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }

    .si-stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .si-stat-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }

    .si-stat-label svg {
      color: rgba(255,255,255,0.25);
    }

    .si-stat-value {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255,255,255,0.8);
    }

    .si-card-cta {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 0.85rem;
      font-weight: 600;
      color: #10b981;
      transition: gap 0.2s;
    }

    .si-state-card:hover .si-card-cta {
      gap: 8px;
    }

    /* NO RESULTS */
    .si-no-results {
      text-align: center;
      padding: 80px 20px;
      color: rgba(255,255,255,0.4);
      font-size: 1.1rem;
    }

    /* SKELETON */
    .si-skeleton-card {
      pointer-events: none;
    }

    .si-skeleton-line {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: si-shimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
      height: 14px;
      margin-bottom: 10px;
    }

    .si-skeleton-line.wide { width: 70%; }
    .si-skeleton-line.medium { width: 50%; }
    .si-skeleton-line.narrow { width: 35%; }

    @keyframes si-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* CTA */
    .si-cta {
      padding: 120px 0;
      text-align: center;
      position: relative;
      background: #0f1419;
    }

    .si-cta-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
    }

    .si-cta-content {
      position: relative;
      z-index: 1;
    }

    .si-cta-title {
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 800;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .si-cta-desc {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.5);
      margin-bottom: 40px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .si-btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-weight: 700;
      font-size: 1rem;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.3s;
      box-shadow: 0 0 40px rgba(16, 185, 129, 0.3);
    }

    .si-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
    }

    /* FOOTER */
    .si-footer {
      padding: 40px 0;
      background: #050508;
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .si-footer .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .si-footer-links {
      display: flex;
      gap: 32px;
    }

    .si-footer-links a {
      color: rgba(255,255,255,0.4);
      text-decoration: none;
      font-size: 0.85rem;
      transition: color 0.2s;
    }

    .si-footer-links a:hover {
      color: #10b981;
    }

    .si-footer-copy {
      color: rgba(255,255,255,0.25);
      font-size: 0.8rem;
    }

    /* RESPONSIVE */
    @media (max-width: 1024px) {
      .si-states-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .si-nav-link:not(.si-nav-cta) {
        display: none;
      }

      .si-hero {
        padding: 120px 20px 60px;
      }

      .si-container {
        padding: 0 20px;
      }

      .si-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .si-search-wrap {
        max-width: none;
      }

      .si-sort-buttons {
        justify-content: center;
      }

      .si-states-grid {
        grid-template-columns: 1fr;
      }

      .si-footer .container {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }
    }
  `;
}
