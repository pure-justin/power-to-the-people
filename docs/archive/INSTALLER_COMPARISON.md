# Installer Comparison Tool

A comprehensive solar installer comparison tool for the Power to the People platform. Helps customers compare multiple solar installers side-by-side based on pricing, ratings, warranties, and other key metrics.

## Features

### Core Functionality

- **Side-by-Side Comparison**: Compare up to 4 installers simultaneously
- **Dynamic Pricing**: Real-time calculations based on system size and equipment
- **Smart Recommendations**: AI-powered installer suggestions based on user priorities
- **Comprehensive Metrics**: Compare ratings, warranties, experience, and customer satisfaction
- **Interactive Filters**: Sort and filter installers by price, quality, speed, or overall score

### Key Metrics Displayed

1. **Pricing**
   - Solar system cost (per watt pricing)
   - 60 kWh battery cost
   - Total system price
   - Federal tax credit (30%)
   - Net cost after incentives
   - Monthly payment estimates

2. **Company Information**
   - Overall rating (out of 5 stars)
   - Number of customer reviews
   - Years in business
   - Total installations completed
   - Customer satisfaction percentage
   - On-time completion rate
   - Permitting success rate

3. **Warranties**
   - Workmanship warranty (years)
   - Panel warranty (years)
   - Inverter warranty (years)
   - Battery warranty (years)

4. **Equipment**
   - Panel brands available
   - Inverter brands available
   - Battery brands available

5. **Timeline**
   - Response time
   - Installation timeline
   - Service areas

6. **Certifications**
   - NABCEP certification
   - BBB rating
   - Manufacturer partnerships
   - Industry certifications

### Installer Scoring System

Each installer receives an overall score (0-100) based on:

- **Rating** (25%): Google/review platform ratings
- **Customer Satisfaction** (25%): Verified customer satisfaction percentage
- **On-Time Completion** (15%): Project completion on schedule
- **Permitting Success** (10%): Success rate getting permits approved
- **Years in Business** (10%): Experience and longevity
- **Price Value** (15%): Competitive pricing relative to market

## Installers Database

Currently includes 6 major solar installers:

### 1. Freedom Solar (Texas Local)
- **Rating**: 4.9/5 ⭐
- **Price**: $2.35/watt
- **Specialty**: Texas-focused, Duracell Master Installer
- **Best For**: Fastest installation, highest customer satisfaction
- **Pros**: Local expertise, 3-4 week install, exceptional service
- **Cons**: Limited to Texas region

### 2. SunPower (Premium)
- **Rating**: 4.8/5 ⭐
- **Price**: $2.95/watt
- **Specialty**: Premium panels with 40-year warranty
- **Best For**: Highest efficiency, best warranties
- **Pros**: Industry-leading panels, 40-year panel warranty
- **Cons**: Premium pricing, longer wait times

### 3. Momentum Solar
- **Rating**: 4.7/5 ⭐
- **Price**: $2.45/watt
- **Specialty**: Comprehensive residential solutions
- **Best For**: Strong warranties, multiple financing options
- **Pros**: Fast response, extensive experience
- **Cons**: Higher price point

### 4. Palmetto Solar
- **Rating**: 4.6/5 ⭐
- **Price**: $2.55/watt
- **Specialty**: Design-first approach, customer education
- **Best For**: Quick installation, flexible equipment
- **Pros**: 4-5 week install, good financing, B Corp certified
- **Cons**: Limited service area

### 5. Tesla Energy
- **Rating**: 4.5/5 ⭐
- **Price**: $2.20/watt (lowest)
- **Specialty**: Integrated Tesla ecosystem
- **Best For**: Tesla owners, competitive pricing
- **Pros**: Best price, Powerwall integration, advanced app
- **Cons**: Longer timelines, variable service quality

### 6. Sunrun
- **Rating**: 4.3/5 ⭐
- **Price**: $2.65/watt
- **Specialty**: Largest residential installer, lease programs
- **Best For**: Flexible financing, low credit requirements
- **Pros**: Wide service area, accepts 600+ credit score
- **Cons**: Mixed reviews, longer timelines

## User Interface

### Controls Section
- **System Size Slider**: Adjust between 5-20 kW
- **Sort By Dropdown**:
  - Overall Score
  - Best Price
  - Highest Rating
  - Customer Satisfaction
  - Fastest Installation
- **Priority Filter**:
  - Balanced (recommended)
  - Best Price
  - Best Quality
  - Fastest Install

### Recommended Section
Shows top 3 installers based on selected priority with quick-select functionality.

### Installer Cards
Each card displays:
- Company name and logo
- Star rating and review count
- Overall score badge
- Pricing breakdown
- Monthly payment estimate
- Key metrics (timeline, experience, satisfaction)
- Battery options
- Pros and cons
- Expandable section with:
  - Detailed warranty information
  - Certifications
  - Contact information

## Price Calculations

### Formula
```javascript
Base Price = System Size (kW) × 1000 × Price Per Watt
Battery Cost = $30,000 (60 kWh Duracell Power Center)
Total Price = Base Price + Battery Cost
Federal Tax Credit = Total Price × 0.30 (30%)
Net Cost = Total Price - Federal Tax Credit
Monthly Payment = Net Cost / (25 years × 12 months) with APR
```

