'use client';

import { useEffect, useState } from 'react';
import { useRef } from 'react';
import { getMe, changePassword, uploadAvatar, deleteAvatar, getApiUrl, getAccessToken, User } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import UserAvatar from '@/components/UserAvatar';

export default function PerfilPage() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de cambio de contraseña
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Estado de desactivación de cuenta
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateMessage, setDeactivateMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await getMe();
        setUser(userData.user);
      } catch (err) {
        console.error('Error cargando usuario:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Contraseña actualizada', 'Tu contraseña ha sido cambiada exitosamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestDeactivation = async () => {
    setDeactivating(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getAccessToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${getApiUrl()}/account/request-deactivation`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al solicitar desactivacion');
      }
      setShowDeactivateDialog(false);
      setDeactivateMessage('Se ha enviado un email de confirmacion. Revisa tu correo para completar la desactivacion.');
      toast.success('Email enviado', 'Revisa tu correo para confirmar la desactivacion de tu cuenta');
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setDeactivating(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const { avatar_url } = await uploadAvatar(file);
      setUser(prev => prev ? { ...prev, avatar_url } : prev);
      toast.success('Foto actualizada', 'Tu foto de perfil ha sido actualizada');
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    setUploadingAvatar(true);
    try {
      await deleteAvatar();
      setUser(prev => prev ? { ...prev, avatar_url: null } : prev);
      toast.success('Foto eliminada', 'Tu foto de perfil ha sido eliminada');
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Error al eliminar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/25">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Administra tu información personal y configuración</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Personal */}
          <div className="card-bg rounded-xl border border-gray-200 dark:border-white/[0.07] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.07] bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#141417] dark:to-[#141417]">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Información Personal</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  {/* Avatar clickeable */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="relative group focus:outline-none"
                    title="Cambiar foto de perfil"
                  >
                    <UserAvatar
                      name={user?.name}
                      avatarUrl={user?.avatar_url}
                      size={104}
                      rounded="rounded-2xl"
                      className="shadow-xl shadow-accent/20"
                    />
                    {/* Overlay al pasar el cursor */}
                    <div className="absolute inset-0 rounded-2xl bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <>
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-white text-xs mt-1 font-medium">Cambiar</span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Botón eliminar foto — solo si tiene avatar */}
                  {user?.avatar_url && (
                    <button
                      type="button"
                      onClick={handleDeleteAvatar}
                      disabled={uploadingAvatar}
                      className="text-xs text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      Eliminar foto
                    </button>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="flex-1 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre Completo</label>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
                      <p className="text-gray-900 dark:text-white break-all">{user?.email}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rol</label>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        user?.role_name
                          ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                          : 'bg-gray-100 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300'
                      }`}>
                        {user?.role_name || 'Sin rol'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado de Cuenta</label>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        user?.active !== false
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${user?.active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                        {user?.active !== false ? 'Activo' : 'Desactivado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div className="card-bg rounded-xl border border-gray-200 dark:border-white/[0.07] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/[0.07] bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#141417] dark:to-[#141417]">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Seguridad</h2>
              </div>
            </div>
            <div className="p-6">
              {!showPasswordForm ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">Contraseña</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Cambia tu contraseña periódicamente para mayor seguridad
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-accent bg-accent-subtle dark:bg-accent/10 hover:bg-accent-subtle dark:hover:bg-accent/20 rounded-lg transition-colors"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange}>
                  <div className="max-w-md mx-auto space-y-4">
                    {passwordError && (
                      <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-sm">
                        {passwordError}
                      </div>
                    )}

                    {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {field === 'currentPassword' ? 'Contraseña Actual' : field === 'newPassword' ? 'Nueva Contraseña' : 'Confirmar Nueva Contraseña'}
                        </label>
                        <input
                          type="password"
                          value={passwordData[field as keyof typeof passwordData]}
                          onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })}
                          className="w-full border border-gray-300 dark:border-white/[0.07] bg-white dark:bg-white/[0.05] text-gray-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                          required
                          minLength={6}
                        />
                      </div>
                    ))}

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          setPasswordError('');
                        }}
                        className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-white/[0.07] rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.06] transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent rounded-lg disabled:opacity-50 transition-all shadow-lg shadow-accent/25"
                      >
                        {changingPassword ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Zona de Peligro */}
          <div className="card-bg rounded-xl border border-red-200 dark:border-red-800/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-200 dark:border-red-800/50 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10">
              <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">Zona de Peligro</h2>
            </div>
            <div className="p-6">
              {deactivateMessage ? (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg text-sm">
                  {deactivateMessage}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white">Desactivar Cuenta</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Tu cuenta será desactivada temporalmente. Tus datos se conservarán.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeactivateDialog(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg transition-colors flex-shrink-0"
                  >
                    Desactivar Cuenta
                  </button>
                </div>
              )}
            </div>
          </div>

          {showDeactivateDialog && (
            <ConfirmDialog
              open={showDeactivateDialog}
              onOpenChange={setShowDeactivateDialog}
              title="Desactivar Cuenta"
              description="Se enviará un email de confirmación a tu correo. Tu cuenta será desactivada cuando hagas clic en el enlace del email."
              confirmText="Enviar Email de Confirmación"
              cancelText="Cancelar"
              variant="danger"
              onConfirm={handleRequestDeactivation}
              loading={deactivating}
            />
          )}
        </div>

        {/* Columna Lateral */}
        <div className="space-y-6">
          {/* Tips de Seguridad */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#141417] dark:to-[#141417] rounded-xl border border-gray-200 dark:border-white/[0.07] p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tips de Seguridad</h3>
            <ul className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400">
              {[
                'Usa una contraseña única y segura',
                'Cambia tu contraseña cada 3 meses',
                'No compartas tus credenciales',
                'Cierra sesión al usar equipos públicos',
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
