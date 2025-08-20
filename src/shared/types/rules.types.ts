/**
 * Rules engine interfaces and user-defined rules for Smart Inbox Janitor
 * 
 * This module defines the RulesEngine interface for evaluating user-defined rules
 * and learning patterns. Includes comprehensive rule evaluation, pattern matching,
 * and adaptive learning capabilities.
 * 
 * @module RulesTypes
 */

import { BaseProvider, Result } from './base.types.js';
import { EmailMetadata, UserRules, UserRule, EmailClassification } from './storage.types.js';
import { EmailSummary } from './email.types.js';
import { ContactSignal } from './llm.types.js';

/**
 * Rules engine interface for evaluating user-defined rules and learning patterns
 * 
 * Provides intelligent rule evaluation, pattern recognition, and adaptive learning
 * to improve email classification accuracy over time based on user feedback.
 */
export interface RulesEngine extends BaseProvider {
  /**
   * Evaluate rules against an email to determine classification override
   * 
   * @param email - Email to evaluate
   * @param rules - Current user rules
   * @param context - Additional context for evaluation
   * @returns Result containing rule evaluation outcome
   */
  evaluateRules(
    email: RuleEvaluationEmail,
    rules: UserRules,
    context?: RuleEvaluationContext
  ): Promise<Result<RuleEvaluationResult>>;
  
  /**
   * Batch evaluate rules against multiple emails
   * 
   * @param emails - Emails to evaluate
   * @param rules - Current user rules
   * @param context - Additional context for evaluation
   * @returns Result containing batch evaluation results
   */
  batchEvaluateRules(
    emails: RuleEvaluationEmail[],
    rules: UserRules,
    context?: RuleEvaluationContext
  ): Promise<Result<BatchRuleEvaluationResult>>;
  
  /**
   * Suggest new rules based on user actions and patterns
   * 
   * @param input - User action history and patterns
   * @returns Result containing suggested rules
   */
  suggestRules(input: RuleSuggestionInput): Promise<Result<RuleSuggestion[]>>;
  
  /**
   * Validate rule syntax and logic
   * 
   * @param rule - Rule to validate
   * @returns Result containing validation assessment
   */
  validateRule(rule: UserRule): Promise<Result<RuleValidationResult>>;
  
  /**
   * Test rule against historical data to predict impact
   * 
   * @param rule - Rule to test
   * @param testData - Historical emails to test against
   * @returns Result containing rule impact analysis
   */
  testRule(rule: UserRule, testData: HistoricalEmail[]): Promise<Result<RuleTestResult>>;
  
  /**
   * Optimize existing rules for better performance and accuracy
   * 
   * @param rules - Current rules to optimize
   * @param feedback - User feedback on rule performance
   * @returns Result containing optimized rules
   */
  optimizeRules(
    rules: UserRules,
    feedback: RuleFeedback[]
  ): Promise<Result<RuleOptimizationResult>>;
  
  /**
   * Learn patterns from user actions to improve rule suggestions
   * 
   * @param learningData - User action history and outcomes
   * @returns Result containing learned patterns
   */
  learnPatterns(learningData: LearningData): Promise<Result<LearnedPatterns>>;
  
  /**
   * Get rule performance analytics and statistics
   * 
   * @param timeRange - Time period for analytics
   * @returns Result containing rule performance data
   */
  getRuleAnalytics(timeRange?: TimeRange): Promise<Result<RuleAnalytics>>;
  
  /**
   * Export rules in various formats
   * 
   * @param rules - Rules to export
   * @param format - Export format
   * @returns Result containing exported rules
   */
  exportRules(rules: UserRules, format: RuleExportFormat): Promise<Result<string>>;
  
  /**
   * Import rules from external format
   * 
   * @param data - Rule data to import
   * @param format - Data format
   * @returns Result containing imported rules
   */
  importRules(data: string, format: RuleExportFormat): Promise<Result<UserRules>>;
}

/**
 * Email data for rule evaluation
 */
export interface RuleEvaluationEmail {
  /** Email identifier */
  readonly id: string;
  
  /** Email summary information */
  readonly summary: EmailSummary;
  
  /** Email metadata */
  readonly metadata?: EmailMetadata;
  
  /** Contact relationship information */
  readonly contactSignal?: ContactSignal;
  
  /** Current AI classification */
  readonly aiClassification?: EmailClassification;
  
  /** AI confidence score */
  readonly aiConfidence?: number;
  
  /** Email headers for rule matching */
  readonly headers: Record<string, string>;
  
  /** Email content snippets for pattern matching */
  readonly contentSnippets?: ContentSnippets;
}

/**
 * Email content snippets for pattern matching
 */
export interface ContentSnippets {
  /** Subject line */
  readonly subject: string;
  
  /** Sender display name */
  readonly senderName?: string;
  
  /** Email body preview */
  readonly bodyPreview?: string;
  
  /** Extracted URLs */
  readonly urls?: string[];
  
  /** Extracted phone numbers */
  readonly phoneNumbers?: string[];
  
  /** Extracted email addresses */
  readonly emailAddresses?: string[];
}

