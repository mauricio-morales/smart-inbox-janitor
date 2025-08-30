/**
 * LLM provider interfaces and classification types for Smart Inbox Janitor
 *
 * This module defines the LLMProvider interface for AI-powered email classification
 * with support for OpenAI GPT-4o-mini (primary), Claude, and local LLM providers.
 * Includes comprehensive types for classification input/output and cost tracking.
 *
 * @module LLMTypes
 */

import { Result, HealthStatus } from './base.types.js';
import { OpenAIConfig, ClaudeConfig, LocalLLMConfig } from './config.types.js';
import { EmailClassification, UserRules } from './storage.types.js';

/**
 * LLM provider interface for AI-powered email classification
 *
 * Provides a unified interface for different LLM backends with support for
 * email classification, search query generation, and bulk grouping operations.
 *
 * @template TConfig - LLM provider configuration type
 */
export interface LLMProvider<TConfig = LLMProviderConfig> {
  readonly name: string;
  readonly version: string;
  initialize(config: TConfig): Promise<Result<void>>;
  shutdown(): Promise<Result<void>>;
  healthCheck(): Promise<Result<HealthStatus>>;
  getConfig(): Readonly<TConfig>;
  isInitialized(): boolean;
  /**
   * Initialize LLM provider with authentication and model configuration
   *
   * @param auth - Authentication configuration
   * @returns Result indicating initialization success or failure
   */
  init(auth: LLMAuth): Promise<Result<void>>;

  /**
   * Classify a batch of emails using AI
   *
   * @param input - Email classification input data
   * @returns Result containing classification results
   */
  classifyEmails(input: ClassifyInput): Promise<Result<ClassifyOutput>>;

  /**
   * Generate search query suggestions for email discovery
   *
   * @param context - Search context and user preferences
   * @returns Result containing suggested search queries
   */
  suggestSearchQueries(context: QueryContext): Promise<Result<string[]>>;

  /**
   * Group emails for bulk operations based on similarity
   *
   * @param input - Emails to group for bulk processing
   * @returns Result containing grouping suggestions
   */
  groupForBulk(input: GroupingInput): Promise<Result<GroupOutput>>;

  /**
   * Validate email content for safety and policy compliance
   *
   * @param content - Email content to validate
   * @returns Result containing validation assessment
   */
  validateContent(content: ContentValidationInput): Promise<Result<ContentValidationResult>>;

  /**
   * Generate explanations for classification decisions
   *
   * @param input - Classification to explain
   * @returns Result containing human-readable explanation
   */
  explainClassification(input: ExplanationInput): Promise<Result<ClassificationExplanation>>;

  /**
   * Get current usage statistics and cost information
   *
   * @returns Result containing usage and cost data
   */
  getUsageStats(): Promise<Result<UsageStatistics>>;

  /**
   * Estimate cost for a given operation
   *
   * @param operation - Operation to estimate cost for
   * @returns Result containing cost estimation
   */
  estimateCost(operation: CostEstimationInput): Promise<Result<CostEstimation>>;

  /**
   * Test connectivity and model availability
   *
   * @returns Result containing connection test results
   */
  testConnection(): Promise<Result<ConnectionTestResult>>;
}

/**
 * LLM provider configuration union type
 */
export type LLMProviderConfig = OpenAIConfig | ClaudeConfig | LocalLLMConfig;

/**
 * LLM authentication configuration
 */
export type LLMAuth =
  | { readonly kind: 'api_key'; readonly key: string }
  | { readonly kind: 'oauth'; readonly accessToken: string; readonly refreshToken?: string }
  | { readonly kind: 'local'; readonly endpoint: string };

/**
 * Input for email classification operations
 */
export interface ClassifyInput {
  /** Emails to classify */
  readonly emails: ClassificationEmailInput[];

  /** Current user rules for context */
  readonly userRulesSnapshot: UserRules;

  /** Classification configuration */
  readonly config?: ClassificationConfig;

  /** Batch identifier for tracking */
  readonly batchId?: string;
}

/**
 * Email data for classification
 */
export interface ClassificationEmailInput {
  /** Unique email identifier */
  readonly id: string;

  /** Email headers */
  readonly headers: Record<string, string>;

  /** Plain text email body */
  readonly bodyText?: string;

  /** HTML email body (sanitized) */
  readonly bodyHtml?: string;

