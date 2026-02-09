# UI Component Catalog

> All shared components. Use these instead of inline implementations.

## UI Primitives (`src/components/ui/`)

| Component | File | Purpose | Use Instead Of |
|-----------|------|---------|---------------|
| Badge | `Badge.jsx` | Status/category labels | Inline `<span>` badges |
| ComplianceBadge | `ComplianceBadge.jsx` | FEOC/domestic/tariff status | Inline compliance markup |
| ConfirmDialog | `ConfirmDialog.jsx` | Destructive action confirmation | `window.confirm()` |
| CurrencyDisplay | `CurrencyDisplay.jsx` | Consistent money formatting | Manual `$` formatting |
| DataTable | `DataTable.jsx` | Sortable, paginated table | Hand-rolled `<table>` |
| DateRangePicker | `DateRangePicker.jsx` | Date range selection | Raw date inputs |
| EmptyState | `EmptyState.jsx` | No-data guidance | "No data" text |
| FilterBar | `FilterBar.jsx` | Dropdown filters + active chips | Raw `<select>` elements |
| GaugeMeter | `GaugeMeter.jsx` | Circular progress indicator | Inline progress bars |
| KanbanBoard | `KanbanBoard.jsx` | Pipeline column visualization | Custom column layouts |
| LoadingSkeleton | `LoadingSkeleton.jsx` | Loading placeholder | Custom skeleton markup |
| MetricCard | `MetricCard.jsx` | Dashboard metric with icon | Custom metric divs |
| Modal | `Modal.jsx` | Overlay dialog | Custom modal markup |
| SearchInput | `SearchInput.jsx` | Search with icon | Inline search inputs |
| Tabs | `Tabs.jsx` | Tab navigation | Custom tab implementations |
| Timeline | `Timeline.jsx` | Event timeline | Custom timeline markup |
| Toast | `Toast.jsx` | Notification popup | Alert/custom notifications |

### DataTable Props
```jsx
<DataTable
  columns={[{ key: "name", label: "Name", sortable: true, render: (val) => <b>{val}</b> }]}
  data={filteredItems}
  onRowClick={(row) => navigate(`/detail/${row.id}`)}
  emptyMessage="No items found"
/>
```

### FilterBar Props
```jsx
<FilterBar
  filters={[{ key: "state", label: "State", options: ["TX", "CA", "FL"] }]}
  activeFilters={{ state: "TX" }}
  onChange={(newFilters) => setFilters(newFilters)}
/>
```

## Domain Components (`src/components/`)

| Component | File | Used By |
|-----------|------|---------|
| AddressAutocomplete | `AddressAutocomplete.jsx` | Qualify, Survey |
| AdminAnalytics | `AdminAnalytics.jsx` | AdminAnalytics page |
| ApiPlayground | `ApiPlayground.jsx` | API docs |
| AvaActivityPanel | `AvaActivityPanel.jsx` | AdminAva |
| BidCard | `BidCard.jsx` | Marketplace |
| BidComparison | `BidComparison.jsx` | Marketplace |
| ErrorBoundary | `ErrorBoundary.jsx` | App root |
| InvoicePanel | `InvoicePanel.jsx` | Invoice pages |
| NotificationPreferences | `NotificationPreferences.jsx` | Settings |
| ProductionChart | `ProductionChart.jsx` | Portal/Dashboard |
| ProjectDetailModal | `ProjectDetailModal.jsx` | Project lists |
| PublicFooter | `PublicFooter.jsx` | All public pages |
| PublicNav | `PublicNav.jsx` | All public pages |
| ReferralAdminPanel | `ReferralAdminPanel.jsx` | AdminReferrals |
| ReferralDashboard | `ReferralDashboard.jsx` | DashboardReferrals |
| ReferralManager | `ReferralManager.jsx` | Referral management |
| ReferralSocialShare | `ReferralSocialShare.jsx` | Referral sharing |
| ReferralWidget | `ReferralWidget.jsx` | Portal sidebar |
| RoofVisualizer | `RoofVisualizer.jsx` | Survey/Estimates |
| RoofVisualizer3D | `RoofVisualizer3D.jsx` | Survey/Estimates (3D) |
| SmsNotificationPanel | `SmsNotificationPanel.jsx` | AdminSms |

## Adoption Checklist

Components that should be used more widely:
- [ ] `EmptyState` — replace all "No data" text strings
- [ ] `MetricCard` — standardize all dashboard metric cards
- [ ] `LoadingSkeleton` — replace all custom loading spinners
- [ ] `SearchInput` — replace all inline search inputs
- [ ] `ConfirmDialog` — use for all destructive actions
- [ ] `CurrencyDisplay` — use for all money formatting
- [ ] `Modal` — replace all custom modal implementations
- [ ] `Toast` — replace all alert() and custom notifications

---

*See [INDEX](./INDEX.md) for full navigation*
