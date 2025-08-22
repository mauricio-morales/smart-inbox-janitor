import { useCallback } from 'react'
import type { ElectronAPI } from '../../../preload'
import type {
  ListOptions,
  GetEmailOptions,
  BatchModifyRequest,
  BatchDeleteRequest,
  UserRules,
  ClassifyInput,
  EmailSummary,
  EmailFull,
  BatchOperationResult,
  SearchOptions,
  SearchResult,
  EmailFolder,
  EmailMetadata,
  StoredAppConfig
} from '@shared/types'

/**
 * React hook that provides a typed, React-friendly wrapper around the Electron API
 * 
 * This hook converts the Result<T> pattern used by providers into thrown exceptions
 * that work well with React Query and other React patterns.
 * 
 * @returns Object with typed methods for interacting with Electron main process
 */
export function useElectronAPI(): {
  listEmails: (options?: ListOptions) => Promise<EmailSummary[]>
  getEmail: (emailId: string, options?: GetEmailOptions) => Promise<EmailFull>
  batchModifyEmails: (request: BatchModifyRequest) => Promise<BatchOperationResult>
  deleteEmail: (emailId: string) => Promise<void>
  searchEmails: (query: string, options?: SearchOptions) => Promise<SearchResult>
  getFolders: () => Promise<EmailFolder[]>
  reportSpam: (emailIds: string[]) => Promise<BatchOperationResult>
  reportPhishing: (emailIds: string[]) => Promise<BatchOperationResult>
  batchDeleteEmails: (request: BatchDeleteRequest) => Promise<BatchOperationResult>
  getUserRules: (userId: string) => Promise<UserRules>
  updateUserRules: (rules: UserRules) => Promise<void>
  getEmailMetadata: (emailId: string) => Promise<EmailMetadata | null>
  setEmailMetadata: (emailId: string, metadata: EmailMetadata) => Promise<void>
  classifyEmails: (input: ClassifyInput) => Promise<unknown>
  getConfig: () => Promise<StoredAppConfig>
  updateConfig: (config: Partial<StoredAppConfig>) => Promise<void>
  healthCheck: () => Promise<{ status: string; timestamp: Date }>
  initialize: () => Promise<void>
  shutdown: () => Promise<void>
} {
  // Get the Electron API from the global window object
  const api: ElectronAPI = (globalThis as typeof globalThis & { electronAPI: ElectronAPI }).electronAPI

  // Email operations
  const listEmails = useCallback(async (options?: ListOptions) => {
    const result = await api.email.list(options)
    if (result.success) {
      return result.data.emails
    }
    throw new Error(result.error?.message || 'Failed to list emails')
  }, [api])

  const getEmail = useCallback(async (emailId: string, options?: GetEmailOptions) => {
    const result = await api.email.get(emailId, options)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get email')
  }, [api])

  const batchModifyEmails = useCallback(async (request: BatchModifyRequest) => {
    const result = await api.email.batchModify(request)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to modify emails')
  }, [api])

  const batchDeleteEmails = useCallback(async (request: BatchDeleteRequest) => {
    const result = await api.email.batchDelete(request)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to delete emails')
  }, [api])

  const searchEmails = useCallback(async (query: string, options?: SearchOptions) => {
    const result = await api.email.search(query, options)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to search emails')
  }, [api])

  const getEmailFolders = useCallback(async () => {
    const result = await api.email.getFolders()
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get email folders')
  }, [api])

  // Storage operations
  const getUserRules = useCallback(async () => {
    const result = await api.storage.getUserRules()
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get user rules')
  }, [api])

  const updateUserRules = useCallback(async (rules: UserRules) => {
    const result = await api.storage.updateUserRules(rules)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to update user rules')
  }, [api])

  const getEmailMetadata = useCallback(async (emailId: string) => {
    const result = await api.storage.getEmailMetadata(emailId)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get email metadata')
  }, [api])

  const setEmailMetadata = useCallback(async (emailId: string, metadata: EmailMetadata) => {
    const result = await api.storage.setEmailMetadata(emailId, metadata)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to set email metadata')
  }, [api])

  const getConfig = useCallback(async () => {
    const result = await api.storage.getConfig()
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to get configuration')
  }, [api])

  const updateConfig = useCallback(async (config: Partial<StoredAppConfig>) => {
    const result = await api.storage.updateConfig(config)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to update configuration')
  }, [api])

  // LLM operations
  const classifyEmails = useCallback(async (input: ClassifyInput) => {
    const result = await api.llm.classify(input)
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'Failed to classify emails')
  }, [api])

  // App operations



  return {
    // Email operations
    listEmails,
    getEmail,
    batchModifyEmails,
    batchDeleteEmails,
    searchEmails,
    getFolders: getEmailFolders,

    // Storage operations
    getUserRules,
    updateUserRules,
    getEmailMetadata,
    setEmailMetadata,
    getConfig,
    updateConfig,

    // LLM operations
    classifyEmails,

    // Required API methods (stubs for interface compatibility)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteEmail: async (_: string): Promise<void> => {
      return Promise.reject(new Error('Delete email not implemented yet'));
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reportSpam: async (_: string[]): Promise<{ successCount: number; failureCount: number; results: unknown[]; processingTimeMs: number }> => {
      return Promise.resolve({ successCount: 0, failureCount: 0, results: [], processingTimeMs: 0 });
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    reportPhishing: async (_: string[]): Promise<{ successCount: number; failureCount: number; results: unknown[]; processingTimeMs: number }> => {
      return Promise.resolve({ successCount: 0, failureCount: 0, results: [], processingTimeMs: 0 });
    },
    healthCheck: async (): Promise<{ status: string; timestamp: Date }> => {
      return Promise.resolve({ status: 'ok', timestamp: new Date() });
    },
    initialize: async (): Promise<void> => {
      // Initialization stub
    },
    shutdown: async (): Promise<void> => {
      // Shutdown stub
    },

  }
}