/**
 * Context for rule evaluation
 */
export interface RuleEvaluationContext {
  /** Current user preferences */
  readonly userPreferences?: UserPreferences;
  
  /** Time of evaluation */
  readonly evaluationTime: Date;
  
  /** Email provider type */
  readonly emailProvider: string;
  
  /** User's typical email patterns */
  readonly emailPatterns?: EmailPatterns;
  
  /** Recent user actions for context */
  readonly recentActions?: RecentActionContext[];
}

/**
 * User preferences for rule evaluation
 */
export interface UserPreferences {
  /** Preferred strictness level */
  readonly strictnessLevel: 'permissive' | 'moderate' | 'strict';
  
  /** Whether to favor precision over recall */
  readonly favorPrecision: boolean;
  
  /** Confidence threshold for automatic actions */
  readonly autoActionThreshold: number;
  
  /** Categories to never auto-process */
  readonly protectedCategories: EmailClassification[];
}

/**
 * Email usage patterns for context
 */
export interface EmailPatterns {
  /** Average emails received per day */
  readonly avgEmailsPerDay: number;
  
  /** Most active hours */
  readonly activeHours: number[];
  
  /** Common sender domains */
  readonly commonDomains: string[];
  
  /** Typical response time in hours */
  readonly avgResponseTimeHours: number;
  
  /** Folder usage patterns */
  readonly folderUsage: Record<string, number>;
}

/**
 * Recent user action for context
 */
export interface RecentActionContext {
  /** Email that was acted upon */
  readonly emailId: string;
  
  /** Action taken */
  readonly action: string;
  
  /** When action was taken */
  readonly timestamp: Date;
  
  /** Email characteristics */
  readonly emailFeatures: EmailFeatures;
}

/**
 * Email features for pattern recognition
 */
export interface EmailFeatures {
  /** Sender domain */
  readonly senderDomain: string;
  
  /** Subject keywords */
  readonly subjectKeywords: string[];
  
  /** Content categories */
  readonly contentCategories: string[];
  
  /** Email size category */
  readonly sizeCategory: 'small' | 'medium' | 'large';
  
  /** Time of day received */
  readonly timeCategory: 'morning' | 'afternoon' | 'evening' | 'night';
}

/**
 * Result of rule evaluation
 */
export interface RuleEvaluationResult {
  /** Email identifier */
  readonly emailId: string;
  
  /** Whether any rules matched */
  readonly hasMatch: boolean;
  
  /** Matched rules */
  readonly matchedRules: MatchedRule[];
  
  /** Final classification recommendation */
  readonly recommendedClassification?: EmailClassification;
  
  /** Confidence in recommendation */
  readonly confidence: number;
  
  /** Whether to override AI classification */
  readonly overrideAI: boolean;
  
  /** Reasoning for recommendation */
  readonly reasoning: string[];
  
  /** Suggested actions */
  readonly suggestedActions: string[];
}

/**
 * Matched rule information
 */
export interface MatchedRule {
  /** Rule that matched */
  readonly rule: UserRule;
  
  /** Strength of match (0-1) */
  readonly matchStrength: number;
  
  /** Parts of email that triggered match */
  readonly matchedFeatures: string[];
  
  /** Rule application result */
  readonly application: RuleApplication;
}

/**
 * Rule application result
 */
export interface RuleApplication {
  /** Action to take */
  readonly action: RuleAction;
  
  /** Confidence in action */
  readonly confidence: number;
  
  /** Conditions that were met */
  readonly conditionsMet: string[];
  
  /** Additional context */
  readonly context?: Record<string, unknown>;
}

/**
 * Actions that rules can trigger
 */
export type RuleAction = 
  | 'force_keep'
  | 'force_delete'
  | 'force_spam'
  | 'boost_confidence'
  | 'reduce_confidence'
  | 'require_manual_review'
  | 'apply_label'
  | 'set_priority';

/**
 * Batch rule evaluation result
 */
export interface BatchRuleEvaluationResult {
  /** Individual evaluation results */
  readonly results: RuleEvaluationResult[];
  
  /** Batch processing statistics */
  readonly statistics: BatchEvaluationStatistics;
  
  /** Patterns detected across batch */
  readonly detectedPatterns: DetectedPattern[];
  
  /** Performance metrics */
  readonly performance: EvaluationPerformance;
}

/**
 * Batch evaluation statistics
 */
export interface BatchEvaluationStatistics {
  /** Total emails evaluated */
  readonly totalEmails: number;
  
  /** Emails with rule matches */
  readonly emailsWithMatches: number;
  
  /** Most frequently matched rules */
  readonly topMatchedRules: Array<{ ruleId: string; matchCount: number }>;
  
  /** Classification override rate */
  readonly overrideRate: number;
  
  /** Average confidence score */
  readonly avgConfidence: number;
}

/**
 * Pattern detected in batch evaluation
 */
export interface DetectedPattern {
  /** Pattern identifier */
  readonly id: string;
  
  /** Pattern description */
  readonly description: string;
  
  /** Pattern type */
  readonly type: PatternType;
  
