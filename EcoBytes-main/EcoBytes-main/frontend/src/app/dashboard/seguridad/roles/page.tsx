'use client';

import { useEffect, useState, Fragment } from 'react';
import { usersApi, rolesApi, User, Role, Permission } from '@/lib/api';
import { getMe, getStoredUser } from '@/lib/auth';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import SubHeader from '@/components/SubHeader';

//type TabType = 'usuarios' | 'roles';

export default function SeguridadAccesosPage() {
  //const [activeTab, setActiveTab] = useState<TabType | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [triggerCreateRole, setTriggerCreateRole] = useState(0);
  const [loading, setLoading] = useState(true);

  // Verificar permisos
  const canViewAccesos = userPermissions.includes('seguridad.roles.ver') || userPermissions.some(p => p.startsWith('seguridad.roles'));

  useEffect(() => {
    const fetchPermissions = async (retryCount = 0) => {
      try {
        const data = await getMe();
        const perms = data.user.permissions || [];
        setUserPermissions(perms);

        // Establecer tab inicial según permisos
        const hasUsers = perms.some((p: string) => p.startsWith('seguridad.usuarios'));
        const hasRoles = perms.some((p: string) => p.startsWith('seguridad.roles'));

        if (hasUsers) {
          setLoading(false);
        } else if (hasRoles) {
          setLoading(false);
        }
        setLoading(false);
      } catch (error) {
        // Intentar usar datos almacenados como fallback
        const storedUser = getStoredUser();
        if (storedUser?.permissions) {
          const perms = storedUser.permissions;
          setUserPermissions(perms);

          const hasUsers = perms.some((p: string) => p.startsWith('seguridad.usuarios'));
          const hasRoles = perms.some((p: string) => p.startsWith('seguridad.roles'));

          if (hasUsers) {
            setLoading(false);
          } else if (hasRoles) {
            setLoading(false);
          }
          setLoading(false);
          return;
        }

        // Reintentar hasta 2 veces con delay (útil durante HMR)
        if (retryCount < 2) {
          setTimeout(() => fetchPermissions(retryCount + 1), 500);
          return;
        }

        console.error('Error fetching permissions:', error);
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <SubHeader
          title="Roles y Permisos"
          breadcrumbs={[{ label: 'Seguridad' }]}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        <div className="card-bg rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.07] p-8">
          <p className="text-center text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!canViewAccesos) {
    return (
      <div className="space-y-4">
        <SubHeader
          title="Roles y Permisos"
          breadcrumbs={[{ label: 'Seguridad' }]}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        <div className="card-bg rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.07] p-8">
          <p className="text-center text-gray-500 dark:text-gray-400">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SubHeader
        title="Roles y Permisos"
        breadcrumbs={[{ label: 'Seguridad' }]}
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        }
      />

      {/* Tabs */}
      <div className="card-bg rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.07]">
        <div className="p-4">
          <RolesTab userPermissions={userPermissions} />
        </div>
      </div>
    </div>
  );
}

// ==================== ROLES TAB ====================
function RolesTab({ userPermissions }: { userPermissions: string[] }) {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', active: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);
  const [expandedPermissions, setExpandedPermissions] = useState<number[]>([]);
  const [expandedSessionTimeout, setExpandedSessionTimeout] = useState<number>(15);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dynamicFilter, setDynamicFilter] = useState('');
  const [togglingRoleId, setTogglingRoleId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<'name' | 'description' | 'sessionTimeout' | 'active'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // Validacion más exacta de permisos de usuario
  const has = (perm: string) => userPermissions.includes(perm);
  const guard = (allowed: boolean, message: string, action: () => void) => {
    if (!allowed) {
      toast.error('Sin permiso', message);
      return;
    }
    action();
  };

  const canCreateRole = has('seguridad.roles.crear');
  const canEditRole = has('seguridad.roles.editar');
  const canDeleteRole = has('seguridad.roles.eliminar');

  useEffect(() => {
    const loadPermissionsWithRetry = async (retryCount = 0) => {
      try {
        const data = await rolesApi.getPermissions();
        setPermissions(data);
      } catch (error) {
        if (retryCount < 2) {
          setTimeout(() => loadPermissionsWithRetry(retryCount + 1), 500);
          return;
        }
        console.error('Error loading permissions:', error);
      }
    };
    loadPermissionsWithRetry();
  }, []);

  const handleToggleActive = async (role: Role) => {
    setTogglingRoleId(role.id);
    try {
      // Si está activo y queremos desactivarlo, verificar usuarios asignados
      if (role.active) {
        const { count } = await rolesApi.getUsersCount(role.id);
        if (count > 0) {
          toast.error(
            'No se puede desactivar',
            `El rol tiene ${count} usuario${count > 1 ? 's' : ''} asignado${count > 1 ? 's' : ''}`
          );
          setTogglingRoleId(null);
          return;
        }
      }

      // Obtener datos completos del rol para mantener permisos
      const roleData = await rolesApi.getById(role.id);

      // Cambiar el estado
      await rolesApi.update(role.id, {
        name: role.name,
        description: role.description || '',
        active: !role.active,
        permissions: roleData.permissions,
        sessionTimeout: role.sessionTimeout
      });

      toast.success(
        role.active ? 'Rol desactivado' : 'Rol activado',
        `El rol "${role.name}" ha sido ${role.active ? 'desactivado' : 'activado'}`
      );
      loadRoles();
    } catch (error) {
      toast.error('Error', 'No se pudo cambiar el estado del rol');
    } finally {
      setTogglingRoleId(null);
    }
  };

  const loadRoles = async () => {
    setLoading(true);
    try {
      const rolesData = await rolesApi.getAll(filterName || undefined);
      let filtered = rolesData;
      if (filterStatus === 'active') filtered = rolesData.filter(r => r.active);
      else if (filterStatus === 'inactive') filtered = rolesData.filter(r => !r.active);
      setRoles(filtered);
      setHasSearched(true);
      setCurrentPage(1);
      setDynamicFilter('');
    } catch (err) {
      console.error('Error cargando roles:', err);
      toast.error('Error al cargar roles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRoles();
  };

  const handleClear = () => {
    setFilterName('');
    setFilterStatus('all');
    setRoles([]);
    setHasSearched(false);
    setExpandedRoleId(null);
  };

  const openCreateModal = () => {
    setFormData({ name: '', description: '', active: true });
    setError('');
    setShowModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateRole) {
      toast.error('Sin permiso', 'No tienes permisos para crear roles.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await rolesApi.create({ name: formData.name, description: formData.description, permissions: [] });
      toast.success('Rol creado', 'El rol se ha creado correctamente');
      setShowModal(false);
      loadRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpandRole = async (role: Role) => {
    if (expandedRoleId === role.id) {
      setExpandedRoleId(null);
      setExpandedPermissions([]);
      setExpandedSessionTimeout(15);
      setExpandedMenus({});
      setExpandedSubmenus({});
    } else {
      try {
        const data = await rolesApi.getById(role.id);
        setExpandedRoleId(role.id);
        setExpandedPermissions(data.permissions);
        setExpandedSessionTimeout(data.role.sessionTimeout || 15);
        const menus: Record<string, boolean> = {};
        permissions.forEach(p => { menus[p.menu] = true; });
        setExpandedMenus(menus);
        setExpandedSubmenus({});
      } catch {
        toast.error('Error al cargar permisos');
      }
    }
  };

  const togglePermission = (permId: number) => {
    setExpandedPermissions(prev => prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]);
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  const toggleSubmenu = (menu: string, submenu: string) => {
    setExpandedSubmenus(prev => ({ ...prev, [`${menu}-${submenu}`]: !prev[`${menu}-${submenu}`] }));
  };

  const toggleAllSubmenuPermissions = (perms: Permission[]) => {
    const permIds = perms.map(p => p.id);
    const allSelected = permIds.every(id => expandedPermissions.includes(id));
    if (allSelected) setExpandedPermissions(prev => prev.filter(id => !permIds.includes(id)));
    else setExpandedPermissions(prev => [...new Set([...prev, ...permIds])]);
  };

  const toggleAllMenuPermissions = (perms: Permission[]) => {
    const permIds = perms.map(p => p.id);
    const allSelected = permIds.every(id => expandedPermissions.includes(id));
    if (allSelected) setExpandedPermissions(prev => prev.filter(id => !permIds.includes(id)));
    else setExpandedPermissions(prev => [...new Set([...prev, ...permIds])]);
  };

  const handleSavePermissions = async () => {
    if (!expandedRoleId) return;
    const role = roles.find(r => r.id === expandedRoleId);
    if (!role) return;

    setSavingPermissions(true);
    try {
      await rolesApi.update(expandedRoleId, {
        name: role.name,
        description: role.description || '',
        active: role.active,
        permissions: expandedPermissions,
        sessionTimeout: expandedSessionTimeout,
      });

      toast.success('Configuración guardada', 'Los permisos se han actualizado correctamente');
      loadRoles();
    } catch {
      toast.error('Error', 'No se pudieron guardar los cambios');
    } finally {
      setSavingPermissions(false);
    }
  };

  const openDeleteConfirm = (role: Role) => {
    setRoleToDelete(role);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!canDeleteRole) {
      toast.error('Sin permiso', 'No tienes permisos para eliminar roles.');
      return;
    }
    if (!roleToDelete) return;
    setDeleting(true);
    try {
      await rolesApi.delete(roleToDelete.id);
      toast.success('Rol eliminado', 'El rol se ha eliminado correctamente');
      setConfirmOpen(false);
      setRoleToDelete(null);
      if (expandedRoleId === roleToDelete.id) setExpandedRoleId(null);
      loadRoles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el rol';
      toast.error('Error', message);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: 'name' | 'description' | 'sessionTimeout' | 'active') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const filteredRoles = roles.filter(role => {
    if (!dynamicFilter) return true;
    const search = dynamicFilter.toLowerCase();
    return role.name.toLowerCase().includes(search) || (role.description && role.description.toLowerCase().includes(search));
  });

  const sortedRoles = [...filteredRoles].sort((a, b) => {
    let aVal: string | number | boolean;
    let bVal: string | number | boolean;

    switch (sortColumn) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'description':
        aVal = (a.description || '').toLowerCase();
        bVal = (b.description || '').toLowerCase();
        break;
      case 'sessionTimeout':
        aVal = a.sessionTimeout || 15;
        bVal = b.sessionTimeout || 15;
        break;
      case 'active':
        aVal = a.active ? 1 : 0;
        bVal = b.active ? 1 : 0;
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalRecords = sortedRoles.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRoles = sortedRoles.slice(startIndex, endIndex);

  const SortIcon = ({ column }: { column: 'name' | 'description' | 'sessionTimeout' | 'active' }) => {
    if (sortColumn !== column) return null;
    return (
      <svg className="w-4 h-4 inline-block ml-1 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    );
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [dynamicFilter, rowsPerPage]);

  // Estructura para soportar submenús anidados (ej: "Seguridad y Accesos > Usuarios")
  type NestedSubmenu = {
    permissions: Permission[];
    children: Record<string, Permission[]>;
  };

  const permissionsByMenu = permissions.reduce((acc, perm) => {
    if (!acc[perm.menu]) acc[perm.menu] = {};

    // Detectar si el submenu tiene anidación (contiene " > ")
    if (perm.submenu.includes(' > ')) {
      const [parent, child] = perm.submenu.split(' > ');
      if (!acc[perm.menu][parent]) {
        acc[perm.menu][parent] = { permissions: [], children: {} };
      }
      if (!acc[perm.menu][parent].children[child]) {
        acc[perm.menu][parent].children[child] = [];
      }
      acc[perm.menu][parent].children[child].push(perm);
    } else {
      if (!acc[perm.menu][perm.submenu]) {
        acc[perm.menu][perm.submenu] = { permissions: [], children: {} };
      }
      acc[perm.menu][perm.submenu].permissions.push(perm);
    }
    return acc;
  }, {} as Record<string, Record<string, NestedSubmenu>>);

  // Orden de los menús según menuOrder de la base de datos
  const menuNames = Object.keys(permissionsByMenu).sort((a, b) => {
    const orderA = permissions.find(p => p.menu === a)?.menuOrder ?? 999;
    const orderB = permissions.find(p => p.menu === b)?.menuOrder ?? 999;
    return orderA - orderB;
  });

  const getMenuPermissions = (menu: string): Permission[] => {
    const submenus = permissionsByMenu[menu];
    return Object.values(submenus).flatMap(sub => [
      ...sub.permissions,
      ...Object.values(sub.children).flat()
    ]);
  };

  const getSubmenuPermissions = (submenu: NestedSubmenu): Permission[] => {
    return [
      ...submenu.permissions,
      ...Object.values(submenu.children).flat()
    ];
  };

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Roles</h3>
        <button onClick={() => guard(canCreateRole, 'No tienes permisos para crear roles.', openCreateModal)} className="flex items-center gap-2 px-4 py-2 border border-accent text-accent bg-transparent rounded-lg text-sm font-medium hover:bg-accent hover:text-white hover:border-accent transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Rol
        </button>
      </div>

      {/* Filtro de Búsqueda */}
      <div
        data-ignore-session-reset
        className="rounded-lg border border-gray-200 dark:border-white/[0.07]"
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.02] rounded-t-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-semibold text-white">Filtro de Búsqueda</span>
          </div>
        </div>
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre</label>
              <input type="text" value={filterName} onChange={(e) => setFilterName(e.target.value)} className="w-full border border-gray-300 dark:border-white/[0.07] dark:bg-white/[0.05] dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" />
            </div>
            <div className="w-48 relative">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Estado</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  onBlur={() => setTimeout(() => setStatusDropdownOpen(false), 150)}
                  className="w-full border border-gray-300 dark:border-white/[0.07] dark:bg-white/[0.05] dark:text-white rounded pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent bg-white text-left cursor-pointer"
                >
                  {filterStatus === 'all' && 'TODOS'}
                  {filterStatus === 'active' && 'ACTIVO'}
                  {filterStatus === 'inactive' && 'INACTIVO'}
                </button>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {filterStatus === 'all' && (
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                  {filterStatus === 'active' && (
                    <svg className="w-4 h-4 text-[#34C759]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  )}
                  {filterStatus === 'inactive' && (
                    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                    </svg>
                  )}
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {statusDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/[0.07] rounded-lg shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setFilterStatus('all'); setStatusDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors ${filterStatus === 'all' ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="dark:text-white">TODOS</span>
                      {filterStatus === 'all' && (
                        <svg className="w-4 h-4 ml-auto text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterStatus('active'); setStatusDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors ${filterStatus === 'active' ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                    >
                      <svg className="w-4 h-4 text-[#34C759]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span className="dark:text-white">ACTIVO</span>
                      {filterStatus === 'active' && (
                        <svg className="w-4 h-4 ml-auto text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setFilterStatus('inactive'); setStatusDropdownOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors ${filterStatus === 'inactive' ? 'bg-gray-100 dark:bg-gray-600' : ''}`}
                    >
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z" />
                      </svg>
                      <span className="dark:text-white">INACTIVO</span>
                      {filterStatus === 'inactive' && (
                        <svg className="w-4 h-4 ml-auto text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 bg-gray-900 dark:bg-white/[0.05] text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-white/[0.06] disabled:opacity-70 transition-colors min-w-[100px]">
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {loading ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />}
                </svg>
                Buscar
              </button>
              <button type="button" onClick={handleClear} className="flex items-center justify-center bg-orange-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-orange-600 transition-colors" title="Limpiar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="rounded-lg border border-gray-200 dark:border-white/[0.07]">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-white/[0.07] bg-zinc-50 dark:bg-white/[0.02] rounded-t-lg flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-semibold text-white">Resultados</span>
          </div>
          {hasSearched && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input type="text" placeholder="Filtrar..." value={dynamicFilter} onChange={(e) => setDynamicFilter(e.target.value)} className="pl-9 pr-3 py-1.5 border border-gray-600 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-28 sm:w-40" />
              </div>
              <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))} className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>
        <div className="p-4">
          {!hasSearched ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">Utilice los filtros de búsqueda para mostrar resultados</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="border border-gray-200 dark:border-white/[0.07] rounded-lg overflow-hidden">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-gray-100 dark:bg-white/[0.05]">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 w-10 sm:w-12"></th>
                      <th className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('name')}>
                        Nombre <SortIcon column="name" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('description')}>
                        Descripción <SortIcon column="description" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('sessionTimeout')}>
                        Sesión <SortIcon column="sessionTimeout" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('active')}>
                        Estado <SortIcon column="active" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRoles.map((role) => (
                      <Fragment key={role.id}>
                        <tr className={`border-b border-gray-100 dark:border-white/[0.07] ${expandedRoleId === role.id ? 'bg-gray-100 dark:bg-white/[0.05]' : 'hover:bg-gray-50 dark:hover:bg-white/[0.06]'}`}>
                          <td className="px-2 sm:px-4 py-3">
                            <button onClick={() => guard(canEditRole, 'No tienes permisos para editar roles.', () => toggleExpandRole(role))} className="p-1 hover:bg-gray-200 dark:hover:bg-white/[0.06] rounded transition-colors">
                              <svg className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400 transition-transform ${expandedRoleId === role.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-2 sm:px-4 py-3 font-medium dark:text-white">
                            <div className="truncate max-w-[100px] sm:max-w-none">{role.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px] sm:hidden">{role.description || ''}</div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                            <div className="truncate max-w-[150px]">{role.description || '-'}</div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center text-gray-600 dark:text-gray-400 hidden md:table-cell">{role.sessionTimeout || 15} min</td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <button
                              onClick={() => guard(canEditRole, 'No tienes permisos para cambiar el estado del rol.', () => handleToggleActive(role))}
                              disabled={togglingRoleId === role.id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${role.active
                                ? 'bg-[#34C759]'
                                : 'bg-gray-300 dark:bg-gray-600'
                                } ${togglingRoleId === role.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                              title={role.active ? 'Desactivar rol' : 'Activar rol'}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${role.active ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                              />
                            </button>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => toggleExpandRole(role)} className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="Editar permisos">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button onClick={() => guard(canDeleteRole, 'No tienes permisos para eliminar roles.', () => openDeleteConfirm(role))} className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="Eliminar">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded permissions */}
                        {expandedRoleId === role.id && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <div className="bg-gray-50 dark:bg-white/[0.02] border-t border-b border-gray-200 dark:border-white/[0.07] p-6">
                                <div className="flex justify-between items-center mb-6">
                                  <h3 className="text-accent font-semibold text-lg">Configuración de {role.name}</h3>
                                  <button onClick={() => guard(canEditRole, 'No tienes permisos para editar roles.', handleSavePermissions)} disabled={savingPermissions} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
                                    {savingPermissions ? <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                    Guardar
                                  </button>
                                </div>

                                {/* Timeout de sesión */}
                                <div className="card-bg rounded-lg p-4 shadow-sm mb-6">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <label className="font-medium text-gray-700 dark:text-gray-300">Tiempo de sesión:</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input type="number" min="1" max="480" value={expandedSessionTimeout} onChange={(e) => setExpandedSessionTimeout(Math.max(1, Math.min(480, parseInt(e.target.value) || 15)))} className="w-20 border border-gray-300 dark:border-white/[0.07] dark:bg-white/[0.05] dark:text-white rounded px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent" />
                                      <span className="text-sm text-gray-600 dark:text-gray-400">minutos</span>
                                    </div>
                                  </div>
                                </div>

                                <h4 className="text-accent font-medium text-sm mb-4">Permisos del rol</h4>

                                {/* Permissions Tree */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {menuNames.map(menu => {
                                    const menuPerms = getMenuPermissions(menu);
                                    const isMenuExpanded = expandedMenus[menu] ?? true;
                                    const menuSelectedCount = menuPerms.filter(p => expandedPermissions.includes(p.id)).length;
                                    const menuAllSelected = menuSelectedCount === menuPerms.length;
                                    const menuSomeSelected = menuSelectedCount > 0 && !menuAllSelected;
                                    const submenuNames = Object.keys(permissionsByMenu[menu]);

                                    return (
                                      <div key={menu} className="card-bg rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                          <button onClick={() => toggleMenu(menu)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded">
                                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${isMenuExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                          </button>
                                          <input type="checkbox" disabled={!canEditRole} checked={menuAllSelected} ref={el => { if (el) el.indeterminate = menuSomeSelected; }} onChange={() => toggleAllMenuPermissions(menuPerms)} className="w-4 h-4 text-accent rounded border-gray-300 dark:border-white/[0.07] focus:ring-accent dark:bg-white/[0.05]" />
                                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /></svg>
                                          <span className="font-semibold text-gray-800 dark:text-white">{menu}</span>
                                        </div>

                                        {isMenuExpanded && (
                                          <div className="ml-6 space-y-3">
                                            {submenuNames.map(submenuName => {
                                              const submenuData = permissionsByMenu[menu][submenuName];
                                              const allSubmenuPerms = getSubmenuPermissions(submenuData);
                                              const submenuKey = `${menu}-${submenuName}`;
                                              const isSubmenuExpanded = expandedSubmenus[submenuKey] ?? false;
                                              const submenuSelectedCount = allSubmenuPerms.filter(p => expandedPermissions.includes(p.id)).length;
                                              const submenuAllSelected = submenuSelectedCount === allSubmenuPerms.length;
                                              const submenuSomeSelected = submenuSelectedCount > 0 && !submenuAllSelected;
                                              const hasChildren = Object.keys(submenuData.children).length > 0;

                                              return (
                                                <div key={submenuKey}>
                                                  <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-4 h-4 border-l-2 border-gray-200 dark:border-white/[0.07]"></div>
                                                    <button onClick={() => toggleSubmenu(menu, submenuName)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded">
                                                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isSubmenuExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                      </svg>
                                                    </button>
                                                    <input type="checkbox" disabled={!canEditRole} checked={submenuAllSelected} ref={el => { if (el) el.indeterminate = submenuSomeSelected; }} onChange={() => toggleAllSubmenuPermissions(allSubmenuPerms)} className="w-4 h-4 text-accent rounded border-gray-300 dark:border-white/[0.07] focus:ring-accent dark:bg-white/[0.05]" />
                                                    <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /></svg>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{submenuName}</span>
                                                    {!isSubmenuExpanded && <span className="text-sm text-gray-500 dark:text-gray-400">({submenuSelectedCount}/{allSubmenuPerms.length})</span>}
                                                  </div>

                                                  {isSubmenuExpanded && (
                                                    <div className="ml-10 space-y-2">
                                                      {submenuData.permissions.length > 0 && (
                                                        <div className="space-y-1">
                                                          {submenuData.permissions.map(perm => (
                                                            <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.06] p-1 rounded">
                                                              <div className="w-4 h-4 border-l-2 border-gray-200 dark:border-white/[0.07]"></div>
                                                              <input type="checkbox" disabled={!canEditRole} checked={expandedPermissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="w-4 h-4 text-accent rounded border-gray-300 dark:border-white/[0.07] focus:ring-accent dark:bg-white/[0.05]" />
                                                              <svg className="w-4 h-4 text-accent-light" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                                              <span className="text-sm text-gray-700 dark:text-gray-300">{perm.description || perm.name}</span>
                                                            </label>
                                                          ))}
                                                        </div>
                                                      )}

                                                      {hasChildren && Object.entries(submenuData.children).map(([childName, childPerms]) => {
                                                        const childKey = `${submenuKey}-${childName}`;
                                                        const isChildExpanded = expandedSubmenus[childKey] ?? false;
                                                        const childSelectedCount = childPerms.filter(p => expandedPermissions.includes(p.id)).length;
                                                        const childAllSelected = childSelectedCount === childPerms.length;
                                                        const childSomeSelected = childSelectedCount > 0 && !childAllSelected;

                                                        return (
                                                          <div key={childKey}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <div className="w-4 h-4 border-l-2 border-gray-200 dark:border-white/[0.07]"></div>
                                                              <button onClick={() => setExpandedSubmenus(prev => ({ ...prev, [childKey]: !prev[childKey] }))} className="p-0.5 hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded">
                                                                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isChildExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                              </button>
                                                              <input type="checkbox" disabled={!canEditRole} checked={childAllSelected} ref={el => { if (el) el.indeterminate = childSomeSelected; }} onChange={() => toggleAllSubmenuPermissions(childPerms)} className="w-4 h-4 text-accent rounded border-gray-300 dark:border-white/[0.07] focus:ring-accent dark:bg-white/[0.05]" />
                                                              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" /></svg>
                                                              <span className="font-medium text-gray-600 dark:text-gray-400">{childName}</span>
                                                              {!isChildExpanded && <span className="text-sm text-gray-500 dark:text-gray-400">({childSelectedCount}/{childPerms.length})</span>}
                                                            </div>

                                                            {isChildExpanded && (
                                                              <div className="ml-10 space-y-1">
                                                                {childPerms.map(perm => (
                                                                  <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.06] p-1 rounded">
                                                                    <div className="w-4 h-4 border-l-2 border-gray-200 dark:border-white/[0.07]"></div>
                                                                    <input type="checkbox" disabled={!canEditRole} checked={expandedPermissions.includes(perm.id)} onChange={() => togglePermission(perm.id)} className="w-4 h-4 text-accent rounded border-gray-300 dark:border-white/[0.07] focus:ring-accent dark:bg-white/[0.05]" />
                                                                    <svg className="w-4 h-4 text-accent-light" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{perm.description || perm.name}</span>
                                                                  </label>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                    {paginatedRoles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No se encontraron roles</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalRecords > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Mostrando {startIndex + 1}-{Math.min(endIndex, totalRecords)} de {totalRecords}</div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-300 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1.5 rounded border border-gray-300 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="px-2 sm:px-3 py-1 text-sm dark:text-gray-400 whitespace-nowrap">{currentPage}/{totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded border border-gray-300 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded border border-gray-300 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Rol */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-bg rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-light to-accent flex items-center justify-center shadow-lg shadow-accent/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Nuevo Rol</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Crear un nuevo rol de usuario</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-white/[0.06] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="px-6 pb-6">
              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre del rol <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Administrador, Editor, Auditor..."
                    className="w-full border border-gray-200 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow placeholder:text-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe brevemente las responsabilidades de este rol..."
                    rows={3}
                    className="w-full border border-gray-200 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow placeholder:text-gray-400 resize-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-gray-700 dark:text-gray-300 font-medium rounded-xl text-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-accent text-white font-medium rounded-xl text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Creando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Crear Rol
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Eliminar Rol" description={`¿Está seguro que desea eliminar el rol "${roleToDelete?.name}"?`} confirmText="Eliminar" cancelText="Cancelar" variant="danger" onConfirm={handleDeleteConfirm} loading={deleting} />
    </div>
  );
}
