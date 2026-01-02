import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.enum(['ADMIN', 'READ_ONLY']),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  tenantId: z.string().nullable().optional(),
});

type UserForm = z.infer<typeof userSchema>;

interface Tenant {
  id: string;
  name: string;
}

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Only admins can access this page
  if (user?.role !== 'ADMIN') {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You need admin privileges to manage users.
        </p>
      </div>
    );
  }

  const { data: users, isLoading } = useQuery('users', async () => {
    const response = await api.get('/users');
    return response.data;
  });

  const { data: tenants } = useQuery<Tenant[]>('tenants', async () => {
    const response = await api.get('/users/tenants');
    return response.data;
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
  });

  const createMutation = useMutation(
    (data: UserForm) => api.post('/users', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User created successfully');
        setIsModalOpen(false);
        reset();
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create user';
        toast.error(errorMessage);
      }
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UserForm }) => api.put(`/users/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User updated successfully');
        setIsModalOpen(false);
        setEditingUser(null);
        reset();
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update user';
        toast.error(errorMessage);
      }
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/users/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User deleted successfully');
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete user';
        toast.error(errorMessage);
      }
    }
  );

  const toggleUserStatus = useMutation(
    ({ id, isActive }: { id: string; isActive: boolean }) => 
      api.patch(`/users/${id}/status`, { isActive }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('users');
        toast.success('User status updated successfully');
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update user status';
        toast.error(errorMessage);
      }
    }
  );

  const onSubmit = (data: UserForm) => {
    const formData = {
      ...data,
      password: data.password || undefined,
      tenantId: data.tenantId || null, // Convert empty string to null
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (userToEdit: any) => {
    setEditingUser(userToEdit);
    reset({
      name: userToEdit.name,
      email: userToEdit.email,
      username: userToEdit.username,
      role: userToEdit.role,
      password: '', // Don't pre-fill password
      tenantId: userToEdit.tenantId || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, username: string) => {
    if (id === user?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: boolean, username: string) => {
    if (id === user?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }

    const action = currentStatus ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} user "${username}"?`)) {
      toggleUserStatus.mutate({ id, isActive: !currentStatus });
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    reset();
    setIsModalOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-danger';
      case 'READ_ONLY':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive ? 'badge-success' : 'badge-secondary';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts and permissions for the SAA Contracting system
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">Name</th>
              <th className="table-header-cell">Username</th>
              <th className="table-header-cell">Email</th>
              <th className="table-header-cell">Role</th>
              <th className="table-header-cell">Tenant Access</th>
              <th className="table-header-cell">Status</th>
              <th className="table-header-cell">Created</th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {users?.map((userItem: any) => (
              <tr key={userItem.id} className={!userItem.isActive ? 'opacity-60' : ''}>
                <td className="table-cell font-medium">{userItem.name}</td>
                <td className="table-cell">
                  <div className="flex items-center">
                    <span className="font-mono text-sm">{userItem.username}</span>
                    {userItem.id === user?.id && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                    )}
                  </div>
                </td>
                <td className="table-cell">{userItem.email}</td>
                <td className="table-cell">
                  <span className={`badge ${getRoleBadgeColor(userItem.role)}`}>
                    {userItem.role === 'READ_ONLY' ? 'Read Only' : userItem.role}
                  </span>
                </td>
                <td className="table-cell">
                  {userItem.tenant ? (
                    <span className="badge badge-info">{userItem.tenant.name}</span>
                  ) : (
                    <span className="badge badge-success">All Tenants</span>
                  )}
                </td>
                <td className="table-cell">
                  <span className={`badge ${getStatusBadgeColor(userItem.isActive)}`}>
                    {userItem.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="table-cell">
                  {new Date(userItem.createdAt).toLocaleDateString()}
                </td>
                <td className="table-cell">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(userItem)}
                      className="text-primary-600 hover:text-primary-900"
                      title="Edit user"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {userItem.id !== user?.id && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(userItem.id, userItem.isActive, userItem.username)}
                          className={`${userItem.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                          title={userItem.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {userItem.isActive ? '⏸️' : '▶️'}
                        </button>
                        <button
                          onClick={() => handleDelete(userItem.id, userItem.username)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete user"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users?.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No users found. Click "Add User" to create the first user account.
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input {...register('name')} className="input" placeholder="John Doe" />
                  {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">Username</label>
                  <input 
                    {...register('username')} 
                    className="input" 
                    placeholder="johndoe"
                    disabled={!!editingUser} // Don't allow username changes
                  />
                  {errors.username && <p className="text-red-600 text-sm">{errors.username.message}</p>}
                  {editingUser && (
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                  )}
                </div>

                <div>
                  <label className="label">Email</label>
                  <input {...register('email')} type="email" className="input" placeholder="john@example.com" />
                  {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="label">Role</label>
                  <select {...register('role')} className="input">
                    <option value="READ_ONLY">Read Only</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {errors.role && <p className="text-red-600 text-sm">{errors.role.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    Admin: Full access to all features. Read Only: Can view data but cannot make changes.
                  </p>
                </div>

                <div>
                  <label className="label">Tenant Access</label>
                  <select {...register('tenantId')} className="input">
                    <option value="">All Tenants</option>
                    {tenants?.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select a specific tenant to restrict access, or "All Tenants" for full access.
                  </p>
                </div>

                <div>
                  <label className="label">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    className="input"
                    placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                  />
                  {errors.password && <p className="text-red-600 text-sm">{errors.password.message}</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isLoading || updateMutation.isLoading}
                    className="btn-primary"
                  >
                    {createMutation.isLoading || updateMutation.isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : null}
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}