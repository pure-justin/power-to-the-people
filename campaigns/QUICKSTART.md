# Commercial Outreach Campaign - Quick Start Guide

## 🚀 Launch in 5 Minutes

### 1. Install Dependencies
```bash
cd /Users/admin/Projects/power-to-the-people
npm install
```

### 2. Configure Environment
Add to `.env`:
```bash
VITE_GOOGLE_MAPS_API_KEY=your_key
OUTREACH_FROM_EMAIL=solar@yourdomain.com
```

### 3. Test (Dry Run)
```bash
npm run campaign:test
```

### 4. Launch Campaign
```bash
npm run campaign:run -- --target 500
```

## Expected Results (30 Days)
- 500 leads scraped
- 150 qualified (30%)
- 50 meetings scheduled
- 5 deals closed
- **$2.25M revenue**

Full docs: `campaigns/commercial-outbound/README.md`
