import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, BriefcaseIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const jobSchema = z.object({
  name: z.string().min(1, 'Job name is required'),
  pricePerHour: z.number().positive('Price per hour must be positive'),
  groupId: z.string().min(1, 'Group is required'),
});

type JobForm = z.infer<typeof jobSchema>;

export default function JobsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Since we have a single admin login, all authenticated users can edit and delete
  const canEdit = true;
  const canDelete = true;

  const { data: jobs, isLoading } = useQuery(['jobs', selectedGroup], async () => {
    const params = selectedGroup ? `?groupId=${selectedGroup}` : '';
    const response = await api.get(`/jobs${params}`);
    return response.data;
  });

  const { data: groups } = useQuery('groups', async () => {
    const response = await api.get('/groups');
    return response.data;
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
  });

  const createMutation = useMutation(
    (data: JobForm) => api.post('/jobs', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobs');
        toast.success('Job created successfully');
        setIsModalOpen(false);
        reset();
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: JobForm }) => api.put(`/jobs/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobs');
        toast.success('Job updated successfully');
        setIsModalOpen(false);
        setEditingJob(null);
        reset();
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/jobs/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobs');
        toast.success('Job deleted successfully');
      },
    }
  );

  const onSubmit = (data: JobForm) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (job: any) => {
    setEditingJob(job);
    reset({
      name: job.name,
      pricePerHour: parseFloat(job.pricePerHour),
      groupId: job.groupId,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingJob(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage job positions and their hourly rates
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreateModal} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Job
          </button>
        )}
      </div>

      {/* Filter by Group */}
      <div className="flex space-x-4">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="input max-w-xs"
        >
          <option value="">All Groups</option>
          {groups?.map((group: any) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {jobs?.map((job: any) => (
          <div key={job.id} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
                  <BriefcaseIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{job.name}</h3>
                  <p className="text-sm text-gray-500">{job.group.name}</p>
                </div>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex space-x-2">
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(job)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <BanknotesIcon className="h-4 w-4 mr-1" />
                  Hourly Rate
                </div>
                <span className="text-lg font-bold text-green-600">
                  {parseFloat(job.pricePerHour).toFixed(2)} SAR
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Assigned Laborers:</span>
                <span className="font-medium">{job._count.laborers}</span>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <span className="badge badge-primary">{job.group.name}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {jobs?.length === 0 && (
        <div className="text-center py-12">
          <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs</h3>
          <p className="mt-1 text-sm text-gray-500">
            {selectedGroup 
              ? 'No jobs found for the selected group.' 
              : 'Get started by creating your first job position.'
            }
          </p>
          {canEdit && !selectedGroup && (
            <div className="mt-6">
              <button onClick={openCreateModal} className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Job
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingJob ? 'Edit Job' : 'Add New Job'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Job Name</label>
                  <input
                    {...register('name')}
                    className="input"
                    placeholder="e.g., Senior Driver, Security Guard"
                  />
                  {errors.name && <p className="text-red-600 text-sm">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">Price Per Hour (SAR)</label>
                  <input
                    {...register('pricePerHour', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="15.00"
                  />
                  {errors.pricePerHour && <p className="text-red-600 text-sm">{errors.pricePerHour.message}</p>}
                </div>

                <div>
                  <label className="label">Group</label>
                  <select {...register('groupId')} className="input">
                    <option value="">Select a group</option>
                    {groups?.map((group: any) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  {errors.groupId && <p className="text-red-600 text-sm">{errors.groupId.message}</p>}
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
                    {editingJob ? 'Update' : 'Create'}
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