  /** Provider-specific email signals */
  readonly providerSignals?: EmailProviderSignals;

  /** Contact relationship information */
  readonly contactSignal?: ContactSignal;

  /** Email metadata for context */
  readonly metadata?: EmailMetadata;
}

/**
 * Provider-specific email authentication and delivery signals
 */
export interface EmailProviderSignals {
  /** Whether email has List-Unsubscribe header */
  readonly hasListUnsubscribe?: boolean;

  /** SPF authentication result */
  readonly spf?: string;

  /** DKIM authentication result */
  readonly dkim?: string;

  /** DMARC authentication result */
  readonly dmarc?: string;

  /** Spam score from provider */
  readonly spamScore?: number;

  /** Whether email passed authentication checks */
  readonly authenticated?: boolean;
}

/**
 * Contact relationship signal
 */
export interface ContactSignal {
  /** Whether sender is known to user */
  readonly known: boolean;

  /** Strength of relationship */
  readonly strength: 'none' | 'weak' | 'strong';

  /** Number of previous interactions */
  readonly interactionCount?: number;

  /** Last interaction timestamp */
  readonly lastInteraction?: Date;
}

/**
 * Email metadata for classification context
 */
export interface EmailMetadata {
  /** Email folder/label */
  readonly folder: string;

  /** Email importance flag */
  readonly important: boolean;

  /** Email starred/flagged status */
  readonly starred: boolean;

  /** Email read status */
  readonly read: boolean;

  /** Email age in days */
  readonly ageDays: number;

  /** Email size in bytes */
  readonly sizeBytes: number;
}

/**
 * Configuration for classification operations
 */
export interface ClassificationConfig {
  /** Temperature setting for model (0-1) */
  readonly temperature?: number;

  /** Maximum tokens for response */
  readonly maxTokens?: number;

  /** Whether to include reasoning in output */
  readonly includeReasons?: boolean;

  /** Confidence threshold for uncertain classifications */
  readonly uncertaintyThreshold?: number;

  /** Custom classification prompt additions */
  readonly customPrompt?: string;
}

/**
 * Output from email classification operations
 */
export interface ClassifyOutput {
  /** Classification results for each email */
  readonly items: ClassifyItem[];

  /** Suggested rule updates based on patterns */
  readonly rulesSuggestions?: RuleSuggestion[];

  /** Batch processing metadata */
  readonly batchMetadata?: BatchMetadata;

  /** Usage information for this operation */
  readonly usage?: OperationUsage;
}

/**
 * Classification result for a single email
 */
export interface ClassifyItem {
  /** Email identifier */
  readonly emailId: string;

  /** Classified category */
  readonly classification: EmailClassification;

  /** Human-readable likelihood assessment */
  readonly likelihood: LikelihoodLevel;

  /** Numeric confidence score (0-1) */
  readonly confidence: number;

  /** Reasoning for classification decision */
  readonly reasons: string[];

  /** Bulk processing group key */
  readonly bulkKey: string;

  /** Unsubscribe method if available */
  readonly unsubscribeMethod?: UnsubscribeMethod;

  /** Suggested action for this email */
  readonly suggestedAction?: EmailAction;

  /** Risk assessment for potentially dangerous emails */
  readonly riskAssessment?: RiskAssessment;
}

/**
 * Likelihood levels for human-readable confidence
 */
export type LikelihoodLevel = 'very likely' | 'likely' | 'unsure';

/**
 * Unsubscribe method information
 */
export interface UnsubscribeMethod {
  /** Method type */
  readonly type: 'http_link' | 'mailto' | 'none';

  /** Unsubscribe URL or email address */
  readonly value?: string;

  /** Whether method appears legitimate */
  readonly trusted: boolean;

  /** Additional method options */
  readonly alternatives?: Array<{ type: string; value: string }>;
}

/**
 * Suggested actions for emails
 */
export type EmailAction =
  | 'KEEP'
  | 'UNSUBSCRIBE_AND_DELETE'
  | 'DELETE_ONLY'
  | 'REPORT_DANGEROUS'
  | 'MANUAL_REVIEW';

/**
 * Risk assessment for potentially dangerous emails
 */
export interface RiskAssessment {
  /** Overall risk level */
  readonly level: RiskLevel;

  /** Specific risk indicators found */
  readonly indicators: string[];

