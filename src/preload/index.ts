// TODO: Remove this disable when stub methods are fully implemented
import { contextBridge, ipcRenderer } from 'electron';
import type {
  EmailProvider,
  StorageProvider,
  LLMProvider,
  ListOptions,
  GetEmailOptions,
  BatchModifyRequest,
  BatchDeleteRequest,
  UserRules,
  ClassifyInput,
  SearchOptions,
  EmailMetadata,
  StoredAppConfig,
  Result,
} from '@shared/types';

// Define the secure API interface that will be exposed to the renderer
export interface ElectronAPI {
  email: {
    list: (options?: ListOptions) => Promise<ReturnType<EmailProvider['list']>>;
    get: (emailId: string, options?: GetEmailOptions) => Promise<ReturnType<EmailProvider['get']>>;
    batchModify: (request: BatchModifyRequest) => Promise<ReturnType<EmailProvider['batchModify']>>;
    batchDelete: (request: BatchDeleteRequest) => Promise<ReturnType<EmailProvider['batchDelete']>>;
    search: (
      query: string,
      options?: SearchOptions,
    ) => Promise<ReturnType<EmailProvider['search']>>;
    getFolders: () => Promise<ReturnType<EmailProvider['getFolders']>>;
  };
  storage: {
    getUserRules: () => Promise<ReturnType<StorageProvider['getUserRules']>>;
    updateUserRules: (rules: UserRules) => Promise<ReturnType<StorageProvider['updateUserRules']>>;
    getEmailMetadata: (emailId: string) => Promise<ReturnType<StorageProvider['getEmailMetadata']>>;
    setEmailMetadata: (
      emailId: string,
      metadata: EmailMetadata,
    ) => Promise<ReturnType<StorageProvider['setEmailMetadata']>>;
    getConfig: () => Promise<ReturnType<StorageProvider['getConfig']>>;
    updateConfig: (
      config: Partial<StoredAppConfig>,
    ) => Promise<ReturnType<StorageProvider['updateConfig']>>;
  };
  llm: {
    classify: (input: ClassifyInput) => Promise<ReturnType<LLMProvider['classifyEmails']>>;
    healthCheck: () => Promise<ReturnType<LLMProvider['healthCheck']>>;
  };
  app: {
    getVersion: () => Promise<string>;
    quit: () => Promise<void>;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    unmaximize: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  oauth: {
    initiateGmailOAuth: (credentials?: {
      clientId: string;
      clientSecret: string;
    }) => Promise<Result<{ accountEmail?: string; connectedAt?: Date }>>;
    checkGmailConnection: () => Promise<
      Result<{ isConnected: boolean; requiresAuth: boolean; accountEmail?: string; error?: string }>
    >;
    validateOpenAIKey: (apiKey: string) => Promise<
      Result<{
        apiKeyValid: boolean;
        modelAvailable?: boolean;
        responseTimeMs?: number;
        testedAt?: Date;
      }>
    >;
    checkOpenAIConnection: () => Promise<
      Result<{ isConnected: boolean; modelAvailable: boolean; error?: string }>
    >;
  };
}

// Implement the secure API bridge
const api: ElectronAPI = {
  email: {
    list: (options) => ipcRenderer.invoke('email:list', options),
    get: (emailId, options) => ipcRenderer.invoke('email:get', emailId, options),
    batchModify: (request) => ipcRenderer.invoke('email:batchModify', request),
    batchDelete: (request) => ipcRenderer.invoke('email:batchDelete', request),
    search: (query, options) => ipcRenderer.invoke('email:search', query, options),
    getFolders: () => ipcRenderer.invoke('email:getFolders'),
  },
  storage: {
    getUserRules: () => ipcRenderer.invoke('storage:getUserRules'),
    updateUserRules: (rules) => ipcRenderer.invoke('storage:updateUserRules', rules),
    getEmailMetadata: (emailId) => ipcRenderer.invoke('storage:getEmailMetadata', emailId),
    setEmailMetadata: (emailId, metadata) =>
      ipcRenderer.invoke('storage:setEmailMetadata', emailId, metadata),
    getConfig: () => ipcRenderer.invoke('storage:getConfig'),
    updateConfig: (config) => ipcRenderer.invoke('storage:updateConfig', config),
  },
  llm: {
    classify: (input) => ipcRenderer.invoke('llm:classify', input),
    healthCheck: () => ipcRenderer.invoke('llm:healthCheck'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    quit: () => ipcRenderer.invoke('app:quit'),
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    unmaximize: () => ipcRenderer.invoke('app:unmaximize'),
    isMaximized: () => ipcRenderer.invoke('app:isMaximized'),
  },
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  },
  oauth: {
    initiateGmailOAuth: (credentials?: { clientId: string; clientSecret: string }) =>
      ipcRenderer.invoke('gmail:initiate-oauth', credentials),
    checkGmailConnection: () => ipcRenderer.invoke('gmail:check-connection'),
    validateOpenAIKey: (apiKey: string) => ipcRenderer.invoke('openai:validate-key', apiKey),
    checkOpenAIConnection: () => ipcRenderer.invoke('openai:check-connection'),
  },
};

// Use context isolation to securely expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', api);

// Type declarations for renderer process
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
