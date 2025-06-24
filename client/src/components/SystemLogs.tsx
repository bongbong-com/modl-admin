import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api';
import { formatDate, formatDateRelative } from '@/lib/utils';
import { 
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  RotateCcw,
  Calendar,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FileText
} from 'lucide-react';

interface SystemLog {
  _id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  category?: string;
  timestamp: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
}

interface LogFilters {
  level: string;
  source: string;
  category: string;
  resolved: string;
  search: string;
  startDate: string;
  endDate: string;
}

export default function SystemLogs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<'timestamp' | 'level'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState<LogFilters>({
    level: 'all',
    source: 'all',
    category: 'all',
    resolved: 'all',
    search: '',
    startDate: '',
    endDate: ''
  });

  // Fetch logs with real-time updates
  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ['system-logs', page, filters, sortBy, sortOrder],
    queryFn: async () => {
      const params = {
        page,
        limit: 20,
        sortBy,
        sortOrder,
        ...(filters.level !== 'all' && { level: filters.level }),
        ...(filters.source !== 'all' && { source: filters.source }),
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.resolved !== 'all' && { resolved: filters.resolved === 'true' }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      };
      const response = await apiClient.getSystemLogs(params);
      return response.data;
    },
    refetchInterval: autoRefresh ? 15000 : false, // Refresh every 15 seconds
  });

  // Get available log sources
  const { data: sources } = useQuery({
    queryKey: ['log-sources'],
    queryFn: async () => {
      const response = await apiClient.getLogSources();
      return response.data;
    },
  });

  // Resolve logs mutation
  const resolveMutation = useMutation({
    mutationFn: async (logIds: string[]) => {
      const promises = logIds.map(id => apiClient.resolveLog(id, 'admin'));
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-logs'] });
      setSelectedLogs([]);
    },
  });

  const logs = logsData?.logs || [];
  const pagination = logsData?.pagination;

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive" className="bg-red-600"><XCircle className="h-3 w-3 mr-1" />Critical</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case 'info':
        return <Badge variant="secondary"><Info className="h-3 w-3 mr-1" />Info</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const handleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log._id));
    }
  };

  const handleSelectLog = (logId: string) => {
    setSelectedLogs(prev => 
      prev.includes(logId) 
        ? prev.filter(id => id !== logId)
        : [...prev, logId]
    );
  };

  const handleResolveSelected = () => {
    if (selectedLogs.length > 0) {
      resolveMutation.mutate(selectedLogs);
    }
  };

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      level: 'all',
      source: 'all',
      category: 'all',
      resolved: 'all',
      search: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">System Logs</h3>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-green-600' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {selectedLogs.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResolveSelected}
                disabled={resolveMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Resolve ({selectedLogs.length})
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Level</label>
                <Select value={filters.level} onValueChange={(value) => handleFilterChange('level', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Source</label>
                <Select value={filters.source} onValueChange={(value) => handleFilterChange('source', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources?.map((source: string) => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filters.resolved} onValueChange={(value) => handleFilterChange('resolved', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="false">Unresolved</SelectItem>
                    <SelectItem value="true">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <div className="flex space-x-2">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'timestamp' | 'level')}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="timestamp">Time</SelectItem>
                      <SelectItem value="level">Level</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Start Date</label>
                <Input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">End Date</label>
                <Input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <div className="border rounded-lg">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading logs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-destructive">Failed to load logs</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No logs found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b p-4 bg-muted/50">
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={selectedLogs.length === logs.length}
                  onCheckedChange={handleSelectAll}
                />
                <div className="grid grid-cols-12 gap-4 flex-1 text-sm font-medium">
                  <div className="col-span-1">Level</div>
                  <div className="col-span-2">Source</div>
                  <div className="col-span-5">Message</div>
                  <div className="col-span-2">Time</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {logs.map((log: SystemLog) => (
                <div key={log._id} className="p-4 hover:bg-muted/30">
                  <div className="flex items-start space-x-4">
                    <Checkbox
                      checked={selectedLogs.includes(log._id)}
                      onCheckedChange={() => handleSelectLog(log._id)}
                    />
                    <div className="grid grid-cols-12 gap-4 flex-1">
                      <div className="col-span-1">
                        {getLevelBadge(log.level)}
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm font-medium">{log.source}</div>
                        {log.category && (
                          <div className="text-xs text-muted-foreground">{log.category}</div>
                        )}
                      </div>
                      <div className="col-span-5">
                        <div className="text-sm">{log.message}</div>
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {Object.entries(log.metadata).slice(0, 2).map(([key, value]) => (
                              <span key={key} className="mr-2">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm">{formatDateRelative(log.timestamp)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        {log.resolved ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </div>
                      <div className="col-span-1">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm" disabled>
                            <Eye className="h-3 w-3" />
                          </Button>
                          {!log.resolved && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => resolveMutation.mutate([log._id])}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="border-t p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} logs
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 