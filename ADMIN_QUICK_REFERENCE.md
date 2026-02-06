# Admin Dashboard - Quick Reference Card

## 🚀 Quick Start

```bash
# 1. Start server
npm run dev

# 2. Open browser
http://localhost:5173/admin

# 3. Login
Email: admin@yourcompany.com
Password: [your password]
```

## 🔑 First Time Setup

### Create Admin User (Choose One Method)

**Method A: Firebase Console** (5 minutes)
1. Firebase → Authentication → Add user
2. Firestore → users → Add document (use UID from step 1)
3. Add field: `role: "admin"`

**Method B: Script** (2 minutes)
```bash
node scripts/create-admin.js admin@example.com Pass123 "Admin"
```

## 📊 Dashboard Features

| Feature | How to Use |
|---------|------------|
| **View Stats** | Displayed at top of dashboard |
| **Search Projects** | Type in search box (searches all fields) |
| **Filter by Status** | Use status dropdown menu |
| **Export CSV** | Click Export button (exports filtered results) |
| **View Project** | Click View button in any row |
| **Refresh Data** | Click Refresh button |
| **Logout** | Click Logout in top-right |

## 🔍 Search Examples

```
"john"          → Finds all Johns (name, email, etc.)
"austin"        → Finds all Austin addresses
"PTTP-1234"     → Finds specific project ID
"512-555"       → Finds phone numbers
"@gmail.com"    → Finds Gmail addresses
```

## 🏷️ Status Meanings

| Status | Meaning | Color |
|--------|---------|-------|
| Submitted | New application | Blue 🔵 |
| Reviewing | Under review | Amber 🟡 |
| Approved | Ready to install | Green 🟢 |
| Scheduled | Date set | Purple 🟣 |
| Completed | Installed | Dark Green 🟢 |
| Cancelled | Not proceeding | Red 🔴 |

## 📈 Statistics Explained

- **Total Projects**: All applications ever submitted
- **New This Month**: Projects created this month
- **Active Customers**: Unique customers (non-cancelled)
- **Customer Growth**: Monthly growth percentage
- **Total Capacity**: Sum of system sizes (kW)
- **Estimated Revenue**: Capacity × $500/kW

## 💾 CSV Export Fields

```
Project ID, Status, Customer Name, Email, Phone,
Address, System Size (kW), Battery Size (kWh), Created Date
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search box |
| `Esc` | Clear search |
| `Tab` | Navigate fields |
| `Enter` | Submit search |

## 🛠️ Common Tasks

### Update Project Status (Not Built-In)
1. Click View on project
2. Manually update in Firestore
3. Click Refresh in dashboard

### Find Customer by Email
1. Type email in search box
2. Results appear instantly

### Export Monthly Report
1. Set date filter (if added)
2. Click Export
3. Open CSV in Excel

### View Project Details
1. Search for project
2. Click View button
3. See full details page

## ⚡ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't login | Check `role: "admin"` in Firestore |
| No projects | Check Firestore security rules |
| Search not working | Check browser console for errors |
| Export fails | Allow downloads in browser settings |
| Slow performance | Check network connection to Firebase |

## 🔧 Developer Commands

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Create admin user
node scripts/create-admin.js [email] [password] [name]
```

## 🌐 URLs

```
Development:  http://localhost:5173/admin
Production:   https://yourapp.com/admin
Firebase:     https://console.firebase.google.com
Firestore:    https://console.firebase.google.com/project/agentic-labs/firestore
```

## 📱 Mobile View

Dashboard is fully responsive:
- Stats stack vertically
- Table scrolls horizontally
- Touch-friendly buttons
- Optimized spacing

## 🔐 Security Checklist

- [ ] Admin user created with strong password
- [ ] Firestore security rules configured
- [ ] Only authorized users have admin role
- [ ] Firebase 2FA enabled (recommended)
- [ ] Regular password changes
- [ ] Audit logs reviewed monthly

## 📞 Getting Help

1. **Setup Issues**: Read `ADMIN_SETUP.md`
2. **Usage Questions**: Read `ADMIN_DEMO.md`
3. **Feature List**: Read `ADMIN_FEATURE_SUMMARY.md`
4. **Console Errors**: Check browser developer tools
5. **Firebase Issues**: Check Firebase Console logs

## 🎯 Best Practices

✅ **Do:**
- Use strong passwords
- Regularly refresh data
- Export backups weekly
- Review project statuses daily
- Clear filters when done

❌ **Don't:**
- Share admin credentials
- Leave session open on shared computers
- Export sensitive data to unsecured locations
- Modify Firestore directly (use dashboard)
- Ignore error messages

## 🚨 Emergency Procedures

