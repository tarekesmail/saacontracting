import { useQuery } from 'react-query';
import { api } from '../lib/api';
import { UsersIcon, UserGroupIcon, BriefcaseIcon, ClockIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery('dashboard-stats', async () => {
    const [laborers, groups, jobs] = await Promise.all([
      api.get('/laborers?limit=1'),
      api.get('/groups'),
      api.get('/jobs'),
    ]);

    return {
      totalLaborers: laborers.data.pagination.total,
      totalGroups: groups.data.length,
      totalJobs: jobs.data.length,
      activeLaborers: laborers.data.laborers.length,
    };
  });

  const { data: recentLaborers } = useQuery('recent-laborers', async () => {
    const response = await api.get('/laborers?limit=5');
    return response.data.laborers;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Laborers',
      value: stats?.totalLaborers || 0,
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Labor Groups',
      value: stats?.totalGroups || 0,
      icon: UserGroupIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Available Jobs',
      value: stats?.totalJobs || 0,
      icon: BriefcaseIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      name: 'Active Today',
      value: stats?.activeLaborers || 0,
      icon: ClockIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your labor management system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Laborers */}
      <div className="card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Laborers</h3>
        </div>
        <div className="overflow-hidden">
          {recentLaborers && recentLaborers.length > 0 ? (
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">ID Number</th>
                  <th className="table-header-cell">Group</th>
                  <th className="table-header-cell">Job</th>
                  <th className="table-header-cell">Start Date</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {recentLaborers.map((laborer: any) => (
                  <tr key={laborer.id}>
                    <td className="table-cell font-medium">{laborer.name}</td>
                    <td className="table-cell">{laborer.idNumber}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No laborers found. Start by adding your first laborer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}