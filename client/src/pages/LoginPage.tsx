import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

interface Tenant {
  id: string;
  name: string;
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // Fetch available tenants on component mount
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await api.get('/auth/tenants');
        setTenants(response.data);
      } catch (error) {
        console.error('Failed to fetch tenants:', error);
        toast.error('Failed to load tenants');
      } finally {
        setLoadingTenants(false);
      }
    };

    fetchTenants();
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.username, data.password, data.tenantId);
      toast.success('Welcome to SAA Contracting!');
    } catch (error) {
      // Error is handled by the API interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            SAA Contracting
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Labor Management System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                {...register('username')}
                type="text"
                className="input"
                placeholder="Enter username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="Enter password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="tenantId" className="label">
                Select Tenant (Optional)
              </label>
              {loadingTenants ? (
                <div className="flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm text-gray-500">Loading tenants...</span>
                </div>
              ) : (
                <select
                  {...register('tenantId')}
                  className="input"
                >
                  <option value="">No tenant selected</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.tenantId && (
                <p className="mt-1 text-sm text-red-600">{errors.tenantId.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}