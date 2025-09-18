# Canvas Discussion Browser

A Next.js application designed for **educators and instructors** who want to efficiently review and analyze student participation in Canvas LMS discussion forums. Includes Google Sheets integration for enhanced user profiles with institutional context.

## Why This Tool Exists

Canvas's default discussion interface is organized by topic, making it difficult for instructors to:
- See the complete picture of individual student participation across all discussions
- Quickly identify which students are engaging vs. remaining silent
- Efficiently navigate between student posts and grading interfaces
- Keep records of discussion content for evaluation or accreditation

This app transforms Canvas's topic-centric view into a **student-centric view**, allowing instructors to assess participation patterns, streamline grading workflows, and export discussions for documentation.

## Key Use Cases

- **Participation Assessment**: Quickly identify which students are actively participating
- **Grading Efficiency**: View all posts by a student in chronological order with direct links to SpeedGrader for ungraded content
- **Content Analysis**: Review the quality and depth of individual student contributions across all course topics  
- **Documentation**: Export all discussions as markdown for course evaluation, sharing with colleagues, or archival purposes

The app uses a secure API proxy to access Canvas course data with your personal API token, ensuring your credentials remain private.

## Canvas Discussion Browser Features

- **Settings**: Enter your Canvas API URL, Access Token, and Course ID in a simple settings form. Credentials are stored locally in your browser's localStorage for your privacy.
- **Google Sheets Integration**: Optionally enhance user profiles with additional data from Google Sheets (institution, role, notes, etc.)
- **Enhanced User Profiles**: View comprehensive user information with fuzzy name matching between Canvas and external data
- **User List**: View a list of users in the course and their posts with enhanced profile information
- **User Posts**: View all posts by a user, sorted oldest-to-newest. Includes link to Speedgrade for ungraded posts.

## Implementation

- ** Next.js App**: All features are implemented in a modern React/Next.js stack.
- **Secure API Proxy**: All Canvas API calls are proxied through a Next.js API route to keep your API keys private and avoid CORS issues. No data or credentials are ever sent to third-party servers.

### Google Sheets Integration

- **Enhanced User Profiles**: Supplement Canvas data with information from Google Sheets (institution, role, notes, etc.)
- **Automatic Name Matching**: Smart matching between Canvas display names and spreadsheet entries, including nickname variations
- **Flexible Schema**: 8-column format supporting institution, title, notes, assistant type, tags, and custom fields
- **Visual Integration**: Enhanced profile sidebars and activity indicators throughout the interface
- **Easy Setup**: Simply provide Google Sheets ID and API key in settings for immediate integration

### Markdown Export Feature

- **Download All Discussions as Markdown**: Export every discussion topic and all replies in a single portable `.md` file.
- **Preserves Thread Structure**: Replies are nested and indented, with each reply prefaced by `Reply:` and shown as a deeper heading.
- **No HTML**: All Canvas post content is converted to clean markdown (using Turndown), with paragraphs and line breaks preserved.
- **Topics Ordered by Due Date**: Topics are sorted by due date (if available) or alphabetically.
- **Easy to Use**: Just click the "Download All Discussions (Markdown)" button on the Home page.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.
4. Go to Settings, enter your Canvas API URL, Access Token, and Course ID.
5. Optionally configure Google Sheets integration for enhanced user profiles.
6. Use the Home page to browse users, view posts, and export discussions.

## Requirements
- Node.js 18+
- A valid Canvas API Access Token
- Your Canvas instance API URL (e.g. https://school.instructure.com/api/v1)
- Your Course ID
- (Optional) Google Sheets API key for enhanced user profiles
- (Optional) Google Sheets ID with properly formatted user data

## Security Notes & Best Practices

**API Key Handling**
- Canvas API tokens are never hardcoded or committed to the repository.
- Credentials are stored only in the browser's localStorage and are sent only to your own deployed app (never to third parties).

**API Proxy**
- All Canvas API requests are proxied through a Next.js API route to avoid CORS issues and keep tokens private.
- The API proxy does not log or persist sensitive data.

**HTML Sanitization**
- All HTML content from Canvas (such as discussion posts) is sanitized with [DOMPurify](https://github.com/cure53/DOMPurify) before being rendered or processed, protecting against XSS attacks.
- Markdown exports also sanitize HTML before conversion.

**Input Validation**
- User input (API URL, Access Token, Course ID) is not trusted and should be validated for correct format and length.

**General Recommendations**
- Keep dependencies up to date and run `npm audit` regularly.
- If you deploy to a public URL, consider Netlify password protection or similar if you want to restrict access.
- Review any new features that render or process HTML to ensure DOMPurify is used where appropriate.

**Assumptions**
- Canvas is assumed to sanitize its own data, but additional local sanitization is performed for defense in depth.

**Security Review**
- This app follows best practices for handling credentials and untrusted content, and is ready for review by security teams.

## Deployment

### Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to production**:
   ```bash
   vercel --prod --yes
   ```

4. **Follow the prompts** to set project name and deployment settings

The app will be automatically built and deployed. Vercel will provide you with a production URL.

### Other Hosting Options

This app can also be deployed to Netlify or any Next.js-compatible host.

---

**Security Note**: All API credentials are stored only in users' browsers (localStorage) and never transmitted to third parties.