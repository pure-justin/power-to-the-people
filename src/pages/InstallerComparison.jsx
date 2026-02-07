import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  ArrowLeft,
  DollarSign,
  Star,
  Shield,
  Clock,
  TrendingUp,
  Check,
  X,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Battery,
  Sun,
  Filter,
  Download,
  Grid,
  List,
  ArrowRight,
  Target,
  Trophy,
  ThumbsUp,
  Sparkles,
  CircleDot,
} from "lucide-react";
import {
  getAllInstallers,
  compareInstallers,
  getInstallerScore,
  getRecommendedInstallers,
  getMatchScore,
  calculateInstallerROI,
  getHeadToHead,
} from "../services/installerService";

// ─── SVG Radar Chart Component ────────────────────────
function RadarChart({ data, size = 200 }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const categories = ["Price", "Quality", "Speed", "Warranty", "Local"];

  const getPoint = (index, value) => {
    const angle = (Math.PI * 2 * index) / categories.length - Math.PI / 2;
    const dist = (value / 100) * r;
    return {
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    };
  };

  const gridLevels = [20, 40, 60, 80, 100];
  const colors = ["#00FFD4", "#f59e0b", "#a78bfa", "#ef4444", "#3b82f6"];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={categories
            .map((_, i) => {
              const p = getPoint(i, level);
              return `${p.x},${p.y}`;
            })
            .join(" ")}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}
      {/* Axes */}
      {categories.map((_, i) => {
        const p = getPoint(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        );
      })}
      {/* Data polygons */}
      {data.map((dataset, di) => {
        const points = categories.map((cat, i) => {
          const key = cat.toLowerCase();
          const val = dataset.breakdown[key] || 0;
          return getPoint(i, val);
        });
        return (
          <g key={di}>
            <polygon
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={colors[di % colors.length]}
              fillOpacity={0.15}
              stroke={colors[di % colors.length]}
              strokeWidth={2}
            />
            {points.map((p, pi) => (
              <circle
                key={pi}
                cx={p.x}
                cy={p.y}
                r={3}
                fill={colors[di % colors.length]}
              />
            ))}
          </g>
        );
      })}
      {/* Labels */}
      {categories.map((cat, i) => {
        const p = getPoint(i, 118);
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.7)"
            fontSize={11}
            fontWeight={600}
          >
            {cat}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Horizontal Bar Component ────────────────────────
function ComparisonBar({ label, values, maxVal, colors, names }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.7)",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      {values.map((val, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              width: 100,
              fontSize: "0.75rem",
              color: colors[i],
              fontWeight: 600,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {names[i]}
          </span>
          <div
            style={{
              flex: 1,
              height: 8,
              background: "rgba(255,255,255,0.05)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(val / maxVal) * 100}%`,
                background: colors[i],
                borderRadius: 4,
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <span
            style={{
              width: 50,
              fontSize: "0.8rem",
              color: "#fff",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {typeof val === "number" && val > 999
              ? `$${(val / 1000).toFixed(1)}k`
              : val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini Savings Chart ────────────────────────
function SavingsChart({ roiData, color = "#00FFD4", height = 80 }) {
  if (!roiData?.yearlyData) return null;
  const data = roiData.yearlyData;
  const maxVal = Math.max(...data.map((d) => Math.abs(d.cumulativeSavings)));
  const minVal = Math.min(...data.map((d) => d.cumulativeSavings));
  const range = maxVal - minVal || 1;
  const w = 280;
  const zeroY = height - ((0 - minVal) / range) * height;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((d.cumulativeSavings - minVal) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={height} style={{ overflow: "visible" }}>
      {/* Zero line */}
      <line
        x1={0}
        y1={zeroY}
        x2={w}
        y2={zeroY}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1}
        strokeDasharray="4,4"
      />
      {/* Area fill */}
      <polygon
        points={`0,${zeroY} ${points} ${w},${zeroY}`}
        fill={color}
        fillOpacity={0.1}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Main Component ────────────────────────
export default function InstallerComparison() {
  const [activeTab, setActiveTab] = useState("compare"); // compare, headtohead, match, roi
  const [selectedInstallers, setSelectedInstallers] = useState([
    "freedom-solar",
    "sunpower",
    "tesla-energy",
  ]);
  const [systemSize, setSystemSize] = useState(10);
  const [sortBy, setSortBy] = useState("score");
  const [viewMode, setViewMode] = useState("grid");
  const [expandedCards, setExpandedCards] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [h2hPair, setH2hPair] = useState(["freedom-solar", "sunpower"]);

  // Match preferences
  const [preferences, setPreferences] = useState({
    budgetPriority: 7,
    qualityPriority: 8,
    speedPriority: 5,
    warrantyPriority: 6,
    localPriority: 7,
  });

  // Filters
  const [filters, setFilters] = useState({
    minRating: 0,
    maxPrice: 3.5,
    minYearsInBusiness: 0,
  });

  // Quote request
  const [quoteModal, setQuoteModal] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    message: "",
  });
  const [quoteSent, setQuoteSent] = useState(false);

  const allInstallers = useMemo(() => getAllInstallers(), []);

  const comparisonData = useMemo(
    () => compareInstallers(selectedInstallers, systemSize),
    [selectedInstallers, systemSize],
  );

  const sortedData = useMemo(() => {
    let data = [...comparisonData];

    data = data.filter((inst) => {
      if (inst.rating < filters.minRating) return false;
      if (inst.pricePerWatt > filters.maxPrice) return false;
      if (inst.yearsInBusiness < filters.minYearsInBusiness) return false;
      return true;
    });

    switch (sortBy) {
      case "price":
        return data.sort((a, b) => a.pricing.netCost - b.pricing.netCost);
      case "rating":
        return data.sort((a, b) => b.rating - a.rating);
      case "satisfaction":
        return data.sort(
          (a, b) => b.customerSatisfaction - a.customerSatisfaction,
        );
      case "speed":
        return data.sort((a, b) => {
          const aW = parseInt(a.installationTime.split("-")[0]);
          const bW = parseInt(b.installationTime.split("-")[0]);
          return aW - bW;
        });
      case "score":
      default:
        return data.sort(
          (a, b) => getInstallerScore(b).total - getInstallerScore(a).total,
        );
    }
  }, [comparisonData, sortBy, filters]);

  // Match scores
  const matchScores = useMemo(() => {
    const scores = {};
    allInstallers.forEach((inst) => {
      scores[inst.id] = getMatchScore(inst, preferences);
    });
    return scores;
  }, [allInstallers, preferences]);

  // ROI data per installer
  const roiData = useMemo(() => {
    const data = {};
    selectedInstallers.forEach((id) => {
      const inst = allInstallers.find((i) => i.id === id);
      if (inst) {
        data[id] = calculateInstallerROI(inst, systemSize);
      }
    });
    return data;
  }, [selectedInstallers, systemSize, allInstallers]);

  // Head-to-head data
  const h2hData = useMemo(
    () => getHeadToHead(h2hPair[0], h2hPair[1], systemSize),
    [h2hPair, systemSize],
  );

  // Insights
  const insights = useMemo(() => {
    if (sortedData.length === 0) return null;
    const avgPrice =
      sortedData.reduce((s, i) => s + i.pricing.netCost, 0) / sortedData.length;
    const avgRating =
      sortedData.reduce((s, i) => s + i.rating, 0) / sortedData.length;
    const cheapest = sortedData.reduce(
      (min, i) => (i.pricing.netCost < min.pricing.netCost ? i : min),
      sortedData[0],
    );
    const fastest = sortedData.reduce((min, i) => {
      const a = parseInt(i.installationTime.split("-")[0]);
      const b = parseInt(min.installationTime.split("-")[0]);
      return a < b ? i : min;
    }, sortedData[0]);
    const bestMatch = Object.entries(matchScores)
      .filter(([id]) => selectedInstallers.includes(id))
      .sort((a, b) => b[1].total - a[1].total)[0];
    return {
      avgPrice: Math.round(avgPrice),
      avgRating: avgRating.toFixed(1),
      cheapest,
      fastest,
      bestMatch: bestMatch
        ? {
            id: bestMatch[0],
            score: bestMatch[1].total,
            name: allInstallers.find((i) => i.id === bestMatch[0])?.name || "",
          }
        : null,
    };
  }, [sortedData, matchScores, selectedInstallers, allInstallers]);

  const toggleInstaller = useCallback((id) => {
    setSelectedInstallers((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      return prev.length < 6 ? [...prev, id] : prev;
    });
  }, []);

  const exportComparison = () => {
    const csv = [
      [
        "Installer",
        "Rating",
        "Score",
        "Price/Watt",
        "Net Cost",
        "Monthly",
        "Install Time",
        "Satisfaction",
        "Match Score",
      ],
      ...sortedData.map((inst) => [
        inst.name,
        inst.rating,
        getInstallerScore(inst).total,
        `$${inst.pricePerWatt}`,
        `$${inst.pricing.netCost}`,
        `$${inst.pricing.monthlyPayment}/mo`,
        inst.installationTime,
        `${inst.customerSatisfaction}%`,
        matchScores[inst.id]?.total || "-",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `installer-comparison-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleQuoteSubmit = (e) => {
    e.preventDefault();
    setQuoteSent(true);
    setTimeout(() => {
      setQuoteModal(null);
      setQuoteSent(false);
      setQuoteForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        message: "",
      });
    }, 2500);
  };

  const recommendedInstallers = getRecommendedInstallers({
    priority: "balanced",
    location: "Texas",
  });

  return (
    <div className="installer-comparison-page">
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

      <style>{styles}</style>

      <div className="page-bg" />
      <div className="page-overlay" />

      <div className="page-container">
        {/* Header */}
        <div className="page-header">
          <Link to="/" className="logo-link">
            <div className="logo-icon">
              <Zap size={20} color="#0a1520" />
            </div>
            Power to the People
          </Link>
          <div className="header-actions">
            <button className="action-btn" onClick={exportComparison}>
              <Download size={16} /> Export
            </button>
            <Link to="/success" className="back-btn">
              <ArrowLeft size={16} /> Back
            </Link>
          </div>
        </div>

        {/* Title */}
        <div className="page-title-section">
          <h1 className="page-title">
            Compare <span className="gradient-text">Solar Installers</span>
          </h1>
          <p className="page-subtitle">
            Find the perfect installer for your {systemSize} kW solar + 60 kWh
            battery system
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          {[
            { id: "compare", label: "Compare All", icon: <Grid size={16} /> },
            {
              id: "headtohead",
              label: "Head to Head",
              icon: <Trophy size={16} />,
            },
            {
              id: "match",
              label: "Find Your Match",
              icon: <Target size={16} />,
            },
            {
              id: "roi",
              label: "ROI Projection",
              icon: <TrendingUp size={16} />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Insights Bar */}
        {insights && activeTab === "compare" && (
          <div className="insights-bar">
            <div className="insight-item">
              <DollarSign size={18} color="#00FFD4" />
              <div>
                <div className="insight-val">
                  ${insights.avgPrice.toLocaleString()}
                </div>
                <div className="insight-lbl">Avg Price</div>
              </div>
            </div>
            <div className="insight-item">
              <Star size={18} color="#fbbf24" />
              <div>
                <div className="insight-val">{insights.avgRating}</div>
                <div className="insight-lbl">Avg Rating</div>
              </div>
            </div>
            <div className="insight-item">
              <Award size={18} color="#00FFD4" />
              <div>
                <div className="insight-val">{insights.cheapest.name}</div>
                <div className="insight-lbl">Best Value</div>
              </div>
            </div>
            <div className="insight-item">
              <Clock size={18} color="#a78bfa" />
              <div>
                <div className="insight-val">{insights.fastest.name}</div>
                <div className="insight-lbl">Fastest Install</div>
              </div>
            </div>
            {insights.bestMatch && (
              <div className="insight-item">
                <Target size={18} color="#f59e0b" />
                <div>
                  <div className="insight-val">
                    {insights.bestMatch.name} ({insights.bestMatch.score}%)
                  </div>
                  <div className="insight-lbl">Best Match</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Size Control */}
        <div className="system-size-bar">
          <label className="size-label">
            <Sun size={16} /> System Size
          </label>
          <div className="size-slider-wrap">
            <input
              type="range"
              className="size-slider"
              value={systemSize}
              onChange={(e) => setSystemSize(parseFloat(e.target.value))}
              min={5}
              max={20}
              step={0.5}
            />
            <span className="size-value">{systemSize} kW</span>
          </div>
        </div>

        {/* ════════════════ TAB: COMPARE ALL ════════════════ */}
        {activeTab === "compare" && (
          <>
            {/* Controls Row */}
            <div className="controls-row">
              <div className="control-group-inline">
                <label className="ctrl-label">Sort</label>
                <select
                  className="ctrl-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="score">Overall Score</option>
                  <option value="price">Best Price</option>
                  <option value="rating">Highest Rating</option>
                  <option value="satisfaction">Satisfaction</option>
                  <option value="speed">Fastest Install</option>
                </select>
              </div>
              <div className="view-toggle">
                <button
                  className={`vt-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`vt-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  <List size={16} />
                </button>
              </div>
              <button
                className="filter-btn"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={14} />
                Filters
                {showFilters ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="filters-panel">
                <div className="filter-row">
                  <div className="filter-group">
                    <label>
                      Min Rating: <strong>{filters.minRating}</strong>
                    </label>
                    <input
                      type="range"
                      value={filters.minRating}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minRating: parseFloat(e.target.value),
                        })
                      }
                      min={0}
                      max={5}
                      step={0.5}
                    />
                  </div>
                  <div className="filter-group">
                    <label>
                      Max $/W: <strong>${filters.maxPrice}</strong>
                    </label>
                    <input
                      type="range"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          maxPrice: parseFloat(e.target.value),
                        })
                      }
                      min={2}
                      max={3.5}
                      step={0.1}
                    />
                  </div>
                  <div className="filter-group">
                    <label>
                      Min Experience:{" "}
                      <strong>{filters.minYearsInBusiness} yr</strong>
                    </label>
                    <input
                      type="range"
                      value={filters.minYearsInBusiness}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          minYearsInBusiness: parseInt(e.target.value),
                        })
                      }
                      min={0}
                      max={20}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Installer Chips */}
            <div className="chips-section">
              <span className="chips-label">
                Select installers ({selectedInstallers.length}/6):
              </span>
              <div className="chips-row">
                {allInstallers.map((inst) => (
                  <button
                    key={inst.id}
                    className={`chip ${selectedInstallers.includes(inst.id) ? "selected" : ""} ${!selectedInstallers.includes(inst.id) && selectedInstallers.length >= 6 ? "disabled" : ""}`}
                    onClick={() => toggleInstaller(inst.id)}
                    disabled={
                      !selectedInstallers.includes(inst.id) &&
                      selectedInstallers.length >= 6
                    }
                  >
                    {selectedInstallers.includes(inst.id) && (
                      <Check size={14} />
                    )}
                    {inst.name}
                    <span className="chip-score">
                      {getInstallerScore(inst).total}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid View */}
            {viewMode === "grid" ? (
              <div className="comparison-grid">
                {sortedData.map((installer) => {
                  const score = getInstallerScore(installer);
                  const match = matchScores[installer.id];
                  const isExpanded = expandedCards[installer.id];
                  const roi = roiData[installer.id];

                  return (
                    <div key={installer.id} className="inst-card">
                      {/* Card Header */}
                      <div className="card-top">
                        <div className="card-top-row">
                          <h2 className="inst-name">{installer.name}</h2>
                          {score.total >= 90 && (
                            <span className="top-badge">Top Rated</span>
                          )}
                        </div>
                        <div className="rating-row">
                          <div className="stars-display">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                fill={
                                  i < Math.floor(installer.rating)
                                    ? "#fbbf24"
                                    : "none"
                                }
                                color="#fbbf24"
                              />
                            ))}
                            <span className="rating-num">
                              {installer.rating}
                            </span>
                            <span className="review-count">
                              ({installer.reviews.toLocaleString()})
                            </span>
                          </div>
                        </div>
                        <div className="score-badges">
                          <div className="score-badge primary">
                            <Award size={14} />
                            <span>{score.total}/100</span>
                          </div>
                          {match && (
                            <div className="score-badge match">
                              <Target size={14} />
                              <span>{match.total}% match</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="card-pricing">
                        <div className="price-big">
                          ${installer.pricing.netCost.toLocaleString()}
                        </div>
                        <div className="price-sub">After 30% Tax Credit</div>
                        <div className="price-details">
                          <div className="pd-row">
                            <span>Solar ({systemSize} kW)</span>
                            <span>
                              ${installer.pricing.basePrice.toLocaleString()}
                            </span>
                          </div>
                          <div className="pd-row">
                            <span>60 kWh Battery</span>
                            <span>
                              ${installer.pricing.batteryCost.toLocaleString()}
                            </span>
                          </div>
                          <div className="pd-row highlight">
                            <span>Monthly Payment</span>
                            <span>
                              $
                              {installer.pricing.monthlyPayment.toLocaleString()}
                              /mo
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div className="card-metrics">
                        <div className="metric-row">
                          <Clock size={16} className="metric-icon" />
                          <div className="metric-content">
                            <div className="metric-label">Install Time</div>
                            <div className="metric-val">
                              {installer.installationTime}
                            </div>
                          </div>
                        </div>
                        <div className="metric-row">
                          <Users size={16} className="metric-icon" />
                          <div className="metric-content">
                            <div className="metric-label">Experience</div>
                            <div className="metric-val">
                              {installer.yearsInBusiness} yr |{" "}
                              {installer.installsCompleted.toLocaleString()}{" "}
                              installs
                            </div>
                          </div>
                        </div>
                        <div className="metric-row">
                          <ThumbsUp size={16} className="metric-icon" />
                          <div className="metric-content">
                            <div className="metric-label">Satisfaction</div>
                            <div className="metric-val">
                              {installer.customerSatisfaction}%
                            </div>
                          </div>
                        </div>
                        <div className="metric-row">
                          <Battery size={16} className="metric-icon" />
                          <div className="metric-content">
                            <div className="metric-label">Batteries</div>
                            <div className="metric-val">
                              {installer.equipmentBrands.batteries.join(", ")}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pros/Cons */}
                      <div className="card-proscons">
                        <div className="proscons-col">
                          <div className="pc-title pros">Pros</div>
                          {installer.pros.slice(0, 3).map((p, i) => (
                            <div key={i} className="pc-item pro">
                              <Check size={12} /> {p}
                            </div>
                          ))}
                        </div>
                        <div className="proscons-col">
                          <div className="pc-title cons">Cons</div>
                          {installer.cons.slice(0, 2).map((c, i) => (
                            <div key={i} className="pc-item con">
                              <X size={12} /> {c}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ROI Mini Preview */}
                      {roi && (
                        <div className="card-roi-preview">
                          <div className="roi-preview-header">
                            <TrendingUp size={14} />
                            <span>25-Year Savings</span>
                          </div>
                          <div className="roi-preview-value">
                            ${roi.totalSavings25yr.toLocaleString()}
                          </div>
                          <div className="roi-preview-sub">
                            Payback in ~{roi.paybackYear} years
                          </div>
                          <SavingsChart roiData={roi} />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="card-actions">
                        <button
                          className="card-action-btn primary"
                          onClick={() => setQuoteModal(installer)}
                        >
                          Get Quote
                          <ArrowRight size={14} />
                        </button>
                        <button
                          className="card-action-btn secondary"
                          onClick={() =>
                            setExpandedCards({
                              ...expandedCards,
                              [installer.id]: !isExpanded,
                            })
                          }
                        >
                          {isExpanded ? "Less" : "Details"}
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </div>

                      {/* Expanded */}
                      {isExpanded && (
                        <div className="card-expanded">
                          <div className="expanded-section">
                            <h4>Warranty Coverage</h4>
                            <div className="warranty-grid">
                              {Object.entries(installer.warranty).map(
                                ([key, val]) => (
                                  <div key={key} className="w-item">
                                    <div className="w-label">{key}</div>
                                    <div className="w-val">{val} yr</div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                          <div className="expanded-section">
                            <h4>Certifications</h4>
                            <div className="cert-row">
                              {installer.certifications.map((c, i) => (
                                <span key={i} className="cert-tag">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="expanded-section">
                            <h4>Equipment Brands</h4>
                            <div className="equip-row">
                              <span className="equip-label">Panels:</span>
                              {installer.equipmentBrands.panels.join(", ")}
                            </div>
                            <div className="equip-row">
                              <span className="equip-label">Inverters:</span>
                              {installer.equipmentBrands.inverters.join(", ")}
                            </div>
                          </div>
                          <div className="expanded-section">
                            <h4>Contact</h4>
                            <div className="contact-rows">
                              <div className="contact-row">
                                <Phone size={14} />
                                <a href={`tel:${installer.contactInfo.phone}`}>
                                  {installer.contactInfo.phone}
                                </a>
                              </div>
                              <div className="contact-row">
                                <Mail size={14} />
                                <a
                                  href={`mailto:${installer.contactInfo.email}`}
                                >
                                  {installer.contactInfo.email}
                                </a>
                              </div>
                              <div className="contact-row">
                                <Globe size={14} />
                                <a
                                  href={installer.contactInfo.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Visit Website
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="table-wrap">
                <table className="comp-table">
                  <thead>
                    <tr>
                      <th>Installer</th>
                      <th>Score</th>
                      <th>Match</th>
                      <th>Rating</th>
                      <th>Net Cost</th>
                      <th>Monthly</th>
                      <th>Install Time</th>
                      <th>Satisfaction</th>
                      <th>25yr Savings</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((inst) => {
                      const score = getInstallerScore(inst);
                      const match = matchScores[inst.id];
                      const roi = roiData[inst.id];
                      return (
                        <tr key={inst.id}>
                          <td className="td-name">{inst.name}</td>
                          <td>
                            <span className="td-score">{score.total}</span>
                          </td>
                          <td>
                            <span className="td-match">
                              {match?.total || "-"}%
                            </span>
                          </td>
                          <td>
                            <span className="td-rating">
                              <Star size={12} fill="#fbbf24" color="#fbbf24" />{" "}
                              {inst.rating}
                            </span>
                          </td>
                          <td className="td-bold">
                            ${inst.pricing.netCost.toLocaleString()}
                          </td>
                          <td>
                            ${inst.pricing.monthlyPayment.toLocaleString()}/mo
                          </td>
                          <td>{inst.installationTime}</td>
                          <td>{inst.customerSatisfaction}%</td>
                          <td className="td-savings">
                            {roi
                              ? `$${roi.totalSavings25yr.toLocaleString()}`
                              : "-"}
                          </td>
                          <td>
                            <button
                              className="table-quote-btn"
                              onClick={() => setQuoteModal(inst)}
                            >
                              Quote
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ════════════════ TAB: HEAD TO HEAD ════════════════ */}
        {activeTab === "headtohead" && (
          <div className="h2h-section">
            {/* Selector */}
            <div className="h2h-selector">
              <div className="h2h-pick">
                <label>Installer 1</label>
                <select
                  value={h2hPair[0]}
                  onChange={(e) => setH2hPair([e.target.value, h2hPair[1]])}
                  className="ctrl-select"
                >
                  {allInstallers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="h2h-vs">VS</div>
              <div className="h2h-pick">
                <label>Installer 2</label>
                <select
                  value={h2hPair[1]}
                  onChange={(e) => setH2hPair([h2hPair[0], e.target.value])}
                  className="ctrl-select"
                >
                  {allInstallers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {h2hData && (
              <>
                {/* Winner Banner */}
                <div className="h2h-winner-banner">
                  <Trophy size={24} color="#fbbf24" />
                  <span>
                    <strong>
                      {
                        allInstallers.find(
                          (i) => i.id === h2hData.overallWinner,
                        )?.name
                      }
                    </strong>{" "}
                    wins {h2hData.winsCount[h2hData.overallWinner]} of{" "}
                    {h2hData.categories.length} categories
                  </span>
                </div>

                {/* Category Battles */}
                <div className="h2h-battles">
                  {h2hData.categories.map((cat) => {
                    const inst1 = h2hData.installers[0];
                    const inst2 = h2hData.installers[1];
                    const winner = cat.winner;
                    return (
                      <div key={cat.name} className="battle-card">
                        <div className="battle-header">{cat.name}</div>
                        <div className="battle-row">
                          <div
                            className={`battle-side ${winner === inst1.id ? "winner" : ""}`}
                          >
                            <span className="battle-name">{inst1.name}</span>
                            {winner === inst1.id && (
                              <Trophy size={14} color="#fbbf24" />
                            )}
                          </div>
                          <div className="battle-diff">
                            {cat.diff} {cat.unit}
                          </div>
                          <div
                            className={`battle-side right ${winner === inst2.id ? "winner" : ""}`}
                          >
                            {winner === inst2.id && (
                              <Trophy size={14} color="#fbbf24" />
                            )}
                            <span className="battle-name">{inst2.name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Radar Chart */}
                <div className="h2h-radar">
                  <h3>Performance Comparison</h3>
                  <div className="radar-container">
                    <RadarChart
                      data={h2hData.installers.map((inst) =>
                        getMatchScore(inst, preferences),
                      )}
                      size={260}
                    />
                    <div className="radar-legend">
                      {h2hData.installers.map((inst, i) => (
                        <div key={inst.id} className="legend-item">
                          <div
                            className="legend-dot"
                            style={{
                              background: i === 0 ? "#00FFD4" : "#f59e0b",
                            }}
                          />
                          {inst.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Side by Side Details */}
                <div className="h2h-details">
                  {h2hData.installers.map((inst, idx) => (
                    <div key={inst.id} className="h2h-detail-card">
                      <h3
                        style={{
                          color: idx === 0 ? "#00FFD4" : "#f59e0b",
                        }}
                      >
                        {inst.name}
                      </h3>
                      <div className="h2h-stat-grid">
                        <div className="h2h-stat">
                          <div className="stat-val">
                            ${inst.pricing.netCost.toLocaleString()}
                          </div>
                          <div className="stat-lbl">Net Cost</div>
                        </div>
                        <div className="h2h-stat">
                          <div className="stat-val">
                            ${inst.pricing.monthlyPayment}/mo
                          </div>
                          <div className="stat-lbl">Monthly</div>
                        </div>
                        <div className="h2h-stat">
                          <div className="stat-val">{inst.rating}</div>
                          <div className="stat-lbl">Rating</div>
                        </div>
                        <div className="h2h-stat">
                          <div className="stat-val">
                            {inst.customerSatisfaction}%
                          </div>
                          <div className="stat-lbl">Satisfaction</div>
                        </div>
                        <div className="h2h-stat">
                          <div className="stat-val">
                            {inst.installationTime}
                          </div>
                          <div className="stat-lbl">Install Time</div>
                        </div>
                        <div className="h2h-stat">
                          <div className="stat-val">{inst.score.total}/100</div>
                          <div className="stat-lbl">Score</div>
                        </div>
                      </div>
                      <div className="h2h-proscons">
                        <div className="pc-title pros">Pros</div>
                        {inst.pros.map((p, i) => (
                          <div key={i} className="pc-item pro">
                            <Check size={12} /> {p}
                          </div>
                        ))}
                        <div
                          className="pc-title cons"
                          style={{ marginTop: 12 }}
                        >
                          Cons
                        </div>
                        {inst.cons.map((c, i) => (
                          <div key={i} className="pc-item con">
                            <X size={12} /> {c}
                          </div>
                        ))}
                      </div>
                      <button
                        className="card-action-btn primary"
                        style={{ marginTop: 16 }}
                        onClick={() => setQuoteModal(inst)}
                      >
                        Get Quote from {inst.name}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════ TAB: FIND YOUR MATCH ════════════════ */}
        {activeTab === "match" && (
          <div className="match-section">
            <div className="match-header">
              <Sparkles size={24} color="#00FFD4" />
              <div>
                <h2>Find Your Perfect Installer</h2>
                <p>
                  Adjust the sliders to match your priorities and we'll rank
                  installers by how well they fit your needs.
                </p>
              </div>
            </div>

            {/* Priority Sliders */}
            <div className="pref-sliders">
              {[
                {
                  key: "budgetPriority",
                  label: "Budget Importance",
                  icon: <DollarSign size={16} />,
                  desc: "How important is getting the lowest price?",
                },
                {
                  key: "qualityPriority",
                  label: "Quality Importance",
                  icon: <Star size={16} />,
                  desc: "How important are ratings and satisfaction?",
                },
                {
                  key: "speedPriority",
                  label: "Speed Importance",
                  icon: <Clock size={16} />,
                  desc: "How important is fast installation?",
                },
                {
                  key: "warrantyPriority",
                  label: "Warranty Importance",
                  icon: <Shield size={16} />,
                  desc: "How important is warranty coverage?",
                },
                {
                  key: "localPriority",
                  label: "Local Expertise",
                  icon: <Target size={16} />,
                  desc: "How important is Texas-focused knowledge?",
                },
              ].map((pref) => (
                <div key={pref.key} className="pref-slider">
                  <div className="pref-top">
                    <div className="pref-label">
                      {pref.icon}
                      <span>{pref.label}</span>
                    </div>
                    <span className="pref-val">{preferences[pref.key]}/10</span>
                  </div>
                  <input
                    type="range"
                    value={preferences[pref.key]}
                    onChange={(e) =>
                      setPreferences({
                        ...preferences,
                        [pref.key]: parseInt(e.target.value),
                      })
                    }
                    min={1}
                    max={10}
                    step={1}
                    className="range-slider"
                  />
                  <div className="pref-desc">{pref.desc}</div>
                </div>
              ))}
            </div>

            {/* Match Results */}
            <div className="match-results">
              <h3>Your Top Matches</h3>
              <div className="match-cards">
                {allInstallers
                  .map((inst) => ({
                    ...inst,
                    match: matchScores[inst.id],
                  }))
                  .sort((a, b) => b.match.total - a.match.total)
                  .map((inst, idx) => (
                    <div
                      key={inst.id}
                      className={`match-card ${idx === 0 ? "top-match" : ""}`}
                    >
                      <div className="match-card-top">
                        <div className="match-rank">#{idx + 1}</div>
                        <div>
                          <h4>{inst.name}</h4>
                          <div className="match-stars">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                fill={
                                  i < Math.floor(inst.rating)
                                    ? "#fbbf24"
                                    : "none"
                                }
                                color="#fbbf24"
                              />
                            ))}
                            <span>{inst.rating}</span>
                          </div>
                        </div>
                        <div className="match-pct">
                          <CircleDot size={16} />
                          <span className="match-pct-val">
                            {inst.match.total}%
                          </span>
                          <span className="match-pct-label">match</span>
                        </div>
                      </div>

                      {/* Breakdown bars */}
                      <div className="match-breakdown">
                        {Object.entries(inst.match.breakdown).map(
                          ([key, val]) => (
                            <div key={key} className="mb-row">
                              <span className="mb-label">{key}</span>
                              <div className="mb-bar-bg">
                                <div
                                  className="mb-bar-fill"
                                  style={{
                                    width: `${val}%`,
                                    background:
                                      val >= 80
                                        ? "#00FFD4"
                                        : val >= 50
                                          ? "#f59e0b"
                                          : "#ef4444",
                                  }}
                                />
                              </div>
                              <span className="mb-val">{val}</span>
                            </div>
                          ),
                        )}
                      </div>

                      <button
                        className="card-action-btn primary match-quote-btn"
                        onClick={() => setQuoteModal(inst)}
                      >
                        Get Quote <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ TAB: ROI PROJECTION ════════════════ */}
        {activeTab === "roi" && (
          <div className="roi-section">
            <div className="roi-header">
              <TrendingUp size={24} color="#00FFD4" />
              <div>
                <h2>25-Year ROI by Installer</h2>
                <p>
                  See how your investment pays off with each installer over
                  time.
                </p>
              </div>
            </div>

            {/* Installer Selection for ROI */}
            <div className="chips-section">
              <span className="chips-label">Compare ROI for:</span>
              <div className="chips-row">
                {allInstallers.map((inst) => (
                  <button
                    key={inst.id}
                    className={`chip ${selectedInstallers.includes(inst.id) ? "selected" : ""}`}
                    onClick={() => toggleInstaller(inst.id)}
                  >
                    {selectedInstallers.includes(inst.id) && (
                      <Check size={14} />
                    )}
                    {inst.name}
                  </button>
                ))}
              </div>
            </div>

            {/* ROI Summary Cards */}
            <div className="roi-cards">
              {selectedInstallers.map((id) => {
                const roi = roiData[id];
                const inst = allInstallers.find((i) => i.id === id);
                if (!roi || !inst) return null;

                return (
                  <div key={id} className="roi-card">
                    <div className="roi-card-header">
                      <h3>{inst.name}</h3>
                      <div className="roi-badge">${roi.monthlyPayment}/mo</div>
                    </div>

                    <div className="roi-stats">
                      <div className="roi-stat">
                        <div className="roi-stat-val">
                          ${roi.netCost.toLocaleString()}
                        </div>
                        <div className="roi-stat-lbl">Net Cost</div>
                      </div>
                      <div className="roi-stat highlight">
                        <div className="roi-stat-val">
                          ${roi.totalSavings25yr.toLocaleString()}
                        </div>
                        <div className="roi-stat-lbl">25yr Savings</div>
                      </div>
                      <div className="roi-stat">
                        <div className="roi-stat-val">
                          ~{roi.paybackYear} yr
                        </div>
                        <div className="roi-stat-lbl">Payback</div>
                      </div>
                    </div>

                    {/* Savings chart */}
                    <div className="roi-chart-area">
                      <SavingsChart roiData={roi} height={100} />
                    </div>

                    {/* Year milestones */}
                    <div className="roi-milestones">
                      {[5, 10, 15, 20, 25].map((yr) => {
                        const d = roi.yearlyData[yr - 1];
                        return (
                          <div key={yr} className="milestone">
                            <div className="ms-year">Yr {yr}</div>
                            <div
                              className={`ms-val ${d.cumulativeSavings >= 0 ? "pos" : "neg"}`}
                            >
                              {d.cumulativeSavings >= 0 ? "+" : ""}$
                              {Math.abs(d.cumulativeSavings).toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison Bar Chart */}
            {selectedInstallers.length >= 2 && (
              <div className="roi-comparison-chart">
                <h3>Side-by-Side Comparison</h3>
                <ComparisonBar
                  label="Net System Cost"
                  values={selectedInstallers.map(
                    (id) => roiData[id]?.netCost || 0,
                  )}
                  maxVal={Math.max(
                    ...selectedInstallers.map(
                      (id) => roiData[id]?.netCost || 0,
                    ),
                  )}
                  colors={[
                    "#00FFD4",
                    "#f59e0b",
                    "#a78bfa",
                    "#ef4444",
                    "#3b82f6",
                    "#22c55e",
                  ]}
                  names={selectedInstallers.map(
                    (id) => allInstallers.find((i) => i.id === id)?.name || id,
                  )}
                />
                <ComparisonBar
                  label="25-Year Total Savings"
                  values={selectedInstallers.map(
                    (id) => roiData[id]?.totalSavings25yr || 0,
                  )}
                  maxVal={Math.max(
                    ...selectedInstallers.map(
                      (id) => roiData[id]?.totalSavings25yr || 0,
                    ),
                  )}
                  colors={[
                    "#00FFD4",
                    "#f59e0b",
                    "#a78bfa",
                    "#ef4444",
                    "#3b82f6",
                    "#22c55e",
                  ]}
                  names={selectedInstallers.map(
                    (id) => allInstallers.find((i) => i.id === id)?.name || id,
                  )}
                />
                <ComparisonBar
                  label="Monthly Payment"
                  values={selectedInstallers.map(
                    (id) => roiData[id]?.monthlyPayment || 0,
                  )}
                  maxVal={Math.max(
                    ...selectedInstallers.map(
                      (id) => roiData[id]?.monthlyPayment || 0,
                    ),
                  )}
                  colors={[
                    "#00FFD4",
                    "#f59e0b",
                    "#a78bfa",
                    "#ef4444",
                    "#3b82f6",
                    "#22c55e",
                  ]}
                  names={selectedInstallers.map(
                    (id) => allInstallers.find((i) => i.id === id)?.name || id,
                  )}
                />
                <ComparisonBar
                  label="Payback Period (years)"
                  values={selectedInstallers.map(
                    (id) => roiData[id]?.paybackYear || 0,
                  )}
                  maxVal={25}
                  colors={[
                    "#00FFD4",
                    "#f59e0b",
                    "#a78bfa",
                    "#ef4444",
                    "#3b82f6",
                    "#22c55e",
                  ]}
                  names={selectedInstallers.map(
                    (id) => allInstallers.find((i) => i.id === id)?.name || id,
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* ════════════════ QUOTE MODAL ════════════════ */}
        {quoteModal && (
          <div className="modal-backdrop" onClick={() => setQuoteModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              {quoteSent ? (
                <div className="quote-success">
                  <div className="quote-success-icon">
                    <Check size={48} />
                  </div>
                  <h2>Quote Request Sent!</h2>
                  <p>
                    {quoteModal.name} will contact you within{" "}
                    {quoteModal.responseTime}.
                  </p>
                </div>
              ) : (
                <>
                  <div className="modal-header">
                    <h2>Get a Quote from {quoteModal.name}</h2>
                    <button
                      className="modal-close"
                      onClick={() => setQuoteModal(null)}
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="quote-summary">
                      <div className="qs-item">
                        <Sun size={16} />
                        <span>{systemSize} kW Solar System</span>
                      </div>
                      <div className="qs-item">
                        <Battery size={16} />
                        <span>60 kWh Duracell Battery</span>
                      </div>
                      <div className="qs-item">
                        <DollarSign size={16} />
                        <span>
                          Est. $
                          {quoteModal.pricing?.netCost?.toLocaleString() ||
                            "TBD"}{" "}
                          after tax credit
                        </span>
                      </div>
                    </div>
                    <form onSubmit={handleQuoteSubmit} className="quote-form">
                      <div className="qf-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          required
                          value={quoteForm.name}
                          onChange={(e) =>
                            setQuoteForm({
                              ...quoteForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="John Smith"
                        />
                      </div>
                      <div className="qf-row">
                        <div className="qf-group">
                          <label>Email</label>
                          <input
                            type="email"
                            required
                            value={quoteForm.email}
                            onChange={(e) =>
                              setQuoteForm({
                                ...quoteForm,
                                email: e.target.value,
                              })
                            }
                            placeholder="john@email.com"
                          />
                        </div>
                        <div className="qf-group">
                          <label>Phone</label>
                          <input
                            type="tel"
                            required
                            value={quoteForm.phone}
                            onChange={(e) =>
                              setQuoteForm({
                                ...quoteForm,
                                phone: e.target.value,
                              })
                            }
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                      <div className="qf-group">
                        <label>Installation Address</label>
                        <input
                          type="text"
                          required
                          value={quoteForm.address}
                          onChange={(e) =>
                            setQuoteForm({
                              ...quoteForm,
                              address: e.target.value,
                            })
                          }
                          placeholder="123 Main St, Austin, TX"
                        />
                      </div>
                      <div className="qf-group">
                        <label>Additional Notes (optional)</label>
                        <textarea
                          value={quoteForm.message}
                          onChange={(e) =>
                            setQuoteForm({
                              ...quoteForm,
                              message: e.target.value,
                            })
                          }
                          placeholder="Any specific requirements or questions..."
                          rows={3}
                        />
                      </div>
                      <button type="submit" className="quote-submit-btn">
                        <Mail size={16} />
                        Send Quote Request
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────
const styles = `
  .installer-comparison-page {
    min-height: 100vh;
    background: #0a0a0f;
    position: relative;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #fff;
  }
  .installer-comparison-page h1, .installer-comparison-page h2, .installer-comparison-page h3, .installer-comparison-page h4 {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
  }
  .page-bg {
    position: fixed; inset: 0;
    background-image: url('/graffiti-fist-sun.jpg');
    background-size: cover; background-position: center;
  }
  .page-overlay {
    position: fixed; inset: 0;
    background: linear-gradient(180deg, rgba(10,15,25,0.92) 0%, rgba(10,15,25,0.88) 100%);
  }
  .page-container {
    position: relative; z-index: 10;
    padding: 20px 24px 80px;
    max-width: 1400px; margin: 0 auto;
  }

  /* Header */
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
  .logo-link { display: flex; align-items: center; gap: 12px; color: #fff; font-weight: 800; font-size: 1.1rem; text-decoration: none; }
  .logo-icon { width: 38px; height: 38px; background: linear-gradient(135deg, #00FFD4, #00B894); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(0,212,170,0.4); }
  .header-actions { display: flex; gap: 12px; align-items: center; }
  .action-btn, .back-btn {
    display: flex; align-items: center; gap: 8px; padding: 10px 16px;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px; color: #fff; text-decoration: none; font-size: 0.9rem;
    font-weight: 600; transition: all 0.2s; cursor: pointer;
  }
  .action-btn:hover, .back-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(0,212,170,0.5); }

  /* Title */
  .page-title-section { text-align: center; margin-bottom: 32px; }
  .page-title { font-size: clamp(1.8rem, 4vw, 2.6rem); font-weight: 900; color: #fff; margin: 0 0 8px; }
  .gradient-text { background: linear-gradient(135deg, #00FFD4, #00B894); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .page-subtitle { color: rgba(255,255,255,0.6); font-size: 1rem; margin: 0; }

  /* Tab Nav */
  .tab-nav {
    display: flex; gap: 8px; margin-bottom: 24px;
    background: rgba(0,0,0,0.3); padding: 6px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    overflow-x: auto;
  }
  .tab-btn {
    display: flex; align-items: center; gap: 8px; padding: 12px 20px;
    background: transparent; border: none; color: rgba(255,255,255,0.5);
    font-size: 0.9rem; font-weight: 700; border-radius: 10px;
    cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .tab-btn:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.05); }
  .tab-btn.active { background: rgba(0,212,170,0.15); color: #00FFD4; }

  /* Insights Bar */
  .insights-bar {
    display: flex; gap: 20px; flex-wrap: wrap;
    padding: 16px 20px; margin-bottom: 20px;
    background: linear-gradient(135deg, rgba(0,212,170,0.08), rgba(0,100,80,0.04));
    border: 1px solid rgba(0,212,170,0.15); border-radius: 14px;
  }
  .insight-item { display: flex; align-items: center; gap: 10px; }
  .insight-val { font-size: 0.95rem; font-weight: 800; color: #fff; }
  .insight-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; }

  /* System Size */
  .system-size-bar {
    display: flex; align-items: center; gap: 20px;
    padding: 14px 20px; margin-bottom: 20px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
  }
  .size-label { display: flex; align-items: center; gap: 8px; color: rgba(255,255,255,0.8); font-size: 0.85rem; font-weight: 600; white-space: nowrap; }
  .size-slider-wrap { display: flex; align-items: center; gap: 16px; flex: 1; }
  .size-slider { flex: 1; accent-color: #00FFD4; }
  .size-value { font-size: 1.1rem; font-weight: 800; color: #00FFD4; min-width: 60px; }

  /* Controls Row */
  .controls-row { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
  .control-group-inline { display: flex; align-items: center; gap: 8px; }
  .ctrl-label { color: rgba(255,255,255,0.6); font-size: 0.85rem; font-weight: 600; }
  .ctrl-select {
    padding: 10px 14px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px; color: #fff; font-size: 0.9rem; outline: none; cursor: pointer;
  }
  .ctrl-select:focus { border-color: #00FFD4; }
  .view-toggle { display: flex; gap: 4px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 8px; }
  .vt-btn { padding: 8px 10px; background: transparent; border: none; color: rgba(255,255,255,0.5); border-radius: 6px; cursor: pointer; }
  .vt-btn.active { background: rgba(0,212,170,0.2); color: #00FFD4; }
  .filter-btn {
    display: flex; align-items: center; gap: 6px; padding: 10px 14px;
    background: rgba(0,212,170,0.1); border: 1px solid rgba(0,212,170,0.3);
    border-radius: 8px; color: #00FFD4; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  }

  /* Filters Panel */
  .filters-panel {
    padding: 16px 20px; margin-bottom: 16px;
    background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
  }
  .filter-row { display: flex; gap: 24px; flex-wrap: wrap; }
  .filter-group { flex: 1; min-width: 200px; }
  .filter-group label { display: block; color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-bottom: 8px; }
  .filter-group strong { color: #00FFD4; }
  .filter-group input[type="range"] { width: 100%; accent-color: #00FFD4; }

  /* Chips */
  .chips-section { margin-bottom: 20px; }
  .chips-label { color: rgba(255,255,255,0.6); font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 10px; }
  .chips-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .chip {
    display: flex; align-items: center; gap: 6px; padding: 8px 14px;
    background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.12);
    border-radius: 8px; color: rgba(255,255,255,0.7); font-size: 0.85rem;
    font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .chip:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.25); }
  .chip.selected { background: rgba(0,212,170,0.15); border-color: #00FFD4; color: #00FFD4; }
  .chip.disabled { opacity: 0.35; cursor: not-allowed; }
  .chip-score { padding: 2px 6px; background: rgba(0,0,0,0.3); border-radius: 4px; font-size: 0.7rem; }

  /* ═══ GRID VIEW ═══ */
  .comparison-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 20px; }

  .inst-card {
    background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px; overflow: hidden; transition: all 0.3s;
    display: flex; flex-direction: column;
  }
  .inst-card:hover { border-color: rgba(0,212,170,0.3); box-shadow: 0 8px 30px rgba(0,212,170,0.1); transform: translateY(-2px); }

  .card-top { padding: 20px; background: rgba(0,0,0,0.2); }
  .card-top-row { display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; }
  .inst-name { font-size: 1.2rem; font-weight: 800; margin: 0; color: #fff; }
  .top-badge { padding: 4px 10px; background: linear-gradient(135deg, #00FFD4, #00B894); border-radius: 6px; color: #0a1520; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; }
  .rating-row { margin-bottom: 12px; }
  .stars-display { display: flex; align-items: center; gap: 4px; }
  .rating-num { font-weight: 700; color: #fff; font-size: 0.95rem; margin-left: 4px; }
  .review-count { color: rgba(255,255,255,0.5); font-size: 0.8rem; }
  .score-badges { display: flex; gap: 8px; }
  .score-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; }
  .score-badge.primary { background: rgba(0,212,170,0.15); color: #00FFD4; }
  .score-badge.match { background: rgba(245,158,11,0.15); color: #f59e0b; }

  .card-pricing { padding: 20px; background: linear-gradient(135deg, rgba(0,212,170,0.06), transparent); border-top: 1px solid rgba(255,255,255,0.06); }
  .price-big { font-size: 2rem; font-weight: 900; color: #00FFD4; }
  .price-sub { font-size: 0.75rem; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-bottom: 12px; }
  .price-details { display: flex; flex-direction: column; gap: 6px; }
  .pd-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: rgba(255,255,255,0.7); }
  .pd-row span:last-child { font-weight: 600; color: #fff; }
  .pd-row.highlight span:last-child { color: #00FFD4; font-weight: 800; }

  .card-metrics { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.06); }
  .metric-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
  .metric-icon { color: #00FFD4; flex-shrink: 0; }
  .metric-label { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; }
  .metric-val { font-size: 0.85rem; color: #fff; font-weight: 600; }

  .card-proscons { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.06); }
  .proscons-col { display: flex; flex-direction: column; gap: 4px; }
  .pc-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
  .pc-title.pros { color: #00FFD4; }
  .pc-title.cons { color: #ef4444; }
  .pc-item { display: flex; align-items: start; gap: 6px; font-size: 0.78rem; line-height: 1.4; }
  .pc-item.pro { color: rgba(255,255,255,0.8); }
  .pc-item.pro svg { color: #00FFD4; flex-shrink: 0; margin-top: 2px; }
  .pc-item.con { color: rgba(255,255,255,0.6); }
  .pc-item.con svg { color: #ef4444; flex-shrink: 0; margin-top: 2px; }

  .card-roi-preview {
    padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(0,212,170,0.03);
  }
  .roi-preview-header { display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.6); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
  .roi-preview-header svg { color: #00FFD4; }
  .roi-preview-value { font-size: 1.4rem; font-weight: 900; color: #00FFD4; }
  .roi-preview-sub { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-bottom: 8px; }

  .card-actions { display: flex; gap: 8px; padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.06); margin-top: auto; }
  .card-action-btn {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 16px; border: none; border-radius: 10px;
    font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
    flex: 1;
  }
  .card-action-btn.primary { background: linear-gradient(135deg, #00FFD4, #00B894); color: #0a1520; }
  .card-action-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(0,212,170,0.4); }
  .card-action-btn.secondary { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.12); }
  .card-action-btn.secondary:hover { background: rgba(255,255,255,0.08); }

  /* Expanded Card */
  .card-expanded { padding: 20px; background: rgba(0,0,0,0.15); border-top: 1px solid rgba(255,255,255,0.06); }
  .expanded-section { margin-bottom: 20px; }
  .expanded-section h4 { font-size: 0.8rem; color: rgba(255,255,255,0.6); text-transform: uppercase; margin: 0 0 10px; }
  .warranty-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .w-item { padding: 10px; background: rgba(255,255,255,0.03); border-radius: 8px; }
  .w-label { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: capitalize; }
  .w-val { font-size: 1rem; font-weight: 700; color: #00FFD4; }
  .cert-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .cert-tag { padding: 5px 10px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.25); border-radius: 6px; color: #fbbf24; font-size: 0.75rem; font-weight: 600; }
  .equip-row { font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
  .equip-label { font-weight: 700; color: rgba(255,255,255,0.5); margin-right: 6px; }
  .contact-rows { display: flex; flex-direction: column; gap: 8px; }
  .contact-row { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
  .contact-row svg { color: #00FFD4; flex-shrink: 0; }
  .contact-row a { color: #00FFD4; text-decoration: none; }
  .contact-row a:hover { text-decoration: underline; }

  /* ═══ TABLE VIEW ═══ */
  .table-wrap { overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; }
  .comp-table { width: 100%; border-collapse: collapse; }
  .comp-table th { padding: 14px 16px; text-align: left; background: rgba(0,0,0,0.3); color: #00FFD4; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.08); white-space: nowrap; }
  .comp-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.9rem; white-space: nowrap; }
  .comp-table tr:hover { background: rgba(0,212,170,0.04); }
  .td-name { font-weight: 700; }
  .td-score { color: #00FFD4; font-weight: 800; }
  .td-match { color: #f59e0b; font-weight: 700; }
  .td-rating { display: flex; align-items: center; gap: 4px; }
  .td-bold { font-weight: 700; }
  .td-savings { color: #00FFD4; font-weight: 700; }
  .table-quote-btn {
    padding: 8px 14px; background: linear-gradient(135deg, #00FFD4, #00B894);
    border: none; border-radius: 6px; color: #0a1520; font-size: 0.8rem;
    font-weight: 700; cursor: pointer;
  }

  /* ═══ HEAD TO HEAD ═══ */
  .h2h-section { max-width: 900px; margin: 0 auto; }
  .h2h-selector { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; justify-content: center; flex-wrap: wrap; }
  .h2h-pick { display: flex; flex-direction: column; gap: 6px; }
  .h2h-pick label { font-size: 0.8rem; color: rgba(255,255,255,0.6); font-weight: 600; }
  .h2h-vs { font-size: 1.5rem; font-weight: 900; color: rgba(255,255,255,0.3); }

  .h2h-winner-banner {
    display: flex; align-items: center; gap: 12px; justify-content: center;
    padding: 16px 24px; margin-bottom: 24px;
    background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05));
    border: 1px solid rgba(251,191,36,0.3); border-radius: 12px;
    font-size: 1rem; color: #fff;
  }

  .h2h-battles { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .battle-card { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; overflow: hidden; }
  .battle-header { padding: 10px 16px; background: rgba(255,255,255,0.03); font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.6); text-transform: uppercase; text-align: center; }
  .battle-row { display: flex; align-items: center; padding: 14px 16px; }
  .battle-side { display: flex; align-items: center; gap: 6px; flex: 1; font-size: 0.85rem; color: rgba(255,255,255,0.6); }
  .battle-side.right { justify-content: flex-end; text-align: right; }
  .battle-side.winner { color: #fbbf24; font-weight: 700; }
  .battle-name { font-weight: 600; }
  .battle-diff { padding: 4px 10px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 0.8rem; font-weight: 700; color: #00FFD4; white-space: nowrap; }

  .h2h-radar { text-align: center; margin-bottom: 32px; }
  .h2h-radar h3 { font-size: 1.1rem; color: #fff; margin-bottom: 16px; }
  .radar-container { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .radar-legend { display: flex; gap: 24px; justify-content: center; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: rgba(255,255,255,0.8); }
  .legend-dot { width: 12px; height: 12px; border-radius: 50%; }

  .h2h-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .h2h-detail-card { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
  .h2h-detail-card h3 { font-size: 1.2rem; font-weight: 800; margin: 0 0 16px; }
  .h2h-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .h2h-stat { text-align: center; }
  .stat-val { font-size: 1.1rem; font-weight: 800; color: #fff; }
  .stat-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; }
  .h2h-proscons { font-size: 0.85rem; }

  /* ═══ MATCH SECTION ═══ */
  .match-section { max-width: 900px; margin: 0 auto; }
  .match-header { display: flex; align-items: start; gap: 16px; margin-bottom: 32px; }
  .match-header h2 { font-size: 1.4rem; margin: 0 0 4px; }
  .match-header p { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin: 0; }

  .pref-sliders { display: flex; flex-direction: column; gap: 20px; margin-bottom: 40px; }
  .pref-slider {
    padding: 16px 20px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
  }
  .pref-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .pref-label { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 700; color: #fff; }
  .pref-label svg { color: #00FFD4; }
  .pref-val { font-size: 1rem; font-weight: 800; color: #00FFD4; }
  .pref-desc { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .range-slider { width: 100%; accent-color: #00FFD4; }

  .match-results h3 { font-size: 1.2rem; color: #fff; margin-bottom: 16px; }
  .match-cards { display: flex; flex-direction: column; gap: 16px; }
  .match-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px; padding: 20px; transition: all 0.2s;
  }
  .match-card:hover { border-color: rgba(0,212,170,0.3); }
  .match-card.top-match { border-color: rgba(0,212,170,0.4); background: rgba(0,212,170,0.05); }
  .match-card-top { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .match-rank { font-size: 1.4rem; font-weight: 900; color: rgba(255,255,255,0.2); min-width: 36px; }
  .match-card-top h4 { font-size: 1.1rem; font-weight: 800; margin: 0; color: #fff; }
  .match-stars { display: flex; align-items: center; gap: 2px; margin-top: 4px; }
  .match-stars span { margin-left: 6px; color: rgba(255,255,255,0.7); font-weight: 600; font-size: 0.85rem; }
  .match-pct { display: flex; flex-direction: column; align-items: center; margin-left: auto; }
  .match-pct svg { color: #00FFD4; }
  .match-pct-val { font-size: 1.6rem; font-weight: 900; color: #00FFD4; }
  .match-pct-label { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; }

  .match-breakdown { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .mb-row { display: flex; align-items: center; gap: 10px; }
  .mb-label { width: 70px; font-size: 0.78rem; color: rgba(255,255,255,0.5); text-transform: capitalize; font-weight: 600; }
  .mb-bar-bg { flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
  .mb-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
  .mb-val { width: 30px; font-size: 0.8rem; font-weight: 700; color: #fff; text-align: right; }
  .match-quote-btn { width: 100%; }

  /* ═══ ROI SECTION ═══ */
  .roi-section { max-width: 1200px; margin: 0 auto; }
  .roi-header { display: flex; align-items: start; gap: 16px; margin-bottom: 24px; }
  .roi-header h2 { font-size: 1.4rem; margin: 0 0 4px; }
  .roi-header p { color: rgba(255,255,255,0.6); font-size: 0.9rem; margin: 0; }

  .roi-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 40px; }
  .roi-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 24px; }
  .roi-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .roi-card-header h3 { font-size: 1.1rem; font-weight: 800; margin: 0; }
  .roi-badge { padding: 6px 12px; background: rgba(0,212,170,0.15); border-radius: 8px; color: #00FFD4; font-size: 0.85rem; font-weight: 700; }

  .roi-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .roi-stat { text-align: center; padding: 12px 8px; background: rgba(0,0,0,0.2); border-radius: 10px; }
  .roi-stat.highlight { background: rgba(0,212,170,0.1); }
  .roi-stat-val { font-size: 1.1rem; font-weight: 800; color: #fff; }
  .roi-stat.highlight .roi-stat-val { color: #00FFD4; }
  .roi-stat-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.5); text-transform: uppercase; margin-top: 2px; }

  .roi-chart-area { margin-bottom: 16px; overflow: hidden; }

  .roi-milestones { display: flex; gap: 8px; flex-wrap: wrap; }
  .milestone { flex: 1; min-width: 60px; text-align: center; padding: 8px 4px; background: rgba(0,0,0,0.2); border-radius: 8px; }
  .ms-year { font-size: 0.7rem; color: rgba(255,255,255,0.5); font-weight: 600; }
  .ms-val { font-size: 0.8rem; font-weight: 700; }
  .ms-val.pos { color: #00FFD4; }
  .ms-val.neg { color: #ef4444; }

  .roi-comparison-chart {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px; padding: 24px;
  }
  .roi-comparison-chart h3 { font-size: 1.1rem; font-weight: 800; margin: 0 0 20px; }

  /* ═══ MODAL ═══ */
  .modal-backdrop {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .modal {
    background: #141420; border: 1px solid rgba(255,255,255,0.12);
    border-radius: 20px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto;
  }
  .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 24px 24px 0; }
  .modal-header h2 { font-size: 1.2rem; font-weight: 800; margin: 0; }
  .modal-close { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; padding: 4px; }
  .modal-body { padding: 24px; }

  .quote-summary { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; padding: 16px; background: rgba(0,212,170,0.08); border-radius: 12px; }
  .qs-item { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: rgba(255,255,255,0.8); }
  .qs-item svg { color: #00FFD4; }

  .quote-form { display: flex; flex-direction: column; gap: 16px; }
  .qf-group { display: flex; flex-direction: column; gap: 6px; }
  .qf-group label { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.7); }
  .qf-group input, .qf-group textarea {
    padding: 12px 16px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px; color: #fff; font-size: 0.95rem; outline: none; font-family: inherit;
  }
  .qf-group input:focus, .qf-group textarea:focus { border-color: #00FFD4; }
  .qf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .quote-submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 14px; background: linear-gradient(135deg, #00FFD4, #00B894);
    border: none; border-radius: 12px; color: #0a1520;
    font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
  }
  .quote-submit-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,212,170,0.4); }

  .quote-success { text-align: center; padding: 60px 24px; }
  .quote-success-icon { width: 80px; height: 80px; background: rgba(0,212,170,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .quote-success-icon svg { color: #00FFD4; }
  .quote-success h2 { font-size: 1.5rem; margin: 0 0 8px; }
  .quote-success p { color: rgba(255,255,255,0.6); margin: 0; }

  /* ═══ RESPONSIVE ═══ */
  @media (max-width: 768px) {
    .comparison-grid { grid-template-columns: 1fr; }
    .h2h-details { grid-template-columns: 1fr; }
    .roi-cards { grid-template-columns: 1fr; }
    .card-proscons { grid-template-columns: 1fr; }
    .h2h-stat-grid { grid-template-columns: repeat(2, 1fr); }
    .header-actions { gap: 8px; }
    .insights-bar { flex-direction: column; gap: 12px; }
    .tab-nav { gap: 4px; }
    .tab-btn { padding: 10px 14px; font-size: 0.8rem; }
    .qf-row { grid-template-columns: 1fr; }
  }
`;
