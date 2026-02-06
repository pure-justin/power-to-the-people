import { useMemo } from "react";
import { Sun, Zap, TrendingUp, TrendingDown } from "lucide-react";

/**
 * Monthly consumption vs production comparison chart
 * Shows bar chart with consumption and production for each month
 */
export default function ProductionChart({
  monthlyConsumption, // Array of { month, kWh } or just kWh values
  monthlyProduction, // Array of { month, productionKwh }
  annualConsumption,
  annualProduction,
}) {
  const monthNames = [
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
  ];

  // Normalize consumption data to array of numbers
  const consumptionData = useMemo(() => {
    if (!monthlyConsumption) return Array(12).fill(annualConsumption / 12);

    if (Array.isArray(monthlyConsumption)) {
      return monthlyConsumption.map((item) =>
        typeof item === "object" ? item.kWh || item.kwh || 0 : item,
      );
    }

    return Array(12).fill(annualConsumption / 12);
  }, [monthlyConsumption, annualConsumption]);

  // Normalize production data to array of numbers
  const productionData = useMemo(() => {
    if (!monthlyProduction) return Array(12).fill(annualProduction / 12);

    return monthlyProduction.map((item) =>
      typeof item === "object" ? item.productionKwh || item.kWh || 0 : item,
    );
  }, [monthlyProduction, annualProduction]);

  // Find max value for scaling
  const maxValue = useMemo(() => {
    const allValues = [...consumptionData, ...productionData];
    return Math.max(...allValues, 1);
  }, [consumptionData, productionData]);

  // Calculate offset percentage
  const offsetPercent =
    annualProduction && annualConsumption
      ? Math.round((annualProduction / annualConsumption) * 100)
      : 0;

  // Calculate net for each month
  const monthlyNet = useMemo(() => {
    return productionData.map((prod, i) => prod - consumptionData[i]);
  }, [productionData, consumptionData]);

  const annualNet = annualProduction - annualConsumption;

  return (
    <div
      style={{
        background: "white",
        borderRadius: "var(--radius-lg)",
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
          Monthly Energy Comparison
        </h3>

        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: "#ef4444",
                borderRadius: 2,
              }}
            />
            <span>Consumption</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 12,
                height: 12,
                background: "#22c55e",
                borderRadius: 2,
              }}
            />
            <span>Production</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: 200,
          gap: 4,
          paddingBottom: 24,
          borderBottom: "1px solid var(--gray-200)",
        }}
      >
        {monthNames.map((month, i) => {
          const consumption = consumptionData[i] || 0;
          const production = productionData[i] || 0;
          const consumptionHeight = (consumption / maxValue) * 180;
          const productionHeight = (production / maxValue) * 180;
          const net = monthlyNet[i];

          return (
            <div
              key={month}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
                minWidth: 0,
              }}
            >
              {/* Bars container */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 2,
                  height: 180,
                  marginBottom: 4,
                }}
              >
                {/* Consumption bar */}
                <div
                  style={{
                    width: 12,
                    height: Math.max(consumptionHeight, 2),
                    background: "#ef4444",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.3s ease",
                  }}
                  title={`${month}: ${consumption.toLocaleString()} kWh consumption`}
                />
                {/* Production bar */}
                <div
                  style={{
                    width: 12,
                    height: Math.max(productionHeight, 2),
                    background: "#22c55e",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.3s ease",
                  }}
                  title={`${month}: ${production.toLocaleString()} kWh production`}
                />
              </div>

              {/* Month label */}
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--gray-500)",
                  fontWeight: 500,
                }}
              >
                {month}
              </span>

              {/* Net indicator */}
              <span
                style={{
                  fontSize: "0.65rem",
                  color: net >= 0 ? "#22c55e" : "#ef4444",
                  fontWeight: 500,
                  marginTop: 2,
                }}
              >
                {net >= 0 ? "+" : ""}
                {Math.round(net)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginTop: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <Zap size={14} style={{ color: "#ef4444" }} />
          </div>
          <div
            style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ef4444" }}
          >
            {annualConsumption?.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
            kWh Used
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <Sun size={14} style={{ color: "#22c55e" }} />
          </div>
          <div
            style={{ fontSize: "1.25rem", fontWeight: 700, color: "#22c55e" }}
          >
            {annualProduction?.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
            kWh Produced
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              marginBottom: 4,
            }}
          >
            {annualNet >= 0 ? (
              <TrendingUp size={14} style={{ color: "#22c55e" }} />
            ) : (
              <TrendingDown size={14} style={{ color: "#ef4444" }} />
            )}
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: annualNet >= 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {annualNet >= 0 ? "+" : ""}
            {annualNet?.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
            kWh Net
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                background:
                  offsetPercent >= 100
                    ? "linear-gradient(135deg, #22c55e, #16a34a)"
                    : offsetPercent >= 80
                      ? "linear-gradient(135deg, #eab308, #ca8a04)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color:
                offsetPercent >= 100
                  ? "#22c55e"
                  : offsetPercent >= 80
                    ? "#eab308"
                    : "#ef4444",
            }}
          >
            {offsetPercent}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--gray-500)" }}>
            Offset
          </div>
        </div>
      </div>

      {/* Offset Message */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          background:
            offsetPercent >= 100
              ? "rgba(34, 197, 94, 0.1)"
              : offsetPercent >= 80
                ? "rgba(234, 179, 8, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
          borderRadius: "var(--radius)",
          textAlign: "center",
          fontSize: "0.9rem",
          color: "var(--gray-700)",
        }}
      >
        {offsetPercent >= 100 ? (
          <>
            Your solar system is designed to produce{" "}
            <strong>{offsetPercent}%</strong> of your annual electricity needs.
          </>
        ) : offsetPercent >= 80 ? (
          <>
            Your system will cover <strong>{offsetPercent}%</strong> of your
            usage. Consider adding more panels for 100% offset.
          </>
        ) : (
          <>
            Your current design covers <strong>{offsetPercent}%</strong> of your
            usage. More roof space may be needed for full offset.
          </>
        )}
      </div>
    </div>
  );
}
