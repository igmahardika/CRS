// ============================================================
// GENRE REPORTING - Role & Department RBAC Matrix
// Edge-compatible: NO Node.js / Prisma imports allowed here
// ============================================================

export const DEPARTMENTS = [
  'Network Operation',
  'Customer Experience',
  'Account Executive',
  'Finance',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const TARGET_DEPARTMENTS = [
  'Internal NOC',
  'Customer Experience',
  'Account Executive',
  'Finance',
] as const;

export type TargetDepartment = (typeof TARGET_DEPARTMENTS)[number];

export const USER_ROLES = [
  'ADMIN',
  'SUPERVISOR',
  'OPERATOR',
  'STAFF',
  'VIEWER',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type PermissionKey =
  | 'report:create'            // Access / (Generator), generate draft, fetch Cacti/PRTG graphs, next-number, save report
  | 'report:view_all_status'   // View PENDING_APPROVAL and REVISION_NEEDED in /history
  | 'report:view_approved'     // View and download APPROVED reports
  | 'report:approve'           // Supervisor/Admin approval & rejection
  | 'report:delete'            // Delete reports in /history
  | 'request:create'           // Access /request-report, create report requests, autocomplete customers
  | 'request:view_all'         // View all requests across all departments in /requests
  | 'request:view_dept'        // View requests belonging to user's department in /requests
  | 'request:process'          // Process requests into Generator & update progress/completion
  | 'request:cancel_own'       // Cancel PENDING request belonging to user's department
  | 'schedule:view'            // View monthly routine SLA 24H schedule
  | 'schedule:manage'          // Kickoff monthly routine & mark tasks completed
  | 'customer:read'            // View customer directory
  | 'customer:write'           // Create, edit, delete, import customers, auto-sync nodes & SLA
  | 'customer:export'          // Export full customer directory to Excel (.xlsx)
  | 'discovery:view'           // View network discovery tree
  | 'discovery:manage'         // Trigger discovery sync & map ports to customers
  | 'system:admin';            // Access /users, /settings, system configs, telegram test

export function isValidDepartment(dept: unknown): dept is Department {
  return typeof dept === 'string' && (DEPARTMENTS as readonly string[]).includes(dept);
}

export function isNocDepartment(dept: unknown): boolean {
  return dept === 'Network Operation';
}

/**
 * Evaluates whether a user session has a specific permission key
 */
export function hasPermission(
  user: { role: string; department?: string | null } | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  const role = user.role;
  const dept = user.department || 'Network Operation';
  const isNoc = isNocDepartment(dept);

  // 1. Super Admin has all permissions globally
  if (role === 'ADMIN') {
    return true;
  }

  // System admin pages are strictly ADMIN only
  if (permission === 'system:admin') {
    return false;
  }

  // 2. Network Operation (NOC) permissions
  if (isNoc) {
    if (role === 'SUPERVISOR') {
      // Supervisor has full operational permissions including approval
      return true;
    }

    if (role === 'OPERATOR' || role === 'STAFF') {
      // Operators and Staff can do all operational work except approval
      if (permission === 'report:approve') return false;
      return true;
    }

    if (role === 'VIEWER') {
      // Read-only observer inside NOC
      return (
        permission === 'report:view_approved' ||
        permission === 'request:view_all' ||
        permission === 'request:view_dept' ||
        permission === 'schedule:view' ||
        permission === 'customer:read' ||
        permission === 'discovery:view'
      );
    }

    return false;
  }

  // 3. Non-NOC Departments (Customer Experience, Account Executive, Finance)
  // Non-NOC NEVER has access to Generator, Schedule, Master Data, or System Administration
  if (
    permission === 'report:create' ||
    permission === 'report:view_all_status' ||
    permission === 'report:delete' ||
    permission === 'request:view_all' ||
    permission === 'request:process' ||
    permission === 'schedule:view' ||
    permission === 'schedule:manage' ||
    permission === 'customer:read' ||
    permission === 'customer:write' ||
    permission === 'customer:export' ||
    permission === 'discovery:view' ||
    permission === 'discovery:manage'
  ) {
    return false;
  }

  // Non-NOC: Supervisor can authorize Tier 2 departmental approvals for their department
  if (permission === 'report:approve') {
    return role === 'SUPERVISOR';
  }

  // Non-NOC: Viewer can view approved scoped reports & view own department requests
  if (role === 'VIEWER') {
    return (
      permission === 'report:view_approved' ||
      permission === 'request:view_dept'
    );
  }

  // Non-NOC: Supervisor, Staff can submit requests, view dept requests, cancel pending, and view approved reports
  return (
    permission === 'report:view_approved' ||
    permission === 'request:create' ||
    permission === 'request:view_dept' ||
    permission === 'request:cancel_own'
  );
}

/**
 * Returns the default landing page URL for a user upon login or logo click
 */
export function getDefaultLandingRoute(
  user: { role: string; department?: string | null } | null | undefined
): string {
  if (!user) return '/login';
  if (hasPermission(user, 'report:create')) {
    return '/';
  }
  if (hasPermission(user, 'request:view_dept') || hasPermission(user, 'request:view_all')) {
    return '/requests';
  }
  return '/history';
}

/**
 * Determines whether a user can access a specific frontend route pathname
 */
export function canAccessPage(
  user: { role: string; department?: string | null } | null | undefined,
  pathname: string
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

  if (pathname === '/') {
    return hasPermission(user, 'report:create');
  }

  if (pathname.startsWith('/history')) {
    return hasPermission(user, 'report:view_approved') || hasPermission(user, 'report:view_all_status');
  }

  if (pathname.startsWith('/approvals')) {
    return hasPermission(user, 'report:approve');
  }

  if (pathname.startsWith('/requests')) {
    return hasPermission(user, 'request:view_dept') || hasPermission(user, 'request:view_all');
  }

  if (pathname.startsWith('/request-report')) {
    return hasPermission(user, 'request:create');
  }

  if (pathname.startsWith('/schedule')) {
    return hasPermission(user, 'schedule:view');
  }

  if (pathname.startsWith('/customers')) {
    return hasPermission(user, 'customer:read');
  }

  if (pathname.startsWith('/discovery')) {
    return hasPermission(user, 'discovery:view');
  }

  if (pathname.startsWith('/users') || pathname.startsWith('/settings')) {
    return hasPermission(user, 'system:admin');
  }

  return true;
}