  /** Number of emails matching pattern */
  readonly emailCount: number;
  
  /** Pattern confidence (0-1) */
  readonly confidence: number;
  
  /** Suggested rule based on pattern */
  readonly suggestedRule?: UserRule;
}

/**
 * Types of patterns that can be detected
 */
export type PatternType = 
  | 'sender_pattern'
  | 'subject_pattern'
  | 'content_pattern'
  | 'temporal_pattern'
  | 'behavioral_pattern'
  | 'classification_pattern';

/**
 * Evaluation performance metrics
 */
export interface EvaluationPerformance {
  /** Processing time in milliseconds */
  readonly processingTimeMs: number;
  
  /** Average time per email */
  readonly avgTimePerEmail: number;
  
  /** Memory usage statistics */
  readonly memoryUsage?: MemoryUsage;
  
  /** Cache hit rate */
  readonly cacheHitRate?: number;
}

/**
 * Memory usage statistics
 */
export interface MemoryUsage {
  /** Peak memory usage in bytes */
  readonly peakUsageBytes: number;
  
  /** Average memory usage in bytes */
  readonly avgUsageBytes: number;
  
  /** Memory allocated for rules */
  readonly rulesMemoryBytes: number;
}

/**
 * Input for rule suggestion generation
 */
export interface RuleSuggestionInput {
  /** User action history */
  readonly actionHistory: UserActionHistory[];
  
  /** Current rules */
  readonly currentRules: UserRules;
  
  /** Email patterns observed */
  readonly emailPatterns: ObservedEmailPattern[];
  
  /** Classification accuracy feedback */
  readonly accuracyFeedback: AccuracyFeedback[];
  
  /** Time period for analysis */
  readonly analysisPeriod: TimeRange;
}

/**
 * User action history item
 */
export interface UserActionHistory {
  /** Email that was acted upon */
  readonly emailId: string;
  
  /** Email characteristics */
  readonly emailFeatures: EmailFeatures;
  
  /** Action taken by user */
  readonly userAction: string;
  
  /** AI recommendation at time of action */
  readonly aiRecommendation?: EmailClassification;
  
  /** Whether user agreed with AI */
  readonly agreedWithAI: boolean;
  
  /** Timestamp of action */
  readonly timestamp: Date;
  
  /** Context of action */
  readonly context?: ActionContext;
}

/**
 * Context when user action was taken
 */
export interface ActionContext {
  /** Session duration when action was taken */
  readonly sessionDurationMinutes: number;
  
  /** Number of emails processed in session */
  readonly emailsProcessedInSession: number;
  
  /** User's mood/state indicators */
  readonly userStateIndicators?: string[];
  
  /** Device/platform used */
  readonly platform?: string;
}

/**
 * Observed email pattern
 */
export interface ObservedEmailPattern {
  /** Pattern identifier */
  readonly id: string;
  
  /** Pattern characteristics */
  readonly characteristics: PatternCharacteristics;
  
  /** Frequency of occurrence */
  readonly frequency: number;
  
  /** User's typical response to this pattern */
  readonly typicalResponse: string;
  
  /** Pattern stability over time */
  readonly stability: number; // 0-1
}

/**
 * Pattern characteristics
 */
export interface PatternCharacteristics {
  /** Sender-related features */
  readonly senderFeatures?: SenderFeatures;
  
  /** Subject-related features */
  readonly subjectFeatures?: SubjectFeatures;
  
  /** Content-related features */
  readonly contentFeatures?: ContentFeatures;
  
  /** Temporal features */
  readonly temporalFeatures?: TemporalFeatures;
}

/**
 * Sender-related pattern features
 */
export interface SenderFeatures {
  /** Domain patterns */
  readonly domainPatterns: string[];
  
  /** Name patterns */
  readonly namePatterns: string[];
  
  /** Email format patterns */
  readonly emailFormatPatterns: string[];
  
  /** Reputation indicators */
  readonly reputationIndicators: string[];
}

/**
 * Subject-related pattern features
 */
export interface SubjectFeatures {
  /** Keyword patterns */
  readonly keywordPatterns: string[];
  
  /** Length patterns */
  readonly lengthPatterns: NumberRange[];
  
  /** Format patterns (uppercase, special chars, etc.) */
  readonly formatPatterns: string[];
  
  /** Emoji patterns */
  readonly emojiPatterns: string[];
}

/**
 * Content-related pattern features
 */
export interface ContentFeatures {
  /** Language patterns */
  readonly languagePatterns: string[];
  
  /** Topic categories */
  readonly topicCategories: string[];
  
  /** Link patterns */
  readonly linkPatterns: string[];
  
  /** Attachment patterns */
  readonly attachmentPatterns: string[];
}

/**
 * Temporal pattern features
 */
export interface TemporalFeatures {
  /** Time of day patterns */
  readonly timeOfDayPatterns: TimeRange[];
  
  /** Day of week patterns */
  readonly dayOfWeekPatterns: number[];
  
  /** Frequency patterns */
  readonly frequencyPatterns: FrequencyPattern[];
  
  /** Seasonal patterns */
  readonly seasonalPatterns: string[];
}

