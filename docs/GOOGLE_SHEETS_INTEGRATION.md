# Google Sheets Integration Documentation

## Overview

The Google Sheets integration enhances the Canvas Discussion Browser by providing supplemental user data from Google Sheets. This feature allows educators to maintain additional context about participants (institution, role, notes, etc.) in a familiar spreadsheet format while having that data automatically displayed in the discussion browser.

**Key Benefits:**
- **Enhanced User Profiles**: Display additional context beyond Canvas data
- **Flexible Data Management**: Use Google Sheets as a simple database
- **Fuzzy Name Matching**: Automatically match users even with name variations
- **Visual Integration**: Seamlessly display enhanced data in existing UI

## Technical Architecture

### Core Components

#### 1. **Google Sheets API Client** (`/public/js/googleSheetsApi.js`)
- **Public Sheet Access**: Uses Google Sheets API v4 with API key authentication
- **No OAuth Required**: Simplified setup using read-only API keys
- **Caching Layer**: localStorage-based caching for performance
- **Error Handling**: Graceful degradation when sheets are unavailable

#### 2. **User Matching Engine**
- **Fuzzy Name Matching**: Handles name variations and nicknames
- **Subset Matching**: Matches names with/without middle names
- **Confidence Scoring**: Tracks match quality (exact vs fuzzy)
- **Fallback Strategies**: Continues working when matches fail

#### 3. **Settings Integration** (`/pages/settings.js`)
- **Configuration UI**: Sheet ID and API key management
- **Connection Testing**: Verify sheet access and preview data
- **Schema Documentation**: Built-in guidance for sheet format

### Data Flow

```
Google Sheets → API Key Authentication → Fetch Sheet Data → 
Cache Locally → Match with Canvas Users → Enhance UI Display
```

## Google Sheets Schema

### Required Sheet Format

The integration expects a specific 8-column format:

| Column | Field | Description | Example |
|--------|-------|-------------|---------|
| **A** | Display Name | Name matching Canvas display name | "Rebecca Davis" |
| **B** | Institution | User's institution | "Boston College" |
| **C** | Title | Job title or role | "Graduate Student" |
| **D** | Notes | Free-form notes | "Specializes in medieval history" |
| **E** | Assistant Type | Type of assistant/role | "Research Assistant" |
| **F** | Tags | Comma-separated tags | "advanced,phd,researcher" |
| **G** | Custom Field 1 | Institution-specific data | "Cohort 2024" |
| **H** | Custom Field 2 | Additional custom data | "Advisor: Dr. Smith" |

### Schema Rules

1. **Header Row**: First row reserved for column headers (skipped during processing)
2. **Display Name Required**: Column A must contain the name for matching
3. **Optional Fields**: All other columns are optional and can be empty
4. **Tag Format**: Column F should use comma-separated values for multiple tags
5. **Sheet Permissions**: Must be publicly readable or shared with API key

## User Matching Algorithm

### Matching Strategy Priority

1. **Exact Match**: Direct string comparison of display names
2. **Fuzzy Match**: Normalized name comparison with transformations
3. **Subset Match**: Handle names with/without middle names or suffixes

### Name Normalization Process

```javascript
function normalizeNameForMatching(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, ' ')      // Remove parentheses
    .replace(/\b[a-z]\b/g, '')            // Remove middle initials
    .replace(/\bjonathan\b/g, 'jon')      // Nickname mappings
    .replace(/\btimothy\b/g, 'tim')
    .replace(/\bsteven?\b/g, 'steve')
    .replace(/\bnathaniel\b/g, 'nate')
    .replace(/\braymond\b/g, 'ray')
    .replace(/\bkimberlyn\b/g, 'kim')     // Institution-specific mappings
    .replace(/\bkimberly\b/g, 'kim')
    .replace(/[^\w\s]/g, '')              // Remove punctuation
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim();
}
```

### Subset Matching Logic

Handles cases where names differ by middle names or suffixes:

