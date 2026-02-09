import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Sun,
  ArrowRight,
  ChevronRight,
  Zap,
  DollarSign,
  TrendingUp,
  MapPin,
  FileCheck,
  Shield,
  Globe,
  BarChart3,
  Clock,
  CheckCircle2,
  Activity,
  Award,
  Building2,
  Bolt,
  ArrowLeft,
} from "lucide-react";
import { db } from "../services/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";

const STATE_SLUGS = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new-hampshire": "NH",
  "new-jersey": "NJ",
  "new-mexico": "NM",
  "new-york": "NY",
  "north-carolina": "NC",
  "north-dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode-island": "RI",
  "south-carolina": "SC",
  "south-dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west-virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

// Reverse mapping: abbreviation -> slug
const ABBREV_TO_SLUG = Object.fromEntries(
  Object.entries(STATE_SLUGS).map(([slug, abbr]) => [abbr, slug]),
);

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

function formatRate(val) {
  if (val == null) return "N/A";
  return "$" + (val * 100).toFixed(1) + "\u00a2/kWh";
}

function formatNumber(val, decimals = 0) {
  if (val == null) return "N/A";
  return Number(val).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function SkeletonCard() {
  return (
    <div className="ss-skeleton-card">
      <div className="ss-skeleton-line wide" />
      <div className="ss-skeleton-line medium" />
      <div className="ss-skeleton-line narrow" />
    </div>
  );
}

export default function SolarState() {
  const { stateSlug } = useParams();
  const [stateData, setStateData] = useState(null);
  const [permits, setPermits] = useState([]);
  const [incentives, setIncentives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  const stateAbbr = STATE_SLUGS[stateSlug];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.id]));
          }
        });
      },
      { threshold: 0.1 },
    );

    const refs = Object.values(sectionRefs.current);
    refs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [loading]);

  const setSectionRef = (id) => (el) => {
    sectionRefs.current[id] = el;
  };

  const isVisible = (id) => visibleSections.has(id);

  useEffect(() => {
    if (!stateAbbr) {
      setError("State not found");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch state profile from Firestore
        const stateRef = doc(db, "nrel_state_profiles", stateAbbr);
        const stateSnap = await getDoc(stateRef);

        if (!stateSnap.exists()) {
          setError("State data not available yet");
          setLoading(false);
          return;
        }

        setStateData({ id: stateSnap.id, ...stateSnap.data() });

        // Fetch permits filtered by state
        try {
          const permitsQuery = query(
            collection(db, "solar_permits"),
            where("state", "==", stateAbbr),
          );
          const permitsSnap = await getDocs(permitsQuery);
          const permitsData = permitsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setPermits(permitsData);
        } catch (e) {
          console.warn("Could not fetch permits:", e);
        }

        // Fetch incentives filtered by state
        try {
          const incentivesQuery = query(
            collection(db, "solar_incentives"),
            where("state", "==", stateAbbr),
          );
          const incentivesSnap = await getDocs(incentivesQuery);
          const incentivesData = incentivesSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          setIncentives(incentivesData);
        } catch (e) {
          console.warn("Could not fetch incentives:", e);
        }
      } catch (err) {
        console.error("Error fetching state data:", err);
        setError("Failed to load state data. Please try again.");
      }

      setLoading(false);
    };

    fetchData();
  }, [stateAbbr]);

  // Derive display values
  const stateName =
    stateData?.name ||
    stateSlug?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "";
  const solarResource = stateData?.solar_resource || {};
  const utilityRates = stateData?.utility_rates || {};
  const production = stateData?.production || {};
  const economics = stateData?.economics || {};

  // Get top jurisdictions from permit data
  const topJurisdictions = permits
    .flatMap((p) => p.jurisdictions || [])
    .sort((a, b) => (b.population || 0) - (a.population || 0))
    .slice(0, 5);

  // Get general permit info
  const generalPermit =
    permits.length > 0 ? permits[0]?.general_requirements : null;
  const interconnection =
    permits.length > 0 ? permits[0]?.interconnection : null;

  // Active incentives
  const activeIncentives = incentives.filter(
    (inc) => inc.status === "active" || inc.status === "Active" || !inc.status,
  );

  if (error && !stateAbbr) {
    return (
      <div className="ss-page">
        <style>{getStyles()}</style>
        <header className="ss-header">
          <div className="container">
            <Link to="/" className="ss-logo">
              <div className="ss-logo-icon">
                <Sun size={20} />
              </div>
              SolarOS
            </Link>
          </div>
        </header>
        <div className="ss-error-container">
          <h1>State Not Found</h1>
          <p>The state "{stateSlug}" could not be found.</p>
          <Link to="/solar" className="ss-btn-primary">
            <ArrowLeft size={18} />
            Browse All States
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ss-page">
      <style>{getStyles()}</style>

      {/* HEADER */}
      <header className="ss-header">
        <div className="container">
          <Link to="/" className="ss-logo">
            <div className="ss-logo-icon">
              <Sun size={20} />
            </div>
            SolarOS
          </Link>
          <nav className="ss-nav">
            <Link to="/solar" className="ss-nav-link">
              All States
            </Link>
            <Link to="/features" className="ss-nav-link">
              Features
            </Link>
            <Link to="/pricing" className="ss-nav-link">
              Pricing
            </Link>
            <Link to="/login" className="ss-nav-link">
              Sign In
            </Link>
            <Link to="/get-started" className="ss-nav-cta">
              Get Started <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="ss-hero">
        <div className="ss-hero-bg" />
        <div className="ss-hero-grid-bg" />
        <div className="ss-hero-content">
          <Link to="/solar" className="ss-breadcrumb">
            <ArrowLeft size={14} />
            All States
          </Link>
          {loading ? (
            <>
              <div
                className="ss-skeleton-line wide"
                style={{ height: 48, marginBottom: 24, maxWidth: 500 }}
              />
              <div
                className="ss-skeleton-line medium"
                style={{ height: 20, marginBottom: 48, maxWidth: 400 }}
              />
            </>
          ) : (
            <>
              <h1 className="ss-hero-title">
                {stateName} <span className="highlight">Solar Energy</span>
              </h1>
              <p className="ss-hero-subtitle">
                {production.annual_kwh
                  ? `An 8 kW system in ${stateName} produces an estimated ${formatNumber(production.annual_kwh)} kWh per year, saving homeowners approximately ${formatCurrency(economics.annual_savings_est)} annually.`
                  : `Explore solar energy data, incentives, and permitting information for ${stateName}.`}
              </p>
              <div className="ss-hero-stats">
                <div className="ss-hero-stat">
                  <div className="ss-hero-stat-value">
                    {formatNumber(production.annual_kwh)}
                  </div>
                  <div className="ss-hero-stat-label">kWh / Year (8 kW)</div>
                </div>
                <div className="ss-hero-stat">
                  <div className="ss-hero-stat-value">
                    {formatCurrency(economics.annual_savings_est)}
                  </div>
                  <div className="ss-hero-stat-label">Annual Savings</div>
                </div>
                <div className="ss-hero-stat">
                  <div className="ss-hero-stat-value">
                    {economics.payback_years_est
                      ? economics.payback_years_est.toFixed(1) + " yr"
                      : "N/A"}
                  </div>
                  <div className="ss-hero-stat-label">Payback Period</div>
                </div>
              </div>
              <Link to="/get-started" className="ss-btn-primary">
                Get a Quote in {stateName}
                <ArrowRight size={18} />
              </Link>
            </>
          )}
        </div>
      </section>

      {/* SOLAR RESOURCE */}
      <section
        id="solar-resource"
        ref={setSectionRef("solar-resource")}
        className="ss-section alt-bg"
      >
        <div className="ss-container">
          <div
            className={`ss-section-animate ${isVisible("solar-resource") ? "visible" : ""}`}
          >
            <div className="ss-section-header">
              <div className="ss-section-label">
                <Sun size={14} /> Solar Resource
              </div>
              <h2 className="ss-section-title">
                Solar Irradiance in {stateName}
              </h2>
              <p className="ss-section-desc">
                How much sunlight reaches {stateName}, measured in
                kWh/m\u00b2/day. Higher values mean more solar potential.
              </p>
            </div>

            {loading ? (
              <div className="ss-card-grid three">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <div className="ss-card-grid three">
                <div className="ss-data-card">
                  <div className="ss-data-icon">
                    <Sun size={22} />
                  </div>
                  <div className="ss-data-value">
                    {solarResource.avg_ghi != null
                      ? solarResource.avg_ghi.toFixed(2)
                      : "N/A"}
                  </div>
                  <div className="ss-data-label">Avg GHI (kWh/m\u00b2/day)</div>
                  <div className="ss-data-detail">
                    Global Horizontal Irradiance
                  </div>
                </div>
                <div className="ss-data-card">
                  <div className="ss-data-icon">
                    <Zap size={22} />
                  </div>
                  <div className="ss-data-value">
                    {solarResource.avg_dni != null
                      ? solarResource.avg_dni.toFixed(2)
                      : "N/A"}
                  </div>
                  <div className="ss-data-label">Avg DNI (kWh/m\u00b2/day)</div>
                  <div className="ss-data-detail">Direct Normal Irradiance</div>
                </div>
                <div className="ss-data-card">
                  <div className="ss-data-icon">
                    <TrendingUp size={22} />
                  </div>
                  <div className="ss-data-value">
                    {solarResource.avg_lat_tilt != null
                      ? solarResource.avg_lat_tilt.toFixed(2)
                      : "N/A"}
                  </div>
                  <div className="ss-data-label">Avg Tilt Production</div>
                  <div className="ss-data-detail">Latitude tilt irradiance</div>
                </div>
              </div>
            )}

            {!loading && production.annual_kwh && (
              <div className="ss-production-bar">
                <h3 className="ss-subsection-title">
                  Monthly Production (kWh) -- 8 kW System
                </h3>
                <div className="ss-month-grid">
                  {[
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
                  ].map((month, i) => {
                    const kwh = production.monthly_kwh?.[i] || 0;
                    const maxKwh = Math.max(...(production.monthly_kwh || [1]));
                    const pct = maxKwh > 0 ? (kwh / maxKwh) * 100 : 0;
                    return (
                      <div key={month} className="ss-month-col">
                        <div className="ss-month-value">{Math.round(kwh)}</div>
                        <div className="ss-month-bar-wrap">
                          <div
                            className="ss-month-bar"
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <div className="ss-month-label">{month}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FINANCIAL BENEFITS */}
      <section
        id="financial"
        ref={setSectionRef("financial")}
        className="ss-section"
      >
        <div className="ss-container">
          <div
            className={`ss-section-animate ${isVisible("financial") ? "visible" : ""}`}
          >
            <div className="ss-section-header">
              <div className="ss-section-label">
                <DollarSign size={14} /> Financial Benefits
              </div>
              <h2 className="ss-section-title">
                Save Money with Solar in {stateName}
              </h2>
              <p className="ss-section-desc">
                Utility rates, estimated savings, and available financial
                incentives for {stateName} homeowners.
              </p>
            </div>

            {loading ? (
              <div className="ss-card-grid four">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <>
                <div className="ss-card-grid four">
                  <div className="ss-data-card">
                    <div className="ss-data-icon">
                      <DollarSign size={22} />
                    </div>
                    <div className="ss-data-value">
                      {utilityRates.residential_rate != null
                        ? (utilityRates.residential_rate * 100).toFixed(1) +
                          "\u00a2"
                        : "N/A"}
                    </div>
                    <div className="ss-data-label">Avg Residential Rate</div>
                    <div className="ss-data-detail">per kWh</div>
                  </div>
                  <div className="ss-data-card">
                    <div className="ss-data-icon">
                      <TrendingUp size={22} />
                    </div>
                    <div className="ss-data-value">
                      {formatCurrency(economics.annual_savings_est)}
                    </div>
                    <div className="ss-data-label">Annual Savings</div>
                    <div className="ss-data-detail">
                      Estimated for 8 kW system
                    </div>
                  </div>
                  <div className="ss-data-card">
                    <div className="ss-data-icon">
                      <Clock size={22} />
                    </div>
                    <div className="ss-data-value">
                      {economics.payback_years_est
                        ? economics.payback_years_est.toFixed(1)
                        : "N/A"}
                    </div>
                    <div className="ss-data-label">Payback Period</div>
                    <div className="ss-data-detail">Years to break even</div>
                  </div>
                  <div className="ss-data-card">
                    <div className="ss-data-icon">
                      <Building2 size={22} />
                    </div>
                    <div
                      className="ss-data-value"
                      style={{ fontSize: "1.1rem" }}
                    >
                      {utilityRates.utility_name?.split("|")[0] || "N/A"}
                    </div>
                    <div className="ss-data-label">Primary Utility</div>
                    <div className="ss-data-detail">{stateName}</div>
                  </div>
                </div>

                {activeIncentives.length > 0 && (
                  <div className="ss-incentives-section">
                    <h3 className="ss-subsection-title">
                      Available Incentives in {stateName}
                    </h3>
                    <div className="ss-incentives-list">
                      {activeIncentives.slice(0, 6).map((inc, i) => (
                        <div key={inc.id || i} className="ss-incentive-card">
                          <div className="ss-incentive-icon">
                            <Award size={18} />
                          </div>
                          <div className="ss-incentive-content">
                            <div className="ss-incentive-name">
                              {inc.program_name ||
                                inc.name ||
                                "Solar Incentive"}
                            </div>
                            <div className="ss-incentive-type">
                              {inc.incentive_type || inc.type || "Incentive"}
                            </div>
                            {inc.amount && (
                              <div className="ss-incentive-amount">
                                {inc.amount}
                              </div>
                            )}
                            {inc.description && (
                              <div className="ss-incentive-desc">
                                {inc.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ss-itc-note">
                  <Shield size={18} />
                  <div>
                    <strong>2026 Tax Credit Update:</strong> The residential
                    Investment Tax Credit (ITC) ended January 1, 2026 for
                    homeowner-owned systems. Solar leases and PPAs (third-party
                    ownership) can still access the commercial ITC. SolarOS
                    helps you find the best financing path.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* PERMITTING */}
      <section
        id="permitting"
        ref={setSectionRef("permitting")}
        className="ss-section alt-bg"
      >
        <div className="ss-container">
          <div
            className={`ss-section-animate ${isVisible("permitting") ? "visible" : ""}`}
          >
            <div className="ss-section-header">
              <div className="ss-section-label">
                <FileCheck size={14} /> Permitting
              </div>
              <h2 className="ss-section-title">Solar Permits in {stateName}</h2>
              <p className="ss-section-desc">
                Permitting requirements, fees, and timelines for solar
                installations across {stateName} jurisdictions.
              </p>
            </div>

            {loading ? (
              <div className="ss-card-grid two">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : (
              <>
                {generalPermit && (
                  <div className="ss-permit-overview">
                    <div className="ss-permit-overview-grid">
                      <div className="ss-permit-stat">
                        <div className="ss-permit-stat-label">
                          Permit Required
                        </div>
                        <div className="ss-permit-stat-value">
                          {generalPermit.permit_required ? "Yes" : "Varies"}
                        </div>
                      </div>
                      <div className="ss-permit-stat">
                        <div className="ss-permit-stat-label">
                          Typical Fee Range
                        </div>
                        <div className="ss-permit-stat-value">
                          {generalPermit.typical_fee_range || "Varies"}
                        </div>
                      </div>
                      <div className="ss-permit-stat">
                        <div className="ss-permit-stat-label">
                          Typical Timeline
                        </div>
                        <div className="ss-permit-stat-value">
                          {generalPermit.typical_timeline_days
                            ? generalPermit.typical_timeline_days + " days"
                            : "Varies"}
                        </div>
                      </div>
                      <div className="ss-permit-stat">
                        <div className="ss-permit-stat-label">
                          Inspection Required
                        </div>
                        <div className="ss-permit-stat-value">
                          {generalPermit.inspection_required ? "Yes" : "Varies"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {topJurisdictions.length > 0 && (
                  <div className="ss-jurisdictions">
                    <h3 className="ss-subsection-title">Top Jurisdictions</h3>
                    <div className="ss-jurisdiction-table">
                      <div className="ss-jur-header">
                        <span>Jurisdiction</span>
                        <span>Permit Fee</span>
                        <span>Timeline</span>
                        <span>Method</span>
                        <span>SolarAPP+</span>
                      </div>
                      {topJurisdictions.map((jur) => (
                        <div
                          key={jur.jurisdiction_id || jur.name}
                          className="ss-jur-row"
                        >
                          <div className="ss-jur-name">
                            <MapPin size={14} />
                            {jur.name}
                          </div>
                          <div className="ss-jur-cell">
                            {jur.fees?.estimated_total_residential
                              ? formatCurrency(
                                  jur.fees.estimated_total_residential,
                                )
                              : jur.fees?.base_fee
                                ? formatCurrency(jur.fees.base_fee)
                                : "Varies"}
                          </div>
                          <div className="ss-jur-cell">
                            {jur.typical_timeline_days
                              ? jur.typical_timeline_days + " days"
                              : "Varies"}
                          </div>
                          <div className="ss-jur-cell">
                            <span className="ss-method-badge">
                              {jur.submission_method || "Varies"}
                            </span>
                          </div>
                          <div className="ss-jur-cell">
                            {jur.solarapp_enabled ? (
                              <span className="ss-solarapp-yes">
                                <CheckCircle2 size={14} /> Yes
                              </span>
                            ) : (
                              <span className="ss-solarapp-no">No</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* NET METERING */}
      <section
        id="net-metering"
        ref={setSectionRef("net-metering")}
        className="ss-section"
      >
        <div className="ss-container">
          <div
            className={`ss-section-animate ${isVisible("net-metering") ? "visible" : ""}`}
          >
            <div className="ss-section-header">
              <div className="ss-section-label">
                <Activity size={14} /> Net Metering
              </div>
              <h2 className="ss-section-title">Net Metering in {stateName}</h2>
              <p className="ss-section-desc">
                How {stateName} credits solar energy exported back to the grid.
              </p>
            </div>

            {loading ? (
              <SkeletonCard />
            ) : (
              <div className="ss-net-metering-card">
                <div className="ss-nm-status">
                  <div
                    className="ss-nm-badge"
                    data-available={
                      interconnection?.net_metering_available ? "yes" : "no"
                    }
                  >
                    {interconnection?.net_metering_available
                      ? "Net Metering Available"
                      : "Limited / No Statewide Net Metering"}
                  </div>
                </div>
                {interconnection?.net_metering_details && (
                  <p className="ss-nm-details">
                    {interconnection.net_metering_details}
                  </p>
                )}
                <div className="ss-nm-grid">
                  <div className="ss-nm-item">
                    <Globe size={16} />
                    <div>
                      <div className="ss-nm-item-label">Utility Approval</div>
                      <div className="ss-nm-item-value">
                        {interconnection?.utility_approval_required
                          ? "Required"
                          : "Not required"}
                      </div>
                    </div>
                  </div>
                  <div className="ss-nm-item">
                    <Clock size={16} />
                    <div>
                      <div className="ss-nm-item-label">
                        Interconnection Timeline
                      </div>
                      <div className="ss-nm-item-value">
                        {interconnection?.typical_timeline_days
                          ? interconnection.typical_timeline_days + " days"
                          : "Varies"}
                      </div>
                    </div>
                  </div>
                  {interconnection?.fees && (
                    <div className="ss-nm-item">
                      <DollarSign size={16} />
                      <div>
                        <div className="ss-nm-item-label">Fees</div>
                        <div className="ss-nm-item-value">
                          {interconnection.fees}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="ss-nm-item">
                    <Building2 size={16} />
                    <div>
                      <div className="ss-nm-item-label">Primary Utility</div>
                      <div className="ss-nm-item-value">
                        {utilityRates.utility_name?.split("|")[0] || "N/A"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="ss-cta">
        <div className="ss-cta-bg" />
        <div className="ss-cta-content">
          <div
            className="ss-section-label"
            style={{ justifyContent: "center" }}
          >
            <Zap size={14} />
            Ready to go solar?
          </div>
          <h2 className="ss-cta-title">
            See how much you could save in {stateName}
          </h2>
          <p className="ss-cta-desc">
            Get a personalized solar estimate based on your address, utility
            rate, and roof. Free, no obligation.
          </p>
          <div className="ss-cta-buttons">
            <Link to="/get-started" className="ss-btn-primary">
              Get Started Free
              <ArrowRight size={18} />
            </Link>
            <Link to="/solar" className="ss-btn-secondary">
              Browse All States
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ss-footer">
        <div className="container">
          <div className="ss-footer-links">
            <Link to="/">Home</Link>
            <Link to="/solar">Solar by State</Link>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
          </div>
          <p className="ss-footer-copy">
            &copy; 2026 SolarOS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function getStyles() {
  return `
    .ss-page {
      background: #0a0a0f;
      min-height: 100vh;
      color: #ffffff;
      overflow-x: hidden;
      font-family: 'Inter', -apple-system, sans-serif;
    }

    /* HEADER */
    .ss-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 16px 0;
      background: rgba(10, 10, 15, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .ss-header .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ss-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 800;
      font-size: 1.25rem;
      color: #fff;
      text-decoration: none;
      letter-spacing: -0.02em;
    }

    .ss-logo-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.4);
    }

    .ss-nav {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ss-nav-link {
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.3s;
      padding: 8px 16px;
      border-radius: 8px;
    }

    .ss-nav-link:hover {
      color: #fff;
      background: rgba(255,255,255,0.05);
    }

    .ss-nav-cta {
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

    .ss-nav-cta:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
    }

    /* HERO */
    .ss-hero {
      position: relative;
      padding: 160px 40px 80px;
      text-align: center;
    }

    .ss-hero-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
        radial-gradient(ellipse 60% 40% at 80% 20%, rgba(16, 185, 129, 0.06) 0%, transparent 50%);
    }

    .ss-hero-grid-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 60px 60px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent);
    }

    .ss-hero-content {
      max-width: 850px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .ss-breadcrumb {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 24px;
      transition: color 0.2s;
    }

    .ss-breadcrumb:hover {
      color: #10b981;
    }

    .ss-hero-title {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 20px;
      letter-spacing: -0.03em;
    }

    .ss-hero-title .highlight {
      background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .ss-hero-subtitle {
      font-size: 1.15rem;
      color: rgba(255,255,255,0.55);
      line-height: 1.7;
      max-width: 640px;
      margin: 0 auto 40px;
    }

    .ss-hero-stats {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 48px;
      margin-bottom: 40px;
      flex-wrap: wrap;
    }

    .ss-hero-stat-value {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .ss-hero-stat-label {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.45);
      font-weight: 500;
    }

    /* BUTTONS */
    .ss-btn-primary {
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

    .ss-btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 60px rgba(16, 185, 129, 0.5);
    }

    .ss-btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 16px 32px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      color: white;
      font-weight: 600;
      font-size: 1rem;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.3s;
    }

    .ss-btn-secondary:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.2);
    }

    /* SECTIONS */
    .ss-section {
      padding: 100px 0;
    }

    .ss-section.alt-bg {
      background: #0f1419;
    }

    .ss-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 40px;
    }

    .ss-section-animate {
      opacity: 0;
      transform: translateY(40px);
      transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .ss-section-animate.visible {
      opacity: 1;
      transform: translateY(0);
    }

    .ss-section-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .ss-section-label {
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

    .ss-section-title {
      font-size: clamp(1.8rem, 3.5vw, 2.5rem);
      font-weight: 800;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .ss-section-desc {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.5);
      line-height: 1.7;
      max-width: 640px;
      margin: 0 auto;
    }

    .ss-subsection-title {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 20px;
      margin-top: 48px;
    }

    /* CARD GRIDS */
    .ss-card-grid {
      display: grid;
      gap: 20px;
    }

    .ss-card-grid.three {
      grid-template-columns: repeat(3, 1fr);
    }

    .ss-card-grid.four {
      grid-template-columns: repeat(4, 1fr);
    }

    .ss-card-grid.two {
      grid-template-columns: repeat(2, 1fr);
    }

    /* DATA CARDS */
    .ss-data-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 32px 24px;
      text-align: center;
      transition: all 0.3s;
    }

    .ss-data-card:hover {
      border-color: rgba(16, 185, 129, 0.2);
      transform: translateY(-4px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 0 40px rgba(16, 185, 129, 0.05);
    }

    .ss-data-icon {
      color: #10b981;
      margin-bottom: 16px;
    }

    .ss-data-value {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 4px;
    }

    .ss-data-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      margin-bottom: 4px;
    }

    .ss-data-detail {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.35);
    }

    /* MONTHLY PRODUCTION BAR CHART */
    .ss-production-bar {
      margin-top: 48px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 32px;
    }

    .ss-production-bar .ss-subsection-title {
      margin-top: 0;
      margin-bottom: 24px;
      text-align: center;
    }

    .ss-month-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 8px;
      align-items: flex-end;
      height: 200px;
    }

    .ss-month-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .ss-month-value {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.5);
      font-weight: 600;
      margin-bottom: 6px;
    }

    .ss-month-bar-wrap {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .ss-month-bar {
      width: 70%;
      min-width: 12px;
      background: linear-gradient(to top, #059669, #10b981, #34d399);
      border-radius: 4px 4px 0 0;
      transition: height 0.6s ease;
    }

    .ss-month-label {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.4);
      font-weight: 600;
      margin-top: 8px;
    }

    /* ITC NOTE */
    .ss-itc-note {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-top: 32px;
      padding: 24px;
      background: rgba(16, 185, 129, 0.05);
      border: 1px solid rgba(16, 185, 129, 0.15);
      border-radius: 16px;
      color: rgba(255,255,255,0.6);
      font-size: 0.9rem;
      line-height: 1.6;
    }

    .ss-itc-note svg {
      color: #10b981;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .ss-itc-note strong {
      color: #34d399;
    }

    /* INCENTIVES */
    .ss-incentives-section {
      margin-top: 16px;
    }

    .ss-incentives-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .ss-incentive-card {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      transition: border-color 0.3s;
    }

    .ss-incentive-card:hover {
      border-color: rgba(16, 185, 129, 0.2);
    }

    .ss-incentive-icon {
      color: #10b981;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .ss-incentive-name {
      font-weight: 700;
      font-size: 0.9rem;
      margin-bottom: 4px;
    }

    .ss-incentive-type {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }

    .ss-incentive-amount {
      font-size: 0.85rem;
      font-weight: 600;
      color: #34d399;
    }

    .ss-incentive-desc {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      line-height: 1.5;
      margin-top: 4px;
    }

    /* PERMITS */
    .ss-permit-overview {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 32px;
    }

    .ss-permit-overview-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    }

    .ss-permit-stat-label {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
      margin-bottom: 6px;
    }

    .ss-permit-stat-value {
      font-size: 1.2rem;
      font-weight: 700;
      color: #fff;
    }

    /* JURISDICTIONS TABLE */
    .ss-jurisdiction-table {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      overflow: hidden;
    }

    .ss-jur-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .ss-jur-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 16px;
      padding: 16px 24px;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      transition: background 0.2s;
    }

    .ss-jur-row:last-child {
      border-bottom: none;
    }

    .ss-jur-row:hover {
      background: rgba(255,255,255,0.02);
    }

    .ss-jur-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .ss-jur-name svg {
      color: #10b981;
    }

    .ss-jur-cell {
      font-size: 0.85rem;
      color: rgba(255,255,255,0.6);
    }

    .ss-method-badge {
      padding: 3px 10px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.15);
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #10b981;
      text-transform: capitalize;
    }

    .ss-solarapp-yes {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #10b981;
      font-weight: 600;
      font-size: 0.85rem;
    }

    .ss-solarapp-no {
      color: rgba(255,255,255,0.3);
      font-size: 0.85rem;
    }

    /* NET METERING */
    .ss-net-metering-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 36px;
    }

    .ss-nm-status {
      margin-bottom: 20px;
    }

    .ss-nm-badge {
      display: inline-flex;
      padding: 8px 20px;
      border-radius: 100px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .ss-nm-badge[data-available="yes"] {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .ss-nm-badge[data-available="no"] {
      background: rgba(245, 158, 11, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }

    .ss-nm-details {
      color: rgba(255,255,255,0.55);
      font-size: 0.95rem;
      line-height: 1.7;
      margin-bottom: 28px;
    }

    .ss-nm-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .ss-nm-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(255,255,255,0.02);
      border-radius: 12px;
    }

    .ss-nm-item svg {
      color: #10b981;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .ss-nm-item-label {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .ss-nm-item-value {
      font-size: 0.95rem;
      font-weight: 600;
    }

    /* CTA */
    .ss-cta {
      padding: 120px 0;
      text-align: center;
      position: relative;
      background: #0f1419;
    }

    .ss-cta-bg {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 60%);
    }

    .ss-cta-content {
      position: relative;
      z-index: 1;
    }

    .ss-cta-title {
      font-size: clamp(2rem, 4vw, 3rem);
      font-weight: 800;
      margin-bottom: 16px;
      letter-spacing: -0.02em;
    }

    .ss-cta-desc {
      font-size: 1.1rem;
      color: rgba(255,255,255,0.5);
      margin-bottom: 40px;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .ss-cta-buttons {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    /* FOOTER */
    .ss-footer {
      padding: 40px 0;
      background: #050508;
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .ss-footer .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .ss-footer-links {
      display: flex;
      gap: 32px;
    }

    .ss-footer-links a {
      color: rgba(255,255,255,0.4);
      text-decoration: none;
      font-size: 0.85rem;
      transition: color 0.2s;
    }

    .ss-footer-links a:hover {
      color: #10b981;
    }

    .ss-footer-copy {
      color: rgba(255,255,255,0.25);
      font-size: 0.8rem;
    }

    /* SKELETON */
    .ss-skeleton-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 20px;
      padding: 32px 24px;
    }

    .ss-skeleton-line {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 200% 100%;
      animation: ss-shimmer 1.5s ease-in-out infinite;
      border-radius: 8px;
      height: 16px;
      margin-bottom: 12px;
    }

    .ss-skeleton-line.wide { width: 80%; }
    .ss-skeleton-line.medium { width: 60%; }
    .ss-skeleton-line.narrow { width: 40%; }

    @keyframes ss-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* ERROR */
    .ss-error-container {
      padding: 200px 40px 80px;
      text-align: center;
    }

    .ss-error-container h1 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 16px;
    }

    .ss-error-container p {
      color: rgba(255,255,255,0.5);
      margin-bottom: 32px;
    }

    /* RESPONSIVE */
    @media (max-width: 1024px) {
      .ss-card-grid.four {
        grid-template-columns: repeat(2, 1fr);
      }

      .ss-card-grid.three {
        grid-template-columns: repeat(2, 1fr);
      }

      .ss-permit-overview-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .ss-jur-header,
      .ss-jur-row {
        grid-template-columns: 2fr 1fr 1fr;
      }

      .ss-jur-header span:nth-child(4),
      .ss-jur-header span:nth-child(5),
      .ss-jur-row .ss-jur-cell:nth-child(4),
      .ss-jur-row .ss-jur-cell:nth-child(5) {
        display: none;
      }

      .ss-incentives-list {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .ss-nav-link:not(.ss-nav-cta) {
        display: none;
      }

      .ss-hero {
        padding: 120px 20px 60px;
      }

      .ss-container {
        padding: 0 20px;
      }

      .ss-hero-stats {
        gap: 24px;
      }

      .ss-card-grid.three,
      .ss-card-grid.four,
      .ss-card-grid.two {
        grid-template-columns: 1fr;
      }

      .ss-month-grid {
        grid-template-columns: repeat(6, 1fr);
        height: 150px;
      }

      .ss-month-col:nth-child(n+7) {
        margin-top: 24px;
      }

      .ss-permit-overview-grid {
        grid-template-columns: 1fr;
      }

      .ss-jur-header,
      .ss-jur-row {
        grid-template-columns: 1fr 1fr;
      }

      .ss-jur-header span:nth-child(n+3),
      .ss-jur-row .ss-jur-cell:nth-child(n+3) {
        display: none;
      }

      .ss-nm-grid {
        grid-template-columns: 1fr;
      }

      .ss-footer .container {
        flex-direction: column;
        gap: 16px;
        text-align: center;
      }

      .ss-month-grid {
        grid-template-columns: repeat(12, 1fr);
      }

      .ss-month-col:nth-child(n+7) {
        margin-top: 0;
      }

      .ss-month-value {
        font-size: 0.55rem;
      }
    }
  `;
}
