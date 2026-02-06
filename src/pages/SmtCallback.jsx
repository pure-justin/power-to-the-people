/**
 * Smart Meter Texas Callback Page
 * Receives data from Python connector and redirects to Qualify page
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function SmtCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("processing");
  const [error, setError] = useState(null);
  const [usageData, setUsageData] = useState(null);

  useEffect(() => {
    const processData = async () => {
      const encodedData = searchParams.get("data");

      if (!encodedData) {
        setStatus("error");
        setError("No data received");
        return;
      }

      try {
        // Decode the data
        const decoded = JSON.parse(atob(decodeURIComponent(encodedData)));
        console.log("SMT Data received:", decoded);

        const data = decoded.data;

        // Store in sessionStorage for Qualify page
        const smtData = {
          source: "smart_meter_texas",
          dataQuality: "excellent",
          esiid: data.esiid,
          usageHistory: data.monthlyUsage,
          calculatedAnnualKwh: data.annualKwh,
          monthlyConsumption: data.monthlyUsage?.map((m) => m.kWh) || [],
          extractedAt: decoded.extractedAt,
        };

        sessionStorage.setItem("smtExtractedData", JSON.stringify(smtData));
        setUsageData(smtData);
        setStatus("success");

        // Redirect after showing success
        setTimeout(() => {
          navigate("/qualify?smtData=ready", { replace: true });
        }, 2000);
      } catch (err) {
        console.error("Error processing SMT data:", err);
        setStatus("error");
        setError(err.message);
      }
    };

    processData();
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 450,
          textAlign: "center",
          padding: 40,
        }}
      >
        {status === "processing" && (
          <>
            <Loader2
              size={48}
              style={{ color: "#22c55e", animation: "spin 1s linear infinite" }}
            />
            <h2 style={{ marginTop: 20 }}>Processing Your Data</h2>
            <p style={{ color: "var(--gray-600)" }}>
              Analyzing your Smart Meter Texas usage data...
            </p>
          </>
        )}

        {status === "success" && usageData && (
          <>
            <CheckCircle size={48} style={{ color: "#22c55e" }} />
            <h2 style={{ marginTop: 20 }}>Data Received!</h2>

            <div
              style={{
                background: "var(--gray-50)",
                borderRadius: "var(--radius)",
                padding: 20,
                marginTop: 20,
                textAlign: "left",
              }}
            >
              {usageData.esiid && (
                <p style={{ margin: "0 0 8px" }}>
                  <strong>ESIID:</strong> {usageData.esiid}
                </p>
              )}
              <p style={{ margin: "0 0 8px" }}>
                <strong>Annual Usage:</strong>{" "}
                {usageData.calculatedAnnualKwh?.toLocaleString()} kWh
              </p>
              <p style={{ margin: 0 }}>
                <strong>Months of Data:</strong>{" "}
                {usageData.usageHistory?.length || 0}
              </p>
            </div>

            <p style={{ color: "var(--gray-600)", marginTop: 16 }}>
              Redirecting you back...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={48} style={{ color: "#ef4444" }} />
            <h2 style={{ marginTop: 20 }}>Something Went Wrong</h2>
            <p style={{ color: "var(--gray-600)" }}>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/qualify")}
              style={{ marginTop: 20 }}
            >
              Back to Qualification
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
