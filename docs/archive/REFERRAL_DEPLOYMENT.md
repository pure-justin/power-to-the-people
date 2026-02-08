# Referral System Deployment Guide

## Quick Deploy

### 1. Deploy Cloud Functions
```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 2. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### 3. Configure Secrets
```bash
# Set webhook secret for signature verification
firebase functions:config:set webhook.secret="$(openssl rand -hex 32)"

# Set API key for stats endpoint
firebase functions:config:set webhook.api_key="$(openssl rand -hex 32)"

# View current config
firebase functions:config:get
```

### 4. Enable Scheduled Functions
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Navigate to Cloud Scheduler
- Verify `processWeeklyPayouts` is scheduled for Mondays 9am CT

### 5. Test the System
```bash
# Run test suite
node test-referral-system.js

# Or test manually via app
npm run dev
# Visit http://localhost:5174/referrals
```

## Deployed Functions

| Function | Type | URL/Trigger |
|----------|------|-------------|
| onProjectCreated | Firestore Trigger | `projects/{projectId}` onCreate |
| onProjectUpdated | Firestore Trigger | `projects/{projectId}` onUpdate |
| updateReferralStatusHttp | Callable | Call from client with admin auth |
| getReferralStats | Callable | Call from client with admin auth |
| processWeeklyPayouts | Scheduled | Every Monday 9am CT |
| referralStatusWebhook | HTTP | `/referralStatusWebhook` |
| referralBulkUpdateWebhook | HTTP | `/referralBulkUpdateWebhook` |
| referralStatsWebhook | HTTP | `/referralStatsWebhook?apiKey=xxx` |

## Webhook URLs

After deployment, your webhook URLs will be:
```
https://us-central1-agentic-labs.cloudfunctions.net/referralStatusWebhook
https://us-central1-agentic-labs.cloudfunctions.net/referralBulkUpdateWebhook
https://us-central1-agentic-labs.cloudfunctions.net/referralStatsWebhook
```

## Environment Variables

### Production
```bash
NODE_ENV=production
WEBHOOK_SECRET=<from functions:config>
WEBHOOK_API_KEY=<from functions:config>
```

### Development
```bash
NODE_ENV=development
# Uses default development secrets (change in prod!)
```

## Monitoring

### View Logs
```bash
# All functions
firebase functions:log

# Specific function
firebase functions:log --only referralStatusWebhook

# Tail logs in real-time
firebase functions:log --follow
```

### Cloud Console
- [Cloud Functions Dashboard](https://console.cloud.google.com/functions)
- [Firestore Data](https://console.firebase.google.com/project/agentic-labs/firestore)
- [Cloud Scheduler](https://console.cloud.google.com/cloudscheduler)

## Troubleshooting

### Functions Not Deploying
```bash
# Check Node version (should be 18+)
node --version

# Reinstall dependencies
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Scheduled Function Not Running
1. Check Cloud Scheduler is enabled
2. Verify IAM permissions for Cloud Scheduler
3. Check function logs for errors
4. Test manually: `firebase functions:shell` then call `processWeeklyPayouts()`

### Webhooks Failing
1. Verify signature is being sent correctly
2. Check webhook secret matches deployed config
3. Review webhook logs in Firestore `webhookLogs` collection
4. Test with development mode (no signature required)

## Post-Deployment Checklist

- [ ] All functions deployed successfully
- [ ] Firestore rules deployed
- [ ] Webhook secrets configured
- [ ] Scheduled function appears in Cloud Scheduler
- [ ] Test referral flow end-to-end
- [ ] Verify earnings update correctly
- [ ] Check notifications are created
- [ ] Test webhook endpoints
- [ ] Review function logs for errors
- [ ] Set up monitoring alerts

## Support

**Firebase Project**: agentic-labs
**Region**: us-central1
**Documentation**: See REFERRAL_SYSTEM.md for full details