  /** Confidence in risk assessment (0-1) */
  readonly confidence: number;

  /** Recommended immediate actions */
  readonly recommendations: string[];
}

/**
 * Risk levels for email security assessment
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Rule suggestion from LLM analysis
 */
export interface RuleSuggestion {
  /** Type of rule to create */
  readonly type: string;

  /** Rule value or pattern */
  readonly value: string;

  /** Rationale for suggestion */
  readonly rationale?: string;

  /** Confidence in suggestion (0-1) */
  readonly confidence: number;

  /** Number of emails this rule would affect */
  readonly impactCount?: number;
}

/**
 * Batch processing metadata
 */
export interface BatchMetadata {
  /** Batch identifier */
  readonly batchId: string;

  /** Processing timestamp */
  readonly processedAt: Date;

  /** Processing time in milliseconds */
  readonly processingTimeMs: number;

  /** Model version used */
  readonly modelVersion: string;

  /** Batch size */
  readonly batchSize: number;
}

/**
 * Operation usage information
 */
export interface OperationUsage {
  /** Tokens used for prompt */
  readonly promptTokens: number;

  /** Tokens used for completion */
  readonly completionTokens: number;

  /** Total tokens used */
  readonly totalTokens: number;

  /** Estimated cost in USD */
  readonly estimatedCost: number;
}

/**
 * Context for search query generation
 */
export interface QueryContext {
  /** User's email provider type */
  readonly emailProvider: string;

  /** User's typical email patterns */
  readonly emailPatterns?: EmailPatterns;

  /** Current user rules */
  readonly userRules?: UserRules;

  /** Search objectives */
  readonly objectives: SearchObjective[];

  /** Time range for search */
  readonly timeRange?: TimeRange;
}

/**
 * User's email usage patterns for context
 */
export interface EmailPatterns {
  /** Average emails per day */
  readonly avgEmailsPerDay: number;

  /** Common sender domains */
  readonly commonDomains: string[];

  /** Typical folder usage */
  readonly folderUsage: Record<string, number>;

  /** Peak activity times */
  readonly peakHours: number[];
}

/**
 * Search objectives for query generation
 */
export type SearchObjective =
  | 'find_newsletters'
  | 'find_promotions'
  | 'find_spam'
  | 'find_large_emails'
  | 'find_old_emails'
  | 'find_unread_emails'
  | 'custom';

/**
 * Time range specification
 */
export interface TimeRange {
  /** Start date */
  readonly start?: Date;

  /** End date */
  readonly end?: Date;

  /** Relative time specification */
  readonly relative?: RelativeTime;
}

/**
 * Relative time specification
 */
export interface RelativeTime {
  /** Time unit */
  readonly unit: 'days' | 'weeks' | 'months' | 'years';

  /** Number of units */
  readonly amount: number;

  /** Direction (past or future) */
  readonly direction: 'past' | 'future';
}

/**
 * Input for bulk grouping operations
 */
export interface GroupingInput {
  /** Emails to group */
  readonly emails: GroupingEmailInput[];

  /** Grouping criteria */
  readonly criteria: GroupingCriteria;

  /** Maximum number of groups */
  readonly maxGroups?: number;
}

/**
 * Email data for grouping operations
 */
export interface GroupingEmailInput {
  /** Email identifier */
  readonly id: string;

  /** Email subject */
  readonly subject: string;

  /** Sender information */
  readonly sender: string;

  /** Email content preview */
  readonly snippet: string;

  /** Email headers (relevant ones) */
  readonly headers: Record<string, string>;

  /** Classification if available */
  readonly classification?: EmailClassification;
}

/**
 * Criteria for grouping emails
 */
export interface GroupingCriteria {
  /** Primary grouping factor */
  readonly primary: GroupingFactor;

  /** Secondary grouping factors */
  readonly secondary?: GroupingFactor[];

  /** Minimum group size */
  readonly minGroupSize?: number;

  /** Similarity threshold (0-1) */
  readonly similarityThreshold?: number;
}

/**
 * Factors for grouping emails
 */
export type GroupingFactor =
  | 'sender'
  | 'subject_pattern'
  | 'content_similarity'
  | 'list_id'
  | 'classification'
  | 'temporal'
  | 'custom';

/**
 * Output from bulk grouping operations
 */
export interface GroupOutput {
  /** Identified email groups */
  readonly groups: EmailGroup[];