### Lost Admin Access
1. Check Firebase Authentication
2. Verify Firestore user document
3. Recreate admin user if needed

### Dashboard Not Loading
1. Check network connection
2. Clear browser cache
3. Check Firebase Console status
4. Restart dev server

### Data Not Showing
1. Check Firestore security rules
2. Verify Firebase initialization
3. Check browser console for errors
4. Test Firestore connection

## 📊 Metrics to Monitor

**Daily:**
- New projects submitted
- Projects needing review
- Pending approvals

**Weekly:**
- Total active projects
- Customer growth rate
- Installation schedule

**Monthly:**
- Total capacity installed
- Revenue estimates
- Customer satisfaction

## 🎨 UI Elements

```
┌─────────────────────────────────────┐
│ Header: Logo + User Menu + Logout  │
├─────────────────────────────────────┤
│ Stats: 4 cards with metrics        │
├─────────────────────────────────────┤
│ Projects Header: Title + Actions    │
│ Search: [🔍 Search box]            │
│ Filter: [Status dropdown]           │
│ Actions: [🔄 Refresh] [⬇ Export]  │
├─────────────────────────────────────┤
│ Table: Sortable project list        │
│ - Project ID                        │
│ - Customer (name + contact)         │
│ - Address                           │
│ - Status badge                      │
│ - System size                       │
│ - Created date                      │
│ - View button                       │
└─────────────────────────────────────┘
```

## 🎓 Training Checklist

New admin users should:
- [ ] Complete first-time login
- [ ] Review all dashboard sections
- [ ] Practice searching for projects
- [ ] Test status filters
- [ ] Export a CSV file
- [ ] Navigate to project details
- [ ] Understand all status meanings
- [ ] Know how to logout
- [ ] Bookmark the dashboard URL
- [ ] Read full documentation

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| Create admin user | 5 min |
| First-time setup | 10 min |
| Daily dashboard check | 2 min |
| Search for project | 30 sec |
| Export monthly report | 1 min |
| Review new submissions | 5 min |

## 📋 Daily Workflow Example

```
1. Login to dashboard
2. Check "New This Month" stat
3. Filter by "Submitted" status
4. Review new applications
5. Update statuses as needed
6. Export CSV for records
7. Search for specific customers
8. Review project details
9. Logout when done
```

## 🔔 Notifications (Future)

Not yet implemented, but planned:
- Email alerts for new submissions
- SMS for urgent updates
- Push notifications for status changes
- Daily summary emails
- Weekly reports

## 💡 Pro Tips

1. **Fast Search**: Use partial matches ("aus" finds "Austin")
2. **Quick Filter**: Combine search + status filter
3. **Regular Exports**: Save weekly CSV backups
4. **Status Colors**: Learn color meanings for quick scanning
5. **Keyboard Nav**: Use Tab to move between fields faster

## 📊 Sample Data

In development mode, 12 mock projects are available:
- Various statuses (submitted, reviewing, approved, etc.)
- Different locations (Austin, Dallas, Houston, etc.)
- Random system sizes (5-15 kW)
- Random battery sizes (10-30 kWh)

Perfect for testing before real data exists!

---

## 🎯 One-Page Cheat Sheet

```
┌─────────────────────────────────────────────────────┐
│           ADMIN DASHBOARD CHEAT SHEET               │
├─────────────────────────────────────────────────────┤
│ URL:       http://localhost:5173/admin             │
│ Login:     admin@yourcompany.com / [password]      │
│                                                     │
│ SEARCH:    Type anything → instant results         │
│ FILTER:    Use status dropdown                     │
│ EXPORT:    Click Export → CSV downloads            │
│ VIEW:      Click View → project details            │
│ REFRESH:   Click 🔄 → reload data                 │
│                                                     │
│ STATUSES:                                          │
│   🔵 Submitted  🟡 Reviewing  🟢 Approved         │
│   🟣 Scheduled  🟢 Completed   🔴 Cancelled       │
│                                                     │
│ TROUBLESHOOTING:                                   │
│   Can't login? → Check role: "admin" in Firestore │
│   No data?     → Check security rules              │
│   Slow?        → Check network connection          │
│                                                     │
│ DOCS:                                              │
│   Setup:    ADMIN_SETUP.md                        │
│   Demo:     ADMIN_DEMO.md                         │
│   Features: ADMIN_FEATURE_SUMMARY.md              │
│                                                     │
│ SUPPORT:                                           │
│   1. Check docs first                             │
│   2. Review browser console                        │
│   3. Check Firebase Console                        │
└─────────────────────────────────────────────────────┘
```

---

**Print this page and keep it handy for quick reference!** 📄

**Bookmark**: `http://localhost:5173/admin` 🔖

**Questions?** Read the full docs in the project folder. 📚