### Example (10 kW System, Freedom Solar)
```
Base Price: 10 kW × 1000 × $2.35 = $23,500
Battery: $30,000
Total: $53,500
Tax Credit (30%): -$16,050
Net Cost: $37,450
Monthly: $216/mo @ 3.75% APR (25 years)
```

## Usage

### From Success Page
After completing the qualification form, customers see a prominent "Compare Installers" button on the Success page.

### Direct Access
Navigate to `/installers` to access the comparison tool directly.

### Workflow
1. Select desired installers (up to 4)
2. Adjust system size if needed
3. Choose sorting preference
4. Review detailed comparisons
5. Expand cards for more information
6. Contact preferred installer

## Technical Implementation

### Files
- `src/services/installerService.js` - Data management and calculations
- `src/pages/InstallerComparison.jsx` - Main comparison UI
- `src/pages/Success.jsx` - Integration with success page

### Key Functions

#### `getAllInstallers()`
Returns array of all installer objects.

#### `getInstallerById(id)`
Retrieves specific installer by ID.

#### `calculatePriceEstimate(installer, systemSizeKw)`
Calculates complete pricing breakdown for a system.

#### `compareInstallers(installerIds, systemSizeKw)`
Returns comparison data for multiple installers.

#### `getRecommendedInstallers(criteria)`
Returns top 3 installers based on priority criteria.

#### `getInstallerScore(installer)`
Calculates weighted score (0-100) for an installer.

### State Management
```javascript
const [selectedInstallers, setSelectedInstallers] = useState([])
const [systemSize, setSystemSize] = useState(10)
const [comparisonData, setComparisonData] = useState([])
const [sortBy, setSortBy] = useState('score')
const [filterPriority, setFilterPriority] = useState('balanced')
```

## Design System

### Colors
- **Primary Accent**: `#00FFD4` (teal)
- **Secondary Accent**: `#00B894` (green)
- **Background**: `#0a0a0f` (dark)
- **Cards**: `rgba(255, 255, 255, 0.03)`
- **Borders**: `rgba(255, 255, 255, 0.08)`
- **Success**: `#10b981`
- **Warning**: `#fbbf24`
- **Error**: `#ef4444`

### Typography
- **Headers**: Space Grotesk (bold, 600-900 weight)
- **Body**: Inter (400-700 weight)
- **Size Scale**: 0.7rem - 2.6rem (responsive with clamp)

### Components
- Gradient text effects
- Glassmorphism cards
- Smooth transitions (0.2-0.3s)
- Hover effects with elevation
- Responsive grid layouts

## Mobile Optimization

- Responsive grid (1-4 columns based on screen size)
- Touch-friendly controls
- Collapsible sections
- Optimized font sizes with clamp()
- Stacked layouts on mobile

## Future Enhancements

### Planned Features
1. **Real-time Availability**: Check installer availability in user's area
2. **Financing Calculator**: Detailed payment scenarios
3. **Equipment Comparison**: Deep-dive into panel/battery specs
4. **Customer Reviews**: Integration with Google Reviews API
5. **Direct Booking**: Schedule consultations within the app
6. **Incentive Calculator**: State and local rebate information
7. **ROI Timeline**: Break-even analysis per installer
8. **Installer Videos**: Company introduction videos
9. **Live Chat**: Direct messaging with installer reps
10. **Save Comparisons**: User accounts to save favorite installers

### Data Integration
- Connect to Firestore for dynamic installer data
- Real-time pricing updates
- Inventory availability
- Regional service area validation
- Automated review imports

### Analytics
- Track most compared installers
- Monitor conversion rates
- A/B test card layouts
- Optimize recommendation algorithm

## API Integration Points

### Future APIs
1. **Google Reviews API**: Pull real-time reviews
2. **BBB API**: Verify BBB ratings
3. **NABCEP API**: Verify certifications
4. **EnergySage API**: Cross-reference installer data
5. **DSIRE API**: State/local incentive data

## Conversion Optimization

### Call-to-Actions
- Prominent "Compare Installers" button on Success page
- Direct contact links (phone, email, website)
- Single-click to expand detailed info
- Clear next steps

### Trust Signals
- Official certifications displayed
- Warranty details prominently shown
- Customer satisfaction percentages
- Years in business highlighted
- Review counts visible

### User Experience
- Fast load times (< 2s)
- Smooth animations
- Clear visual hierarchy
- Consistent design language
- Accessible color contrasts

## Testing

### Manual Testing Checklist
- [ ] Compare 1-4 installers
- [ ] Adjust system size (5-20 kW)
- [ ] Test all sort options
- [ ] Test all filter options
- [ ] Expand/collapse all cards
- [ ] Verify pricing calculations
- [ ] Test responsive layouts
- [ ] Check contact links
- [ ] Verify navigation
- [ ] Test on mobile devices

### Automated Testing (Future)
- Unit tests for calculations
- Integration tests for API calls
- E2E tests for user flows
- Visual regression tests

## Deployment

Built and deployed with the main Power to the People app:

```bash
npm run build
firebase deploy
```

Access at: `https://power-to-the-people-vpp.web.app/installers`

## Support

For issues or feature requests, contact the development team or open an issue in the project repository.

---

Built with ❤️ for Power to the People
