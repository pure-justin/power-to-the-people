import { useState, useEffect } from "react";
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
  Calendar,
  Battery,
  Sun,
  AlertCircle,
} from "lucide-react";
import {
  getAllInstallers,
  compareInstallers,
  getInstallerScore,
  getRecommendedInstallers,
} from "../services/installerService";

export default function InstallerComparison() {
  const [selectedInstallers, setSelectedInstallers] = useState([
    "freedom-solar",
    "sunpower",
    "tesla-energy",
  ]);
  const [systemSize, setSystemSize] = useState(10);
  const [comparisonData, setComparisonData] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [sortBy, setSortBy] = useState("score");
  const [filterPriority, setFilterPriority] = useState("balanced");

  const allInstallers = getAllInstallers();

  useEffect(() => {
    const data = compareInstallers(selectedInstallers, systemSize);
    setComparisonData(data);
  }, [selectedInstallers, systemSize]);

  const toggleInstallerSelection = (installerId) => {
    if (selectedInstallers.includes(installerId)) {
      if (selectedInstallers.length > 1) {
        setSelectedInstallers(
          selectedInstallers.filter((id) => id !== installerId),
        );
      }
    } else {
      if (selectedInstallers.length < 4) {
        setSelectedInstallers([...selectedInstallers, installerId]);
      }
    }
  };

  const toggleCardExpanded = (installerId) => {
    setExpandedCards({
      ...expandedCards,
      [installerId]: !expandedCards[installerId],
    });
  };

  const getSortedData = () => {
    const data = [...comparisonData];
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
          const aWeeks = parseInt(a.installationTime.split("-")[0]);
          const bWeeks = parseInt(b.installationTime.split("-")[0]);
          return aWeeks - bWeeks;
        });
      case "score":
      default:
        return data.sort((a, b) => {
          const aScore = getInstallerScore(a).total;
          const bScore = getInstallerScore(b).total;
          return bScore - aScore;
        });
    }
  };

  const recommendedInstallers = getRecommendedInstallers({
    priority: filterPriority,
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

      <style>{`
        .installer-comparison-page {
          min-height: 100vh;
          background: #0a0a0f;
          position: relative;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .installer-comparison-page h1, .installer-comparison-page h2, .installer-comparison-page h3 {
          font-family: 'Space Grotesk', 'Inter', sans-serif;
        }

        .page-bg {
          position: fixed;
          inset: 0;
          background-image: url('/graffiti-fist-sun.jpg');
          background-size: cover;
          background-position: center;
        }

        .page-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(10, 15, 25, 0.92) 0%,
            rgba(10, 15, 25, 0.88) 100%
          );
        }

        .page-container {
          position: relative;
          z-index: 10;
          padding: 20px 24px 60px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
          font-weight: 800;
          font-size: 1.1rem;
          text-decoration: none;
        }

        .logo-icon {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #00FFD4, #00B894);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 212, 170, 0.4);
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #fff;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(0, 212, 170, 0.5);
        }

        .page-title-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-title {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 900;
          color: #fff;
          margin: 0 0 12px;
        }

        .gradient-text {
          background: linear-gradient(135deg, #00FFD4, #00B894);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-subtitle {
          color: rgba(255, 255, 255, 0.7);
          font-size: 1rem;
          margin: 0;
        }

        /* Controls Section */
        .controls-section {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .controls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .control-input {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          outline: none;
        }

        .control-input:focus {
          border-color: #00FFD4;
        }

        .control-select {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          outline: none;
          cursor: pointer;
        }

        .control-select:focus {
          border-color: #00FFD4;
        }

        /* Recommended Section */
        .recommended-section {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.15), rgba(0, 100, 80, 0.1));
          border: 2px solid rgba(0, 212, 170, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .recommended-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .recommended-header h2 {
          color: #fff;
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0;
        }

        .recommended-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .recommended-card {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .recommended-card:hover {
          background: rgba(0, 0, 0, 0.5);
          border-color: rgba(0, 212, 170, 0.5);
          transform: translateY(-2px);
        }

        .recommended-card.selected {
          background: rgba(0, 212, 170, 0.15);
          border-color: #00FFD4;
        }

        .recommended-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .recommended-name {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .recommended-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #fbbf24;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .recommended-features {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .feature-badge {
          padding: 4px 10px;
          background: rgba(0, 212, 170, 0.2);
          border-radius: 6px;
          color: #00FFD4;
          font-size: 0.75rem;
          font-weight: 600;
        }

        /* Installer Selection */
        .installer-selection {
          margin-bottom: 32px;
        }

        .selection-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .selection-title {
          color: #fff;
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
        }

        .selection-count {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }

        .installer-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }

        .installer-chip {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .installer-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .installer-chip.selected {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(0, 184, 148, 0.1));
          border-color: #00FFD4;
          color: #00FFD4;
        }

        .installer-chip.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Comparison Cards */
        .comparison-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .installer-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s;
        }

        .installer-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 212, 170, 0.3);
          box-shadow: 0 8px 30px rgba(0, 212, 170, 0.15);
        }

        .card-header {
          background: rgba(0, 0, 0, 0.3);
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .installer-name-row {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 12px;
        }

        .installer-name {
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }

        .installer-badge {
          padding: 4px 10px;
          background: linear-gradient(135deg, #00FFD4, #00B894);
          border-radius: 6px;
          color: #0a1520;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .rating-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .rating-display {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rating-stars {
          display: flex;
          gap: 2px;
          color: #fbbf24;
        }

        .rating-value {
          font-weight: 700;
          color: #fff;
          font-size: 1rem;
        }

        .rating-reviews {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85rem;
        }

        .installer-score {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(0, 212, 170, 0.15);
          border-radius: 8px;
        }

        .score-value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #00FFD4;
        }

        .score-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }

        /* Pricing Section */
        .pricing-section {
          padding: 20px;
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.08), rgba(0, 100, 80, 0.05));
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .price-main {
          text-align: center;
          margin-bottom: 16px;
        }

        .price-value {
          font-size: 2.2rem;
          font-weight: 900;
          color: #00FFD4;
          display: block;
        }

        .price-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
        }

        .price-breakdown {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .price-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 0.85rem;
        }

        .price-item-label {
          color: rgba(255, 255, 255, 0.7);
        }

        .price-item-value {
          color: #fff;
          font-weight: 700;
        }

        .price-monthly {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: 16px;
        }

        .monthly-payment {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
        }

        .monthly-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Details Section */
        .details-section {
          padding: 20px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-icon {
          flex-shrink: 0;
          color: #00FFD4;
        }

        .detail-content {
          flex: 1;
        }

        .detail-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .detail-value {
          font-size: 0.9rem;
          color: #fff;
          font-weight: 600;
        }

        /* Pros/Cons */
        .pros-cons-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .pros-list, .cons-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-title-small {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .pros-list .section-title-small {
          color: #00FFD4;
        }

        .cons-list .section-title-small {
          color: #ef4444;
        }

        .pros-list li, .cons-list li {
          display: flex;
          align-items: start;
          gap: 6px;
          font-size: 0.8rem;
          line-height: 1.4;
        }

        .pros-list li {
          color: rgba(255, 255, 255, 0.8);
        }

        .cons-list li {
          color: rgba(255, 255, 255, 0.6);
        }

        .pros-list svg {
          color: #00FFD4;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .cons-list svg {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 2px;
        }

        /* Expand Button */
        .expand-button {
          width: 100%;
          padding: 14px;
          background: rgba(0, 0, 0, 0.3);
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          color: #00FFD4;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .expand-button:hover {
          background: rgba(0, 212, 170, 0.1);
        }

        /* Expanded Details */
        .expanded-details {
          padding: 20px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .warranty-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .warranty-item {
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .warranty-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .warranty-value {
          font-size: 1rem;
          font-weight: 700;
          color: #00FFD4;
        }

        .certifications-section {
          margin-bottom: 20px;
        }

        .cert-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .cert-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .cert-badge {
          padding: 6px 12px;
          background: rgba(251, 191, 36, 0.15);
          border: 1px solid rgba(251, 191, 36, 0.3);
          border-radius: 6px;
          color: #fbbf24;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .contact-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .contact-item svg {
          color: #00FFD4;
        }

        .contact-item a {
          color: #00FFD4;
          text-decoration: none;
        }

        .contact-item a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .comparison-grid {
            grid-template-columns: 1fr;
          }

          .pros-cons-section {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

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
          <Link to="/success" className="back-btn">
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>

        {/* Title */}
        <div className="page-title-section">
          <h1 className="page-title">
            Compare <span className="gradient-text">Solar Installers</span>
          </h1>
          <p className="page-subtitle">
            Find the perfect installer for your {systemSize} kW solar + battery
            system
          </p>
        </div>

        {/* Controls */}
        <div className="controls-section">
          <div className="controls-grid">
            <div className="control-group">
              <label className="control-label">
                <Sun size={16} />
                System Size (kW)
              </label>
              <input
                type="number"
                className="control-input"
                value={systemSize}
                onChange={(e) =>
                  setSystemSize(parseFloat(e.target.value) || 10)
                }
                min="5"
                max="20"
                step="0.5"
              />
            </div>
            <div className="control-group">
              <label className="control-label">
                <TrendingUp size={16} />
                Sort By
              </label>
              <select
                className="control-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="score">Overall Score</option>
                <option value="price">Best Price</option>
                <option value="rating">Highest Rating</option>
                <option value="satisfaction">Customer Satisfaction</option>
                <option value="speed">Fastest Installation</option>
              </select>
            </div>
            <div className="control-group">
              <label className="control-label">
                <Shield size={16} />
                Priority
              </label>
              <select
                className="control-select"
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="balanced">Balanced</option>
                <option value="price">Best Price</option>
                <option value="quality">Best Quality</option>
                <option value="speed">Fastest Install</option>
              </select>
            </div>
          </div>
        </div>

        {/* Recommended Installers */}
        <div className="recommended-section">
          <div className="recommended-header">
            <Award size={24} color="#00FFD4" />
            <h2>Recommended for You</h2>
          </div>
          <div className="recommended-grid">
            {recommendedInstallers.map((installer) => (
              <div
                key={installer.id}
                className={`recommended-card ${selectedInstallers.includes(installer.id) ? "selected" : ""}`}
                onClick={() => toggleInstallerSelection(installer.id)}
              >
                <div className="recommended-card-header">
                  <h3 className="recommended-name">{installer.name}</h3>
                  <div className="recommended-rating">
                    <Star size={16} fill="#fbbf24" />
                    {installer.rating}
                  </div>
                </div>
                <div className="recommended-features">
                  {installer.specialties.slice(0, 2).map((specialty, i) => (
                    <span key={i} className="feature-badge">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Installer Selection */}
        <div className="installer-selection">
          <div className="selection-header">
            <h3 className="selection-title">All Installers</h3>
            <span className="selection-count">
              {selectedInstallers.length} of 4 selected
            </span>
          </div>
          <div className="installer-chips">
            {allInstallers.map((installer) => (
              <button
                key={installer.id}
                className={`installer-chip ${
                  selectedInstallers.includes(installer.id)
                    ? "selected"
                    : selectedInstallers.length >= 4
                      ? "disabled"
                      : ""
                }`}
                onClick={() => toggleInstallerSelection(installer.id)}
                disabled={
                  !selectedInstallers.includes(installer.id) &&
                  selectedInstallers.length >= 4
                }
              >
                {installer.name}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="comparison-grid">
          {getSortedData().map((installer) => {
            const score = getInstallerScore(installer);
            const isExpanded = expandedCards[installer.id];

            return (
              <div key={installer.id} className="installer-card">
                {/* Header */}
                <div className="card-header">
                  <div className="installer-name-row">
                    <h2 className="installer-name">{installer.name}</h2>
                    {score.total >= 90 && (
                      <span className="installer-badge">Top Rated</span>
                    )}
                  </div>
                  <div className="rating-row">
                    <div className="rating-display">
                      <div className="rating-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            fill={
                              i < Math.floor(installer.rating)
                                ? "#fbbf24"
                                : "none"
                            }
                            color="#fbbf24"
                          />
                        ))}
                      </div>
                      <span className="rating-value">{installer.rating}</span>
                      <span className="rating-reviews">
                        ({installer.reviews.toLocaleString()} reviews)
                      </span>
                    </div>
                  </div>
                  <div className="installer-score">
                    <Award size={18} />
                    <div>
                      <div className="score-value">{score.total}/100</div>
                      <div className="score-label">Overall Score</div>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="pricing-section">
                  <div className="price-main">
                    <span className="price-value">
                      ${installer.pricing.netCost.toLocaleString()}
                    </span>
                    <span className="price-label">
                      After Federal Tax Credit
                    </span>
                  </div>
                  <div className="price-breakdown">
                    <div className="price-item">
                      <span className="price-item-label">Solar System</span>
                      <span className="price-item-value">
                        ${installer.pricing.basePrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="price-item">
                      <span className="price-item-label">60 kWh Battery</span>
                      <span className="price-item-value">
                        ${installer.pricing.batteryCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="price-item">
                      <span className="price-item-label">Total System</span>
                      <span className="price-item-value">
                        ${installer.pricing.totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="price-item">
                      <span className="price-item-label">Tax Credit (30%)</span>
                      <span
                        className="price-item-value"
                        style={{ color: "#00FFD4" }}
                      >
                        -${installer.pricing.federalTaxCredit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="price-monthly">
                    <div className="monthly-payment">
                      ${installer.pricing.monthlyPayment.toLocaleString()}/mo
                    </div>
                    <div className="monthly-label">
                      25-year financing @ {installer.financing.apr}% APR
                    </div>
                  </div>
                </div>

                {/* Key Details */}
                <div className="details-section">
                  <div className="detail-row">
                    <div className="detail-icon">
                      <Clock size={20} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Installation Time</div>
                      <div className="detail-value">
                        {installer.installationTime}
                      </div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-icon">
                      <Users size={20} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Experience</div>
                      <div className="detail-value">
                        {installer.yearsInBusiness} years |{" "}
                        {installer.installsCompleted.toLocaleString()} installs
                      </div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-icon">
                      <TrendingUp size={20} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Customer Satisfaction</div>
                      <div className="detail-value">
                        {installer.customerSatisfaction}%
                      </div>
                    </div>
                  </div>
                  <div className="detail-row">
                    <div className="detail-icon">
                      <Battery size={20} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Battery Options</div>
                      <div className="detail-value">
                        {installer.equipmentBrands.batteries.join(", ")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pros/Cons */}
                <div className="pros-cons-section">
                  <div className="pros-list">
                    <div className="section-title-small">Pros</div>
                    {installer.pros.map((pro, i) => (
                      <li key={i}>
                        <Check size={14} />
                        {pro}
                      </li>
                    ))}
                  </div>
                  <div className="cons-list">
                    <div className="section-title-small">Cons</div>
                    {installer.cons.map((con, i) => (
                      <li key={i}>
                        <X size={14} />
                        {con}
                      </li>
                    ))}
                  </div>
                </div>

                {/* Expand Button */}
                <button
                  className="expand-button"
                  onClick={() => toggleCardExpanded(installer.id)}
                >
                  {isExpanded ? "Show Less" : "Show More Details"}
                  {isExpanded ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="expanded-details">
                    {/* Warranty */}
                    <div className="certifications-section">
                      <div className="cert-label">Warranty Coverage</div>
                      <div className="warranty-grid">
                        <div className="warranty-item">
                          <div className="warranty-label">Workmanship</div>
                          <div className="warranty-value">
                            {installer.warranty.workmanship} years
                          </div>
                        </div>
                        <div className="warranty-item">
                          <div className="warranty-label">Panels</div>
                          <div className="warranty-value">
                            {installer.warranty.panels} years
                          </div>
                        </div>
                        <div className="warranty-item">
                          <div className="warranty-label">Inverters</div>
                          <div className="warranty-value">
                            {installer.warranty.inverters} years
                          </div>
                        </div>
                        <div className="warranty-item">
                          <div className="warranty-label">Batteries</div>
                          <div className="warranty-value">
                            {installer.warranty.batteries} years
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Certifications */}
                    <div className="certifications-section">
                      <div className="cert-label">Certifications</div>
                      <div className="cert-badges">
                        {installer.certifications.map((cert, i) => (
                          <span key={i} className="cert-badge">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="certifications-section">
                      <div className="cert-label">Contact Information</div>
                      <div className="contact-section">
                        <div className="contact-item">
                          <Phone size={16} />
                          <a href={`tel:${installer.contactInfo.phone}`}>
                            {installer.contactInfo.phone}
                          </a>
                        </div>
                        <div className="contact-item">
                          <Mail size={16} />
                          <a href={`mailto:${installer.contactInfo.email}`}>
                            {installer.contactInfo.email}
                          </a>
                        </div>
                        <div className="contact-item">
                          <Globe size={16} />
                          <a
                            href={installer.contactInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {installer.contactInfo.website}
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
      </div>
    </div>
  );
}
