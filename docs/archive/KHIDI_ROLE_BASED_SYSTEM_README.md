# KHIDI Role-Based Account System

## Overview
This implementation provides a comprehensive role-based access control (RBAC) system for HEALO-KHIDI, enabling multi-role user management for cancer patients, Korean hospitals, local clinics, agents, and administrators.

## Architecture

### 1. Database Schema
**Table: `user_roles`**

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'korean_hospital', 'local_clinic', 'agent', 'admin')),
  organization_name TEXT, -- hospital/clinic name if applicable
  organization_id UUID, -- reference to hospitals table if korean_hospital
  language_preference TEXT DEFAULT 'ru',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
```

**Features:**
- One user can have multiple roles
- `UNIQUE(user_id, role)` prevents duplicate role assignments
- RLS (Row-Level Security) policies enable:
  - Users can read their own roles
  - Admins can manage all roles
- Language preference stored per role for multi-language support

### 2. Role Definitions

**Five Role Types:**

| Role | Permissions | Use Case |
|------|---|---|
| **patient** | intake:create, symptom:report, consultation:join, followup:view | Cancer patients from Kazakhstan |
| **korean_hospital** | referral:review, consultation:host, treatment:record, patient:view | Korean hospitals treating KHIDI patients |
| **local_clinic** | consultation:join, followup:report, patient:refer | Local clinics referring patients to Korea |
| **agent** | escalation:handle, matching:verify, schedule:manage, patient:view, consultation:moderate | KHIDI operational agents |
| **admin** | * (all permissions) | System administrators |

### 3. Code Modules

#### `/src/lib/auth/roles.ts`
**Exports:**
- `UserRole` — Type union of all role types
- `UserRoleRecord` — Interface for user role records with optional organization metadata
- `ROLE_PERMISSIONS` — Permission matrix for each role
- `hasPermission(roles, permission)` — Check if user has permission across all active roles
- `getPrimaryRole(roles)` — Get the highest-priority role (admin > agent > hospital > clinic > patient)

**Usage Example:**
```typescript
import { hasPermission, getPrimaryRole } from '@/lib/auth/roles';

// Check if user can create intake
const canCreateIntake = hasPermission(userRoles, 'intake:create');

// Get primary role for dashboard routing
const primaryRole = getPrimaryRole(userRoles);
```

#### `/app/api/khidi/roles/route.ts`
**GET /api/khidi/roles** (Authenticated users)
- Returns current user's all roles
- Requires valid authentication session
- Response:
  ```json
  {
    "ok": true,
    "userId": "uuid",
    "roles": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "role": "admin",
        "organization_name": null,
        "is_active": true,
        "language_preference": "ko",
        "created_at": "2026-04-03T...",
        "updated_at": "2026-04-03T..."
      }
    ]
  }
  ```

**POST /api/khidi/roles** (Admin-only)
- Assign new role to user
- Requires admin authentication
- Request body:
  ```json
  {
    "userId": "uuid",
    "role": "patient|korean_hospital|local_clinic|agent|admin",
    "organizationName": "Hospital Name" (optional),
    "organizationId": "uuid" (optional),
    "languagePreference": "ru|ko|en" (default: "ru"),
    "isActive": true (default: true)
  }
  ```
- Returns 409 if user already has that role
- Returns 403 if requester is not admin

### 4. Authentication Flow

The API route uses existing `checkAdminAuth` utility from `/src/lib/auth/checkAdminAuth.ts`:

1. **Authorization header priority** (Bearer token)
2. **Cookie fallback** (session-based)
3. **Admin checks** (email allowlist, metadata, app_metadata)

The system integrates with:
- Supabase Auth
- NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY

## Implementation Status

### Completed
✅ Database migration applied (`20260403_create_user_roles_table`)
✅ Role middleware module created (`/src/lib/auth/roles.ts`)
✅ API endpoints implemented (`/app/api/khidi/roles/route.ts`)
✅ RLS policies configured
✅ Error handling and validation

### Pending (Admin User Setup)
⏳ **Seeding admin role for bonroi2296@gmail.com**

**Steps to complete:**
1. Create the admin user in Supabase Auth UI or via management API with email `bonroi2296@gmail.com`
2. Run seeding migration:
   ```bash
   # Via migration tool (recommended)
   supabase migration apply migrations/20260403_seed_admin_role.sql

   # Or manually via SQL editor in Supabase console
   ```
3. Verify: Query `SELECT * FROM user_roles WHERE role = 'admin'` should return the admin user

**Manual SQL if needed:**
```sql
-- After admin user is created in auth.users
INSERT INTO user_roles (user_id, role, language_preference, is_active)
SELECT id, 'admin', 'ko', true
FROM auth.users
WHERE email = 'bonroi2296@gmail.com';
```

## Testing

### Test 1: GET user's roles (authenticated)
```bash
curl -H "Authorization: Bearer <user_session_token>" \
  https://your-app.com/api/khidi/roles
```

### Test 2: POST - Assign role (admin-only)
```bash
curl -X POST \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "patient-uuid",
    "role": "patient",
    "languagePreference": "ru"
  }' \
  https://your-app.com/api/khidi/roles
```

## Security Considerations

1. **RLS Policies** prevent unauthorized data access
2. **Admin-only endpoints** for role assignment (checkAdminAuth verification)
3. **Unique constraint** on (user_id, role) prevents duplicate assignments
4. **Active status** allows soft-delete of roles without data removal
5. **Organization context** stored for multi-hospital scenarios

## Integration with Existing HEALO Components

This system is designed to coexist with existing HEALO features:
- Uses same Supabase client patterns (getSupabaseServerClient)
- Uses same authentication flow (checkAdminAuth)
- Follows same API response format ({ok: bool, data: ..., error: ...})
- No modifications to HEALO tables required
- Separate khidi namespace (/app/api/khidi/*)

## File Locations

| File | Path |
|------|------|
| Type definitions | `/src/lib/auth/roles.ts` |
| API endpoints | `/app/api/khidi/roles/route.ts` |
| DB migration | `/migrations/20260403_create_user_roles_table` |
| Seeding migration | `/migrations/20260403_seed_admin_role.sql` |

## Environment Variables Required

Existing variables used (no new ones needed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL_ALLOWLIST` (existing, for admin verification)

## Next Steps

1. **Create admin user** in Supabase Auth with email `bonroi2296@gmail.com`
2. **Run seeding migration** to assign admin role
3. **Test API endpoints** with sample requests
4. **Implement role-based UI routing** using `getPrimaryRole()` and `hasPermission()`
5. **Add permission checks** in protected API routes that need role validation

## References

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Database schema: `user_roles` table in KHIDI project (hvwwlkawaxabhtumjhrg)
- Existing auth patterns: `/src/lib/auth/checkAdminAuth.ts`
