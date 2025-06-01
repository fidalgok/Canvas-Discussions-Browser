# Canvas Discussion Viewer (Next.js)

A modern, secure, and portable Next.js app for viewing and exporting Canvas LMS discussions. No Python backend required—everything runs on Next.js with a secure API proxy.

## Features

- **Unified Next.js App**: All features are implemented in a modern React/Next.js stack.
- **Secure API Proxy**: All Canvas API calls are proxied through a Next.js API route to keep your API keys private and avoid CORS issues. No data or credentials are ever sent to third-party servers.
- **User-Friendly Settings**: Enter your Canvas API URL, Access Token, and Course ID in a simple settings form. Credentials are stored in localStorage for your privacy.
- **Course Name in Header**: The course name is fetched and displayed in the site header for context.
- **Unified Navigation**: Consistent header and navigation across all pages (Home, User Posts, Settings).
- **Accessible, Minimal UI**: Modern design with Tailwind CSS and accessibility improvements.
- **Chronological Posts**: User posts are sorted oldest-to-newest for clarity.

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
5. Use the Home page to browse users, view posts, and export discussions.

## Requirements
- Node.js 18+
- A valid Canvas API Access Token
- Your Canvas instance API URL (e.g. https://school.instructure.com/api/v1)
- Your Course ID

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

---

This app is ready for deployment to Vercel, Netlify, or any Next.js-friendly host. All logic is in JavaScript/TypeScript—no Python or legacy code required.
