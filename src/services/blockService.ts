// services/blockService.ts
import { api } from './apiService'; 
import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext'; 

// Types
export interface BlockedUser {
  id: number;
  blockedId: number;
  blockedNickname: string;
  profileImageUrl?: string;
  createdAt?: string;
}

export interface BlockStatus {
  blockedByMe: boolean;
  blocksMe: boolean;
  either: boolean;
}

export interface BlockResponse {
  status: string;
  blockedId: number;
}

// Block Service Class
class BlockService {
  private baseUrl = '/api/blocks';

  /**
   * Block a user by ID
   */
  async blockUser(blockedId: number): Promise<BlockResponse> {
    try {
      const response = await api(`${this.baseUrl}/${blockedId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to block user: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error blocking user:', error);
      throw new Error('Failed to block user');
    }
  }

  /**
   * Unblock a user by ID
   */
  async unblockUser(blockedId: number): Promise<BlockResponse> {
    try {
      const response = await api(`${this.baseUrl}/${blockedId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to unblock user: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error unblocking user:', error);
      throw new Error('Failed to unblock user');
    }
  }

  /**
   * Get current user's blocked users list
   */
  async getMyBlocks(): Promise<BlockedUser[]> {
    try {
      const response = await api(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch blocked users: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      throw new Error('Failed to fetch blocked users');
    }
  }

  /**
   * Get block status with a specific user by nickname
   */
  async getBlockStatus(nickname: string): Promise<BlockStatus> {
    try {
      const response = await api(`${this.baseUrl}/status/${nickname}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch block status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching block status:', error);
      throw new Error('Failed to fetch block status');
    }
  }

  /**
   * Check if current user has blocked a specific user
   */
  async isUserBlocked(nickname: string): Promise<boolean> {
    try {
      const status = await this.getBlockStatus(nickname);
      return status.blockedByMe;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  /**
   * Check if current user is blocked by a specific user
   */
  async isBlockedByUser(nickname: string): Promise<boolean> {
    try {
      const status = await this.getBlockStatus(nickname);
      return status.blocksMe;
    } catch (error) {
      console.error('Error checking if blocked by user:', error);
      return false;
    }
  }

  /**
   * Toggle block status for a user
   */
  async toggleBlock(userId: number, nickname: string): Promise<BlockResponse> {
    try {
      const isBlocked = await this.isUserBlocked(nickname);
      
      if (isBlocked) {
        return await this.unblockUser(userId);
      } else {
        return await this.blockUser(userId);
      }
    } catch (error) {
      console.error('Error toggling block status:', error);
      throw new Error('Failed to toggle block status');
    }
  }
}

// Export singleton instance
export const blockService = new BlockService();

// React Hook for Block Operations
export const useBlockService = () => {
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeBlockOperation = useCallback(async (
    operation: () => Promise<any>
  ) => {
    if (!isAuthenticated) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await operation();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const blockUser = useCallback(async (blockedId: number) => {
    return executeBlockOperation(() => blockService.blockUser(blockedId));
  }, [executeBlockOperation]);

  const unblockUser = useCallback(async (blockedId: number) => {
    return executeBlockOperation(() => blockService.unblockUser(blockedId));
  }, [executeBlockOperation]);

  const getMyBlocks = useCallback(async () => {
    return executeBlockOperation(() => blockService.getMyBlocks());
  }, [executeBlockOperation]);

  const getBlockStatus = useCallback(async (nickname: string) => {
    return executeBlockOperation(() => blockService.getBlockStatus(nickname));
  }, [executeBlockOperation]);

  const toggleBlock = useCallback(async (userId: number, nickname: string) => {
    return executeBlockOperation(() => blockService.toggleBlock(userId, nickname));
  }, [executeBlockOperation]);

  return {
    blockUser,
    unblockUser,
    getMyBlocks,
    getBlockStatus,
    toggleBlock,
    loading,
    error,
    clearError: () => setError(null)
  };
};