/**
 * Number range for pattern matching
 */
export interface NumberRange {
  /** Minimum value */
  readonly min: number;
  
  /** Maximum value */
  readonly max: number;
}

/**
 * Frequency pattern
 */
export interface FrequencyPattern {
  /** Pattern type */
  readonly type: 'daily' | 'weekly' | 'monthly' | 'irregular';
  
  /** Expected frequency */
  readonly expectedFrequency: number;
  
  /** Tolerance for variation */
  readonly tolerance: number;
}

/**
 * Accuracy feedback for rule improvement
 */
export interface AccuracyFeedback {
  /** Email that was classified */
  readonly emailId: string;
  
  /** AI classification */
  readonly aiClassification: EmailClassification;
  
  /** AI confidence */
  readonly aiConfidence: number;
  
  /** User's actual action/preference */
  readonly userPreference: EmailClassification;
  
  /** Whether classification was correct */
  readonly correct: boolean;
  
  /** Specific feedback type */
  readonly feedbackType: FeedbackType;
  
  /** Timestamp of feedback */
  readonly timestamp: Date;
}

/**
 * Types of user feedback
 */
export type FeedbackType = 
  | 'explicit_correction'
  | 'implicit_action'
  | 'explicit_approval'
  | 'explicit_rejection';

/**
 * Time range specification
 */
export interface TimeRange {
  /** Start date */
  readonly start: Date;
  
  /** End date */
  readonly end: Date;
}

/**
 * Rule suggestion result
 */
export interface RuleSuggestion {
  /** Suggested rule */
  readonly rule: UserRule;
  
  /** Confidence in suggestion */
  readonly confidence: number;
  
  /** Rationale for suggestion */
  readonly rationale: string;
  
  /** Expected impact */
  readonly expectedImpact: RuleImpact;
  
  /** Supporting evidence */
  readonly evidence: SuggestionEvidence[];
  
  /** Priority of this suggestion */
  readonly priority: 'low' | 'medium' | 'high';
}

/**
 * Expected impact of a rule
 */
export interface RuleImpact {
  /** Estimated emails affected per month */
  readonly emailsAffectedPerMonth: number;
  
  /** Estimated accuracy improvement */
  readonly accuracyImprovement: number;
  
  /** Estimated time savings in minutes per month */
  readonly timeSavingsMinutes: number;
  
  /** Risk of false positives */
  readonly falsePositiveRisk: number;
  
  /** Risk of false negatives */
  readonly falseNegativeRisk: number;
}

/**
 * Evidence supporting a rule suggestion
 */
export interface SuggestionEvidence {
  /** Type of evidence */
  readonly type: EvidenceType;
  
  /** Evidence description */
  readonly description: string;
  
  /** Strength of evidence (0-1) */
  readonly strength: number;
  
  /** Number of supporting instances */
  readonly instanceCount: number;
  
  /** Reference data */
  readonly referenceData?: unknown;
}

/**
 * Types of evidence for rule suggestions
 */
export type EvidenceType = 
  | 'user_action_pattern'
  | 'misclassification_pattern'
  | 'explicit_feedback'
  | 'temporal_pattern'
  | 'similar_user_behavior'
  | 'content_analysis';

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  /** Whether rule is valid */
  readonly valid: boolean;
  
  /** Validation errors */
  readonly errors: ValidationError[];
  
  /** Validation warnings */
  readonly warnings: ValidationWarning[];
  
  /** Complexity score */
  readonly complexityScore: number;
  
  /** Performance impact assessment */
  readonly performanceImpact: PerformanceImpact;
}

/**
 * Rule validation error
 */
export interface ValidationError {
  /** Error code */
  readonly code: string;
  
  /** Error message */
  readonly message: string;
  
  /** Severity level */
  readonly severity: 'error' | 'warning' | 'info';
  
  /** Suggested fix */
  readonly suggestedFix?: string;
}

/**
 * Rule validation warning
 */
export interface ValidationWarning {
  /** Warning type */
  readonly type: string;
  
  /** Warning message */
  readonly message: string;
  
  /** Potential consequences */
  readonly consequences: string[];
  
  /** Recommended actions */
  readonly recommendations: string[];
}

/**
 * Performance impact assessment
 */
export interface PerformanceImpact {
  /** Estimated processing time increase */
  readonly processingTimeIncrease: number;
  
  /** Memory usage increase in bytes */
  readonly memoryIncrease: number;
  
  /** Complexity rating */
  readonly complexityRating: 'low' | 'medium' | 'high';
  
  /** Scalability concerns */
  readonly scalabilityConcerns: string[];
}

/**
 * Historical email for rule testing
 */
export interface HistoricalEmail {
  /** Email identifier */
  readonly id: string;
  
  /** Email features */
  readonly features: EmailFeatures;
  
  /** Actual user action taken */
  readonly actualAction: string;
  
  /** AI classification at the time */
  readonly aiClassification?: EmailClassification;
  
  /** When email was processed */
  readonly processedAt: Date;
}

/**
 * Rule test result
 */
