import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import AdvancedSearch from '../components/AdvancedSearch';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const laborerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  idNumber: z.string().min(1, 'ID Number is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  startDate: z.string().min(1, 'Start date is required'),
  salaryRate: z.number().positive('Salary rate must be positive'),
  orgRate: z.number().positive('Organization rate must be positive'),
  jobId: z.string().min(1, 'Job is required'), // Made required
});

type LaborerForm = z.infer<typeof laborerSchema>;

export default function LaborersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLaborer, setEditingLaborer] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Since we have a single admin login, all authenticated users can edit and delete
  const canEdit = true;
  const canDelete = true;

  // Memoize the query key to prevent unnecessary re-renders
  const queryKey = useMemo(() => [
    'laborers',
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    JSON.stringify(searchParams) // Stringify to ensure stable comparison
  ], [currentPage, pageSize, sortBy, sortOrder, searchParams]);

  const { data: laborersData, isLoading } = useQuery(
    queryKey,
    async () => {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        sortBy,
        sortOrder,
        ...searchParams
      });
      const response = await api.get(`/laborers?${queryParams}`);
      return response.data;
    },
    {
      keepPreviousData: true, // This prevents the loading state when changing pages
      staleTime: 30000, // Keep data fresh for 30 seconds
    }
  );

  const { data: jobs } = useQuery('jobs', async () => {
    const response = await api.get('/jobs');
    return response.data;
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LaborerForm>({
    resolver: zodResolver(laborerSchema),
  });

  const createMutation = useMutation(
    (data: LaborerForm) => api.post('/laborers', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('laborers');
        toast.success('Laborer created successfully');
        setIsModalOpen(false);
        reset();
      },
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create laborer';
        toast.error(errorMessage);
        
        // If it's a field-specific error, you could highlight the field
        if (error.response?.data?.field === 'idNumber') {
          // The error will be shown in the toast, but you could also set form errors here
          console.log('ID Number validation error:', errorMessage);
        }
      }
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
      onError: (error: any) => {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update laborer';
        toast.error(errorMessage);
        
        // If it's a field-specific error, you could highlight the field
        if (error.response?.data?.field === 'idNumber') {
          console.log('ID Number validation error:', errorMessage);
        }
      }
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
    if (editingLaborer) {
      updateMutation.mutate({ id: editingLaborer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (laborer: any) => {
    setEditingLaborer(laborer);
    reset({
      name: laborer.name,
      idNumber: laborer.idNumber,
      phoneNumber: laborer.phoneNumber,
      startDate: new Date(laborer.startDate).toISOString().split('T')[0],
      salaryRate: parseFloat(laborer.salaryRate),
      orgRate: parseFloat(laborer.orgRate),
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

  const handlePageChange = (page: number) => {
    console.log('Page change requested:', page, 'Current page:', currentPage);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleSearch = useCallback((newSearchParams: Record<string, any>) => {
    // Only update if the search params actually changed
    const currentParamsString = JSON.stringify(searchParams);
    const newParamsString = JSON.stringify(newSearchParams);
    
    if (currentParamsString !== newParamsString) {
      setSearchParams(newSearchParams);
      setCurrentPage(1); // Reset to first page when searching
    }
  }, [searchParams]);

  // Define search filters
  const searchFilters = [
    {
      field: 'jobId',
      label: 'Job',
      type: 'select' as const,
      options: jobs?.map((job: any) => ({ value: job.id, label: job.name })) || []
    },
    {
      field: 'phoneNumber',
      label: 'Phone Number',
      type: 'text' as const
    },
    {
      field: 'idNumber',
      label: 'ID Number',
      type: 'text' as const
    },
    {
      field: 'salaryRateMin',
      label: 'Min Salary Rate',
      type: 'number' as const
    },
    {
      field: 'salaryRateMax',
      label: 'Max Salary Rate',
      type: 'number' as const
    },
    {
      field: 'orgRateMin',
      label: 'Min Org Rate',
      type: 'number' as const
    },
    {
      field: 'orgRateMax',
      label: 'Max Org Rate',
      type: 'number' as const
    },
    {
      field: 'startDateFrom',
      label: 'Start Date From',
      type: 'date' as const
    },
    {
      field: 'startDateTo',
      label: 'Start Date To',
      type: 'date' as const
    }
  ];

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th 
      className="table-header-cell cursor-pointer hover:bg-gray-100 select-none"
      onClick={(e) => {
        e.preventDefault();
        handleSort(field);
      }}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          <span className="text-primary-600">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );

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
            Manage your workforce with salary and organization rates
          </p>
        </div>
        {canEdit && (
          <button onClick={openCreateModal} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Laborer
          </button>
        )}
      </div>

      {/* Advanced Search */}
      <AdvancedSearch
        onSearch={handleSearch}
        filters={searchFilters}
        placeholder="Search laborers by name, ID, phone, or job..."
        showAdvanced={true}
      />

      {/* Quick Search Shortcuts */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 self-center">Quick filters:</span>
        <button
          type="button"
          onClick={() => handleSearch({ jobId: jobs?.find((j: any) => j.name === 'Flagman')?.id || '' })}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
        >
          Flagman
        </button>
        <button
          type="button"
          onClick={() => handleSearch({ jobId: jobs?.find((j: any) => j.name === 'Labour')?.id || '' })}
          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
        >
          Labour
        </button>
        <button
          type="button"
          onClick={() => handleSearch({ salaryRateMin: '10' })}
          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
        >
          Salary ≥ 10 SAR
        </button>
        <button
          type="button"
          onClick={() => handleSearch({ startDateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] })}
          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
        >
          New (Last 30 days)
        </button>
        <button
          type="button"
          onClick={() => handleSearch({})}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
        >
          Clear All
        </button>
      </div>

      {/* Results Summary */}
      {laborersData && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <div>
            {Object.keys(searchParams).length > 0 ? (
              <span>
                Found <strong>{laborersData.pagination.total}</strong> laborers matching your search
              </span>
            ) : (
              <span>
                Total <strong>{laborersData.pagination.total}</strong> laborers
              </span>
            )}
          </div>
          <div>
            Page {currentPage} of {laborersData.pagination.pages}
          </div>
        </div>
      )}

      {/* Laborers Table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead className="table-header">
            <tr>
              <SortableHeader field="name">Name</SortableHeader>
              <SortableHeader field="idNumber">ID Number</SortableHeader>
              <SortableHeader field="phoneNumber">Phone</SortableHeader>
              <SortableHeader field="salaryRate">
                <div className="flex flex-col">
                  <span>Salary Rate</span>
                  <span className="text-xs text-gray-400 font-normal">(Laborer Pay)</span>
                </div>
              </SortableHeader>
              <SortableHeader field="orgRate">
                <div className="flex flex-col">
                  <span>Org Rate</span>
                  <span className="text-xs text-gray-400 font-normal">(Client Charge)</span>
                </div>
              </SortableHeader>
              <th className="table-header-cell">Job</th>
              <SortableHeader field="startDate">Start Date</SortableHeader>
              {(canEdit || canDelete) && <th className="table-header-cell">Actions</th>}
            </tr>
          </thead>
          <tbody className="table-body">
            {laborersData?.laborers.map((laborer: any) => (
              <tr key={laborer.id}>
                <td className="table-cell font-medium">{laborer.name}</td>
                <td className="table-cell">{laborer.idNumber}</td>
                <td className="table-cell">{laborer.phoneNumber}</td>
                <td className="table-cell">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-blue-600">
                      {parseFloat(laborer.salaryRate).toFixed(2)} SAR
                    </span>
                  </div>
                </td>
                <td className="table-cell">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-600">
                      {parseFloat(laborer.orgRate).toFixed(2)} SAR
                    </span>
                    <span className="text-xs text-gray-500">
                      +{(parseFloat(laborer.orgRate) - parseFloat(laborer.salaryRate)).toFixed(2)} profit
                    </span>
                  </div>
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

      {/* Improved Pagination */}
      {laborersData?.pagination && laborersData.pagination.pages > 1 && (
        <div className="card">
          <Pagination
            currentPage={currentPage}
            totalPages={laborersData.pagination.pages}
            totalItems={laborersData.pagination.total}
            itemsPerPage={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
            showPageSizeSelector={true}
            showPageInfo={true}
          />
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
                  <p className="text-xs text-gray-500 mt-1">Must be unique across the entire system</p>
                </div>

                <div>
                  <label className="label">Phone Number</label>
                  <input {...register('phoneNumber')} className="input" />
                  {errors.phoneNumber && <p className="text-red-600 text-sm">{errors.phoneNumber.message}</p>}
                </div>

                <div>
                  <label className="label">Start Date</label>
                  <input {...register('startDate')} type="date" className="input" />
                  {errors.startDate && <p className="text-red-600 text-sm">{errors.startDate.message}</p>}
                </div>

                <div>
                  <label className="label">Salary Rate (SAR/hour)</label>
                  <input
                    {...register('salaryRate', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="20.00"
                  />
                  {errors.salaryRate && <p className="text-red-600 text-sm">{errors.salaryRate.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">Amount paid to the laborer</p>
                </div>

                <div>
                  <label className="label">Organization Rate (SAR/hour)</label>
                  <input
                    {...register('orgRate', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    placeholder="35.00"
                  />
                  {errors.orgRate && <p className="text-red-600 text-sm">{errors.orgRate.message}</p>}
                  <p className="text-xs text-gray-500 mt-1">Amount charged to the client organization</p>
                </div>

                <div>
                  <label className="label">Job</label>
                  <select {...register('jobId')} className="input">
                    <option value="">Select a job</option>
                    {jobs?.map((job: any) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                  </select>
                  {errors.jobId && <p className="text-red-600 text-sm">{errors.jobId.message}</p>}
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