import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface AdminSession {
  email: string;
  lastActivityAt: string;
  loggedInIps: string[];
  isAuthenticated: boolean;
}

export function useAuth() {
  const queryClient = useQueryClient();

  // Query for current session
  const {
    data: session,
    isLoading,
    error
  } = useQuery<AdminSession>({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const response = await apiClient.getSession();
      return response.data;
    },
    retry: false, // Don't retry auth queries
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Request verification code mutation
  const requestCodeMutation = useMutation({
    mutationFn: (email: string) => apiClient.requestCode(email),
    onError: (error) => {
      console.error('Request code failed:', error);
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => 
      apiClient.login(email, code),
    onSuccess: () => {
      // Invalidate and refetch session data
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
    onError: (error) => {
      console.error('Login failed:', error);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // Clear all cached data on logout
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Logout failed:', error);
      // Even if logout fails on server, clear local cache
      queryClient.clear();
    }
  });

  return {
    // Session data
    session,
    isAuthenticated: !!session?.isAuthenticated,
    isLoading,
    error,
    
    // Mutations
    requestCode: requestCodeMutation.mutate,
    isRequestingCode: requestCodeMutation.isPending,
    requestCodeError: requestCodeMutation.error,
    
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  };
} 