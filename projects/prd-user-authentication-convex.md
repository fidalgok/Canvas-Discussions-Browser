# PRD: User Authentication and Credential Management with Convex

## Overview

Replace browser localStorage credential storage with secure user authentication and encrypted credential management using Convex backend-as-a-service. This enables persistent, cross-device access to Canvas API credentials while maintaining security best practices.

## Problem Statement

Currently, users must manually enter Canvas API credentials (API URL, API key, course ID) into localStorage on each device and browser. This creates several issues:

- **Credential loss**: Data lost when clearing browser storage or switching devices
- **Security concerns**: Unencrypted storage in browser localStorage
- **User friction**: Must re-enter credentials on every new device/browser
- **No backup**: No recovery mechanism for lost credentials
- **Single institution**: Cannot easily manage multiple Canvas instances

## Solution

Implement user authentication and secure credential storage using Convex, allowing users to:

1. **Create accounts** and log in securely
2. **Save multiple Canvas instances** (e.g., BC, Harvard, MIT)
3. **Access credentials** from any device
4. **Encrypt API keys** server-side for security
5. **Manage institutions** with friendly names and default settings

## Success Metrics

- **User adoption**: 80% of returning users create accounts within 30 days
- **Credential persistence**: Zero credential loss incidents
- **Cross-device usage**: 40% of users access from multiple devices
- **Multi-institution**: 25% of users save multiple Canvas instances
- **Security**: Zero credential exposure incidents

## Technical Architecture

### Convex Backend

#### Database Schema
```typescript
// convex/schema.ts
export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }),
  
  canvasCredentials: defineTable({
    userId: v.id("users"),
    institutionName: v.string(), // "Boston College", "Harvard"
    displayName: v.string(), // User-friendly name
    apiUrl: v.string(),
    encryptedApiKey: v.string(), // Server-side encrypted
    courseId: v.optional(v.string()),
    isDefault: v.boolean(),
    createdAt: v.number(),
    lastUsed: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_default", ["userId", "isDefault"]),
});
```

#### Server Functions
```typescript
// convex/auth.ts
export const getUserProfile = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db.query("users").withIndex("by_email", q => q.eq("email", identity.email)).first();
  }
});

// convex/credentials.ts
export const saveCredentials = mutation({
  args: {
    institutionName: v.string(),
    displayName: v.string(),
    apiUrl: v.string(),
    apiKey: v.string(),
    courseId: v.optional(v.string()),
    isDefault: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    
    const encryptedKey = await encryptApiKey(args.apiKey);
    // Implementation details...
  }
});

export const getCredentials = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    
    const credentials = await ctx.db.query("canvasCredentials")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();
    
    // Decrypt keys and return
  }
});
```

### Frontend Integration

#### Authentication Setup
```typescript
// _app.js updates
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react-auth0"; // or chosen provider

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function App({ Component, pageProps }) {
  return (
    <ConvexProviderWithAuth client={convex}>
      <Component {...pageProps} />
    </ConvexProviderWithAuth>
  );
}
```

#### Credential Management UI
```typescript
// components/auth/CredentialManager.js
export default function CredentialManager() {
  const credentials = useQuery(api.credentials.getCredentials);
  const saveCredentials = useMutation(api.credentials.saveCredentials);
  const deleteCredentials = useMutation(api.credentials.deleteCredentials);
  
  // Multiple institution management UI
  // Add/edit/delete Canvas instances
  // Set default institution
}
```

## User Experience

### Authentication Flow
1. **First visit**: Show login/register option alongside "Try without account"
2. **Registration**: Email + password, OAuth (Google/GitHub), or anonymous trial
3. **Credential import**: Detect existing localStorage, offer to save to account
4. **Institution management**: Add multiple Canvas instances with friendly names

### Migration Strategy
1. **Graceful fallback**: Keep localStorage support for non-authenticated users
2. **Import prompt**: "Save these credentials to your account?" on first login
3. **Sync on login**: Auto-populate from saved credentials
4. **Export option**: Download credentials before migration

