# API Documentation Portal - Complete Guide

## 🎉 What's Been Built

A comprehensive, interactive API documentation portal with live testing capabilities for the Power to the People solar + battery platform.

## 📍 Access the Portal

**URL**: `http://localhost:5173/api-docs` (development)

**Production URL**: `https://your-domain.com/api-docs`

## ✨ Features

### 1. Interactive Navigation
- **Searchable Sidebar**: Quick search across all documentation sections
- **6 Main Sections**: Introduction, Authentication, Solar API, Firebase API, 3D Visualization, API Playground, Code Examples
- **Smooth Animations**: Professional transitions and hover effects
- **Active Section Highlighting**: Always know where you are

### 2. Solar API Documentation
Complete reference for all solar system design endpoints:
- `getBuildingInsights()` - Fetch roof geometry and solar potential
- `calculateSystemDesign()` - Design optimal solar + battery systems
- `designSolarSystem()` - End-to-end system design
- `getDataLayers()` - GeoTIFF imagery and flux data
- `calculatePanelProduction()` - Per-panel production estimates

Each endpoint includes:
- Method type (GET/POST)
- Parameter documentation with types and requirements
- Return value specifications
- Complete code examples
- Copy-to-clipboard functionality

### 3. Firebase API Documentation
Database operations for:
- **Leads Collection**: Solar installation leads
- **Projects Collection**: Active installations
- **Referrals Collection**: Referral tracking
- **Commercial Leads Collection**: AI-generated leads

Includes:
- Collection structure diagrams
- CRUD operation examples
- Real-time listener setup
- Best practices

### 4. 3D Visualization Guide
Integration guides for:
- Cesium 3D viewer configuration
- Google Photorealistic 3D Tiles
- Solar panel overlay rendering
- 2D satellite imagery visualization
- Color-coded production heat maps

### 5. API Playground 🎮
**Interactive testing environment** where you can:
- Select any endpoint from a dropdown
- Enter real coordinates and parameters
- Execute live API calls
- View formatted JSON responses
- Test with example locations (Austin, LA, Miami)

**No Postman or curl needed** - test everything right in the browser!

### 6. Complete Code Examples
Production-ready implementations:
- Full solar system design workflow
- Lead creation with system design
- Real-time project status updates
- Referral tracking system
- Error handling patterns

## 🎨 Design Features

### Visual Design
- **Dark Theme**: Professional dark mode with blue/purple gradients
- **Syntax Highlighting**: Beautiful code blocks with Monaco font
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Polished hover effects and transitions
- **Color-Coded Badges**: Method types (GET/POST/PUT/DELETE) with distinct colors

### User Experience
- **One-Click Copy**: Copy any code example with a single click
- **Search**: Find any section instantly
- **Persistent Sidebar**: Easy navigation without scrolling
- **Clear Typography**: Easy-to-read documentation
- **Visual Hierarchy**: Clear section organization

## 📁 File Structure

```
power-to-the-people/
├── src/
│   ├── pages/
│   │   └── ApiDocs.jsx                 # Main documentation component
│   ├── components/
│   │   └── ApiPlayground.jsx           # Interactive testing playground
│   ├── styles/
│   │   ├── ApiDocs.css                 # Documentation portal styles
│   │   └── ApiPlayground.css           # Playground styles
│   └── services/
│       ├── solarApi.js                 # Solar API functions
│       ├── firebase.js                 # Firebase configuration
│       └── referralService.js          # Referral service
├── docs/
│   └── API_PORTAL_GUIDE.md            # This guide
└── API_DOCUMENTATION.md               # Comprehensive API reference
```

## 🚀 Usage Examples

### Testing an API Endpoint

1. Navigate to `/api-docs`
2. Click "API Playground" in the sidebar
3. Select "Design Solar System" from dropdown
4. Enter coordinates:
   - Latitude: `30.2672`
   - Longitude: `-97.7431`
   - Annual Usage: `12000`
   - Target Offset: `1.0`
5. Click "Execute API Call"
6. View the complete system design response!

### Copying Code Examples

1. Navigate to any endpoint documentation
2. Scroll to the "Example" section
3. Click the "Copy" button in the top-right of the code block
4. Paste into your IDE - ready to use!

### Searching Documentation

1. Use the search box at the top of the sidebar
2. Type any keyword (e.g., "battery", "firebase", "cesium")
3. Sections are filtered in real-time
4. Click any section to jump directly to it

## 📊 API Coverage

### Solar API (9 endpoints documented)
- ✅ Building insights
- ✅ System design calculation
- ✅ Complete system design
- ✅ Data layers (GeoTIFF)
- ✅ RGB imagery decoding
- ✅ Flux data fetching
- ✅ Panel production calculation
- ✅ Optimal panel count
- ✅ Monthly production distribution

### Firebase API (4 collections documented)
- ✅ Leads CRUD operations
- ✅ Projects management
- ✅ Referrals tracking
- ✅ Commercial leads

### Visualization (2 approaches documented)
- ✅ Cesium 3D integration
- ✅ 2D canvas rendering