```javascript
// Example: "Rebecca Davis" matches "Rebecca Frost Davis"
const canvasWords = normalizedCanvasName.split(' ');
const sheetWords = normalizedSheetName.split(' ');
const canvasSet = new Set(canvasWords);
const sheetSet = new Set(sheetWords);

// Check if one name is subset of another
const canvasInSheet = canvasWords.every(word => sheetSet.has(word));
const sheetInCanvas = sheetWords.every(word => canvasSet.has(word));
```

### Match Quality Indicators

- **Exact Match**: Perfect string match, highest confidence
- **Fuzzy Match**: Name normalization required, medium confidence
- **Subset Match**: Partial name matching, lower confidence
- **No Match**: User not found in sheets, display fallback message

## Caching Strategy

### Cache Architecture

```javascript
// Cache key pattern
const cacheKey = `sheets_cache_${sheetId}`;

// Cache data structure
{
  data: [/* array of user objects */],
  timestamp: Date.now()
}
```

### Cache Management

- **Manual Refresh**: No automatic expiry, user controls when to refresh
- **Settings Changes**: Cache cleared when sheet ID or API key changes
- **Performance**: Near-instant loading after initial fetch
- **Isolation**: Separate cache namespace to avoid conflicts with Canvas data

### Cache States

- **Cache Hit**: Uses stored data, displays "Using cached data" in console
- **Cache Miss**: Fetches fresh data, stores in cache
- **Cache Clear**: Manual refresh button clears all sheets cache

## Security Considerations

### API Key Security

- **Read-Only Access**: API key only needs Sheets read permission
- **Client-Side Storage**: API key stored in localStorage (same as Canvas credentials)
- **No Server Storage**: Keys never transmitted to application server
- **Public Sheet Access**: No OAuth required, simplified setup

### Data Privacy

- **Local Processing**: All matching and caching happens in browser
- **No Third-Party Transmission**: Data stays between browser, Canvas, and Google Sheets
- **Optional Feature**: Integration is completely optional and can be disabled
- **Graceful Degradation**: App works fully without sheets integration

## Configuration and Setup

### Google Sheets Setup

1. **Create/Prepare Sheet**: Format data according to schema
2. **Set Permissions**: Make sheet publicly readable or shareable
3. **Get Sheet ID**: Extract from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### Google API Setup

1. **Google Cloud Console**: Create project or use existing
2. **Enable Sheets API**: Enable Google Sheets API v4
3. **Create API Key**: Generate API key for Sheets access
4. **Restrict Key** (recommended): Limit to Sheets API and specific domains

### Application Configuration

1. **Settings Page**: Enter Sheet ID and API key
2. **Test Connection**: Use "Test Connection" button to verify access
3. **Preview Data**: Review first 3 records to verify format
4. **Save Settings**: Store configuration in localStorage

## UI Integration Points

### 1. **Homepage Activity Feed** (`/pages/index.js`)
- Enhanced ActivityCard components show institution badges
- Assistant type indicators for different user roles
- Maintains existing layout while adding contextual information

### 2. **Individual User Pages** (`/pages/user/[user_name].js`)
- **Two-Column Layout**: Enhanced profile sidebar with posts on right
- **About Section**: Displays all available sheets data
- **Status Indicators**: Shows data source and match quality
- **Direct Sheet Access**: Link to edit Google Sheet

### 3. **Settings Page** (`/pages/settings.js`)
- **Dedicated Section**: Google Sheets configuration area
- **Schema Documentation**: Built-in format guidance
- **Connection Testing**: Verify setup before use
- **Debug Information**: Preview data for troubleshooting

## Visual Design Patterns

### Enhanced Profile Display

```javascript
// Profile information with structured layout
{enhancedUserData.institution && (
  <div>
    <span className="text-sm font-bold text-gray-700">Institution</span>
    <p className="text-gray-800">{enhancedUserData.institution}</p>
  </div>
)}
```

### Status Badges

- **"📊 Info from Google Sheets →"**: Link to edit sheet
- **"~Fuzzy Match"**: Indicates name normalization was used
- **Color-coded badges**: Success (green), warning (yellow), info (blue)

### Responsive Layout