  /** Emails that couldn't be grouped */
  readonly ungrouped: string[];

  /** Grouping metadata */
  readonly metadata: GroupingMetadata;
}

/**
 * Email group from bulk operations
 */
export interface EmailGroup {
  /** Group identifier */
  readonly id: string;

  /** Group name/description */
  readonly name: string;

  /** Email IDs in this group */
  readonly emailIds: string[];

  /** Bulk processing key */
  readonly bulkKey: string;

  /** Grouping rationale */
  readonly rationale: string;

  /** Group similarity score */
  readonly similarity: number;

  /** Suggested action for group */
  readonly suggestedAction: EmailAction;
}

/**
 * Grouping operation metadata
 */
export interface GroupingMetadata {
  /** Total emails processed */
  readonly totalEmails: number;

  /** Number of groups created */
  readonly groupsCreated: number;

  /** Grouping algorithm used */
  readonly algorithm: string;

  /** Processing time in milliseconds */
  readonly processingTimeMs: number;
}

/**
 * Input for content validation
 */
export interface ContentValidationInput {
  /** Email content to validate */
  readonly content: string;

  /** Content type */
  readonly contentType: 'text' | 'html';

  /** Validation checks to perform */
  readonly checks: ValidationCheck[];

  /** Context for validation */
  readonly context?: ValidationContext;
}

/**
 * Content validation checks
 */
export type ValidationCheck =
  | 'phishing'
  | 'malware'
  | 'spam'
  | 'adult_content'
  | 'violence'
  | 'hate_speech'
  | 'privacy_leak'
  | 'policy_violation';

/**
 * Context for content validation
 */
export interface ValidationContext {
  /** Sender information */
  readonly sender?: string;

  /** Email domain */
  readonly domain?: string;

  /** User's safety preferences */
  readonly safetyLevel?: SafetyLevel;

  /** Industry/organization context */
  readonly organizationContext?: string;
}

/**
 * Safety level preferences
 */
export type SafetyLevel = 'strict' | 'moderate' | 'permissive';

/**
 * Result from content validation
 */
export interface ContentValidationResult {
  /** Overall safety assessment */
  readonly safe: boolean;

  /** Detected issues */
  readonly issues: ContentIssue[];

  /** Safety score (0-1, higher is safer) */
  readonly safetyScore: number;

  /** Recommended actions */
  readonly recommendations: string[];
}

/**
 * Content safety issue
 */
export interface ContentIssue {
  /** Type of issue detected */
  readonly type: ValidationCheck;

  /** Severity level */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';

  /** Description of the issue */
  readonly description: string;

  /** Confidence in detection (0-1) */
  readonly confidence: number;

  /** Location of issue in content */
  readonly location?: string;
}

/**
 * Input for classification explanation
 */
export interface ExplanationInput {
  /** Email that was classified */
  readonly email: ClassificationEmailInput;

  /** Classification result to explain */
  readonly classification: ClassifyItem;

  /** User rules used in classification */
  readonly userRules: UserRules;

  /** Level of detail for explanation */
  readonly detailLevel: ExplanationDetailLevel;
}

/**
 * Detail level for explanations
 */
export type ExplanationDetailLevel = 'brief' | 'detailed' | 'technical';

/**
 * Classification explanation result
 */
export interface ClassificationExplanation {
  /** Main explanation summary */
  readonly summary: string;

  /** Detailed reasoning steps */
  readonly reasoning: ReasoningStep[];

  /** Factors that influenced decision */
  readonly influencingFactors: InfluencingFactor[];

  /** Alternative classifications considered */
  readonly alternatives?: AlternativeClassification[];
}

/**
 * Reasoning step in classification explanation
 */
export interface ReasoningStep {
  /** Step number */
  readonly step: number;

  /** Description of this reasoning step */
  readonly description: string;

  /** Evidence examined in this step */
  readonly evidence: string[];

  /** Conclusion drawn from this step */
  readonly conclusion: string;
}

/**
 * Factor that influenced classification decision
 */
export interface InfluencingFactor {
  /** Factor type */
  readonly type: 'header' | 'content' | 'sender' | 'rules' | 'authentication' | 'patterns';

  /** Factor description */
  readonly description: string;

  /** Impact weight (0-1) */
  readonly weight: number;

