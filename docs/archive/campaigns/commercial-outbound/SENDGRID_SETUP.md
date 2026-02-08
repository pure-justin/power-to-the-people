# SendGrid Setup Guide

## Quick Setup (5 minutes)

### 1. Create SendGrid Account

Go to: https://signup.sendgrid.com/

**Recommended Plan:**
- **Free Tier**: 100 emails/day (good for testing)
- **Essentials**: $15/month, 50K emails/month (recommended for production)

### 2. Get API Key

1. Log in to SendGrid: https://app.sendgrid.com/
2. Go to Settings → API Keys: https://app.sendgrid.com/settings/api_keys
3. Click "Create API Key"
4. Name: "Commercial Solar Campaign"
5. Permissions: **Full Access** (or at least "Mail Send" permission)
6. Click "Create & View"
7. **Copy the API key immediately** (you won't be able to see it again!)

### 3. Add API Key to .env

Edit `.env` file in `campaigns/commercial-outbound/`:

```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Domain Authentication (Recommended for Production)

**Why?** Improves email deliverability and prevents emails from going to spam.

1. Go to Settings → Sender Authentication: https://app.sendgrid.com/settings/sender_auth
2. Click "Authenticate Your Domain"
3. Choose your DNS provider
4. Add the DNS records provided by SendGrid:
   - CNAME records (2-3 records)
   - TXT record for SPF
   - CNAME for DKIM
5. Wait 24-48 hours for DNS propagation
6. Verify domain

**DNS Records Example for powertothepeople.solar:**
```
Type  Host                    Value
CNAME em1234.powertothepeople.solar  u1234567.wl123.sendgrid.net
CNAME s1._domainkey.powertothepeople.solar  s1.domainkey.u1234567.wl123.sendgrid.net
CNAME s2._domainkey.powertothepeople.solar  s2.domainkey.u1234567.wl123.sendgrid.net
```

### 5. Enable Click & Open Tracking

1. Go to Settings → Tracking: https://app.sendgrid.com/settings/tracking
2. Enable "Click Tracking"
3. Enable "Open Tracking"
4. Enable "Google Analytics"

### 6. Configure Unsubscribe Groups

1. Go to Suppressions → Unsubscribe Groups: https://app.sendgrid.com/suppressions/unsubscribe_groups
2. Click "Create New Group"
3. Name: "Commercial Solar Outreach"
4. Description: "Commercial property manager outreach for solar installations"
5. Click "Save Unsubscribe Group"
6. Copy the Group ID (you'll need this)

Add to `.env`:
```bash
SENDGRID_UNSUBSCRIBE_GROUP_ID=12345
```

### 7. Test Email Sending

Run the test script:

```bash
node test-sendgrid.js
```

Expected output:
```
✅ SendGrid configured successfully
✅ Test email sent to: your.email@example.com
✅ Message ID: <xxxxxxxx>
✅ Check your inbox!
```

## Production Checklist

Before sending to 500+ leads:

- [ ] SendGrid API key configured in `.env`
- [ ] Domain authentication completed (DNS records verified)
- [ ] Click tracking enabled
- [ ] Open tracking enabled
- [ ] Unsubscribe group created
- [ ] Test email sent successfully
- [ ] From email matches authenticated domain
- [ ] Sender reputation is "Good" (check SendGrid dashboard)

## Email Best Practices

### Warm Up Your Domain

Don't send 500 emails on day 1. Gradually increase volume:

| Day | Emails | Notes |
|-----|--------|-------|
| 1-2 | 10-20 | Start slow |
| 3-4 | 50 | Monitor bounce/spam rates |
| 5-7 | 100-150 | Check deliverability |
| 8+ | 500+ | Full volume |

### Avoid Spam Filters

✅ **Do:**
- Personalize emails (use recipient's name, property name)
- Include physical mailing address
- Add unsubscribe link
- Use professional from address (justin@powertothepeople.solar)
- Send during business hours (9 AM - 5 PM local time)
- Use plain text + HTML format
- Keep subject lines under 50 characters
- Include clear call-to-action

❌ **Don't:**
- Use ALL CAPS in subject lines
- Use spam trigger words ("FREE", "GUARANTEED", "ACT NOW")
- Send to purchased/scraped email lists (B2B is okay)
- Send more than 1-2 emails per day to same person
- Use misleading subject lines
- Include attachments in first email

### Monitor Metrics

Check SendGrid dashboard daily:

- **Delivery Rate**: Should be >95%
- **Bounce Rate**: Should be <5%
- **Spam Report Rate**: Should be <0.1%
- **Open Rate**: 20-30% is good for cold outreach
- **Click Rate**: 5-10% is good

## Troubleshooting

### "Forbidden" Error (403)

**Problem:** API key doesn't have permission

**Solution:**
- Regenerate API key with "Full Access" or "Mail Send" permission
- Update `.env` file

### Emails Going to Spam

**Solutions:**
1. Complete domain authentication
2. Reduce sending volume (warm up domain)
3. Improve email content (more personalization, less sales-y)
4. Check spam score: https://www.mail-tester.com/
5. Verify SPF/DKIM records: https://mxtoolbox.com/

### High Bounce Rate

**Problem:** Invalid email addresses

**Solutions:**
- Use email verification API before sending
- Remove hard bounces from list
- Improve contact data quality

### Rate Limiting

**Problem:** "Too many requests" error

**Solutions:**
- Free tier: 100 emails/day limit
- Upgrade to Essentials ($15/month) for 50K/month
- Add delays between emails (already implemented: 1 email/second)

## SendGrid Alternatives

If SendGrid doesn't work for you:

| Service | Pricing | Deliverability | Notes |
|---------|---------|----------------|-------|
| **SendGrid** | $15/mo for 50K | Excellent | Best for volume |
| **Mailgun** | $35/mo for 50K | Excellent | Developer-friendly |
| **Amazon SES** | $0.10 per 1K | Good | Cheapest, harder setup |
| **Postmark** | $15/mo for 10K | Excellent | Best for transactional |
| **SparkPost** | $20/mo for 50K | Good | Good analytics |

## Support

- SendGrid Docs: https://docs.sendgrid.com/
- SendGrid Support: https://support.sendgrid.com/
- Email deliverability tips: https://sendgrid.com/resource/email-deliverability/

## Quick Commands

```bash
# Test SendGrid configuration
node -e "console.log(process.env.SENDGRID_API_KEY ? '✅ API key set' : '❌ API key missing')"

# Send test email
node test-sendgrid.js

# Check SendGrid API key validity
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{"to": [{"email": "test@example.com"}]}],
    "from": {"email": "solar@powertothepeople.solar"},
    "subject": "Test",
    "content": [{"type": "text/plain", "value": "Test"}]
  }'
```

---

**Ready to send emails? Get your SendGrid API key and add it to `.env`!**
