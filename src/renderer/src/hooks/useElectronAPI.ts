import { useCallback } from 'react'
import type { ElectronAPI } from '../../../preload'
import type {
  ListOptions,
  GetEmailOptions,
  BatchModifyRequest,
  BatchDeleteRequest,
  UserRules,
  ClassifyInput,
  AppConfig
} from '@shared/types'

/**
 * React hook that provides a typed, React-friendly wrapper around the Electron API
 * 
 * This hook converts the Result<T> pattern used by providers into thrown exceptions
 * that work well with React Query and other React patterns.
 * 
 * @returns Object with typed methods for interacting with Electron main process
 */
export function useElectronAPI() {
  // Get the Electron API from the global window object
  const api: ElectronAPI = window.electronAPI

  // Email operations
  const listEmails = useCallback(async (options?: ListOptions) => {
    const result = await api.email.list(options)
    if (result.success) {
      return result.data
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

  const searchEmails = useCallback(async (query: string, options?: any) => {
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

  const setEmailMetadata = useCallback(async (emailId: string, metadata: any) => {
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

  const updateConfig = useCallback(async (config: Partial<AppConfig>) => {
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

  const checkLLMHealth = useCallback(async () => {
    const result = await api.llm.healthCheck()
    if (result.success) {
      return result.data
    }
    throw new Error(result.error?.message || 'LLM health check failed')
  }, [api])

  // App operations
  const getAppVersion = useCallback(async () => {
    return await api.app.getVersion()
  }, [api])

  const quitApp = useCallback(() => {
    api.app.quit()
  }, [api])

  const minimizeWindow = useCallback(() => {
    api.app.minimize()
  }, [api])

  const maximizeWindow = useCallback(() => {
    api.app.maximize()
  }, [api])

  const unmaximizeWindow = useCallback(() => {
    api.app.unmaximize()
  }, [api])

  const isWindowMaximized = useCallback(async () => {
    return await api.app.isMaximized()
  }, [api])

  // Direct access to the underlying API for advanced use cases
  const rawAPI = api

  return {
    // Email operations
    listEmails,
    getEmail,
    batchModifyEmails,
    batchDeleteEmails,
    searchEmails,
    getEmailFolders,

    // Storage operations
    getUserRules,
    updateUserRules,
    getEmailMetadata,
    setEmailMetadata,
    getConfig,
    updateConfig,

    // LLM operations
    classifyEmails,
    checkLLMHealth,

    // App operations
    getAppVersion,
    quitApp,
    minimizeWindow,
    maximizeWindow,
    unmaximizeWindow,
    isWindowMaximized,

    // Direct API access
    rawAPI,
  }
}