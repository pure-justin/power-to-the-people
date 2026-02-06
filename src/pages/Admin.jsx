import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  Users,
  FileText,
  TrendingUp,
  LogOut,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Battery,
  MapPin,
  Calendar,
  Mail,
  Phone,
  DollarSign,
  AlertCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import {
  onAuthChange,
  getUserProfile,
  logout,
  signInWithEmail,
} from "../services/firebase";
import { getAdminProjects, getAdminStats } from "../services/adminService";
import ProjectDetailModal from "../components/ProjectDetailModal";
import AdminAnalytics from "../components/AdminAnalytics";

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard state
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Check authentication status
  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      setIsLoading(true);
      try {
        if (authUser && !authUser.isAnonymous) {
          const profile = await getUserProfile(authUser.uid);

          // Check if user is admin
          if (profile && profile.role === "admin") {
            setUser(authUser);
            setUserProfile(profile);
            setIsAuthenticated(true);
            await loadDashboardData();
          } else {
            // Not an admin, sign out
            await logout();
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      const [projectsData, statsData] = await Promise.all([
        getAdminProjects(),
        getAdminStats(),
      ]);
      setProjects(projectsData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      await signInWithEmail(email, password);
      // Auth state change will handle the rest
    } catch (error) {
      console.error("Login error:", error);
      setLoginError(
        error.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : "Login failed. Please try again.",
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Handle project click
  const handleProjectClick = (project) => {
    setSelectedProject(project);
  };

  // Handle modal update (refresh data after changes)
  const handleModalUpdate = async () => {
    await loadDashboardData();
  };

  // Filter and search projects
  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      searchTerm === "" ||
      project.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to CSV
  const handleExport = () => {
    const csv = [
      [
        "Project ID",
        "Status",
        "Customer Name",
        "Email",
        "Phone",
        "Address",
        "System Size (kW)",
        "Battery Size (kWh)",
        "Created Date",
      ],
      ...filteredProjects.map((p) => [
        p.id,
        p.status,
        p.customerName || "",
        p.email || "",
        p.phone || "",
        p.address || "",
        p.systemSize || "",
        p.batterySize || "",
        p.createdAt?.toDate?.()?.toLocaleDateString() || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `power-to-the-people-projects-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "submitted":
        return "#3b82f6";
      case "reviewing":
        return "#f59e0b";
      case "approved":
        return "#10b981";
      case "scheduled":
        return "#8b5cf6";
      case "completed":
        return "#059669";
      case "cancelled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "submitted":
        return <FileText size={16} />;
      case "reviewing":
        return <Clock size={16} />;
      case "approved":
        return <CheckCircle size={16} />;
      case "scheduled":
        return <Calendar size={16} />;
      case "completed":
        return <CheckCircle size={16} />;
      case "cancelled":
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid #e5e7eb",
              borderTopColor: "#10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Login form
  if (!isAuthenticated) {
    return (
      <div className="page">
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .admin-login-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .admin-login-card {
            background: white;
            border-radius: 16px;
            padding: 48px;
            max-width: 420px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .admin-login-header {
            text-align: center;
            margin-bottom: 32px;
          }

          .admin-logo-icon {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
          }

          .admin-login-title {
            font-size: 1.75rem;
            font-weight: 800;
            color: #111827;
            margin-bottom: 8px;
          }

          .admin-login-subtitle {
            color: #6b7280;
            font-size: 0.95rem;
          }

          .login-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            gap: 8px;
          }
        `}</style>

        <div className="admin-login-page">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <div className="admin-logo-icon">
                <Zap size={32} />
              </div>
              <h1 className="admin-login-title">Admin Dashboard</h1>
              <p className="admin-login-subtitle">
                Power to the People Management
              </p>
            </div>

            {loginError && (
              <div className="login-error">
                <AlertCircle size={16} />
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={isLoggingIn}
                style={{ width: "100%", marginTop: "24px" }}
              >
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Link
                to="/"
                style={{
                  color: "#6b7280",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                }}
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="page">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .admin-page {
          background: #f9fafb;
          min-height: 100vh;
        }

        .admin-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 0;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .admin-header-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .admin-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 700;
          color: #111827;
          text-decoration: none;
          font-size: 1.1rem;
        }

        .admin-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .admin-user-menu {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .admin-user-info {
          text-align: right;
        }

        .admin-user-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #111827;
        }

        .admin-user-role {
          font-size: 0.8rem;
          color: #6b7280;
        }

        .admin-logout-btn {
          background: #f3f4f6;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .admin-logout-btn:hover {
          background: #e5e7eb;
        }

        .admin-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 24px;
        }

        .admin-title {
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
          margin-bottom: 8px;
        }

        .admin-subtitle {
          color: #6b7280;
          margin-bottom: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s;
        }

        .stat-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }

        .stat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .stat-label {
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #111827;
        }

        .stat-change {
          font-size: 0.85rem;
          color: #10b981;
          margin-top: 4px;
        }

        .projects-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }

        .projects-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .projects-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }

        .projects-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          flex: 1;
          min-width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .search-input {
          width: 100%;
          padding: 10px 12px 10px 40px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .filter-select {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-select:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .action-btn {
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .action-btn:hover {
          background: #f9fafb;
          border-color: #10b981;
          color: #10b981;
        }

        .action-btn.refresh {
          animation: ${isRefreshing ? "spin 1s linear infinite" : "none"};
        }

        .projects-table {
          width: 100%;
          border-collapse: collapse;
          overflow-x: auto;
        }

        .projects-table th {
          text-align: left;
          padding: 12px 16px;
          background: #f9fafb;
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e5e7eb;
        }

        .projects-table td {
          padding: 16px;
          border-bottom: 1px solid #f3f4f6;
          color: #374151;
          font-size: 0.9rem;
        }

        .projects-table tr:hover {
          background: #f9fafb;
        }

        .project-id {
          font-weight: 600;
          color: #111827;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: capitalize;
        }

        .view-btn {
          padding: 6px 12px;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          transition: all 0.2s;
        }

        .view-btn:hover {
          background: #10b981;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #9ca3af;
        }

        .empty-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .empty-text {
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .admin-header-content {
            flex-direction: column;
            gap: 12px;
          }

          .admin-user-info {
            text-align: center;
          }

          .projects-header {
            flex-direction: column;
            align-items: stretch;
          }

          .projects-actions {
            flex-direction: column;
          }

          .projects-table {
            display: block;
            overflow-x: auto;
          }

          .stat-value {
            font-size: 1.5rem;
          }
        }
      `}</style>

      <div className="admin-page">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-content">
            <Link to="/admin" className="admin-logo">
              <div className="admin-logo-icon">
                <Zap size={18} />
              </div>
              Admin Dashboard
            </Link>

            <div className="admin-user-menu">
              <div className="admin-user-info">
                <div className="admin-user-name">
                  {userProfile?.displayName || user?.email}
                </div>
                <div className="admin-user-role">Administrator</div>
              </div>
              <button className="admin-logout-btn" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="admin-container">
          <h1 className="admin-title">Dashboard</h1>
          <p className="admin-subtitle">
            Manage customer projects and track performance
          </p>

          {/* Stats Grid */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Projects</span>
                  <div
                    className="stat-icon"
                    style={{ background: "rgba(59, 130, 246, 0.1)" }}
                  >
                    <FileText size={20} style={{ color: "#3b82f6" }} />
                  </div>
                </div>
                <div className="stat-value">{stats.totalProjects}</div>
                <div className="stat-change">
                  +{stats.newThisMonth} this month
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Active Customers</span>
                  <div
                    className="stat-icon"
                    style={{ background: "rgba(16, 185, 129, 0.1)" }}
                  >
                    <Users size={20} style={{ color: "#10b981" }} />
                  </div>
                </div>
                <div className="stat-value">{stats.activeCustomers}</div>
                <div className="stat-change">
                  {stats.customerGrowth}% growth
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total Capacity</span>
                  <div
                    className="stat-icon"
                    style={{ background: "rgba(139, 92, 246, 0.1)" }}
                  >
                    <Battery size={20} style={{ color: "#8b5cf6" }} />
                  </div>
                </div>
                <div className="stat-value">{stats.totalCapacity} kW</div>
                <div className="stat-change">Installed systems</div>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Revenue (Est.)</span>
                  <div
                    className="stat-icon"
                    style={{ background: "rgba(245, 158, 11, 0.1)" }}
                  >
                    <DollarSign size={20} style={{ color: "#f59e0b" }} />
                  </div>
                </div>
                <div className="stat-value">${stats.estimatedRevenue}</div>
                <div className="stat-change">VPP program value</div>
              </div>
            </div>
          )}

          {/* Projects Section */}
          <div className="projects-section">
            <div className="projects-header">
              <h2 className="projects-title">All Projects</h2>

              <div className="projects-actions">
                <div className="search-box">
                  <Search className="search-icon" size={18} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <select
                  className="filter-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="approved">Approved</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <button
                  className="action-btn refresh"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>

                <button className="action-btn" onClick={handleExport}>
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            {/* Projects Table */}
            {filteredProjects.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="projects-table">
                  <thead>
                    <tr>
                      <th>Project ID</th>
                      <th>Customer</th>
                      <th>Address</th>
                      <th>Status</th>
                      <th>System Size</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((project) => (
                      <tr key={project.id}>
                        <td className="project-id">{project.id}</td>
                        <td>
                          <div>{project.customerName || "N/A"}</div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {project.email || project.phone || ""}
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 6,
                            }}
                          >
                            <MapPin
                              size={14}
                              style={{
                                color: "#9ca3af",
                                flexShrink: 0,
                                marginTop: 2,
                              }}
                            />
                            <span style={{ fontSize: "0.85rem" }}>
                              {project.address || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              background: `${getStatusColor(project.status)}20`,
                              color: getStatusColor(project.status),
                            }}
                          >
                            {getStatusIcon(project.status)}
                            {project.status || "unknown"}
                          </span>
                        </td>
                        <td>
                          <div>{project.systemSize || "N/A"} kW</div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                              marginTop: 2,
                            }}
                          >
                            {project.batterySize || "N/A"} kWh battery
                          </div>
                        </td>
                        <td>
                          {project.createdAt?.toDate
                            ? project.createdAt.toDate().toLocaleDateString()
                            : "N/A"}
                        </td>
                        <td>
                          <button
                            className="view-btn"
                            onClick={() => navigate(`/project/${project.id}`)}
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  <FileText size={36} />
                </div>
                <h3 className="empty-title">No projects found</h3>
                <p className="empty-text">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "New projects will appear here"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
