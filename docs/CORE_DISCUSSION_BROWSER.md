# Original Canvas Discussion Browser Features

## Overview

The Canvas Discussion Browser is a Next.js application that provides an intuitive interface for educators to view and analyze Canvas LMS discussion posts by individual users across all course topics. Built using the Pages Router architecture, it offers essential functionality for course management and grading workflows.

## Core Features

### 1. 🏠 **Home Page Discussion Browser** (`/`)

#### **User-Centric View**
- **User Aggregation**: Groups all discussion posts by participant using display names
- **Post Count Display**: Shows total number of posts per user for quick engagement overview
- **Last Active Tracking**: Displays when each user was last active in discussions
- **User Avatars**: Shows Canvas profile pictures when available, with fallback initials
- **Search Functionality**: Real-time filtering of users by name
- **Engagement Sorting**: Users sorted by post count (most active first)

#### **Visual Design**
- Clean card-based interface with user avatars/initials
- Red/maroon Boston College color scheme
- Responsive design with hover effects
- Font Awesome icons for visual consistency

### 2. 👤 **Individual User Pages** (`/user/[user_name]`)

#### **Comprehensive Post View**
- **Chronological Display**: All posts by selected user sorted by creation date
- **Topic Context**: Each post shows the discussion topic title
- **Threaded Replies**: Displays replies to user's posts with visual indentation
- **HTML Content Rendering**: Properly displays rich text content from Canvas
- **Creation Timestamps**: Shows when each post was created

#### **Grading Integration**
- **SpeedGrader Links**: Direct links to Canvas SpeedGrader for graded discussions
- **Assignment Detection**: Identifies which posts are linked to graded assignments
- **Grading Status**: Visual indicators showing graded vs ungraded submissions
- **Points Display**: Shows assignment point values when available

#### **Reply Organization**
- **Parent-Child Structure**: Organizes replies under original posts
- **Reply Attribution**: Shows who replied to user's posts
- **Visual Hierarchy**: Color-coded borders to distinguish replies from main posts

### 3. 📁 **Markdown Export Feature**

#### **Complete Course Export**
- **"Download All Discussions" Button**: One-click export of entire course discussions
- **Threaded Format**: Maintains discussion thread structure in markdown
- **Topic Organization**: Groups posts by discussion topic
- **Due Date Sorting**: Orders topics by assignment due dates
- **HTML to Markdown Conversion**: Uses Turndown.js for clean text conversion

#### **Export Structure**
```markdown
# Topic Title
*Due: [Date]*

## User Name at [Timestamp]
[Post content]

### Reply: Replier Name at [Timestamp]
> [Indented reply content]
```

### 4. ⚙️ **Settings Configuration** (`/settings`)

#### **Canvas API Setup**
- **API URL Configuration**: Canvas instance URL (defaults to Boston College)
- **Access Token Management**: Secure API token storage
- **Course ID Setup**: Target course identification
- **Credential Validation**: Tests API connection and displays course name

#### **Cache Management**
- **Manual Cache Control**: Clear cached data button
- **Settings Change Detection**: Auto-clears cache when credentials change
- **User Feedback**: Visual confirmation of save/clear operations

## Technical Architecture

### **API Proxy Pattern** (`/api/canvas-proxy.js`)

#### **CORS Solution**
- **Server-Side Proxy**: All Canvas API requests routed through Next.js API route
- **Security**: API tokens never exposed to client-side code
- **Request Forwarding**: Accepts `apiUrl`, `apiKey`, `endpoint`, `method`, `body` parameters
- **Error Handling**: Proper HTTP status code forwarding and error messages

### **Canvas API Integration** (`js/canvasApi.js`)

#### **Core Functions**

##### `fetchCanvasDiscussions()`
- **Complete Data Fetching**: Gets all discussion posts across all topics
- **Pagination Handling**: Loops through all pages with `per_page=100`
- **Deduplication**: Prevents duplicate posts using Set-based ID tracking
- **Data Enrichment**: Adds topic titles and assignment IDs to posts
- **Reply Fetching**: Recursively fetches all replies for each post