- **Desktop**: Two-column layout with sticky profile sidebar
- **Mobile**: Single column with collapsible sections
- **Consistent Styling**: Matches existing Canvas Discussion Browser theme

## Troubleshooting

### Common Issues

#### 1. **No Users Matching**
- **Check Sheet Format**: Verify Column A contains display names
- **Name Variations**: Compare Canvas vs Sheet names exactly
- **Case Sensitivity**: Matching is case-insensitive but check for typos

#### 2. **API Connection Failures**
- **API Key Validity**: Ensure key has Sheets API access
- **Sheet Permissions**: Verify sheet is publicly readable
- **Network Issues**: Check browser console for detailed error messages

#### 3. **Cache Problems**
- **Stale Data**: Use refresh button to clear cache
- **localStorage Limits**: Clear browser storage if cache is corrupted
- **Settings Lost**: Avoid clearing cache when settings are unsaved

#### 4. **Performance Issues**
- **Large Sheets**: Consider reducing sheet size or using pagination
- **Slow Matching**: Fuzzy matching can be slow with many users
- **Cache Warming**: Initial load may be slow, subsequent loads are fast

### Debug Information

The integration provides extensive console logging:

```javascript
// Example debug output
🔍 Fuzzy matching for "Rebecca Davis" -> "rebecca davis"
   Comparing with "Rebecca Frost Davis" -> "rebecca frost davis"
   ✅ SUBSET MATCH FOUND! (canvas ⊆ sheet)
📊 Google Sheets: Loaded 15 user records
🔄 User Matching Results: {totalCanvas: 12, matched: 10, matchRate: '83.3'}
```

## Performance Optimizations

### Caching Strategy

- **Aggressive Caching**: Data cached until manual refresh
- **Lazy Loading**: Sheet data fetched only when needed
- **Batch Processing**: All matching done in single operation
- **Memory Efficient**: Cache cleaned up appropriately

### Network Optimization

- **Single API Call**: Fetch entire sheet in one request
- **Conditional Requests**: Use cached data when available
- **Error Recovery**: Graceful handling of network failures
- **Timeout Handling**: Reasonable timeouts for API calls

## Future Enhancements

### Potential Improvements

1. **Bi-directional Sync**: Edit notes from app back to sheets
2. **Advanced Matching**: Machine learning for better name matching
3. **Multi-sheet Support**: Different sheets for different courses
4. **Real-time Updates**: Webhook-based sheet change notifications
5. **Batch Operations**: Bulk updates and exports

### Scalability Considerations

- **Rate Limiting**: Handle Google Sheets API rate limits
- **Large Datasets**: Pagination for sheets with many rows
- **Multiple Courses**: Course-specific sheet management
- **Concurrent Users**: Handle multiple simultaneous access

### Integration Opportunities

- **Canvas Gradebook**: Sync enhanced data with Canvas
- **External Systems**: Connect with other institutional databases
- **Analytics**: Track engagement patterns with enhanced context
- **Reporting**: Generate reports combining Canvas and Sheets data

## Quick Reference

### Essential Setup Steps
1. ✅ Create Google Sheets with correct 8-column format
2. ✅ Make sheet publicly readable
3. ✅ Create Google Sheets API key
4. ✅ Enter Sheet ID and API key in settings
5. ✅ Test connection to verify setup
6. ✅ Refresh homepage to see enhanced data

### Configuration Checklist
- [ ] Sheet has proper column headers
- [ ] Column A contains Canvas display names
- [ ] Sheet is publicly accessible
- [ ] API key has Sheets API permission
- [ ] Settings saved successfully
- [ ] Connection test passes
- [ ] User profiles show enhanced data

### Troubleshooting Checklist
- [ ] Check browser console for error messages
- [ ] Verify sheet permissions and API key
- [ ] Test with small dataset first
- [ ] Compare names exactly between Canvas and Sheets
- [ ] Clear cache and test fresh data
- [ ] Verify sheet format matches documentation

This integration significantly enhances the Canvas Discussion Browser by providing rich contextual information about course participants while maintaining the application's simplicity and performance.