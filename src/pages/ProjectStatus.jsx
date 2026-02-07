import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Zap,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertCircle,
  MapPin,
  User,
  Mail,
  Phone,
  Home,
  Sun,
  Battery,
  Leaf,
} from "lucide-react";
import SmsHistoryPanel from "../components/SmsHistoryPanel";

// Get project from local storage
const getLocalProject = (id) => {
  const projects = JSON.parse(localStorage.getItem("pttp_projects") || "[]");
  return projects.find((p) => p.id === id);
};

export default function ProjectStatus() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Small delay for UX
    const timer = setTimeout(() => {
      const data = getLocalProject(id);
      if (data) {
        setProject(data);
      } else {
        setError("Reference not found. Please check your ID and try again.");
      }
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);

  if (isLoading) {
    return (
      <div className="page">
        <header className="header">
          <div className="container header-content">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <Zap size={20} />
              </div>
              Power to the People
            </Link>
          </div>
        </header>
        <div className="loading-overlay">
          <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page">
        <header className="header">
          <div className="container header-content">
            <Link to="/" className="logo">
              <div className="logo-icon">
                <Zap size={20} />
              </div>
              Power to the People
            </Link>
          </div>
        </header>
        <div style={{ padding: "80px 20px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "#fef2f2",
              borderRadius: "var(--radius-full)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <AlertCircle size={32} style={{ color: "var(--danger)" }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Not Found</h2>
          <p style={{ color: "var(--gray-500)", marginBottom: 24 }}>{error}</p>
          <Link to="/portal" className="btn btn-primary">
            <ArrowLeft size={18} />
            Back to Lookup
          </Link>
        </div>
      </div>
    );
  }

  const isEligible = project.energyCommunity?.eligible;

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="container header-content">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <Zap size={20} />
            </div>
            Power to the People
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">
              Home
            </Link>
            <Link to="/qualify" className="nav-link">
              Check Eligibility
            </Link>
          </nav>
        </div>
      </header>

      {/* Status Content */}
      <section className="status-page">
        <div className="container">
          <Link
            to="/portal"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--gray-500)",
              textDecoration: "none",
              marginBottom: 20,
            }}
          >
            <ArrowLeft size={18} />
            Back to Lookup
          </Link>

          <div className="status-header">
            <h1 className="status-title">Qualification Result</h1>
            <p className="status-subtitle">Reference: {project.id}</p>
          </div>

          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            {/* Energy Community Status Card */}
            <div
              className="card"
              style={{
                marginBottom: 24,
                textAlign: "center",
                background: isEligible
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05))"
                  : "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))",
                border: `2px solid ${isEligible ? "var(--primary)" : "var(--accent)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                {isEligible ? (
                  <CheckCircle size={32} style={{ color: "var(--primary)" }} />
                ) : (
                  <XCircle size={32} style={{ color: "var(--accent)" }} />
                )}
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
                  {isEligible ? "Eligible!" : "Not Eligible"}
                </h2>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginBottom: 16,
                }}
              >
                <MapPin size={18} style={{ color: "var(--gray-500)" }} />
                <span style={{ fontSize: "1rem", color: "var(--gray-600)" }}>
                  {project.address?.county} County
                  {project.energyCommunity?.msa
                    ? ` (${project.energyCommunity.msa} MSA)`
                    : ""}
                </span>
              </div>

              <p
                style={{
                  fontSize: "1rem",
                  color: "var(--gray-600)",
                  marginBottom: 0,
                }}
              >
                {isEligible
                  ? "Your location qualifies for federal energy community incentives under IRS Notice 2025-31. This may increase your savings by up to 10%."
                  : "Your location is not currently in a designated energy community, but you may still qualify for other federal and state incentives."}
              </p>
            </div>

            {/* System Design Card */}
            {project.systemDesign && (
              <div
                className="card"
                style={{
                  marginBottom: 24,
                  background:
                    "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.02))",
                  border: "2px solid #3b82f6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <Sun size={24} style={{ color: "#3b82f6" }} />
                  <h3
                    style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}
                  >
                    Your Custom System Design
                  </h3>
                </div>

                {/* Solar Panels */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px",
                    background: "white",
                    borderRadius: "var(--radius)",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                      borderRadius: "var(--radius-full)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sun size={24} style={{ color: "white" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
                      {project.systemDesign.panels.count} SolRite Panels
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--gray-500)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {project.systemDesign.panels.systemSizeKw.toFixed(1)} kW
                      System
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        color: "var(--primary)",
                        fontSize: "1rem",
                      }}
                    >
                      {project.systemDesign.usage.actualOffset}%
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--gray-500)",
                        fontSize: "0.75rem",
                      }}
                    >
                      offset
                    </p>
                  </div>
                </div>

                {/* Batteries */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px",
                    background: "white",
                    borderRadius: "var(--radius)",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      borderRadius: "var(--radius-full)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Battery size={24} style={{ color: "white" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>
                      {project.systemDesign.batteries.count} Battery Storage
                      Units
                    </p>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--gray-500)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {project.systemDesign.batteries.totalCapacityKwh} kWh
                      Total
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        margin: 0,
                        fontWeight: 700,
                        color: "var(--primary)",
                        fontSize: "1rem",
                      }}
                    >
                      {project.systemDesign.batteries.peakPowerKw} kW
                    </p>
                    <p
                      style={{
                        margin: 0,
                        color: "var(--gray-500)",
                        fontSize: "0.75rem",
                      }}
                    >
                      peak
                    </p>
                  </div>
                </div>

                {/* Production Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px",
                      background: "white",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#3b82f6",
                      }}
                    >
                      {project.systemDesign.production.annualKwh.toLocaleString()}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "var(--gray-500)",
                        fontSize: "0.7rem",
                      }}
                    >
                      kWh/year
                    </p>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px",
                      background: "white",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#10b981",
                      }}
                    >
                      {
                        project.systemDesign.environmental
                          .carbonOffsetTonsPerYear
                      }
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "var(--gray-500)",
                        fontSize: "0.7rem",
                      }}
                    >
                      tons CO₂/yr
                    </p>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      padding: "10px",
                      background: "white",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "#f59e0b",
                      }}
                    >
                      {project.systemDesign.environmental.treesEquivalent}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        color: "var(--gray-500)",
                        fontSize: "0.7rem",
                      }}
                    >
                      trees equiv
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submission Details */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3
                style={{
                  marginBottom: 16,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                }}
              >
                Submission Details
              </h3>

              <div className="info-row">
                <span className="info-label">
                  <User
                    size={16}
                    style={{ marginRight: 8, verticalAlign: "middle" }}
                  />
                  Name
                </span>
                <span className="info-value">
                  {project.customer?.firstName} {project.customer?.lastName}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">
                  <Mail
                    size={16}
                    style={{ marginRight: 8, verticalAlign: "middle" }}
                  />
                  Email
                </span>
                <span className="info-value">{project.customer?.email}</span>
              </div>

              {project.customer?.phone && (
                <div className="info-row">
                  <span className="info-label">
                    <Phone
                      size={16}
                      style={{ marginRight: 8, verticalAlign: "middle" }}
                    />
                    Phone
                  </span>
                  <span className="info-value">{project.customer?.phone}</span>
                </div>
              )}

              <div className="info-row">
                <span className="info-label">
                  <Home
                    size={16}
                    style={{ marginRight: 8, verticalAlign: "middle" }}
                  />
                  Address
                </span>
                <span className="info-value">
                  {project.address?.street}
                  <br />
                  {project.address?.city}, {project.address?.state}{" "}
                  {project.address?.postalCode}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Submitted</span>
                <span className="info-value">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* SMS Notifications */}
            {project.customer?.phone && (
              <div style={{ marginBottom: 24 }}>
                <SmsHistoryPanel projectId={project.id} />
              </div>
            )}

            {/* Next Steps */}
            <div className="card">
              <h3
                style={{
                  marginBottom: 16,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                }}
              >
                What's Next?
              </h3>
              <p style={{ color: "var(--gray-600)", marginBottom: 16 }}>
                {isEligible
                  ? "Our team will review your information and contact you within 24-48 hours to discuss your options and schedule a site assessment."
                  : "Even though your location isn't in an energy community, you may still qualify for other incentives. Our team will review your submission and contact you with available options."}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Link to="/" className="btn btn-secondary">
                  Back to Home
                </Link>
                <Link to="/qualify" className="btn btn-primary">
                  Check Another Address
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
