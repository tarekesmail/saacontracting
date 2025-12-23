import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  FunnelIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface SearchFilter {
  field: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date';
  options?: { value: string; label: string }[];
}

interface AdvancedSearchProps {
  onSearch: (searchParams: Record<string, any>) => void;
  filters?: SearchFilter[];
  placeholder?: string;
  showAdvanced?: boolean;
}

export default function AdvancedSearch({
  onSearch,
  filters = [],
  placeholder = "Search...",
  showAdvanced = true
}: AdvancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Trigger search when debounced term or filters change
  useEffect(() => {
    const searchParams = {
      search: debouncedSearchTerm,
      ...advancedFilters
    };
    
    // Remove empty values
    const cleanedParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => 
        value !== '' && value !== null && value !== undefined
      )
    );
    
    onSearch(cleanedParams);
  }, [debouncedSearchTerm, advancedFilters, onSearch]);

  const handleAdvancedFilterChange = (field: string, value: any) => {
    setAdvancedFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setAdvancedFilters({});
    setIsAdvancedOpen(false);
  };

  const hasActiveFilters = searchTerm || Object.keys(advancedFilters).some(key => advancedFilters[key]);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10 pr-20"
        />
        
        {/* Search Actions */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Clear all filters"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          
          {showAdvanced && filters.length > 0 && (
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`p-1 rounded ${
                isAdvancedOpen || Object.keys(advancedFilters).length > 0
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Advanced filters"
            >
              <FunnelIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {isAdvancedOpen && filters.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">Advanced Filters</h3>
            <button
              onClick={() => setIsAdvancedOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <ChevronDownIcon className="h-4 w-4 transform rotate-180" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {filter.label}
                </label>
                
                {filter.type === 'text' && (
                  <input
                    type="text"
                    value={advancedFilters[filter.field] || ''}
                    onChange={(e) => handleAdvancedFilterChange(filter.field, e.target.value)}
                    className="input text-sm"
                    placeholder={`Filter by ${filter.label.toLowerCase()}`}
                  />
                )}
                
                {filter.type === 'select' && (
                  <select
                    value={advancedFilters[filter.field] || ''}
                    onChange={(e) => handleAdvancedFilterChange(filter.field, e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">All {filter.label}</option>
                    {filter.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                
                {filter.type === 'number' && (
                  <input
                    type="number"
                    value={advancedFilters[filter.field] || ''}
                    onChange={(e) => handleAdvancedFilterChange(filter.field, e.target.value)}
                    className="input text-sm"
                    placeholder={`Filter by ${filter.label.toLowerCase()}`}
                  />
                )}
                
                {filter.type === 'date' && (
                  <input
                    type="date"
                    value={advancedFilters[filter.field] || ''}
                    onChange={(e) => handleAdvancedFilterChange(filter.field, e.target.value)}
                    className="input text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          
          {Object.keys(advancedFilters).length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={() => setAdvancedFilters({})}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear advanced filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-1 text-primary-600 hover:text-primary-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {Object.entries(advancedFilters).map(([key, value]) => {
            if (!value) return null;
            const filter = filters.find(f => f.field === key);
            const displayValue = filter?.type === 'select' 
              ? filter.options?.find(opt => opt.value === value)?.label || value
              : value;
              
            return (
              <span
                key={key}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {filter?.label}: {displayValue}
                <button
                  onClick={() => handleAdvancedFilterChange(key, '')}
                  className="ml-1 text-gray-600 hover:text-gray-800"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}