export interface RuleTestResult {
  /** Rule that was tested */
  readonly ruleId: string;
  
  /** Test statistics */
  readonly statistics: RuleTestStatistics;
  
  /** Accuracy metrics */
  readonly accuracy: AccuracyMetrics;
  
  /** Performance metrics */
  readonly performance: TestPerformanceMetrics;
  
  /** Detailed results for sample emails */
  readonly sampleResults: RuleTestSampleResult[];
}

/**
 * Rule test statistics
 */
export interface RuleTestStatistics {
  /** Total emails tested */
  readonly totalEmailsTested: number;
  
  /** Emails that matched the rule */
  readonly emailsMatched: number;
  
  /** Correct applications */
  readonly correctApplications: number;
  
  /** Incorrect applications */
  readonly incorrectApplications: number;
  
  /** Match rate */
  readonly matchRate: number;
  
  /** Accuracy rate */
  readonly accuracyRate: number;
}

/**
 * Accuracy metrics for rule testing
 */
export interface AccuracyMetrics {
  /** Precision (true positives / (true positives + false positives)) */
  readonly precision: number;
  
  /** Recall (true positives / (true positives + false negatives)) */
  readonly recall: number;
  
  /** F1 score */
  readonly f1Score: number;
  
  /** Specificity (true negatives / (true negatives + false positives)) */
  readonly specificity: number;
  
  /** Confusion matrix */
  readonly confusionMatrix: ConfusionMatrix;
}

/**
 * Confusion matrix for classification accuracy
 */
export interface ConfusionMatrix {
  /** True positives */
  readonly truePositives: number;
  
  /** False positives */
  readonly falsePositives: number;
  
  /** True negatives */
  readonly trueNegatives: number;
  
  /** False negatives */
  readonly falseNegatives: number;
}

/**
 * Performance metrics for rule testing
 */
export interface TestPerformanceMetrics {
  /** Total test execution time */
  readonly totalTimeMs: number;
  
  /** Average time per email */
  readonly avgTimePerEmailMs: number;
  
  /** Memory usage during test */
  readonly memoryUsageBytes: number;
  
  /** Cache utilization */
  readonly cacheUtilization: number;
}

/**
 * Sample result from rule testing
 */
export interface RuleTestSampleResult {
  /** Email identifier */
  readonly emailId: string;
  
  /** Whether rule matched */
  readonly matched: boolean;
  
  /** Rule recommendation */
  readonly ruleRecommendation?: string;
  
  /** Actual user action */
  readonly actualAction: string;
  
  /** Whether rule was correct */
  readonly correct: boolean;
  
  /** Confidence score */
  readonly confidence: number;
}

/**
 * Rule feedback for optimization
 */
export interface RuleFeedback {
  /** Rule identifier */
  readonly ruleId: string;
  
  /** Feedback type */
  readonly feedbackType: RuleFeedbackType;
  
  /** User satisfaction score (1-5) */
  readonly satisfactionScore: number;
  
  /** Specific issues encountered */
  readonly issues: string[];
  
  /** Suggested improvements */
  readonly improvements: string[];
  
  /** Usage frequency */
  readonly usageFrequency: UsageFrequency;
  
  /** Performance rating */
  readonly performanceRating: PerformanceRating;
}

/**
 * Types of rule feedback
 */
export type RuleFeedbackType = 
  | 'accuracy_feedback'
  | 'performance_feedback'
  | 'usability_feedback'
  | 'bug_report'
  | 'feature_request';

/**
 * Usage frequency rating
 */
export type UsageFrequency = 'never' | 'rarely' | 'sometimes' | 'often' | 'always';

/**
 * Performance rating
 */
export type PerformanceRating = 'very_slow' | 'slow' | 'acceptable' | 'fast' | 'very_fast';

/**
 * Rule optimization result
 */
export interface RuleOptimizationResult {
  /** Original rules */
  readonly originalRules: UserRules;
  
  /** Optimized rules */
  readonly optimizedRules: UserRules;
  
  /** Optimization changes made */
  readonly changes: OptimizationChange[];
  
  /** Expected improvement metrics */
  readonly expectedImprovements: OptimizationImprovements;
  
  /** Optimization confidence */
  readonly confidence: number;
}

/**
 * Optimization change description
 */
export interface OptimizationChange {
  /** Type of change */
  readonly type: OptimizationType;
  
  /** Rule affected */
  readonly ruleId?: string;
  
  /** Description of change */
  readonly description: string;
  
  /** Rationale for change */
  readonly rationale: string;
  
  /** Expected impact */
  readonly expectedImpact: string;
}

/**
 * Types of optimizations
 */
export type OptimizationType = 
  | 'rule_merge'
  | 'rule_split'
  | 'rule_removal'
  | 'rule_modification'
  | 'rule_reordering'
  | 'rule_addition';

/**
 * Expected improvements from optimization
 */
export interface OptimizationImprovements {
  /** Accuracy improvement percentage */
  readonly accuracyImprovement: number;
  
  /** Performance improvement percentage */
  readonly performanceImprovement: number;
  
  /** Maintainability improvement */
  readonly maintainabilityImprovement: number;
  
