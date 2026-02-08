# Power to the People API Documentation

## 🚀 Overview

The Power to the People API provides comprehensive access to solar system design, lead management, referral tracking, SMS notifications, and utility bill scanning. Built on Firebase Cloud Functions and powered by Google Solar API.

**Base URL (Cloud Functions):** `https://us-central1-power-to-the-people-vpp.cloudfunctions.net`
**Base URL (Netlify Functions):** `https://power-to-the-people-vpp.web.app/.netlify/functions`

## 📚 Quick Links

- **Interactive Docs:** [https://power-to-the-people-vpp.web.app/api-docs](https://power-to-the-people-vpp.web.app/api-docs)
- **OpenAPI Spec:** [/public/api-spec.json](./public/api-spec.json)
- **Postman Collection:** [/public/postman-collection.json](./public/postman-collection.json)
- **Admin Portal:** [https://power-to-the-people-vpp.web.app/admin](https://power-to-the-people-vpp.web.app/admin)

## 🔑 Authentication

All API requests require authentication using API keys:

\`\`\`bash
Authorization: Bearer pk_test_your_api_key_here
\`\`\`

Get your API key from the [Admin Portal](https://power-to-the-people-vpp.web.app/admin) under **Settings** → **API Keys**.

## 📊 Rate Limits

| Environment | Per Minute | Per Hour | Per Day | Per Month |
|-------------|------------|----------|---------|-----------|
| Development | 10 | 100 | 1,000 | 10,000 |
| Production | 60 | 1,000 | 10,000 | 100,000 |

## 🚀 Quick Start

\`\`\`javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createLead = httpsCallable(functions, 'createLead');

const result = await createLead({
  name: 'John Smith',
  email: 'john@example.com',
  phone: '+15125550100',
  address: '123 Solar St, Austin, TX',
  annualUsageKwh: 12000
});

console.log('Lead ID:', result.data.leadId);
\`\`\`

See full documentation at [/api-docs](https://power-to-the-people-vpp.web.app/api-docs)
