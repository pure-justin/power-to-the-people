# Firestore Collections

> 25+ collections in project `power-to-the-people-vpp`.

## Collection Map

### Core Business
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `leads` | ~100s | customerName, email, phone, address, score, status, assignedTo | admin, sales |
| `commercial_leads` | ~100s | engagement, status, notes, propertyManager | admin |
| `projects` | ~10s | leadId, status, systemSize, installer, phone | admin, installer, customer |
| `users` | ~10s | email, role (admin/installer/sales/user), name | auth |

### Billing & Payments
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `subscriptions` | per user | userId, tier, status, limits, stripeSubscriptionId | admin |
| `usage_records` | per month/user | api_call_count, lead_count, compliance_check_count | admin |
| `invoices` | per invoice | mercuryInvoiceId, leadId, amount, status, dueDate | admin |
| `payouts` | per payout | userId, amount | admin |

### Solar Data (Seeded)
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `solar_equipment` | 72+ | type, manufacturer, feoc_compliant, domestic_content_compliant, tariff_safe | public read |
| `solar_utility_rates` | 485+ | state, zip_codes, utility_name, has_net_metering | public read |
| `solar_incentives` | 190+ | state, incentive_type, status, sector | public read |
| `solar_permits` | 106+ | state, jurisdiction_id, county | public read |
| `solar_permits_states` | 50 | state-level permit docs | public read |
| `solar_tpo_providers` | ~10s | states, provider_name | auth |
| `solar_finance_products` | ~10s | (finance options) | auth |

### API & Webhooks
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `apiKeys` | per key | key (hashed), scopes, rateLimit, usageStats, status | admin |
| `apiKeyUsageLogs` | per call | apiKeyId, endpoint, method, statusCode | admin |
| `webhooks` | per subscription | url, events, secret | admin |

### Referrals
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `referrals` | per referral | referrerId, projectId, status, commission | auth |
| `referralTracking` | per user | referrerId, status | auth |
| `referralClicks` | per click | (analytics) | public write |

### System
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `config` | per integration | status, lastSynced, masked keys | admin |
| `smsLog` | per message | to, message, sid, status, sentAt | admin |
| `addressCache` | per address | (geocoding) | public read |
| `analytics` | aggregate | (metrics) | admin |
| `data_refresh_log` | per refresh | source, status, records_processed | admin |
| `campaigns` | per campaign | (campaign data) | admin |
| `utility_rates` | cached | (rate data) | public read |
| `email_templates` | per template | (template data) | public read |
| `pendingNotifications` | per notification | (email queue) | admin |

### Pipeline
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `surveys` | per project | projectId, photos, measurements | installer, customer |
| `designs` | per project | projectId, panels, systemSize | installer |
| `permits` | per project | projectId, status, jurisdiction | installer |
| `installations` | per project | projectId, photos, phases | installer |
| `funding_packages` | per project | projectId, documents, status | admin |
| `ai_tasks` | per task | type, status, aiAttempts, humanResolution | admin |
| `ai_learnings` | per learning | taskType, resolution | admin |

### Ava
| Collection | Documents | Key Fields | Access |
|------------|----------|------------|--------|
| `ava_conversations` | per session | messages subcollection | admin |

## Security Rules

Rules defined in `firestore.rules` at project root. Each collection has role-based access control.

## Data Quality Checks Needed

- [ ] `solar_equipment`: Verify 72+ products have complete compliance fields
- [ ] `solar_utility_rates`: Verify 485+ profiles have state, rate, net metering
- [ ] `solar_incentives`: Verify 190+ programs are current (not expired)
- [ ] `solar_permits`: Verify 106+ jurisdictions have requirements filled

---

*See [INDEX](../INDEX.md) for full navigation*