  /** Reduced rule conflicts */
  readonly conflictReduction: number;
}

/**
 * Learning data for pattern recognition
 */
export interface LearningData {
  /** User action patterns */
  readonly actionPatterns: UserActionHistory[];
  
  /** Classification feedback */
  readonly classificationFeedback: AccuracyFeedback[];
  
  /** Email characteristics */
  readonly emailCharacteristics: EmailCharacteristicData[];
  
  /** Temporal patterns */
  readonly temporalPatterns: TemporalPatternData[];
  
  /** Context information */
  readonly contextData: ContextData[];
}

/**
 * Email characteristic data for learning
 */
export interface EmailCharacteristicData {
  /** Email identifier */
  readonly emailId: string;
  
  /** Extracted features */
  readonly features: ExtractedFeatures;
  
  /** User's final action */
  readonly userAction: string;
  
  /** Processing context */
  readonly processingContext: ProcessingContext;
}

/**
 * Extracted features from emails
 */
export interface ExtractedFeatures {
  /** Text-based features */
  readonly textFeatures: TextFeatures;
  
  /** Metadata features */
  readonly metadataFeatures: MetadataFeatures;
  
  /** Behavioral features */
  readonly behavioralFeatures: BehavioralFeatures;
  
  /** Technical features */
  readonly technicalFeatures: TechnicalFeatures;
}

/**
 * Text-based features
 */
export interface TextFeatures {
  /** Word count */
  readonly wordCount: number;
  
  /** Sentiment score */
  readonly sentimentScore: number;
  
  /** Language detected */
  readonly language: string;
  
  /** Key phrases */
  readonly keyPhrases: string[];
  
  /** Named entities */
  readonly namedEntities: NamedEntity[];
}

/**
 * Named entity in text
 */
export interface NamedEntity {
  /** Entity text */
  readonly text: string;
  
  /** Entity type */
  readonly type: string;
  
  /** Confidence score */
  readonly confidence: number;
}

/**
 * Metadata features
 */
export interface MetadataFeatures {
  /** Time of day received */
  readonly timeOfDay: number;
  
  /** Day of week */
  readonly dayOfWeek: number;
  
  /** Email size category */
  readonly sizeCategory: string;
  
  /** Has attachments */
  readonly hasAttachments: boolean;
  
  /** Thread length */
  readonly threadLength: number;
}

/**
 * Behavioral features
 */
export interface BehavioralFeatures {
  /** Response time if applicable */
  readonly responseTimeHours?: number;
  
  /** Email opening order in session */
  readonly openingOrder: number;
  
  /** Time spent reading */
  readonly readingTimeSeconds?: number;
  
  /** Actions taken */
  readonly actionsTaken: string[];
}

/**
 * Technical features
 */
export interface TechnicalFeatures {
  /** Authentication status */
  readonly authenticationStatus: string;
  
  /** Spam score */
  readonly spamScore?: number;
  
  /** Has tracking pixels */
  readonly hasTrackingPixels: boolean;
  
  /** Number of external links */
  readonly externalLinkCount: number;
  
  /** Suspicious patterns detected */
  readonly suspiciousPatterns: string[];
}

/**
 * Processing context when email was handled
 */
export interface ProcessingContext {
  /** Session identifier */
  readonly sessionId: string;
  
  /** Batch identifier */
  readonly batchId?: string;
  
  /** Processing mode */
  readonly processingMode: 'manual' | 'semi_automatic' | 'automatic';
  
  /** User interface state */
  readonly uiState?: UIState;
}

/**
 * User interface state during processing
 */
export interface UIState {
  /** Current view mode */
  readonly viewMode: string;
  
  /** Filters applied */
  readonly filtersApplied: string[];
  
  /** Sort order */
  readonly sortOrder: string;
  
  /** Screen resolution */
  readonly screenResolution: string;
}

/**
 * Temporal pattern data for learning
 */
export interface TemporalPatternData {
  /** Pattern identifier */
  readonly patternId: string;
  
  /** Time series data */
  readonly timeSeriesData: TimeSeriesPoint[];
  
  /** Pattern type */
  readonly patternType: string;
  
  /** Seasonality information */
  readonly seasonality?: SeasonalityInfo;
}

/**
 * Time series data point
 */
export interface TimeSeriesPoint {
  /** Timestamp */
  readonly timestamp: Date;
  
  /** Value */
  readonly value: number;
  
  /** Associated metadata */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Seasonality information
 */
export interface SeasonalityInfo {
  /** Seasonal period in days */
  readonly periodDays: number;
  
  /** Seasonal strength (0-1) */
  readonly strength: number;
  
  /** Peak periods */
  readonly peakPeriods: PeakPeriod[];
}

/**
 * Peak period in seasonal pattern
 */
export interface PeakPeriod {
  /** Start day of period */
  readonly startDay: number;
  
  /** End day of period */
  readonly endDay: number;
  
  /** Peak intensity */
  readonly intensity: number;
}

/**
 * Context data for learning
 */
export interface ContextData {
  /** Context type */
  readonly type: string;
  
