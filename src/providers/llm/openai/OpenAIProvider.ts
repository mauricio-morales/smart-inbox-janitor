/**
 * OpenAI Provider Implementation for Smart Inbox Janitor
 * 
 * Implements the LLMProvider interface using OpenAI API for email classification.
 * Provides secure API key validation, connection testing, and email classification
 * capabilities following the Result pattern for consistent error management.
 * 
 * @module OpenAIProvider
 */

import OpenAI from 'openai';
import {
  type LLMProvider,
  type Result,
  type HealthStatus,
  type ClassifyInput,
  type ClassifyOutput,
  type ClassifyItem,
  type UsageStatistics,
  type CostEstimation,
  type GroupingInput,
  type GroupingEmailInput,
  type GroupOutput,
  type ContentValidationInput,
  type ContentValidationResult,
  type ExplanationInput,
  type ClassificationExplanation,
  type ConnectionTestResult,
  type CostEstimationInput,
  type OpenAIConfig,
  type EmailSummary,
  type EmailAction,
  createSuccessResult,
  createErrorResult,
  ConfigurationError,
  ValidationError,
  NetworkError,
  RateLimitError,
  QuotaExceededError,
  AuthenticationError
} from '@shared/types';
import { SecureStorageManager } from '../../../main/security/SecureStorageManager';

/**
 * OpenAI Provider Implementation
 * 
 * Provides complete OpenAI integration for email classification using GPT-4o-mini.
 * Implements all LLMProvider interface methods with comprehensive error handling,
 * API key validation, and cost optimization.
 */
export class OpenAIProvider implements LLMProvider<OpenAIConfig> {
  readonly name = 'openai-provider';
  readonly version = '1.0.0';

  private config: OpenAIConfig | null = null;
  private client: OpenAI | null = null;
  private storageManager: SecureStorageManager | null = null;
  private initialized = false;
  private readonly usageStats: UsageStatistics = {
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    lastReset: new Date(),
    requestCounts: {
      classification: 0,
      validation: 0,
      explanation: 0,
      grouping: 0
    }
  };

  /**
   * Initialize the OpenAI provider with configuration
   * 
   * @param config - OpenAI provider configuration
   * @returns Result indicating initialization success or failure
   */
  async initialize(config: OpenAIConfig): Promise<Result<void>> {
    try {
      // Validate configuration
      const validationResult = this.validateConfig(config);
      if (!validationResult.success) {
        return createErrorResult(validationResult.error);
      }

      this.config = config;

      // Create OpenAI client
      this.client = new OpenAI({
        apiKey: config.apiKey,
        timeout: 30000, // 30 second timeout
        maxRetries: 3
      });

      this.initialized = true;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown initialization error';
      return createErrorResult(
        new ConfigurationError(`OpenAI provider initialization failed: ${message}`, {
          provider: 'openai'
        })
      );
    }
  }

