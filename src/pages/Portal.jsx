import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Search, ArrowRight, Loader2, DollarSign } from "lucide-react";

// Get project from local storage
const getLocalProject = (id) => {
  const projects = JSON.parse(localStorage.getItem("pttp_projects") || "[]");
  return projects.find((p) => p.id === id || p.id.includes(id));
};

export default function Portal() {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async (e) => {
    e.preventDefault();
    setError("");

    if (!projectId) {
      setError("Please enter your reference ID");
      return;
    }

    setIsLoading(true);

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const project = getLocalProject(projectId.toUpperCase());
      if (project) {
        navigate(`/project/${project.id}`);
      } else {
        setError("Reference not found. Please check your ID and try again.");
      }
    } catch (err) {
      console.error("Lookup error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <div className="portal-page">
        <div className="form-card login-card">
          <div className="form-header">
            <div
              style={{
                width: 64,
                height: 64,
                background: "var(--gray-100)",
                borderRadius: "var(--radius-full)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <Search size={28} style={{ color: "var(--primary)" }} />
            </div>
            <h2 className="form-title">Customer Portal</h2>
            <p className="form-subtitle">
              Check your project status, documents, and payments
            </p>
          </div>

          <form onSubmit={handleLookup}>
            <div className="form-group">
              <label className="form-label">Project ID *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., PTTP-1234567890 or 7834"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setError("");
                }}
              />
              <p className="form-help">
                Found in your confirmation email or welcome letter
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Email (optional)</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="form-help">For additional verification</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: "100%", marginTop: 8 }}
            >
              {isLoading ? (
                <>
                  <Loader2
                    size={18}
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                  Looking up...
                </>
              ) : (
                <>
                  View My Project
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 32,
              paddingTop: 24,
              borderTop: "1px solid var(--gray-200)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--gray-500)", marginBottom: 12 }}>
              Don't have a project yet?
            </p>
            <Link to="/qualify" className="btn btn-outline btn-sm">
              Check Eligibility
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
