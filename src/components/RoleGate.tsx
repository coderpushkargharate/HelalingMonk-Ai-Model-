import { ReactNode } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Role } from '../lib/auth';

interface Props {
  /** Allowed roles. If omitted, any authenticated user passes. */
  roles?: Role[];
  /** Required permission string (e.g. 'doctors:add'). */
  permission?: string;
  children: ReactNode;
  /** Rendered when the user is not allowed. Defaults to nothing. */
  fallback?: ReactNode;
}

// Conditionally renders children based on the current user's role/permission.
// Use for hiding UI; the API still enforces access server-side.
export default function RoleGate({ roles, permission, children, fallback = null }: Props) {
  const { user, hasRole, can } = useAuth();
  if (!user) return <>{fallback}</>;
  if (roles && !hasRole(...roles)) return <>{fallback}</>;
  if (permission && !can(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
