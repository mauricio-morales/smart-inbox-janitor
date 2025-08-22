import {
  type EmailProvider,
  type Result,
  type HealthStatus,
  type ListEmailsResult,
  type EmailFull,
  type BatchModifyRequest,
  type BatchDeleteRequest,
  type BatchOperationResult,
  type SearchResult,
  type EmailFolder,
  type ConnectionInfo,
  type AccountInfo,
  type GmailProviderConfig,
  createErrorResult,
  ConfigurationError 
} from '@shared/types'

/**
 * Gmail Provider Stub Implementation
 * 
 * This is a placeholder implementation that returns "not implemented" errors
 * for all operations. It serves as a foundation for the real Gmail provider
 * implementation while allowing the application scaffold to compile and run.
 */
export class GmailProviderStub implements EmailProvider<GmailProviderConfig> {
  readonly name = 'gmail-stub'
  readonly version = '0.1.0'

  initialize(): Promise<Result<void>> {
    // GmailProvider.initialize called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'initialize'
      })
    ))
  }

  healthCheck(): Promise<Result<HealthStatus>> {
    // GmailProvider.healthCheck called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'healthCheck'
      })
    ))
  }

  shutdown(): Promise<Result<void>> {
    // GmailProvider.shutdown called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'shutdown'
      })
    ))
  }

  getConfig(): Readonly<GmailProviderConfig> {
    return {
      auth: {
        clientId: '',
        clientSecret: '',
        redirectUri: '',
        scopes: []
      }
    } as const
  }

  connect(): Promise<Result<ConnectionInfo>> {
    // GmailProvider.connect called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'connect'
      })
    ))
  }

  disconnect(): Promise<Result<void>> {
    // GmailProvider.disconnect called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'disconnect'
      })
    ))
  }

  list(): Promise<Result<ListEmailsResult>> {
    // GmailProvider.list called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'list'
      })
    ))
  }

  get(emailId: string): Promise<Result<EmailFull>> {
    // GmailProvider.get called with emailId - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'get',
        emailId
      })
    ))
  }

  batchModify(request: BatchModifyRequest): Promise<Result<BatchOperationResult>> {
    // GmailProvider.batchModify called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'batchModify',
        emailCount: request.emailIds.length
      })
    ))
  }

  delete(emailId: string): Promise<Result<void>> {
    // GmailProvider.delete called with emailId - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'delete',
        emailId
      })
    ))
  }

  search(query: string): Promise<Result<SearchResult>> {
    // GmailProvider.search called with query - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'search',
        query
      })
    ))
  }

  getFolders(): Promise<Result<EmailFolder[]>> {
    // GmailProvider.getFolders called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'getFolders'
      })
    ))
  }

  reportSpam(emailIds: string[]): Promise<Result<BatchOperationResult>> {
    // GmailProvider.reportSpam called with emails - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'reportSpam',
        emailCount: emailIds.length
      })
    ))
  }

  reportPhishing(emailIds: string[]): Promise<Result<BatchOperationResult>> {
    // GmailProvider.reportPhishing called with emails - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'reportPhishing',
        emailCount: emailIds.length
      })
    ))
  }

  batchDelete(request: BatchDeleteRequest): Promise<Result<BatchOperationResult>> {
    // GmailProvider.batchDelete called with emails - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'batchDelete',
        emailCount: request.emailIds.length
      })
    ))
  }

  getAccountInfo(): Promise<Result<AccountInfo>> {
    // GmailProvider.getAccountInfo called - stub implementation
    return Promise.resolve(createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'getAccountInfo'
      })
    ))
  }
}