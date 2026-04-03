// Role definitions and helpers for KHIDI multi-role system
export type UserRole = 'patient' | 'korean_hospital' | 'local_clinic' | 'agent' | 'admin';

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: UserRole;
  organization_name?: string;
  organization_id?: string;
  language_preference: string;
  is_active: boolean;
}

export const ROLE_PERMISSIONS = {
  patient: ['intake:create', 'symptom:report', 'consultation:join', 'followup:view'],
  korean_hospital: ['referral:review', 'consultation:host', 'treatment:record', 'patient:view'],
  local_clinic: ['consultation:join', 'followup:report', 'patient:refer'],
  agent: ['escalation:handle', 'matching:verify', 'schedule:manage', 'patient:view', 'consultation:moderate'],
  admin: ['*'], // all permissions
} as const;

export function hasPermission(roles: UserRoleRecord[], permission: string): boolean {
  return roles.some(r => {
    if (!r.is_active) return false;
    const perms = ROLE_PERMISSIONS[r.role];
    return perms.includes('*' as any) || perms.includes(permission as any);
  });
}

export function getPrimaryRole(roles: UserRoleRecord[]): UserRole | null {
  const priority: UserRole[] = ['admin', 'agent', 'korean_hospital', 'local_clinic', 'patient'];
  for (const p of priority) {
    if (roles.some(r => r.role === p && r.is_active)) return p;
  }
  return null;
}
