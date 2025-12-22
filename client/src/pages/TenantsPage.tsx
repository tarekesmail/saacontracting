import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
  createdAt: string;
  _count?: {
    jobs: number;
    laborers: number;
  };
}

const tenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
});

type TenantForm = z.infer<typeof tenantSchema>;

export default function TenantsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const { user, login } = useAuth();
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery('all-tenants', async () => {
    const response = await api.get('/auth/tenants');
    return response.data;
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
  });

  const createMutation = useMutation(
    (data: TenantForm) => api.post('/auth/tenants', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-tenants');
        toast.success('Tenant created successfully');
        setIsModalOpen(false);
        reset();
      },
      onError: () => {
        toast.error('Failed to create tenant');
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: TenantForm }) => api.put(`/auth/tenants/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-tenants');
        toast.success('Tenant updated successfully');
        setIsModalOpen(false);
        setEditingTenant(null);
        reset();
      },
      onError: () => {
        toast.error('Failed to update tenant');
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/auth/tenants/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-tenants');
        toast.success('Tenant deleted successfully');
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.error || 'Failed to delete tenant';
        toast.error(errorMessage);
      },
    }
  );

  const onSubmit = (data: TenantForm) => {
    if (editingTenant) {
      updateMutation.mutate({ id: editingTenant.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    reset({ name: tenant.name });
    setIsModalOpen(true);
  };

  const handleDelete = (tenant: Tenant) => {
    if (window.confirm(`Are you sure you want to delete "${tenant.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(tenant.id);
    }
  };

  const handleSwitchToTenant = async (tenantId: string) => {
    if (!user) return;
    
    try {
      await login(user.username, 'saacontracting2024', tenantId);
      toast.success('Switched to tenant successfully!');
    } catch (error) {
      toast.error('Failed to switch tenant');
    }
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    reset();
    setIsModalOpen(true);
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
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all tenants in the system
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Tenant
        </button>
      </div>

      {/* Current Tenant Info */}
      {user?.tenant && (
        <div className="card p-4 bg-primary-50 border-primary-200">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-5 w-5 text-primary-600 mr-2" />
            <span className="text-sm font-medium text-primary-900">
              Currently managing: {user.tenant.name}
            </span>
          </div>
        </div>
      )}

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tenants?.map((tenant: Tenant) => (
          <div key={tenant.id} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
                  <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{tenant.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(tenant)}
                  className="text-primary-600 hover:text-primary-900"
                  title="Edit Tenant"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(tenant)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete Tenant"
                  disabled={deleteMutation.isLoading}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {tenant._count && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Jobs:</span>
                    <span className="font-medium">{tenant._count.jobs}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Laborers:</span>
                    <span className="font-medium">{tenant._count.laborers}</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200">
                {user?.tenant?.id === tenant.id ? (
                  <span className="badge badge-success">Current Tenant</span>
                ) : (
                  <button
                    onClick={() => handleSwitchToTenant(tenant.id)}
                    className="btn-secondary w-full text-sm"
                  >
                    Switch to this Tenant
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tenants?.length === 0 && (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first tenant.
          </p>
          <div className="mt-6">
            <button onClick={openCreateModal} className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Tenant
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Tenant Name</label>
                  <input
                    {...register('name')}
                    className="input"
                    placeholder="e.g., Main Office, Riyadh Branch"
                  />
                  {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
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
                    {editingTenant ? 'Update' : 'Create'}
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