  /** Context values */
  readonly values: Record<string, unknown>;
  
  /** Context timestamp */
  readonly timestamp: Date;
  
  /** Related emails */
  readonly relatedEmails: string[];
}

/**
 * Learned patterns from user behavior
 */
export interface LearnedPatterns {
  /** Discovered patterns */
  readonly patterns: DiscoveredPattern[];
  
  /** Pattern confidence scores */
  readonly confidenceScores: Record<string, number>;
  
  /** Learning statistics */
  readonly learningStats: LearningStatistics;
  
  /** Recommended actions */
  readonly recommendedActions: PatternRecommendation[];
}

/**
 * Discovered pattern from learning
 */
export interface DiscoveredPattern {
  /** Pattern identifier */
  readonly id: string;
  
  /** Pattern description */
  readonly description: string;
  
  /** Pattern type */
  readonly type: PatternType;
  
  /** Pattern features */
  readonly features: PatternFeatureSet;
  
  /** Pattern frequency */
  readonly frequency: number;
  
  /** Pattern stability */
  readonly stability: number;
}

/**
 * Set of features that define a pattern
 */
export interface PatternFeatureSet {
  /** Required features */
  readonly required: PatternFeature[];
  
  /** Optional features */
  readonly optional: PatternFeature[];
  
  /** Excluded features */
  readonly excluded: PatternFeature[];
}

/**
 * Individual pattern feature
 */
export interface PatternFeature {
  /** Feature name */
  readonly name: string;
  
  /** Feature type */
  readonly type: 'categorical' | 'numerical' | 'text' | 'boolean';
  
  /** Feature value or range */
  readonly value: unknown;
  
  /** Feature importance weight */
  readonly weight: number;
}

/**
 * Learning statistics
 */
export interface LearningStatistics {
  /** Total patterns discovered */
  readonly totalPatterns: number;
  
  /** High-confidence patterns */
  readonly highConfidencePatterns: number;
  
  /** Learning accuracy */
  readonly learningAccuracy: number;
  
  /** Processing time */
  readonly processingTimeMs: number;
  
  /** Data points analyzed */
  readonly dataPointsAnalyzed: number;
}

/**
 * Pattern-based recommendation
 */
export interface PatternRecommendation {
  /** Recommendation type */
  readonly type: RecommendationType;
  
  /** Recommendation description */
  readonly description: string;
  
  /** Supporting pattern */
  readonly supportingPattern: DiscoveredPattern;
  
  /** Expected benefit */
  readonly expectedBenefit: string;
  
  /** Implementation difficulty */
  readonly implementationDifficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Types of recommendations
 */
export type RecommendationType = 
  | 'create_rule'
  | 'modify_rule'
  | 'remove_rule'
  | 'adjust_thresholds'
  | 'change_workflow'
  | 'update_preferences';

/**
 * Rule analytics data
 */
export interface RuleAnalytics {
  /** Overall rule performance */
  readonly overallPerformance: OverallRulePerformance;
  
  /** Individual rule analytics */
  readonly ruleAnalytics: IndividualRuleAnalytics[];
  
  /** Trend analysis */
  readonly trends: RuleTrend[];
  
  /** Usage patterns */
  readonly usagePatterns: RuleUsagePattern[];
  
  /** Performance over time */
  readonly performanceOverTime: PerformanceTimeSeries[];
}

/**
 * Overall rule performance metrics
 */
export interface OverallRulePerformance {
  /** Total rules active */
  readonly totalActiveRules: number;
  
  /** Average rule accuracy */
  readonly avgAccuracy: number;
  
  /** Total rule applications */
  readonly totalApplications: number;
  
  /** Overall classification improvement */
  readonly classificationImprovement: number;
  
  /** Time savings per day */
  readonly timeSavingsPerDay: number;
}

/**
 * Analytics for individual rules
 */
export interface IndividualRuleAnalytics {
  /** Rule identifier */
  readonly ruleId: string;
  
  /** Rule performance metrics */
  readonly performance: RulePerformanceMetrics;
  
  /** Usage statistics */
  readonly usage: RuleUsageStatistics;
  
  /** Accuracy over time */
  readonly accuracyTrend: AccuracyTrendPoint[];
  
  /** Recent applications */
  readonly recentApplications: RuleApplicationRecord[];
}

/**
 * Rule performance metrics
 */
export interface RulePerformanceMetrics {
  /** Accuracy percentage */
  readonly accuracy: number;
  
  /** Precision */
  readonly precision: number;
  
  /** Recall */
  readonly recall: number;
  
  /** F1 score */
  readonly f1Score: number;
  
  /** Processing time average */
  readonly avgProcessingTimeMs: number;
}

/**
 * Rule usage statistics
 */
export interface RuleUsageStatistics {
  /** Total applications */
  readonly totalApplications: number;
  
  /** Applications this week */
  readonly applicationsThisWeek: number;
  
  /** Applications this month */
  readonly applicationsThisMonth: number;
  
  /** Last used timestamp */
  readonly lastUsed: Date;
  
