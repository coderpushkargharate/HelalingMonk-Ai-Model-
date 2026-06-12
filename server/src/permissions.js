// Single source of truth for what each role is allowed to do.
// Permission strings are namespaced `resource:action` so the same map can be
// shared by the API (middleware) and the frontend (UI gating).

export const ROLES = ['admin', 'doctor', 'reception', 'patient'];

export const PERMISSIONS = {
  admin: [
    'doctors:add',
    'reception:add',
    'patients:viewAll',
    'revenue:view',
    'clinic:configure',
    'users:manage',
  ],
  doctor: [
    'appointments:view',
    'patients:open',
    'patients:add',
    'patients:assign',
    'assessments:perform',
    'reports:upload',
    'reports:view',
    'notes:add',
    'exercisePlans:create',
  ],
  reception: [
    'appointments:book',
    'appointments:reschedule',
    'patients:add',
    'patients:assign',
    'payments:collect',
  ],
  patient: [
    'reports:view',
    'payments:online',
    'reminders:receive',
    'exercises:download',
  ],
};

export function permissionsForRole(role) {
  return PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role, permission) {
  return permissionsForRole(role).includes(permission);
}
