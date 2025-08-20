import type {
  EmailProvider,
  Result,
  HealthStatus,
  ListOptions,
  GetEmailOptions,
  ListEmailsResult,
  EmailFull,
  BatchModifyRequest,
  BatchDeleteRequest,
  BatchOperationResult,
  SearchOptions,
  SearchResult,
  EmailFolder,
  ConnectionOptions,
  ConnectionInfo
} from '@shared/types'
import { 
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
export class GmailProviderStub implements EmailProvider {
  readonly name = 'gmail-stub'
  readonly version = '0.1.0'

  async initialize(_config: any): Promise<Result<void>> {
    console.warn('GmailProvider.initialize called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'initialize'
      })
    )
  }

  async healthCheck(): Promise<Result<HealthStatus>> {
    console.warn('GmailProvider.healthCheck called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'healthCheck'
      })
    )
  }

  async shutdown(): Promise<Result<void>> {
    console.warn('GmailProvider.shutdown called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'shutdown'
      })
    )
  }

  getConfig(): Readonly<any> {
    return {}
  }

  async connect(_options?: ConnectionOptions): Promise<Result<ConnectionInfo>> {
    console.warn('GmailProvider.connect called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'connect'
      })
    )
  }

  async disconnect(): Promise<Result<void>> {
    console.warn('GmailProvider.disconnect called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'disconnect'
      })
    )
  }

  async list(_options?: ListOptions): Promise<Result<ListEmailsResult>> {
    console.warn('GmailProvider.list called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'list'
      })
    )
  }

  async get(emailId: string, _options?: GetEmailOptions): Promise<Result<EmailFull>> {
    console.warn(`GmailProvider.get called with emailId: ${emailId} - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'get',
        emailId
      })
    )
  }

  async batchModify(_request: BatchModifyRequest): Promise<Result<BatchOperationResult>> {
    console.warn(`GmailProvider.batchModify called - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'batchModify',
        emailCount: _request.emailIds.length
      })
    )
  }

  async delete(emailId: string): Promise<Result<void>> {
    console.warn(`GmailProvider.delete called with emailId: ${emailId} - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'delete',
        emailId
      })
    )
  }

  async search(query: string, _options?: SearchOptions): Promise<Result<SearchResult>> {
    console.warn(`GmailProvider.search called with query: ${query} - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'search',
        query
      })
    )
  }

  async getFolders(): Promise<Result<EmailFolder[]>> {
    console.warn('GmailProvider.getFolders called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'getFolders'
      })
    )
  }

  async reportSpam(emailIds: string[]): Promise<Result<BatchOperationResult>> {
    console.warn(`GmailProvider.reportSpam called with ${emailIds.length} emails - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'reportSpam',
        emailCount: emailIds.length
      })
    )
  }

  async reportPhishing(emailIds: string[]): Promise<Result<BatchOperationResult>> {
    console.warn(`GmailProvider.reportPhishing called with ${emailIds.length} emails - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'reportPhishing',
        emailCount: emailIds.length
      })
    )
  }

  async batchDelete(request: BatchDeleteRequest): Promise<Result<BatchOperationResult>> {
    console.warn(`GmailProvider.batchDelete called with ${request.emailIds.length} emails - stub implementation`)
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'batchDelete',
        emailCount: request.emailIds.length
      })
    )
  }

  async getAccountInfo(): Promise<Result<any>> {
    console.warn('GmailProvider.getAccountInfo called - stub implementation')
    return createErrorResult(
      new ConfigurationError('Gmail provider not implemented yet', {
        provider: 'gmail',
        method: 'getAccountInfo'
      })
    )
  }
}