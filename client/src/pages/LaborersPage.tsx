import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const laborerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  idNumber: z.string().min(1, 'ID Number is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  startDate: z.string().min(1, 'Start date is required'),
  groupId: z.string().optional(),
  jobId: z.string().optional(),
});

type LaborerForm = z.infer<typeof laborerSchema>;

export default function LaborersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaborer, setEditingLaborer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'ADMIN' || user?.role === 'EDITOR';
  const canDelete = user?.role === 'ADMIN';

  const { data: laborersData, isLoading } = useQuery(
    ['laborers', currentPage, searchTerm],
    async () => {
      const response = await api.get(`/laborers?page=${currentPage}&search=${searchTerm}`);
      return response.data;
    }
  );

  const { data: groups } = useQuery('groups', async () => {
    const response = await api.get('/groups');
    return response.data;
  });

  const { data: jobs } = useQuery('jobs', async () => {
    const response = await api.get('/jobs');
    return response.data;
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LaborerForm>({
    resolver: zodResolver(laborerSchema),
  });

  const selectedGroupId = watch('groupId');
  const availableJobs = jobs?.filter((job: any) => job.groupId === selectedGroupId) || [];

  const createMutation = useMutation(
    (data: LaborerForm) => api.post('/laborers', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('laborers');
        toast.success('Laborer created successfully');
        setIsModalOpen(false);
        reset();
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: LaborerForm }) => api.put(`/laborers/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('laborers');
        toast.success('Laborer updated successfully');
        setIsModalOpen(false);
        setEditingLaborer(null);
        reset();
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/laborers/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('laborers');
        toast.success('Laborer deleted successfully');
      },
    }
  );

  const onSubmit = (data: LaborerForm) => {
    const formData = {
      ...data,
      email: data.email || undefined,
      groupId: data.groupId || undefined,
      jobId: data.jobId || undefined,
    };

    if (editingLaborer) {
      updateMutation.mutate({ id: editingLaborer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (laborer: any) => {
    setEditingLaborer(laborer);
    reset({
      name: laborer.name,
      idNumber: laborer.idNumber,
      phoneNumber: laborer.phoneNumber,
      email: laborer.email || '',
      startDate: new Date(laborer.startDate).toISOString().split('T')[0],
      groupId: laborer.groupId || '',
      jobId: laborer.jobId || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this laborer?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingLaborer(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Laborers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your workforce and their assignments
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreateModal} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Laborer
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search laborers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Laborers Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">Name</th>
              <th className="table-header-cell">ID Number</th>
              <th className="table-header-cell">Phone</th>
              <th className="table-header-cell">Email</th>
              <th className="table-header-cell">Group</th>
              <th className="table-header-cell">Job</th>
              <th className="table-header-cell">Start Date</th>
              {(canEdit || canDelete) && <th className="table-header-cell">Actions</th>}
            </tr>
          </thead>
          <tbody className="table-body">
            {laborersData?.laborers.map((laborer: any) => (
              <tr key={laborer.id}>
                <td className="table-cell font-medium">{laborer.name}</td>
                <td className="table-cell">{laborer.idNumber}</td>
                <td className="table-cell">{laborer.phoneNumber}</td>
                <td className="table-cell">{laborer.email || '-'}</td>
                <td className="table-cell">
                  {laborer.group ? (
                    <span className="badge badge-primary">{laborer.group.name}</span>
                  ) : (
                    <span className="text-gray-400">No group</span>
                  )}
                </td>
                <td className="table-cell">
                  {laborer.job ? (
                    <span className="badge badge-success">{laborer.job.name}</span>
                  ) : (
                    <span className="text-gray-400">No job</span>
                  )}
                </td>
                <td className="table-cell">
                  {new Date(laborer.startDate).toLocaleDateString()}
                </td>
                {(canEdit || canDelete) && (
                  <td className="table-cell">
                    <div className="flex space-x-2">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(laborer)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(laborer.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {laborersData?.laborers.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            No laborers found. {canEdit && 'Click "Add Laborer" to get started.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {laborersData?.pagination && laborersData.pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: laborersData.pagination.pages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded ${
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingLaborer ? 'Edit Laborer' : 'Add New Laborer'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Name</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">ID Number</label>
                  <input {...register('idNumber')} className="input" />
                  {errors.idNumber && <p className="text-red-600 text-sm">{errors.idNumber.message}</p>}
                </div>

                <div>
                  <label className="label">Phone Number</label>
                  <input {...register('phoneNumber')} className="input" />
                  {errors.phoneNumber && <p className="text-red-600 text-sm">{errors.phoneNumber.message}</p>}
                </div>

                <div>
                  <label className="label">Email (Optional)</label>
                  <input {...register('email')} type="email" className="input" />
                  {errors.email && <p className="text-red-600 text-sm">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="label">Start Date</label>
                  <input {...register('startDate')} type="date" className="input" />
                  {errors.startDate && <p className="text-red-600 text-sm">{errors.startDate.message}</p>}
                </div>

                <div>
                  <label className="label">Group (Optional)</label>
                  <select {...register('groupId')} className="input">
                    <option value="">Select a group</option>
                    {groups?.map((group: any) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Job (Optional)</label>
                  <select {...register('jobId')} className="input" disabled={!selectedGroupId}>
                    <option value="">Select a job</option>
                    {availableJobs.map((job: any) => (
                      <option key={job.id} value={job.id}>
                        {job.name} (${job.pricePerHour}/hr)
                      </option>
                    ))}
                  </select>
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
                    {editingLaborer ? 'Update' : 'Create'}
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