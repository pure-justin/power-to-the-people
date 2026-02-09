# Sales Pages (`/sales/*`)

> 6 pages for sales representatives. Role: `sales`

## Page Map

| Route | Page Component | Source | Status |
|-------|---------------|--------|--------|
| `/sales` | SalesHome | `src/pages/sales/SalesHome.jsx` | NEEDS TEST |
| `/sales/leads` | SalesLeads | `src/pages/sales/SalesLeads.jsx` | NEEDS TEST |
| `/sales/assignments` | SalesAssignments | `src/pages/sales/SalesAssignments.jsx` | NEEDS TEST |
| `/sales/performance` | SalesPerformance | `src/pages/sales/SalesPerformance.jsx` | NEEDS TEST |
| `/sales/proposals` | SalesProposals | `src/pages/sales/SalesProposals.jsx` | NEEDS TEST |
| `/sales/territory` | SalesTerritory | `src/pages/sales/SalesTerritory.jsx` | NEEDS TEST |

## Sales Workflow

```
SalesHome (metrics) → SalesLeads (manage) → SalesAssignments (assign)
→ SalesProposals (generate) → SalesPerformance (track)
```

## Key Issues

- **SalesTerritory**: Uses `LeadMapPlaceholder` — needs real Google Maps implementation
- **SalesProposals**: Need to verify proposal generation works end-to-end

## Dependencies

| Page | Backend | External |
|------|---------|----------|
| SalesLeads | `leads.ts` | — |
| SalesProposals | `proposalGenerator.ts` | — |
| SalesTerritory | — | Google Maps (MCP available) |

---

*See [INDEX](../INDEX.md) for full navigation*