## 🎯 Key Components

### ApiDocs.jsx
Main documentation component with:
- Section-based navigation
- Content rendering
- Search functionality
- Code block with syntax highlighting
- Parameter tables
- Collection cards

### ApiPlayground.jsx
Interactive testing component with:
- Endpoint selector
- Dynamic parameter inputs
- Live API execution
- Response formatting
- Error handling
- Loading states

### Styling
Professional CSS with:
- Dark theme colors
- Gradient effects
- Smooth transitions
- Responsive breakpoints
- Custom scrollbars
- Card hover effects

## 🔧 Customization

### Adding a New Endpoint

1. Open `src/pages/ApiDocs.jsx`
2. Find the appropriate section (e.g., `solarApi`)
3. Add a new `<ApiEndpoint>` component:

```jsx
<ApiEndpoint
  method="POST"
  endpoint="yourNewFunction(param1, param2)"
  description="What this endpoint does"
  parameters={[
    { name: 'param1', type: 'string', required: true, description: 'First parameter' },
    { name: 'param2', type: 'number', required: false, description: 'Second parameter' }
  ]}
  returns="Promise<object> - What it returns"
  example={`import { yourNewFunction } from './services/solarApi';

const result = await yourNewFunction('value1', 123);
console.log(result);`}
  onCopy={(code) => copyToClipboard(code, 'unique-id')}
  copied={copiedCode === 'unique-id'}
/>
```

### Adding to the Playground

1. Open `src/components/ApiPlayground.jsx`
2. Add your endpoint to the `endpoints` object:

```javascript
yourEndpoint: {
  name: 'Your Endpoint Name',
  description: 'What it does',
  params: ['param1', 'param2']
}
```

3. Add execution logic in `executeEndpoint()` switch statement

### Styling Changes

Edit `src/styles/ApiDocs.css` to customize:
- Colors (search for color values like `#60a5fa`)
- Spacing (padding/margin values)
- Border radius (rounded corners)
- Shadows (box-shadow values)
- Animations (transition properties)

## 📱 Responsive Design

The portal is fully responsive:
- **Desktop (1024px+)**: Sidebar + full content
- **Tablet (768px-1023px)**: Stacked layout with collapsible sidebar
- **Mobile (< 768px)**: Single column, optimized for touch

## 🎓 Best Practices

### For Documentation Writers
1. Keep descriptions concise but complete
2. Include realistic code examples
3. Show both success and error cases
4. Link to related endpoints
5. Update when APIs change

### For Developers
1. Test all examples in the playground
2. Verify parameter types and requirements
3. Include error handling in examples
4. Show best practices (not just minimal code)
5. Keep code examples up-to-date

### For Users
1. Start with the Introduction section
2. Set up Authentication first
3. Test endpoints in the Playground
4. Copy examples as starting points
5. Refer back to parameter documentation

## 🔗 Integration Points

### With Existing App
The API docs are integrated at `/api-docs` route in `App.jsx`:

```javascript
<Route path="/api-docs" element={<ApiDocs />} />
```

### External Links
- GitHub repository (footer link)
- Google Solar API docs
- Firebase documentation
- Cesium documentation

## 📈 Future Enhancements

Potential additions:
- [ ] OpenAPI/Swagger spec generation
- [ ] Postman collection export
- [ ] API versioning documentation
- [ ] Rate limiting information
- [ ] Webhook documentation
- [ ] SDK downloads
- [ ] Interactive tutorials
- [ ] Video guides

## 🐛 Troubleshooting

### Portal Not Loading
- Check that dev server is running: `npm run dev`
- Verify route exists in `App.jsx`
- Check browser console for errors

### Playground Not Working
- Verify environment variables are set
- Check API keys are valid
- Look for CORS issues in network tab
- Verify Firebase configuration

### Styling Issues
- Check CSS files are imported correctly
- Verify no conflicting global styles
- Clear browser cache
- Check responsive breakpoints

## 💡 Tips & Tricks

1. **Quick Search**: Press `/` to focus the search box
2. **Copy Code**: Click the copy button, don't select and copy
3. **Test First**: Use the playground before implementing
4. **Real Data**: Test with actual addresses for best results
5. **Error Messages**: Check the browser console for detailed errors

## 📞 Support

For issues or questions:
1. Check this guide first
2. Review the API_DOCUMENTATION.md
3. Test in the API Playground
4. Check browser console for errors
5. Contact the development team

## 📝 Summary

You now have:
- ✅ Interactive API documentation portal at `/api-docs`
- ✅ Live API testing playground (no Postman needed!)
- ✅ Complete code examples for all major operations
- ✅ Beautiful, responsive design
- ✅ Searchable navigation
- ✅ One-click code copying
- ✅ Comprehensive parameter documentation
- ✅ Visual guides for 3D visualization
- ✅ Firebase collection structure
- ✅ Production-ready code patterns

**The portal is live and ready to use!** 🚀

Navigate to http://localhost:5173/api-docs and explore!

---

**Created**: February 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