  /** Whether factor supported or opposed classification */
  readonly influence: 'supporting' | 'opposing' | 'neutral';
}

/**
 * Alternative classification that was considered
 */
export interface AlternativeClassification {
  /** Alternative classification */
  readonly classification: EmailClassification;

  /** Confidence score for alternative */
  readonly confidence: number;

  /** Why this alternative was rejected */
  readonly rejectionReason: string;
}

/**
 * Usage statistics for LLM provider
 */
export interface UsageStatistics {
  /** Current billing period */
  readonly billingPeriod: BillingPeriod;

  /** Token usage statistics */
  readonly tokenUsage: TokenUsage;

  /** Cost statistics */
  readonly costs: CostStatistics;

  /** Request statistics */
  readonly requests: RequestStatistics;

  /** Rate limit information */
  readonly rateLimits: RateLimitInfo;
}

/**
 * Billing period information
 */
export interface BillingPeriod {
  /** Period start date */
  readonly start: Date;

  /** Period end date */
  readonly end: Date;

  /** Days remaining in period */
  readonly daysRemaining: number;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Total prompt tokens used */
  readonly promptTokens: number;

  /** Total completion tokens used */
  readonly completionTokens: number;

  /** Total tokens used */
  readonly totalTokens: number;

  /** Daily usage breakdown */
  readonly dailyUsage: Array<{ date: Date; tokens: number }>;
}

/**
 * Cost statistics
 */
export interface CostStatistics {
  /** Total cost in USD */
  readonly totalCost: number;

  /** Daily cost breakdown */
  readonly dailyCosts: Array<{ date: Date; cost: number }>;

  /** Average cost per request */
  readonly avgCostPerRequest: number;

  /** Projected monthly cost */
  readonly projectedMonthlyCost: number;
}

/**
 * Request statistics
 */
export interface RequestStatistics {
  /** Total requests made */
  readonly totalRequests: number;

  /** Successful requests */
  readonly successfulRequests: number;

  /** Failed requests */
  readonly failedRequests: number;

  /** Average response time in milliseconds */
  readonly avgResponseTimeMs: number;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Requests per minute limit */
  readonly requestsPerMinute: number;

  /** Requests per day limit */
  readonly requestsPerDay: number;

  /** Current requests this minute */
  readonly currentMinuteRequests: number;

  /** Current requests today */
  readonly currentDayRequests: number;

  /** Time until rate limit reset */
  readonly resetTime: Date;
}

/**
 * Input for cost estimation
 */
export interface CostEstimationInput {
  /** Operation type */
  readonly operation: LLMOperation;

  /** Estimated input size */
  readonly inputSize: number;

  /** Expected output size */
  readonly outputSize?: number;

  /** Number of operations */
  readonly operationCount?: number;
}

/**
 * LLM operation types for cost estimation
 */
export type LLMOperation =
  | 'classify_emails'
  | 'generate_queries'
  | 'group_emails'
  | 'validate_content'
  | 'explain_classification';

/**
 * Cost estimation result
 */
export interface CostEstimation {
  /** Estimated cost in USD */
  readonly estimatedCost: number;

  /** Cost breakdown by component */
  readonly breakdown: CostBreakdown;

  /** Confidence in estimation (0-1) */
  readonly confidence: number;

  /** Alternative pricing scenarios */
  readonly scenarios?: CostScenario[];
}

/**
 * Cost breakdown by component
 */
export interface CostBreakdown {
  /** Prompt token cost */
  readonly promptCost: number;

  /** Completion token cost */
  readonly completionCost: number;

  /** Additional fees */
  readonly additionalFees: number;

  /** Total estimated cost */
  readonly totalCost: number;
}

/**
 * Alternative cost scenarios
 */
export interface CostScenario {
  /** Scenario name */
  readonly name: string;

  /** Scenario description */
  readonly description: string;

  /** Estimated cost for scenario */
  readonly cost: number;

  /** Probability of scenario (0-1) */
  readonly probability: number;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  /** Whether connection test passed */
  readonly connected: boolean;

  /** Response time in milliseconds */
  readonly responseTimeMs: number;

  /** Model availability */
  readonly modelAvailable: boolean;

  /** API version information */
  readonly apiVersion?: string;

  /** Available models */
  readonly availableModels?: string[];

  /** Test error if connection failed */
  readonly error?: string;
}
