import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, RefreshCw, Database } from "lucide-react";
import { onAuthChange, getUserProfile } from "../services/firebase";
import { getAdminProjects } from "../services/adminService";
import LeadQualityScoring from "../components/LeadQualityScoring";

// Sample data for demo/development when no Firestore data is available
function generateSampleLeads(count = 30) {
  const names = [
    "Sarah Johnson",
    "Mike Chen",
    "Emily Rodriguez",
    "James Wilson",
    "Lisa Thompson",
    "David Kim",
    "Maria Garcia",
    "Robert Brown",
    "Jennifer Lee",
    "Christopher Davis",
    "Amanda Martinez",
    "Daniel Taylor",
    "Rachel Anderson",
    "Kevin Nguyen",
    "Stephanie White",
    "Andrew Harris",
    "Nicole Clark",
    "Matthew Lewis",
    "Laura Walker",
    "Brian Hall",
    "Michelle Young",
    "Jason Allen",
    "Samantha King",
    "Tyler Wright",
    "Megan Scott",
    "Ryan Torres",
    "Ashley Green",
    "Justin Adams",
    "Heather Baker",
    "Brandon Nelson",
  ];

  const cities = [
    "Austin",
    "San Antonio",
    "Houston",
    "Dallas",
    "El Paso",
    "Fort Worth",
    "Arlington",
    "Corpus Christi",
    "Plano",
    "Lubbock",
  ];

  const providers = [
    "TXU Energy",
    "Reliant",
    "Direct Energy",
    "Green Mountain",
    "Gexa Energy",
  ];
  const sources = ["organic", "referral", "paid", "direct"];
  const creditScores = ["excellent", "good", "fair", "poor"];
  const billSources = ["smart_meter_texas", "utility_bill", "estimated"];

  return Array.from({ length: count }, (_, i) => {
    const hasContact = Math.random() > 0.1;
    const hasQual = Math.random() > 0.2;
    const hasEnergy = Math.random() > 0.3;
    const hasDesign = Math.random() > 0.4;
    const monthlyKwh = 800 + Math.random() * 2200;
    const panelCount = Math.floor(10 + Math.random() * 30);
    const systemSize = +(panelCount * 0.4).toFixed(1);
    const daysAgo = Math.floor(Math.random() * 90);
    const created = new Date(Date.now() - daysAgo * 86400000);

    return {
      id: `lead-${String(i + 1).padStart(4, "0")}`,
      customerName: hasContact ? names[i % names.length] : undefined,
      name: hasContact ? names[i % names.length] : undefined,
      email: hasContact
        ? `${names[i % names.length].toLowerCase().replace(" ", ".")}@email.com`
        : undefined,
      phone:
        hasContact && Math.random() > 0.3
          ? `(512) ${String(Math.floor(Math.random() * 900 + 100))}-${String(Math.floor(Math.random() * 9000 + 1000))}`
          : undefined,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: "TX",
      createdAt: created,
      qualification: hasQual
        ? {
            isHomeowner: Math.random() > 0.2,
            creditScore:
              creditScores[Math.floor(Math.random() * creditScores.length)],
            hasUtilityBill: Math.random() > 0.4,
          }
        : {},
      billData: hasEnergy
        ? {
            source: billSources[Math.floor(Math.random() * billSources.length)],
            monthlyUsageKwh: Math.round(monthlyKwh),
            annualUsageKwh: Math.round(monthlyKwh * 12),
            provider: providers[Math.floor(Math.random() * providers.length)],
            esiid:
              Math.random() > 0.5
                ? `10${Math.floor(Math.random() * 1e15)}`
                : undefined,
            historicalData:
              Math.random() > 0.5
                ? Array.from(
                    { length: Math.floor(3 + Math.random() * 10) },
                    () => ({}),
                  )
                : undefined,
          }
        : {},
      systemDesign: hasDesign
        ? {
            recommendedPanelCount: panelCount,
            systemSizeKw: systemSize,
            annualProductionKwh: Math.round(systemSize * 1400),
            estimatedCost: Math.round(systemSize * 2800),
            estimatedAnnualSavings: Math.round(systemSize * 1400 * 0.12),
            paybackPeriodYears: +(Math.random() * 12 + 5).toFixed(1),
          }
        : {},
      tracking: {
        source: sources[Math.floor(Math.random() * sources.length)],
        referralCode:
          Math.random() > 0.7
            ? `REF-${Math.floor(Math.random() * 9000 + 1000)}`
            : undefined,
        campaign: Math.random() > 0.6 ? "spring-2026" : undefined,
      },
      energyCommunity: {
        eligible: Math.random() > 0.6,
      },
      smartMeterTexas: {
        linked: Math.random() > 0.7,
      },
    };
  });
}

export default function LeadScoringDashboard() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [useSampleData, setUseSampleData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sampleLeads = useMemo(() => generateSampleLeads(30), []);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (authUser) => {
      setIsLoading(true);
      try {
        if (authUser && !authUser.isAnonymous) {
          const profile = await getUserProfile(authUser.uid);
          if (profile && profile.role === "admin") {
            setUser(authUser);
            await loadData();
            return;
          }
        }
        // Not logged in or not admin - use sample data
        setUseSampleData(true);
      } catch {
        setUseSampleData(true);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  async function loadData() {
    try {
      setIsRefreshing(true);
      const data = await getAdminProjects();
      setProjects(data || []);
      if (!data || data.length === 0) {
        setUseSampleData(true);
      }
    } catch {
      setUseSampleData(true);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  const displayData = useSampleData ? sampleLeads : projects;

  if (isLoading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner} />
        <div style={{ marginTop: 12, color: "#9ca3af" }}>
          Loading scoring dashboard...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/admin" style={styles.backLink}>
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 style={styles.h1}>
              <BarChart3 size={24} style={{ color: "#10b981" }} />
              Lead Quality Scoring
            </h1>
            <p style={styles.headerSub}>
              Comprehensive lead quality analysis and scoring visualization
            </p>
          </div>
        </div>
        <div style={styles.headerRight}>
          {useSampleData && (
            <div style={styles.sampleBadge}>
              <Database size={14} />
              Sample Data ({displayData.length} leads)
            </div>
          )}
          {!useSampleData && (
            <button
              style={styles.refreshBtn}
              onClick={loadData}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: isRefreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              Refresh
            </button>
          )}
          <button
            style={{
              ...styles.refreshBtn,
              background: useSampleData ? "#10b981" : "#f3f4f6",
              color: useSampleData ? "white" : "#6b7280",
            }}
            onClick={() => setUseSampleData(!useSampleData)}
          >
            {useSampleData ? "Use Live Data" : "Use Sample Data"}
          </button>
        </div>
      </div>

      {/* Main Scoring Component */}
      <LeadQualityScoring projects={displayData} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 1280,
    margin: "0 auto",
    padding: "24px 32px 48px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 32,
    flexWrap: "wrap",
    gap: 16,
  },
  headerLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  backLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#f3f4f6",
    color: "#6b7280",
    textDecoration: "none",
    marginTop: 4,
  },
  h1: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#111827",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerSub: {
    fontSize: "0.85rem",
    color: "#9ca3af",
    margin: "4px 0 0 0",
  },
  sampleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
    fontSize: "0.85rem",
    fontWeight: 500,
    cursor: "pointer",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #10b981",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
};