##### `fetchCanvasUserPosts()` 
- **User Filtering**: Extracts posts by specific user (display name or user ID)
- **Reply Inclusion**: Gets all replies to user's posts (regardless of reply author)
- **Thread Organization**: Maintains parent-child relationships between posts

##### Cache Management
- **Browser Storage**: Uses localStorage for client-side caching
- **Cache Key**: `canvas_discussions_${courseId}` for course-specific storage
- **Manual Refresh**: No automatic expiry - persists until user refreshes
- **Performance**: Near-instant navigation after initial load

### **Security Features**

#### **Content Sanitization**
- **DOMPurify Integration**: All HTML content sanitized before rendering
- **XSS Prevention**: Removes malicious scripts and unsafe content
- **Safe HTML Rendering**: Uses `dangerouslySetInnerHTML` only after sanitization

#### **Data Protection**
- **Local Storage Only**: Credentials stored in browser localStorage
- **No Third-Party Transmission**: All data stays between browser and Canvas
- **API Token Security**: Tokens handled server-side via proxy

### **Browser Caching System**

#### **Performance Optimization**
- **Persistent Storage**: Cache survives browser sessions
- **Manual Control**: User controls when to refresh data
- **Cache Indicators**: Visual feedback showing cache status and timestamps
- **Grading Session Support**: Cache persists during long grading sessions

#### **Cache States**
- **"⚡ Last refreshed: [timestamp]"** (green): Shows cached data age
- **"🔄 Fresh data"** (blue): Indicates newly fetched data
- **Manual refresh button**: Forces cache clear and data reload

## User Workflows

### **Typical Usage Patterns**

#### **Course Setup**
1. Navigate to Settings page
2. Enter Canvas API URL, access token, and course ID
3. Verify connection (course name displays)
4. Return to home page to view discussions

#### **Student Review**
1. Home page shows all participants with post counts
2. Click on student name to view their posts
3. Review posts chronologically with context
4. Use SpeedGrader links for grading when applicable

#### **Course Export**
1. Click "Download All Discussions" on home page
2. Receive complete markdown file with all course discussions
3. File includes threaded structure and due date organization

### **Navigation Flow**
- **Consistent Header**: All pages include navigation menu
- **Breadcrumb-style**: Clear path between home → user pages
- **Settings Access**: Always available from any page
- **GitHub Link**: Open source transparency

## Boston College Customizations

### **Institution-Specific Features**
- **Default API URL**: Pre-configured for BC Canvas instance
- **Color Scheme**: BC maroon/red branding
- **SpeedGrader URLs**: Hardcoded BC Canvas URLs for grading links
- **Email Construction**: Assumes `username@bc.edu` format (though not used in core functionality)

### **Educational Context**
- **Discussion-Heavy Courses**: Optimized for courses with extensive discussion participation
- **Grading Workflows**: Integrated with Canvas grading tools
- **Course Management**: Supports large enrollment courses with pagination

## Data Flow Summary

1. **User Setup**: Credentials configured in Settings page
2. **Data Fetching**: Home page fetches all discussions via Canvas API proxy
3. **User Aggregation**: Posts grouped by display name, sorted by activity
4. **Individual Views**: User pages show filtered posts with threading
5. **Export Options**: Complete course data exportable as markdown
6. **Caching**: Browser storage optimizes performance for repeat use

## File Structure

```
pages/
├── index.js          # Home page - user list and export
├── settings.js       # API configuration
├── dashboard.js      # Legacy dashboard (unused)
├── user/
│   └── [user_name].js # Individual user post view
└── api/
    └── canvas-proxy.js # Canvas API proxy

js/
└── canvasApi.js      # Canvas API client functions
```

This original feature set provides the foundation for the enhanced analytics and verification features documented in `NEW_FEATURES.md`.