  /** Usage frequency category */
  readonly frequencyCategory: UsageFrequency;
}

/**
 * Accuracy trend point
 */
export interface AccuracyTrendPoint {
  /** Date of measurement */
  readonly date: Date;
  
  /** Accuracy value */
  readonly accuracy: number;
  
  /** Number of applications */
  readonly applicationCount: number;
  
  /** Confidence interval */
  readonly confidenceInterval: [number, number];
}

/**
 * Rule application record
 */
export interface RuleApplicationRecord {
  /** Application timestamp */
  readonly timestamp: Date;
  
  /** Email identifier */
  readonly emailId: string;
  
  /** Rule recommendation */
  readonly recommendation: string;
  
  /** User action taken */
  readonly userAction: string;
  
  /** Whether rule was correct */
  readonly correct: boolean;
  
  /** Processing time */
  readonly processingTimeMs: number;
}

/**
 * Rule trend analysis
 */
export interface RuleTrend {
  /** Trend type */
  readonly type: TrendType;
  
  /** Trend description */
  readonly description: string;
  
  /** Trend direction */
  readonly direction: 'increasing' | 'decreasing' | 'stable';
  
  /** Trend strength (0-1) */
  readonly strength: number;
  
  /** Statistical significance */
  readonly significance: number;
  
  /** Affected rules */
  readonly affectedRules: string[];
}

/**
 * Types of trends in rule analytics
 */
export type TrendType = 
  | 'accuracy_trend'
  | 'usage_trend'
  | 'performance_trend'
  | 'complexity_trend'
  | 'maintenance_trend';

/**
 * Rule usage pattern
 */
export interface RuleUsagePattern {
  /** Pattern name */
  readonly name: string;
  
  /** Pattern type */
  readonly type: UsagePatternType;
  
  /** Temporal characteristics */
  readonly temporalCharacteristics: TemporalCharacteristics;
  
  /** Associated rules */
  readonly associatedRules: string[];
  
  /** Pattern strength */
  readonly strength: number;
}

/**
 * Types of usage patterns
 */
export type UsagePatternType = 
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'seasonal'
  | 'event_driven'
  | 'random';

/**
 * Temporal characteristics of usage patterns
 */
export interface TemporalCharacteristics {
  /** Peak usage times */
  readonly peakTimes: TimeRange[];
  
  /** Low usage times */
  readonly lowTimes: TimeRange[];
  
  /** Cyclical patterns */
  readonly cyclicalPatterns: CyclicalPattern[];
  
  /** Anomaly periods */
  readonly anomalyPeriods: AnomalyPeriod[];
}

/**
 * Cyclical pattern in usage
 */
export interface CyclicalPattern {
  /** Cycle length in hours */
  readonly cycleLengthHours: number;
  
  /** Cycle amplitude */
  readonly amplitude: number;
  
  /** Cycle phase offset */
  readonly phaseOffset: number;
  
  /** Cycle reliability */
  readonly reliability: number;
}

/**
 * Anomaly period in usage patterns
 */
export interface AnomalyPeriod {
  /** Anomaly start time */
  readonly start: Date;
  
  /** Anomaly end time */
  readonly end: Date;
  
  /** Anomaly type */
  readonly type: 'spike' | 'drop' | 'shift';
  
  /** Anomaly severity */
  readonly severity: number;
  
  /** Possible causes */
  readonly possibleCauses: string[];
}

/**
 * Performance time series data
 */
export interface PerformanceTimeSeries {
  /** Metric name */
  readonly metric: string;
  
  /** Time series data points */
  readonly dataPoints: PerformanceDataPoint[];
  
  /** Trend analysis */
  readonly trend: TrendAnalysis;
  
  /** Statistical summary */
  readonly summary: StatisticalSummary;
}

/**
 * Performance data point
 */
export interface PerformanceDataPoint {
  /** Timestamp */
  readonly timestamp: Date;
  
  /** Metric value */
  readonly value: number;
  
  /** Associated context */
  readonly context?: Record<string, unknown>;
}

/**
 * Trend analysis for time series
 */
export interface TrendAnalysis {
  /** Trend slope */
  readonly slope: number;
  
  /** R-squared value */
  readonly rSquared: number;
  
  /** Trend significance */
  readonly significance: number;
  
  /** Forecast values */
  readonly forecast: ForecastPoint[];
}

/**
 * Forecast point for trend analysis
 */
export interface ForecastPoint {
  /** Forecast timestamp */
  readonly timestamp: Date;
  
  /** Forecasted value */
  readonly value: number;
  
  /** Confidence interval */
  readonly confidenceInterval: [number, number];
}

/**
 * Statistical summary
 */
export interface StatisticalSummary {
  /** Mean value */
  readonly mean: number;
  
  /** Median value */
  readonly median: number;
  
  /** Standard deviation */
  readonly standardDeviation: number;
  
  /** Minimum value */
  readonly min: number;
  
  /** Maximum value */
  readonly max: number;
  
  /** Percentile values */
  readonly percentiles: Record<string, number>;
}

/**
 * Rule export formats
 */
export type RuleExportFormat = 'json' | 'yaml' | 'xml' | 'csv' | 'custom';