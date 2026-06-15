'use client';

import { useEffect, useState, Fragment } from 'react';
import { usersApi, rolesApi, User, Role, Permission } from '@/lib/api';
import { getMe, getStoredUser } from '@/lib/auth';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import SubHeader from '@/components/SubHeader';
import Tooltip from '@/components/Tooltip';

export default function SeguridadUsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const canViewUsers = userPermissions.includes('seguridad.usuarios.ver') || userPermissions.some(p => p.startsWith('seguridad.usuarios'));

  useEffect(() => {
    const fetchPermissions = async (retryCount = 0) => {
      try {
        const data = await getMe();
        setUserPermissions(data.user.permissions || []);
        setLoading(false);
      } catch {
        const storedUser = getStoredUser();
        if (storedUser?.permissions) {
          setUserPermissions(storedUser.permissions);
          setLoading(false);
          return;
        }
        if (retryCount < 2) {
          setTimeout(() => fetchPermissions(retryCount + 1), 500);
          return;
        }
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <SubHeader title="Usuarios" breadcrumbs={[{ label: 'Seguridad' }]} />
        <div className="card-bg rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.07] p-8">
          <p className="text-center text-gray-500 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!canViewUsers) {
    return (
      <div className="space-y-4">
        <SubHeader title="Usuarios" breadcrumbs={[{ label: 'Seguridad' }]} />
        <div className="card-bg rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.07] p-8">
          <p className="text-center text-gray-500 dark:text-gray-400">
            No tienes permisos para ver esta sección.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SubHeader title="Usuarios" breadcrumbs={[{ label: 'Seguridad' }]} />
      <div className="card-bg rounded-lg shadow-sm border border-gray-200 dark:border-white/[0.07] p-4">
        <UsersTab userPermissions={userPermissions} />
      </div>
    </div>
  );
}

// ==================== USUARIOS TAB ====================
function UsersTab({ userPermissions }: { userPermissions: string[] }) {
  const toast = useToast();
  const currentUser = getStoredUser();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    active: true
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dynamicFilter, setDynamicFilter] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<'name' | 'email' | 'role_name' | 'active'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [togglingUserId, setTogglingUserId] = useState<number | null>(null);

  // Validacion más exacta de permisos de usuario
  const has = (perm: string) => userPermissions.includes(perm);
  const guard = (allowed: boolean, message: string, action: () => void) => {
    if (!allowed) {
      toast.error('Sin permiso', message);
      return;
    }
    action();
  };

  const canCreateUser = has('seguridad.usuarios.crear');
  const canEditUser = has('seguridad.usuarios.editar');
  const canDeleteUser = has('seguridad.usuarios.eliminar');

  // Jerarquía de roles: un usuario no puede actuar sobre alguien de igual o mayor rango
  const ROLE_RANK: Record<string, number> = {
    'SuperAdmin':    4,
    'Administrador': 3,
    'Moderador':     2,
    'Usuario':       1,
  };
  const currentUserRank = ROLE_RANK[currentUser?.role_name || ''] ?? 0;
  const isTargetProtected = (targetRoleName: string | null): boolean => {
    const targetRank = ROLE_RANK[targetRoleName || ''] ?? 0;
    return targetRank >= currentUserRank;
  };

  useEffect(() => {
    const loadRolesWithRetry = async (retryCount = 0) => {
      try {
        const data = await rolesApi.getAll();
        setRoles(data.filter(r => r.active));
      } catch (error) {
        // Reintentar hasta 2 veces con delay (útil durante HMR)
        if (retryCount < 2) {
          setTimeout(() => loadRolesWithRetry(retryCount + 1), 500);
          return;
        }
        console.error('Error loading roles:', error);
      }
    };
    loadRolesWithRetry();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await usersApi.getAll();
      let filtered = usersData;

      if (filterName) {
        const search = filterName.toLowerCase();
        filtered = filtered.filter(u =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search)
        );
      }

      if (filterStatus === 'active') {
        filtered = filtered.filter(u => u.active);
      } else if (filterStatus === 'inactive') {
        filtered = filtered.filter(u => !u.active);
      }

      setUsers(filtered);
      setHasSearched(true);
      setCurrentPage(1);
      setDynamicFilter('');
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleClear = () => {
    setFilterName('');
    setFilterStatus('all');
    setUsers([]);
    setHasSearched(false);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role_id: '', active: true });
    setError('');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role_id: user.role_id?.toString() || '',
      active: user.active
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allowed = editingUser ? canEditUser : canCreateUser;
    const msg = editingUser
      ? 'No tienes permisos para editar usuarios.'
      : 'No tienes permisos para crear usuarios.';

    if (!allowed) {
      toast.error('Sin permisos', msg);
      return;
    }
    setError('');
    setSaving(true);

    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, {
          name: formData.name,
          email: formData.email,
          roleId: formData.role_id ? parseInt(formData.role_id) : undefined,
          active: formData.active
        });
        toast.success('Usuario actualizado', 'El usuario se ha actualizado correctamente');
      } else {
        if (!formData.password) {
          setError('La contraseña es requerida');
          setSaving(false);
          return;
        }
        await usersApi.create({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          roleId: formData.role_id ? parseInt(formData.role_id) : undefined,
        });
        toast.success('Usuario creado', 'El usuario se ha creado correctamente');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setDeleting(true);
    try {
      await usersApi.delete(userToDelete.id);
      toast.success('Usuario eliminado', 'El usuario se ha eliminado correctamente');
      setConfirmOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el usuario';
      toast.error('Error', message);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (column: 'name' | 'email' | 'role_name' | 'active') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleToggleUserActive = async (user: User) => {
    setTogglingUserId(user.id);
    try {
      await usersApi.update(user.id, {
        name: user.name,
        email: user.email,
        roleId: user.role_id || undefined,
        active: !user.active
      });
      toast.success(
        user.active ? 'Usuario desactivado' : 'Usuario activado',
        `El usuario "${user.name}" ha sido ${user.active ? 'desactivado' : 'activado'}`
      );
      loadUsers();
    } catch (error) {
      toast.error('Error', 'No se pudo cambiar el estado del usuario');
    } finally {
      setTogglingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!dynamicFilter) return true;
    const search = dynamicFilter.toLowerCase();
    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      (user.role_name && user.role_name.toLowerCase().includes(search))
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: string | number | boolean;
    let bVal: string | number | boolean;

    switch (sortColumn) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'email':
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
        break;
      case 'role_name':
        aVal = (a.role_name || '').toLowerCase();
        bVal = (b.role_name || '').toLowerCase();
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

  const totalRecords = sortedUsers.length;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  const SortIcon = ({ column }: { column: 'name' | 'email' | 'role_name' | 'active' }) => {
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

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Gestión de Usuarios</h3>
        <button
          onClick={() => guard(canCreateUser, 'No tienes permisos para crear usuarios.', openCreateModal)}
          className="flex items-center gap-2 px-4 py-2 border border-accent text-accent bg-transparent rounded-lg text-sm font-medium hover:bg-accent hover:text-white hover:border-accent transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Usuario
        </button>
      </div>

      {/* Filtro de Búsqueda */}
      <div className="rounded-lg border border-gray-200 dark:border-white/[0.07]">
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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre / Email</label>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full border border-gray-300 dark:border-white/[0.07] dark:bg-white/[0.05] dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
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
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-gray-900 dark:bg-white/[0.05] text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-white/[0.06] disabled:opacity-70 transition-colors min-w-[100px]"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {loading ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  )}
                </svg>
                Buscar
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center justify-center bg-orange-500 text-white px-3 py-2 rounded text-sm font-medium hover:bg-orange-600 transition-colors"
                title="Limpiar filtros"
              >
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
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={dynamicFilter}
                  onChange={(e) => setDynamicFilter(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-gray-600 bg-gray-700 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent w-28 sm:w-40"
                />
              </div>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="border border-gray-600 bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}
        </div>
        <div className="p-4">
          {!hasSearched ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              Utilice los filtros de búsqueda para mostrar resultados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="border border-gray-200 dark:border-white/[0.07] rounded-lg overflow-hidden">
                <table className="w-full text-sm min-w-[500px]">
                  <thead className="bg-zinc-100 dark:bg-white/[0.05]">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('name')}>
                        Nombre <SortIcon column="name" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('email')}>
                        Email <SortIcon column="email" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('role_name')}>
                        Rol <SortIcon column="role_name" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/[0.06] select-none" onClick={() => handleSort('active')}>
                        Estado <SortIcon column="active" />
                      </th>
                      <th className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 dark:border-white/[0.07] hover:bg-gray-50 dark:hover:bg-white/[0.06]">
                        <td className="px-2 sm:px-4 py-3 font-medium dark:text-white">
                          <div className="truncate max-w-[120px] sm:max-w-none">{user.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:hidden">{user.email}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                          <div className="truncate max-w-[200px]">{user.email}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-gray-600 dark:text-gray-400">
                          <div className="truncate max-w-[80px] sm:max-w-none">{user.role_name || '-'}</div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              if (isTargetProtected(user.role_name)) return;
                              guard(canEditUser, 'No tienes permisos para cambiar el estado del usuario.', () => handleToggleUserActive(user));
                            }}
                            disabled={togglingUserId === user.id || isTargetProtected(user.role_name)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                              isTargetProtected(user.role_name)
                                ? 'opacity-40 cursor-not-allowed ' + (user.active ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600')
                                : user.active
                                  ? 'bg-[#34C759]'
                                  : 'bg-gray-300 dark:bg-gray-600'
                            } ${togglingUserId === user.id ? 'opacity-50 cursor-wait' : isTargetProtected(user.role_name) ? '' : 'cursor-pointer'}`}
                            title={
                              isTargetProtected(user.role_name)
                                ? 'No puedes modificar a un usuario con rol igual o superior al tuyo'
                                : user.active ? 'Desactivar usuario' : 'Activar usuario'
                            }
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${user.active ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                          </button>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (isTargetProtected(user.role_name)) return;
                                guard(canEditUser, 'No tienes permisos para editar usuarios.', () => openEditModal(user));
                              }}
                              disabled={isTargetProtected(user.role_name)}
                              className={`p-1.5 sm:p-2 rounded transition-colors ${
                                isTargetProtected(user.role_name)
                                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                  : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              }`}
                              title={isTargetProtected(user.role_name) ? 'No puedes editar a un usuario con rol igual o superior al tuyo' : 'Editar'}
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (currentUser?.id === user.id) {
                                  toast.error('Acción no permitida', 'No puedes eliminar tu propia cuenta.');
                                  return;
                                }
                                if (isTargetProtected(user.role_name)) return;
                                guard(canDeleteUser, 'No tienes permisos para eliminar usuarios.', () => openDeleteConfirm(user));
                              }}
                              disabled={currentUser?.id === user.id || isTargetProtected(user.role_name)}
                              className={`p-1.5 sm:p-2 rounded transition-colors ${
                                currentUser?.id === user.id || isTargetProtected(user.role_name)
                                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                              }`}
                              title={
                                currentUser?.id === user.id
                                  ? 'No puedes eliminar tu propia cuenta'
                                  : isTargetProtected(user.role_name)
                                  ? 'No puedes eliminar a un usuario con rol igual o superior al tuyo'
                                  : 'Eliminar'
                              }
                            >
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No se encontraron usuarios
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalRecords > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, totalRecords)} de {totalRecords}
                  </div>
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

      {/* Modal Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-bg rounded-2xl w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-light to-accent flex items-center justify-center shadow-lg shadow-accent/30">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{editingUser ? 'Modificar datos del usuario' : 'Crear una nueva cuenta de usuario'}</p>
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
            <form onSubmit={handleSubmit} className="px-6 pb-6">
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
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    className="w-full border border-gray-200 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow placeholder:text-gray-400"
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Ej: usuario@empresa.com"
                    className="w-full border border-gray-200 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow placeholder:text-gray-400"
                    autoComplete="off"
                    required
                  />
                </div>
                {/* Password field only when creating a new user */}
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contraseña <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Ingrese una contraseña"
                      className="w-full border border-gray-200 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow placeholder:text-gray-400"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rol <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  {editingUser && currentUser?.id === editingUser.id ? (
                    <div className="w-full border border-gray-200 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formData.role_id ? (roles.find(r => r.id === parseInt(formData.role_id))?.name || 'Rol asignado') : 'Sin rol asignado'}
                      <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">No puedes cambiar tu propio rol</span>
                    </div>
                  ) : (
                    <select
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                      className="w-full border border-gray-200 dark:border-white/[0.07] dark:bg-white/[0.04] dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="">Sin rol asignado</option>
                      {roles
                        .filter(role => (ROLE_RANK[role.name] ?? 0) < currentUserRank)
                        .map(role => <option key={role.id} value={role.id}>{role.name}</option>)
                      }
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/[0.03] rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.active ? 'bg-[#34C759]' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${formData.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.active ? 'Usuario activo' : 'Usuario inactivo'}
                  </span>
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
                  className="px-5 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-white font-medium rounded-xl text-sm hover:from-accent-hover hover:to-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/25 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingUser ? 'Guardar cambios' : 'Crear usuario'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog 
        open={confirmOpen} 
        onOpenChange={setConfirmOpen} 
        title="Eliminar Usuario" 
        description={`¿Está seguro que desea eliminar el usuario "${userToDelete?.name}"?`} 
        confirmText="Eliminar" 
        cancelText="Cancelar" 
        variant="danger" 
        onConfirm={handleDeleteConfirm} 
        loading={deleting} 
      />
    </div>
  );
}
