import useSWR from 'swr';
import { UsersResponse } from '@/types/user';
import { authenticatedFetcher, getAuthHeaders } from '@/lib/fetch-utils';

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<UsersResponse>(
    '/api/users',
    (url) => authenticatedFetcher<UsersResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const importUsers = async () => {
    try {
      const response = await fetch('/api/users/import', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to import users');
      }

      // Refresh the users list
      await mutate();

      return true;
    } catch (error) {
      console.error('Error importing users:', error);
      throw error;
    }
  };

  return {
    users: data?.users ?? [],
    isLoading,
    isError: error,
    mutate,
    importUsers,
  };
} 