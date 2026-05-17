import { useSelector } from 'react-redux';

/**
 * usePermission() — call inside any component to check permissions.
 *
 * Usage:
 *   const { canView, canEdit, isAdmin } = usePermission();
 *   if (!canView('billing')) return <Forbidden />;
 *   {canEdit('inventory') && <button>Add Stock</button>}
 */
export default function usePermission() {
  const { user } = useSelector((s) => s.auth);

  const isAdmin      = () => !user || user.role === 'admin' || user.role === 'superadmin';
  const isSuperAdmin = () => !user || user.role === 'superadmin';

  const canView = (module) => {
    if (!user) return false;
    if (isAdmin()) return true;
    const perm = (user.permissions || []).find((p) => p.module === module);
    return !!perm?.view;
  };

  const canEdit = (module) => {
    if (!user) return false;
    if (isAdmin()) return true;
    const perm = (user.permissions || []).find((p) => p.module === module);
    return !!perm?.edit;
  };

  return { canView, canEdit, isAdmin, isSuperAdmin };
}