  /**
   * Check OpenAI provider health and API key validity
   * 
   * @returns Result containing health status
   */
  async healthCheck(): Promise<Result<HealthStatus>> {
    try {
      this.ensureInitialized();

      if (!this.client) {
        return createSuccessResult({
          healthy: false,
          message: 'OpenAI client not initialized',
          metrics: { initialized: 0 }
        });
      }

      // Test API access with models endpoint (lightweight)
      const testResult = await this.callWithErrorHandling(async () => {
        return await this.client!.models.list();
      });

      if (!testResult.success) {
        return createSuccessResult({
          healthy: false,
          message: `OpenAI API error: ${testResult.error.message}`,
          metrics: { apiError: 1 }
        });
      }

      return createSuccessResult({
        healthy: true,
        message: 'OpenAI connection healthy',
        lastSuccess: new Date(),
        metrics: {
          initialized: 1,
          totalRequests: this.usageStats.totalRequests,
          totalTokens: this.usageStats.totalTokens
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown health check error';
      return createSuccessResult({
        healthy: false,
        message: `Health check failed: ${message}`,
        metrics: { error: 1 }
      });
    }
  }

  /**
   * Gracefully shutdown the OpenAI provider
   * 
   * @returns Result indicating shutdown success or failure
   */
  async shutdown(): Promise<Result<void>> {
    try {
      this.config = null;
      this.client = null;
      this.storageManager = null;
      this.initialized = false;

      return createSuccessResult(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown shutdown error';
      return createErrorResult(
        new ConfigurationError(`OpenAI provider shutdown failed: ${message}`, {
          provider: 'openai'
        })
      );
    }
  }

  /**
   * Get current OpenAI provider configuration
   * 
   * @returns Readonly copy of configuration (with sanitized API key)
   */
  getConfig(): Readonly<OpenAIConfig> {
    if (!this.config) {
      return {
        apiKey: '',
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 1000
      } as const;
    }

    return {
      ...this.config,
      apiKey: `sk-...${this.config.apiKey.slice(-4)}`
    } as const;
  }

  /**
   * Initialize OpenAI provider (duplicate method for interface compatibility)
   * 
   * @returns Result indicating initialization success or failure
   */
  async init(): Promise<Result<void>> {
    if (!this.config) {
      return createErrorResult(
        new ConfigurationError('OpenAI provider not configured', {
          provider: 'openai',
          operation: 'init'
        })
      );
    }

    return await this.initialize(this.config);
  }

  /**
   * Test OpenAI API connection and key validity
   * 
   * @returns Result containing connection test results
   */
  async testConnection(): Promise<Result<ConnectionTestResult>> {
    try {
      this.ensureInitialized();

      if (!this.client) {
        return createErrorResult(
          new ConfigurationError('OpenAI client not initialized', {
            operation: 'testConnection'
          })
        );
      }

      const startTime = Date.now();

      // Test with models endpoint
      const modelsResult = await this.callWithErrorHandling(async () => {
        return await this.client!.models.list();
      });

      if (!modelsResult.success) {
        return createErrorResult(modelsResult.error);
      }

      const responseTime = Date.now() - startTime;
      const models = modelsResult.data.data;
      const hasGPT4oMini = models.some(model => model.id === 'gpt-4o-mini');

      const result: ConnectionTestResult = {
        connected: true,
        responseTimeMs: responseTime,
        apiKeyValid: true,
        modelAvailable: hasGPT4oMini,
        quotaRemaining: null, // OpenAI doesn't provide quota info in models endpoint
        testedAt: new Date()
      };

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown connection test error';
      return createErrorResult(
        new NetworkError(`Connection test failed: ${message}`, {
          operation: 'testConnection'
        })
      );
    }
  }

  /**
   * Validate OpenAI configuration and API key
   * 
   * @param config - Optional configuration to validate (uses current if not provided)
   * @returns Result indicating validation success or failure
   */
  async validateConfiguration(config?: OpenAIConfig): Promise<Result<boolean>> {
    try {
      const configToValidate = config ?? this.config;
      
      if (!configToValidate) {
        return createErrorResult(
          new ValidationError('No OpenAI configuration available', {
            operation: 'validateConfiguration'
          })
        );
      }

      // Validate configuration structure
      const structuralValidation = this.validateConfig(configToValidate);
      if (!structuralValidation.success) {
        return createErrorResult(structuralValidation.error);
      }

      // Test API key with temporary client
      const tempClient = new OpenAI({
        apiKey: configToValidate.apiKey,
        timeout: 10000, // Shorter timeout for validation
        maxRetries: 1
      });

      const testResult = await this.callWithErrorHandling(async () => {
        return await tempClient.models.list();
      });

      if (!testResult.success) {
        return createErrorResult(testResult.error);
      }

      return createSuccessResult(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown validation error';
      return createErrorResult(
        new ValidationError(`Configuration validation failed: ${message}`, {
          operation: 'validateConfiguration'
        })
      );
    }
  }

  /**
   * Classify emails using OpenAI GPT-4o-mini
   * 
   * @param input - Email classification input
   * @returns Result containing classification results
   */
  async classifyEmails(input: ClassifyInput): Promise<Result<ClassifyOutput>> {
    try {
      this.ensureInitialized();

      if (!input.emails.length) {
        return createSuccessResult({
          classifications: [],
          totalProcessed: 0,
          totalTokens: 0,
          estimatedCost: 0,
          modelUsed: this.config?.model ?? 'gpt-4o-mini',
          processedAt: new Date()
        });
      }

      const classifications: ClassifyItem[] = [];
      let totalTokens = 0;

      // Process emails in batches to manage token limits
      const batchSize = 5; // Conservative batch size for context management
      
      for (let i = 0; i < input.emails.length; i += batchSize) {
        const batch = input.emails.slice(i, i + batchSize);
        const batchResult = await this.classifyEmailBatch(batch, input);
        
        if (batchResult.success) {
          classifications.push(...batchResult.data.classifications);
          totalTokens += batchResult.data.tokens;
        } else {
          // Add failed classifications
          batch.forEach(email => {
            classifications.push({
              emailId: email.id,
              classification: 'unknown',
              confidence: 0,
              reasoning: `Classification failed: ${batchResult.error.message}`,
              suggestedAction: 'KEEP',
              riskLevel: 'low',
              signals: []
            });
          });
        }
      }

      const estimatedCost = this.calculateCost(totalTokens, this.config?.model ?? 'gpt-4o-mini');

      // Update usage statistics
      this.updateUsageStats('classification', 1, totalTokens, estimatedCost);

      const output: ClassifyOutput = {
        classifications,
        totalProcessed: input.emails.length,
        totalTokens,
        estimatedCost,
        modelUsed: this.config?.model ?? 'gpt-4o-mini',
        processedAt: new Date()
      };

      return createSuccessResult(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown classification error';
      return createErrorResult(
        new NetworkError(`Email classification failed: ${message}`, {
          operation: 'classifyEmails',
          emailCount: input.emails.length
        })
      );
    }
  }

  /**
   * Validate email content for safety
   * 
   * @param content - Content validation input
   * @returns Result containing validation results
   */
  async validateContent(content: ContentValidationInput): Promise<Result<ContentValidationResult>> {
    try {
      this.ensureInitialized();

      const prompt = this.buildContentValidationPrompt(content);
      
      const completionResult = await this.callWithErrorHandling(async () => {
        return await this.client!.chat.completions.create({
          model: this.config?.model ?? 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 200,
          response_format: { type: 'json_object' }
        });
      });

      if (!completionResult.success) {
        return createErrorResult(completionResult.error);
      }

      const response = completionResult.data.choices[0]?.message?.content;
      if (!response) {
        return createErrorResult(
          new ValidationError('No response from OpenAI', {
            operation: 'validateContent'
          })
        );
      }

      const parsedResponse = JSON.parse(response);
      
      const result: ContentValidationResult = {
        safe: parsedResponse.safe ?? true,
        riskLevel: parsedResponse.riskLevel ?? 'low',
        issues: parsedResponse.issues ?? [],
        recommendations: parsedResponse.recommendations ?? [],
        confidence: parsedResponse.confidence ?? 0.5
      };

      this.updateUsageStats('validation', 1, completionResult.data.usage?.total_tokens ?? 0, 
        this.calculateCost(completionResult.data.usage?.total_tokens ?? 0, this.config?.model ?? 'gpt-4o-mini'));

      return createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown content validation error';
      return createErrorResult(
        new NetworkError(`Content validation failed: ${message}`, {
          operation: 'validateContent'
        })
      );
    }
  }

  /**
   * Explain email classification reasoning
   * 
   * @param input - Explanation input
   * @returns Result containing classification explanation
   */
  async explainClassification(input: ExplanationInput): Promise<Result<ClassificationExplanation>> {
    try {
      this.ensureInitialized();

      const prompt = this.buildExplanationPrompt(input);
      
      const completionResult = await this.callWithErrorHandling(async () => {
        return await this.client!.chat.completions.create({
          model: this.config?.model ?? 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        });
      });

      if (!completionResult.success) {
        return createErrorResult(completionResult.error);
      }

      const response = completionResult.data.choices[0]?.message?.content;
      if (!response) {
        return createErrorResult(
          new ValidationError('No response from OpenAI', {
            operation: 'explainClassification'
          })
        );
      }

      const parsedResponse = JSON.parse(response);
      
      const explanation: ClassificationExplanation = {
        classification: input.classification,
        reasoning: parsedResponse.reasoning ?? 'No reasoning provided',
        keyFactors: parsedResponse.keyFactors ?? [],
        confidence: parsedResponse.confidence ?? 0.5,
        alternativeClassifications: parsedResponse.alternatives ?? [],
        recommendedAction: parsedResponse.recommendedAction ?? 'KEEP'
      };

      this.updateUsageStats('explanation', 1, completionResult.data.usage?.total_tokens ?? 0,
        this.calculateCost(completionResult.data.usage?.total_tokens ?? 0, this.config?.model ?? 'gpt-4o-mini'));

      return createSuccessResult(explanation);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown explanation error';
      return createErrorResult(
        new NetworkError(`Classification explanation failed: ${message}`, {
          operation: 'explainClassification'
        })
      );
    }
  }

  /**
   * Get current usage statistics
   * 
   * @returns Result containing usage statistics
   */
  async getUsageStats(): Promise<Result<UsageStatistics>> {
    try {
      return createSuccessResult({ ...this.usageStats });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ConfigurationError(`Failed to get usage stats: ${message}`, {
          operation: 'getUsageStats'
        })
      );
    }
  }

  /**
   * Get usage statistics (duplicate method for interface compatibility)
   * 
   * @returns Result containing usage statistics
   */
  async getUsageStatistics(): Promise<Result<UsageStatistics>> {
    return await this.getUsageStats();
  }

  /**
   * Suggest search queries for email discovery
   * 
   * @returns Result containing suggested search queries
   */
  async suggestSearchQueries(): Promise<Result<string[]>> {
    try {
      this.ensureInitialized();

      const queries = [
        'is:unread older_than:30d',
        'from:noreply has:attachment',
        'subject:newsletter unsubscribe',
        'from:promotions OR from:marketing',
        'subject:urgent OR subject:action required',
        'has:attachment larger:10M',
        'label:social older_than:7d',
        'from:facebook OR from:twitter OR from:linkedin',
        'subject:invoice OR subject:receipt',
        'is:unread from:security-noreply'
      ];

      return createSuccessResult(queries);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResult(
        new ConfigurationError(`Failed to suggest search queries: ${message}`, {
          operation: 'suggestSearchQueries'
        })
      );
    }
  }

  /**
   * Group emails for bulk operations
   * 
   * @param input - Grouping input
   * @returns Result containing grouping suggestions
   */
  async groupForBulk(input: GroupingInput): Promise<Result<GroupOutput>> {
    try {
      this.ensureInitialized();

      // Simple grouping by sender domain and subject patterns
      const groups = new Map<string, GroupingEmailInput[]>();
      
      input.emails.forEach(email => {
        const domain = this.extractDomain(email.sender);
        const key = `${domain}-${this.normalizeSubject(email.subject)}`;
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(email);
      });

      const groupSuggestions = Array.from(groups.entries())
        .filter(([_, emails]) => emails.length > 1)
        .map(([key, emails]) => ({
          id: key,
          name: `Group ${key}`,
          emailIds: emails.map(e => e.id),
          bulkKey: key,
          rationale: `Same domain: ${this.extractDomain(emails[0].sender)}, Similar subject pattern`,
          similarity: 0.7,
          suggestedAction: this.inferActionFromEmails(emails)
        }));

      const ungrouped = input.emails.filter(email => 
        !groupSuggestions.some(group => group.emailIds.includes(email.id))
      ).map(e => e.id);

      const output: GroupOutput = {
        groups: groupSuggestions,
        ungrouped,
        metadata: {
          totalEmails: input.emails.length,
          groupsCreated: groupSuggestions.length,
          algorithm: 'simple-domain-subject',
          processingTimeMs: 0
        }
      };

      this.updateUsageStats('grouping', 1, 0, 0); // No tokens used for simple grouping

      return createSuccessResult(output);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown grouping error';
      return createErrorResult(
        new NetworkError(`Email grouping failed: ${message}`, {
          operation: 'groupForBulk',
          emailCount: input.emails.length
        })
      );
    }
  }

  /**
   * Estimate cost for a given operation
   * 
   * @param operation - Cost estimation input
   * @returns Result containing cost estimation
   */
  async estimateCost(operation: CostEstimationInput): Promise<Result<CostEstimation>> {
    try {
      const tokenEstimate = this.estimateTokens(operation);
      const cost = this.calculateCost(tokenEstimate, this.config?.model ?? 'gpt-4o-mini');

      const estimation: CostEstimation = {
        estimatedCost: cost,
        breakdown: {
          promptCost: cost * 0.7,  // Approximate split
          completionCost: cost * 0.3,
          additionalFees: 0,
          totalCost: cost
        },
        confidence: 0.8
      };

      return createSuccessResult(estimation);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown cost estimation error';
      return createErrorResult(
        new ConfigurationError(`Cost estimation failed: ${message}`, {
          operation: 'estimateCost'
        })
      );
    }
  }

  /**
   * Set secure storage manager for configuration management
   * 
   * @param storageManager - Initialized secure storage manager
   */
  setStorageManager(storageManager: SecureStorageManager): void {
    this.storageManager = storageManager;
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('OpenAI provider not initialized');
    }
  }

  private validateConfig(config: OpenAIConfig): Result<void> {
    if (!config.apiKey) {
      return createErrorResult(
        new ValidationError('OpenAI API key is required', {
          field: 'apiKey'
        })
      );
    }

    if (!config.apiKey.startsWith('sk-')) {
      return createErrorResult(
        new ValidationError('OpenAI API key must start with "sk-"', {
          field: 'apiKey',
          format: 'sk-...'
        })
      );
    }

    if (config.apiKey.length < 20) {
      return createErrorResult(
        new ValidationError('OpenAI API key appears to be invalid (too short)', {
          field: 'apiKey',
          length: config.apiKey.length
        })
      );
    }

    return createSuccessResult(undefined);
  }

  private async callWithErrorHandling<T>(
    apiCall: () => Promise<T>
  ): Promise<Result<T>> {
    try {
      const result = await apiCall();
      return createSuccessResult(result);
    } catch (error: any) {
      // Handle specific OpenAI API errors
      if (error.status === 401) {
        return createErrorResult(
          new AuthenticationError('Invalid OpenAI API key', false, {
            operation: 'api-call',
            statusCode: error.status
          })
        );
      } else if (error.status === 429) {
        return createErrorResult(
          new RateLimitError(
            'OpenAI API rate limit exceeded',
            error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) * 1000 : 60000,
            { operation: 'api-call' }
          )
        );
      } else if (error.status === 402) {
        return createErrorResult(
          new QuotaExceededError(
            'billing',
            'OpenAI API quota exceeded',
            undefined,
            { operation: 'api-call' }
          )
        );
      } else if (error.status >= 500) {
        return createErrorResult(
          new NetworkError('OpenAI API server error', true, {
            operation: 'api-call',
            statusCode: error.status
          })
        );
      } else {
        const message = error.message || error.toString() || 'Unknown API error';
        return createErrorResult(
          new NetworkError(`OpenAI API error: ${message}`, false, {
            operation: 'api-call',
            statusCode: error.status
          })
        );
      }
    }
  }

  private async classifyEmailBatch(emails: EmailSummary[], input: ClassifyInput): Promise<Result<{ classifications: ClassifyItem[]; tokens: number }>> {
    const prompt = this.buildClassificationPrompt(emails, input);
    
    const completionResult = await this.callWithErrorHandling(async () => {
      return await this.client!.chat.completions.create({
        model: this.config?.model ?? 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });
    });

    if (!completionResult.success) {
      return createErrorResult(completionResult.error);
    }

    const response = completionResult.data.choices[0]?.message?.content;
    if (!response) {
      return createErrorResult(
        new ValidationError('No response from OpenAI', {
          operation: 'classifyEmailBatch'
        })
      );
    }

    try {
      const parsedResponse = JSON.parse(response);
      const classifications: ClassifyItem[] = emails.map((email, index) => {
        const classification = parsedResponse.classifications?.[index] || {};
        return {
          emailId: email.id,
          classification: classification.classification || 'unknown',
          confidence: classification.confidence || 0.5,
          reasoning: classification.reasoning || 'No reasoning provided',
          suggestedAction: classification.suggestedAction || 'KEEP',
          riskLevel: classification.riskLevel || 'low',
          signals: classification.signals || []
        };
      });

      return createSuccessResult({
        classifications,
        tokens: completionResult.data.usage?.total_tokens ?? 0
      });
    } catch (parseError) {
      return createErrorResult(
        new ValidationError('Failed to parse OpenAI response', {
          operation: 'classifyEmailBatch'
        })
      );
    }
  }

  private buildClassificationPrompt(emails: EmailSummary[], input: ClassifyInput): string {
    return `You are an expert email classifier. Classify the following emails into categories: keep, newsletter, promotion, spam, dangerous_phishing, or unknown.

For each email, provide:
- classification: one of the categories above
- confidence: 0.0 to 1.0
- reasoning: brief explanation
- suggestedAction: KEEP, UNSUBSCRIBE_AND_DELETE, DELETE_ONLY, or REPORT_DANGEROUS
- riskLevel: low, medium, high
- signals: array of detected signals

Context: ${input.userContext || 'General email classification'}

Emails to classify:
${emails.map((email, i) => `
Email ${i + 1}:
From: ${email.from}
Subject: ${email.subject}
Snippet: ${email.snippet}
Date: ${email.date.toISOString()}
`).join('\n')}

Return response as JSON with this structure:
{
  "classifications": [
    {
      "classification": "category",
      "confidence": 0.0,
      "reasoning": "explanation",
      "suggestedAction": "ACTION",
      "riskLevel": "level",
      "signals": ["signal1", "signal2"]
    }
  ]
}`;
  }

  private buildContentValidationPrompt(content: ContentValidationInput): string {
    return `Analyze this email content for safety and potential issues:

Subject: ${content.subject || 'N/A'}
Body: ${content.body?.substring(0, 1000) || 'N/A'}
Headers: ${JSON.stringify(content.headers || {})}

Check for:
- Phishing attempts
- Malicious links
- Suspicious attachments
- Social engineering
- Impersonation

Return JSON:
{
  "safe": boolean,
  "riskLevel": "low|medium|high", 
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"],
  "confidence": 0.0
}`;
  }

  private buildExplanationPrompt(input: ExplanationInput): string {
    return `Explain why this email was classified as "${input.classification}":

Email details:
From: ${input.emailData.from}
Subject: ${input.emailData.subject}
Snippet: ${input.emailData.snippet}

Current classification: ${input.classification}
Confidence: ${input.confidence}

Provide detailed explanation as JSON:
{
  "reasoning": "detailed explanation",
  "keyFactors": ["factor1", "factor2"],
  "confidence": 0.0,
  "alternatives": [{"classification": "alt", "probability": 0.0}],
  "recommendedAction": "ACTION"
}`;
  }

  private updateUsageStats(operation: string, requests: number, tokens: number, cost: number): void {
    this.usageStats.totalRequests += requests;
    this.usageStats.totalTokens += tokens;
    this.usageStats.totalCost += cost;
    
    if (operation in this.usageStats.requestCounts) {
      (this.usageStats.requestCounts as any)[operation] += requests;
    }
  }

  private calculateCost(tokens: number, model: string): number {
    // GPT-4o-mini pricing (as of 2024)
    const pricePerToken = model === 'gpt-4o-mini' ? 0.00015 / 1000 : 0.0001 / 1000;
    return tokens * pricePerToken;
  }

  private estimateTokens(operation: CostEstimationInput): number {
    const baseTokens = 100; // Base prompt tokens
    const perItemTokens = operation.operation === 'classify_emails' ? 150 : 50;
    return baseTokens + (perItemTokens * (operation.operationCount || 1));
  }

  private extractDomain(email: string): string {
    const match = email.match(/@([^>]+)/);
    return match ? match[1].toLowerCase() : 'unknown';
  }

  private normalizeSubject(subject: string): string {
    return subject
      .toLowerCase()
      .replace(/re:/g, '')
      .replace(/fw:/g, '')
      .replace(/\[.*?\]/g, '')
      .trim()
      .substring(0, 50);
  }

  private inferActionFromEmails(emails: GroupingEmailInput[]): EmailAction {
    const from = emails[0].sender.toLowerCase();
    
    if (from.includes('noreply') || from.includes('no-reply')) {
      return 'DELETE_ONLY';
    }
    
    if (from.includes('newsletter') || from.includes('marketing')) {
      return 'UNSUBSCRIBE_AND_DELETE';
    }
    
    return 'KEEP';
  }
}