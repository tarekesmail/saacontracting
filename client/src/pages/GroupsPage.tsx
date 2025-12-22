import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required'),
});

type GroupForm = z.infer<typeof groupSchema>;

export default function GroupsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Since we have a single admin login, all authenticated users can edit and delete
  const canEdit = true;
  const canDelete = true;

  const { data: groups, isLoading } = useQuery('groups', async () => {
    const response = await api.get('/groups');
    return response.data;
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
  });

  const createMutation = useMutation(
    (data: GroupForm) => api.post('/groups', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast.success('Group created successfully');
        setIsModalOpen(false);
        reset();
      },
    }
  );

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: GroupForm }) => api.put(`/groups/${id}`, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast.success('Group updated successfully');
        setIsModalOpen(false);
        setEditingGroup(null);
        reset();
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.delete(`/groups/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('groups');
        toast.success('Group deleted successfully');
      },
    }
  );

  const onSubmit = (data: GroupForm) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (group: any) => {
    setEditingGroup(group);
    reset({ name: group.name });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Labor Groups</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize your workforce into different categories
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreateModal} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Group
          </button>
        )}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups?.map((group: any) => (
          <div key={group.id} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-primary-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                  <p className="text-sm text-gray-500">
                    {group._count.laborers} laborer{group._count.laborers !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {(canEdit || canDelete) && (
                <div className="flex space-x-2">
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Available Jobs:</span>
                <span className="font-medium">{group.jobs.length}</span>
              </div>
              {group.jobs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {group.jobs.slice(0, 3).map((job: any) => (
                    <span key={job.id} className="badge badge-success text-xs">
                      {job.name}
                    </span>
                  ))}
                  {group.jobs.length > 3 && (
                    <span className="badge badge-secondary text-xs">
                      +{group.jobs.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {groups?.length === 0 && (
        <div className="text-center py-12">
          <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No groups</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first labor group.
          </p>
          {canEdit && (
            <div className="mt-6">
              <button onClick={openCreateModal} className="btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Group
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
                {editingGroup ? 'Edit Group' : 'Add New Group'}
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="label">Group Name</label>
                  <input
                    {...register('name')}
                    className="input"
                    placeholder="e.g., Drivers, Security, Maintenance"
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
                    {editingGroup ? 'Update' : 'Create'}
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