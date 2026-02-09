# Public Pages (`/`)

> 17 pages accessible without login.

## Page Map

| Route | Page Component | Source | Status |
|-------|---------------|--------|--------|
| `/` | Home | `src/pages/Home.jsx` | NEEDS TEST |
| `/qualify` | Qualify | `src/pages/Qualify.jsx` | NEEDS TEST |
| `/qualify/smt-callback` | SmtCallback | `src/pages/SmtCallback.jsx` | NEEDS TEST |
| `/success` | Success | `src/pages/Success.jsx` | NEEDS TEST |
| `/pricing` | Pricing | `src/pages/Pricing.jsx` | NEEDS TEST |
| `/login` | Login | `src/pages/Login.jsx` | NEEDS TEST |
| `/signup` | Signup | `src/pages/Signup.jsx` | NEEDS TEST |
| `/api-docs` | ApiDocs | `src/pages/ApiDocs.jsx` | NEEDS TEST |
| `/compare` | SubHubCompare | `src/pages/SubHubCompare.jsx` | NEEDS TEST |
| `/get-started` | GetStarted | `src/pages/GetStarted.jsx` | NEEDS TEST |
| `/installers` | InstallerComparison | `src/pages/InstallerComparison.jsx` | NEEDS TEST |
| `/about` | About | `src/pages/About.jsx` | NEEDS TEST |
| `/features` | Features | `src/pages/Features.jsx` | NEEDS TEST |
| `/contact` | Contact | `src/pages/Contact.jsx` | NEEDS TEST |
| `/marketplace/credits` | CreditMarketplace | `src/pages/marketplace/CreditMarketplace.jsx` | NEEDS TEST |
| `/marketplace/credits/:id` | CreditDetail | `src/pages/marketplace/CreditDetail.jsx` | NEEDS TEST |
| `/solar` | SolarStatesIndex | `src/pages/SolarStatesIndex.jsx` | NEEDS TEST |
| `/solar/:stateSlug` | SolarState | `src/pages/SolarState.jsx` | NEEDS TEST |

## Conversion Funnel

```
Home → Qualify → (SMT callback if TX) → Success → Signup → Portal
  or
Home → Pricing → GetStarted → Signup → Dashboard (installer)
```

## Shared Components

All public pages use:
- `PublicNav` — top navigation bar
- `PublicFooter` — footer with links

## Key Issues

- **Home**: Verify hero, features, CTA look professional
- **Qualify**: Test full multi-step flow end-to-end
- **Pricing**: Verify tiers match Stripe config ($79/$149/$299)
- **Contact**: Test form submission
- **API Docs**: Verify Swagger spec completeness

---

*See [INDEX](../INDEX.md) for full navigation*