### New Settings UI
```
┌─ Account Settings ────────────────────────┐
│                                           │
│ 📧 tim@bc.edu                   [Logout]  │
│                                           │
│ ┌─ Canvas Institutions ─────────────────┐ │
│ │                                       │ │
│ │ 🏫 Boston College (Default)           │ │
│ │    api.bc.edu • Course: PSYC1101     │ │
│ │    [Edit] [Delete]                    │ │
│ │                                       │ │
│ │ 🏫 Harvard Extension                  │ │
│ │    canvas.harvard.edu • Course: ...   │ │
│ │    [Edit] [Delete] [Set Default]      │ │
│ │                                       │ │
│ │ [+ Add Institution]                   │ │
│ └───────────────────────────────────────┘ │
│                                           │
│ ┌─ Data & Privacy ──────────────────────┐ │
│ │ [Export Data] [Delete Account]        │ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

## Security Considerations

### Encryption
- **Server-side encryption**: API keys encrypted before database storage
- **Key rotation**: Support for API key updates
- **Zero-knowledge**: Convex never logs decrypted keys

### Access Control
- **User isolation**: Strict user-based access control
- **Session management**: JWT tokens with expiration
- **HTTPS enforcement**: All credential transmission encrypted

### Compliance
- **GDPR compliance**: Data export/deletion capabilities
- **Educational data**: Follow FERPA guidelines for student data
- **Audit logging**: Track credential access (optional)

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Convex project setup and deployment
- [ ] Basic authentication (email/password)
- [ ] User registration/login pages
- [ ] Protected route wrapper

### Phase 2: Credential Storage (Week 2)
- [ ] Database schema implementation
- [ ] Credential encryption/decryption functions
- [ ] CRUD operations for Canvas instances
- [ ] Migration from localStorage

### Phase 3: UI Enhancement (Week 3)
- [ ] Institution management interface
- [ ] Multi-institution switcher
- [ ] Import/export functionality
- [ ] Settings page redesign

### Phase 4: Polish & Deploy (Week 4)
- [ ] OAuth providers (Google, GitHub)
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] Documentation and testing

## Risk Assessment

### Technical Risks
- **Migration complexity**: Careful localStorage → Convex transition needed
- **Encryption performance**: Server-side crypto may add latency
- **Convex limitations**: Vendor lock-in and pricing considerations

### User Risks
- **Adoption friction**: Some users may resist account creation
- **Data loss**: Migration must be bulletproof
- **Privacy concerns**: Clear communication about data handling

### Mitigation Strategies
- **Gradual rollout**: Beta testing with volunteer users
- **Fallback support**: Keep localStorage option for hesitant users
- **Clear privacy policy**: Transparent data handling documentation
- **Export tools**: Easy data portability

## Success Criteria

### Technical
- [ ] Zero credential loss during migration
- [ ] < 500ms credential retrieval latency
- [ ] 99.9% uptime for authentication
- [ ] All API keys properly encrypted

### User Experience
- [ ] < 30 seconds to create account and save credentials
- [ ] Seamless cross-device experience
- [ ] Clear multi-institution management
- [ ] Positive user feedback (> 4.0/5.0 rating)

### Business
- [ ] 50% user retention improvement
- [ ] Reduced support tickets about lost credentials
- [ ] Foundation for future premium features
- [ ] Enhanced security posture

## Future Enhancements

### Phase 2 Features
- **Team sharing**: Share course access with colleagues
- **SSO integration**: Institution-provided single sign-on
- **API key rotation**: Automated Canvas token refresh
- **Usage analytics**: Track API usage and performance

### Enterprise Features
- **Admin dashboard**: Institution-wide credential management
- **Bulk user import**: CSV-based user provisioning
- **Audit logging**: Comprehensive access tracking
- **Custom branding**: White-label authentication

## Conclusion

This authentication system transforms Canvas Discussion Browser from a personal tool to a professional platform. By solving the credential management problem, we enable:

1. **Better user experience**: No more lost credentials
2. **Enhanced security**: Proper encryption and access control
3. **Cross-platform usage**: Seamless device switching
4. **Future scalability**: Foundation for team and enterprise features

The Convex implementation provides a modern, type-safe backend with minimal operational overhead, allowing focus on user experience rather than infrastructure management.