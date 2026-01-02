import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { BuildingOfficeIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
}

const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

export default function TenantSelectionPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [selectingTenant, setSelectingTenant] = useState<string | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<string | null>(null);
  const { user, switchTenant, logout } = useAuth();
  
  const isAdmin = user?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await api.get('/auth/tenants');
      setTenants(response.data);
    } catch (error) {
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const selectTenant = async (tenantId: string) => {
    if (!user) return;
    
    setSelectingTenant(tenantId);
    try {
      // Switch to the selected tenant using the new endpoint
      await switchTenant(tenantId);
      toast.success('Tenant selected successfully!');
    } catch (error) {
      toast.error('Failed to select tenant');
    } finally {
      setSelectingTenant(null);
    }
  };

  const createTenant = async (data: CreateTenantForm) => {
    setCreatingTenant(true);
    try {
      const response = await api.post('/auth/tenants', { name: data.name });
      const newTenant = response.data;
      setTenants([...tenants, newTenant]);
      toast.success('Tenant created successfully!');
      setShowCreateForm(false);
      reset();
      
      // Automatically select the new tenant
      await selectTenant(newTenant.id);
    } catch (error) {
      toast.error('Failed to create tenant');
    } finally {
      setCreatingTenant(false);
    }
  };

  const deleteTenant = async (tenantId: string, tenantName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingTenant(tenantId);
    try {
      await api.delete(`/auth/tenants/${tenantId}`);
      setTenants(tenants.filter(t => t.id !== tenantId));
      toast.success('Tenant deleted successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete tenant';
      toast.error(errorMessage);
    } finally {
      setDeletingTenant(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Select a Tenant
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose a tenant to access the labor management system
          </p>
          <div className="mt-4 flex items-center justify-center space-x-4">
            <span className="text-sm text-gray-500">Logged in as: {user?.username}</span>
            <button
              onClick={logout}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Existing Tenants */}
        {tenants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Tenants</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="card p-6 hover:shadow-md transition-shadow relative group"
                >
                  <div 
                    className="cursor-pointer"
                    onClick={() => selectTenant(tenant.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
                          <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-lg font-medium text-gray-900">{tenant.name}</h4>
                        </div>
                      </div>
                      {selectingTenant === tenant.id && (
                        <LoadingSpinner size="sm" />
                      )}
                    </div>
                  </div>
                  
                  {/* Delete Button - Admin only */}
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTenant(tenant.id, tenant.name);
                      }}
                      disabled={deletingTenant === tenant.id}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete Tenant"
                    >
                      {deletingTenant === tenant.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create New Tenant - Admin only */}
        {isAdmin && (
          <div className="card p-6">
            {!showCreateForm ? (
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Create New Tenant
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Set up a new tenant for your organization
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Tenant
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Create New Tenant
                </h3>
                <form onSubmit={handleSubmit(createTenant)} className="space-y-4">
                  <div>
                    <label className="label">Tenant Name</label>
                    <input
                      {...register('name')}
                      type="text"
                      className="input"
                      placeholder="e.g., Main Office, Branch 1"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        reset();
                      }}
                      className="btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingTenant}
                      className="btn-primary flex-1"
                    >
                      {creatingTenant ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Creating...
                        </>
                      ) : (
                        'Create & Select'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}