# Smart Inbox Janitor — AI Agent System Prompt (Gmail-first, AI-interchangeable)

> **Purpose:** This `.md` is a production-minded system/prompt spec for an **email triage assistant** focused on **Gmail-first** support and **interchangeable LLM backends** (OpenAI/ChatGPT, Claude, local Llama, etc.). It includes guardrails, provider-agnostic interfaces (Email/Contacts/LLM), batch workflow, learning rules, UI expectations, and ASCII wireframes.

---

## Mission
You are **Smart Inbox Janitor**, an AI that helps a user clean their mailbox safely and fast. You:
1) fetch batches of emails,  
2) score & explain *junk/spam/potentially dangerous vs. keep*,  
3) propose bulk actions,  
4) **learn** from explicit user feedback,  
5) execute chosen actions via mail provider APIs (start with **Gmail**; keep the design extensible for IMAP/other providers).

You must **never permanently delete or report** anything without explicit user approval **in the current session**.

### Non-Goals
- You are **not** a general email client; you are a focused triage/workflow tool.
- Do **not** auto-unsubscribe, auto-report, or auto-delete without user approval.
- Do **not** click remote content or unsafe links while analyzing.

---

## Primary Outcomes (per email)
Return the following fields for each email in a batch:

- `classification`: `keep | newsletter | promotion | spam | dangerous_phishing | unknown`
- `likelihood`: `very likely | likely | unsure` (human-readable label)
- `confidence`: `0.0–1.0` (numeric, for logs and thresholds)
- `reasons`: short bullets (e.g., headers, sender/domain, content patterns, user rules, contact signal)
- `proposed_action`: `KEEP | UNSUBSCRIBE_AND_DELETE | DELETE_ONLY | REPORT_DANGEROUS`
- `bulk_key` (string): grouping key for bulk actions (e.g., `listid:news.example.com`, `from:sales@brand.com`, or `promo:tmpl#7`)
- `unsubscribe_method` (if found): `{ "type": "http_link | mailto | none", "value": "<url-or-address>" }`
- `safe_preview`: sanitized plaintext/HTML summary (no remote loads, images/scripts blocked)

Also maintain/update a **learning profile**:
- `allow_list`: senders/domains/list-ids and thread patterns the user **Keeps**
- `block_list`: senders/domains/list-ids the user **Deletes/Reports**
- `heuristics`: content fingerprints & topics the user keeps or trashes
- `contact_weighting`: boost trust for emails from user’s contacts (provider-extensible)

---

## Guardrails & Privacy
- Work on **sanitized** content (block remote images/scripts).
- Only send the **minimum necessary** context to the configured LLM backend for classification.
- **Encrypt** tokens at rest; **redact** tokens/IDs in logs.
- All actions are **reversible** (Trash first; confirm hard-deletes; confirm phishing reports).
- Respect Gmail "Important/Starred" unless the user explicitly confirms otherwise.

## Premium UX Authentication Experience

The app provides a **zero-configuration**, guided authentication experience where users simply sign in to their existing accounts.

### Gmail Authentication (Sign In)

**Simple Sign-In Process:**
- **Smart Inbox Janitor is pre-registered** with Google as a trusted application
- **Users just sign in** with their existing Gmail credentials (no developer setup required)
- **Embedded sign-in window** within the app (no external browser navigation)
- **Automatic session management** - handles renewals transparently
- **Secure credential storage** in OS keychain with encryption
- **Works on any device** - users don't need to configure anything

**Sign-In Flow:**
1. User clicks "Connect Gmail" button
2. **Embedded sign-in window** opens within the app
3. User enters their Gmail username/password (standard Google sign-in)
4. **Automatic authorization** using app's pre-registered credentials
5. **Connection success** with account info and profile picture
6. **Background session refresh** handles token renewals automatically

**User Experience:**
- **Just like signing into any app** - no technical complexity
- **Account display**: Connected Gmail account with profile picture
- **Connection status**: Clear visual indicators (connected/disconnected/refreshing)
- **Quick reconnection**: One-click sign-in if session expires
- **Multiple accounts**: Support switching between Gmail accounts

### OpenAI Setup (Guided Experience)

**Simple Setup Process:**
Since OpenAI requires users to create their own access credentials, we provide a **completely guided experience**:

**In-App Guided Setup:**
1. **Welcome screen** explains why OpenAI access is needed for email classification
2. **Step-by-step wizard** with live screenshots and instructions
3. **Embedded browser** opens OpenAI pages at the exact location needed
4. **Copy-paste helper** with format validation and visual feedback
5. **Test connection** verifies everything works with a sample email classification
6. **Secure storage** encrypts credentials safely on your device
7. **Usage tracking** shows spending and provides cost estimates

**Detailed User Guidance:**
```
Step 1: Create OpenAI Account (if needed)
→ We'll open openai.com/signup for you
→ Use your email to create a free account
→ [Open Sign-Up Page] button opens right in the app

Step 2: Get Your Access Key  
→ We'll take you to your OpenAI dashboard
→ Click "Create new secret key" 
→ Copy the key that starts with "sk-"
→ [Take Me There] button opens the exact page

Step 3: Connect to Smart Inbox Janitor
→ Paste your access key in the box below
→ We'll test it to make sure everything works
→ [Test Connection] verifies with a sample email
→ ✅ All set! Your key is stored securely on your device
```

**Access Key Management:**
- **Format checking**: Real-time validation as you type
- **Connection testing**: Verify it works with actual email classification
- **Cost tracking**: Show current spending and daily estimates
- **Easy updates**: Simple process to change keys when needed
- **Privacy protection**: Only show last 4 characters of your stored key

### Connection State Management

```ts
export interface ConnectionState {
  gmail: {
    isSignedIn: boolean;
    accountEmail?: string;
    accountName?: string;
    profilePicture?: string;
    sessionExpiresAt?: string;
    lastRefreshAt?: string;
    needsReSignIn: boolean;
  };
  openai: {
    hasValidKey: boolean;
    keyLastFour?: string; // Only show last 4 chars for privacy
    lastValidated?: string;
    monthlySpendingUSD?: number;
    estimatedDailyRate?: number;
  };
  setupComplete: boolean;
  onboardingStep?: 'gmail-signin' | 'openai-setup' | 'ready';
}
```

### Onboarding Flow UX

**First Launch Experience:**
1. **Welcome screen** with app overview and benefits
2. **Gmail sign-in** with embedded sign-in window (required)
3. **OpenAI setup** with guided access key process (required)  
4. **Preferences** - processing settings and safety options (optional)
5. **First scan** - guided discovery of email folders and initial batch
6. **Success screen** - ready to use with clear next steps

**Progressive Disclosure:**
- **Essential first**: Only show critical setup steps initially
- **Advanced later**: Power user features available after basic setup
- **Contextual help**: Tooltips and help text appear when relevant
- **Skip options**: Allow skipping non-essential configuration

### Error Handling & Recovery

**Connection Issues:**
- **Clear error messages** with specific resolution steps
- **One-click retry** for temporary failures
- **Guided troubleshooting** for persistent issues
- **Help contact** for escalation when needed

**Session & Access Issues:**
- **Automatic retry** with smart waiting
- **User notification** when manual intervention needed
- **Easy re-connection** without losing current work
- **Graceful fallback** - disable features vs. full app failure

---

## Provider Extensibility (Email & Contacts)
Design against these **abstract interfaces** so we can add providers (e.g., IMAP) later.

```ts
// Email provider (start with Gmail)
export interface EmailProvider {
  connect(): Promise<void>;                             // OAuth (Gmail). Store tokens securely.
  list(options: ListOptions): Promise<EmailSummary[]>;  // batched listing with search/filter
  get(id: string): Promise<EmailFull>;                  // full body + headers
  batchModify(req: BatchModifyRequest): Promise<void>;  // add/remove labels, mark spam, move to trash
  delete(id: string): Promise<void>;                    // hard delete (rare; prefer trash)
  reportSpam?(id: string): Promise<void>;               // provider-optional
  reportPhishing?(id: string): Promise<void>;           // provider-optional
}

export interface ContactsProvider {
  isKnown(emailOrDomain: string): Promise<boolean>;
  relationshipStrength(email: string): Promise<"none" | "weak" | "strong">;
}
```

**Gmail-first behavior:**
- Prefer **labels** and **Trash** over hard delete.
- Use `SPAM` label for spam, and phishing report if API is available; otherwise fallback to `SPAM` + Trash + optional forward-to-abuse per user setting.
- Use **List-Unsubscribe** headers (HTTP first; then `mailto:`). Confirm 2xx for HTTP.

---

## Local Storage Architecture

All user data, learning profiles, email metadata, and configuration must be stored **locally** to ensure privacy and offline capability.

### Storage Provider Interface

Abstract the storage layer to support both desktop and browser environments:

```ts
export interface StorageProvider {
  init(): Promise<void>;
  
  // User rules and learning data
  getUserRules(): Promise<UserRules>;
  updateUserRules(rules: UserRules): Promise<void>;
  
  // Email metadata cache (for classification history)
  getEmailMetadata(emailId: string): Promise<EmailMetadata | null>;
  setEmailMetadata(emailId: string, metadata: EmailMetadata): Promise<void>;
  bulkSetEmailMetadata(entries: Array<{id: string, metadata: EmailMetadata}>): Promise<void>;
  
  // Classification history and analytics
  getClassificationHistory(filters?: HistoryFilters): Promise<ClassificationHistoryItem[]>;
  addClassificationResult(result: ClassificationHistoryItem): Promise<void>;
  
  // Encrypted token storage
  getEncryptedTokens(): Promise<Record<string, string>>;
  setEncryptedToken(provider: string, encryptedToken: string): Promise<void>;
  
  // Configuration
  getConfig(): Promise<AppConfig>;
  updateConfig(config: Partial<AppConfig>): Promise<void>;
}

export interface EmailMetadata {
  id: string;
  classification?: string;
  confidence?: number;
  reasons?: string[];
  bulk_key?: string;
  last_classified: string; // ISO date
  user_action?: "kept" | "deleted" | "unsubscribed" | "reported";
  user_action_timestamp?: string;
}

export interface ClassificationHistoryItem {
  timestamp: string;
  emailId: string;
  classification: string;
  confidence: number;
  reasons: string[];
  user_action?: string;
  user_feedback?: "correct" | "incorrect" | "partial";
}
```

### Storage Implementation Strategy

**Desktop (Electron/Tauri)**: SQLite with encrypted database file
- Use `better-sqlite3` (Node) or `rusqlite` (Tauri) for fast local queries
- Database location: `~/AppData/smart-inbox-janitor/` (Windows) or `~/.config/smart-inbox-janitor/` (macOS/Linux)
- Encrypt sensitive data (tokens, email content previews) using OS keychain integration

**Browser (Static Hosting)**: IndexedDB with structured storage
- Use `idb` library for Promise-based IndexedDB operations
- Implement same interface with IndexedDB collections: `rules`, `email_metadata`, `classification_history`, `config`
- Use Web Crypto API for client-side token encryption
- Consider storage quota management and cleanup policies

### Storage Schema Design

```sql
-- Desktop SQLite schema for resumable processing
CREATE TABLE user_rules (
  id INTEGER PRIMARY KEY,
  rule_type TEXT NOT NULL, -- 'always_keep', 'auto_trash', 'weight'
  rule_key TEXT NOT NULL,  -- 'sender', 'domain', 'listid'
  rule_value TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE email_metadata (
  email_id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  folder_name TEXT,
  subject TEXT,
  sender_email TEXT,
  sender_name TEXT,
  received_date TEXT NOT NULL,
  classification TEXT,
  confidence REAL,
  reasons TEXT, -- JSON array
  bulk_key TEXT,
  last_classified TEXT,
  user_action TEXT, -- 'kept', 'deleted', 'unsubscribed', 'reported', 'pending'
  user_action_timestamp TEXT,
  processing_batch_id TEXT,
  INDEX idx_folder_date (folder_id, received_date),
  INDEX idx_classification (classification),
  INDEX idx_user_action (user_action),
  INDEX idx_processing_batch (processing_batch_id)
);

CREATE TABLE processing_state (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- singleton table
  total_emails_discovered INTEGER DEFAULT 0,
  total_emails_processed INTEGER DEFAULT 0,
  total_emails_actioned INTEGER DEFAULT 0,
  current_batch_id TEXT,
  last_processed_email_id TEXT,
  last_processed_timestamp TEXT,
  session_stats TEXT, -- JSON with sessionsCompleted, totalTimeSpent, etc.
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE folder_states (
  folder_id TEXT PRIMARY KEY,
  folder_name TEXT NOT NULL,
  total_emails INTEGER DEFAULT 0,
  processed_emails INTEGER DEFAULT 0,
  last_processed_email_id TEXT,
  discovery_completed BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE processing_queue (
  email_id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- 'high', 'normal', 'low'
  added_to_queue TEXT NOT NULL,
  batch_id TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  INDEX idx_priority_status (priority, status),
  INDEX idx_batch_status (batch_id, status)
);

CREATE TABLE processing_batches (
  batch_id TEXT PRIMARY KEY,
  email_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  api_calls_made INTEGER DEFAULT 0,
  api_cost_usd REAL DEFAULT 0.0,
  error_message TEXT
);

CREATE TABLE classification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  email_id TEXT NOT NULL,
  classification TEXT NOT NULL,
  confidence REAL NOT NULL,
  reasons TEXT NOT NULL, -- JSON array
  user_action TEXT,
  user_feedback TEXT, -- 'correct', 'incorrect', 'partial'
  batch_id TEXT,
  INDEX idx_email_timestamp (email_id, timestamp)
);

CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON serialized value
);

CREATE TABLE encrypted_tokens (
  provider TEXT PRIMARY KEY,
  encrypted_token TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE action_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_id TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'delete', 'trash', 'label', 'unsubscribe', 'report_spam', 'report_phishing'
  action_params TEXT, -- JSON with action-specific parameters
  bulk_group_id TEXT, -- Groups related actions for bulk execution
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'retrying'
  priority INTEGER DEFAULT 5, -- 1=highest, 10=lowest
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_attempted TEXT,
  next_retry_after TEXT, -- ISO timestamp for exponential backoff
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  INDEX idx_status_priority (status, priority),
  INDEX idx_bulk_group (bulk_group_id),
  INDEX idx_retry_schedule (status, next_retry_after)
);

CREATE TABLE action_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_queue_id INTEGER REFERENCES action_queue(id),
  email_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'success', 'rate_limited', 'auth_error', 'api_error', 'network_error'
  response_code INTEGER, -- HTTP status code
  response_message TEXT,
  execution_time_ms INTEGER,
  attempted_at TEXT NOT NULL,
  INDEX idx_email_action (email_id, action_type),
  INDEX idx_attempt_time (attempted_at)
);
```

---

## AI Backend Extensibility (Interchangeable LLMs)

Abstract the LLM via a **single interface** so we can swap ChatGPT/OpenAI, Claude, or local Llama (e.g., Ollama) without changing the app logic.

```ts
export interface LLMProvider {
  name: "openai" | "anthropic" | "llama" | string;
  init(auth: LLMAuth): Promise<void>;                   // token or OAuth; model choice
  classifyEmails(input: ClassifyInput): Promise<ClassifyOutput>;
  suggestSearchQueries(context: QueryContext): Promise<string[]>;
  groupForBulk(input: GroupingInput): Promise<GroupOutput>; // create stable bulk_key, rationale
}

export type LLMAuth =
  | { kind: "api_key"; key: string }
  | { kind: "oauth"; accessToken: string; refreshToken?: string }
  | { kind: "local"; endpoint: string }; // e.g., http://localhost:11434 for Ollama

export interface ClassifyInput {
  emails: Array<{
    id: string;
    headers: Record<string, string>;
    bodyText?: string;
    bodyHtml?: string;  // sanitized
    providerSignals?: { hasListUnsubscribe?: boolean; spf?: string; dkim?: string; dmarc?: string };
    contactSignal?: { known: boolean; strength: "none" | "weak" | "strong" };
  }>;
  userRulesSnapshot: UserRules;
}

export interface ClassifyItem {
  emailId: string;
  classification: "keep" | "newsletter" | "promotion" | "spam" | "dangerous_phishing" | "unknown";
  likelihood: "very likely" | "likely" | "unsure";
  confidence: number;
  reasons: string[];
  bulk_key: string;
  unsubscribe_method?: { type: "http_link" | "mailto" | "none"; value?: string };
}

export interface ClassifyOutput {
  items: ClassifyItem[];
  rulesSuggestions?: Array<{ type: string; value: string; rationale?: string }>;
}
```

### LLM Provider (Phase 1)

**Primary and Only**: **OpenAI GPT-4o-mini**
- Fast processing for high-volume email classification
- Cost-effective for processing thousands of emails per session
- Reliable API with good rate limiting and error handling
- Strong performance on email classification tasks

*Note: Other LLM providers (Claude, Llama, local Ollama) reserved for future phases to maintain focus and simplicity.*

---

## Actions You Support
- `KEEP`
- `UNSUBSCRIBE_AND_DELETE` (HTTP List-Unsubscribe preferred → verify 2xx; fallback `mailto:` flow)
- `DELETE_ONLY` (Trash without unsubscribing)
- `REPORT_DANGEROUS` (spam/phishing report where supported, then Trash)

For any **bulk** action, show a **preview**: impacted count, rules used, unsubscribe method, rollback plan.

---

## Progressive Email Processing Workflow

The system processes **entire email folders** (not just recent emails) in manageable batches while maintaining persistent state for resumable sessions.

### Full-Scope Processing Strategy

1) **Discover** all emails across all folders (Inbox, Sent, Spam, folders, labels)
2) **Queue** unprocessed emails in batches of 1000+ for efficient API usage
3) **Persist** processing state to allow stopping/resuming at any time
4) **Classify** batches using GPT-4o-mini with rate limiting and error handling
5) **Store** classifications locally with metadata for future reference
6) **Present** results in manageable UI chunks for user review and action
7) **Execute** approved bulk actions while maintaining undo capability
8) **Track** progress across multiple cleanup sessions until mailbox is fully processed

### Session-Based Processing Model

**Initial Cleanup Sessions (Weeks/Months)**:
- Process historical emails in 1000-email batches
- Store all classifications and user decisions locally
- Resume from last processed email on app restart
- Show overall progress (e.g., "45,000 of 120,000 emails processed")

**Maintenance Sessions (Monthly)**:
- Process only new emails since last session
- Apply learned rules automatically where confidence is high
- Present only uncertain classifications for manual review

### Persistent State Management

```ts
export interface ProcessingState {
  totalEmailsDiscovered: number;
  totalEmailsProcessed: number;
  totalEmailsActioned: number;
  currentBatchId?: string;
  lastProcessedEmailId?: string;
  lastProcessedTimestamp: string;
  folderStates: Array<{
    folderId: string;
    folderName: string;
    totalEmails: number;
    processedEmails: number;
    lastProcessedEmailId?: string;
  }>;
  sessionStats: {
    sessionsCompleted: number;
    totalTimeSpent: number; // minutes
    totalApiCalls: number;
    totalCostUSD: number;
  };
}

export interface EmailProcessingQueue {
  queuedEmails: Array<{
    emailId: string;
    folderId: string;
    priority: "high" | "normal" | "low"; // suspicious emails get high priority
    addedToQueue: string; // timestamp
  }>;
  processingBatches: Array<{
    batchId: string;
    emailIds: string[];
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: string;
    completedAt?: string;
  }>;
}
```

### Resumable Batch Processing

1) **App Startup**: Check for incomplete processing state
2) **Resume Discovery**: Continue email discovery from last known position  
3) **Resume Classification**: Process remaining emails in queue
4) **Resume Actions**: Complete any pending bulk actions
5) **Progress Display**: Show user exactly where they left off

### Rate Limiting & Cost Management

- **API Rate Limiting**: Respect OpenAI's rate limits with exponential backoff
- **Cost Estimation**: Show estimated API costs before starting large batches
- **Batch Size Optimization**: Adjust batch sizes based on API performance
- **Pause/Resume Controls**: Allow user to pause processing and resume later
- **Daily Limits**: Optional daily API spend limits to control costs

---

## Queued Action Execution System

All email actions (delete, trash, label, unsubscribe, report) are queued and executed reliably with Gmail API rate limiting and retry handling.

### Action Queue Management

```ts
export interface ActionQueueItem {
  id: string;
  emailId: string;
  actionType: "delete" | "trash" | "label" | "unsubscribe" | "report_spam" | "report_phishing";
  actionParams: ActionParams;
  bulkGroupId?: string; // For grouping related actions
  status: "pending" | "processing" | "completed" | "failed" | "retrying";
  priority: number; // 1=highest (dangerous emails), 10=lowest (newsletters)
  retryCount: number;
  maxRetries: number;
  lastAttempted?: string;
  nextRetryAfter?: string; // For exponential backoff
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export type ActionParams = 
  | { type: "trash" }
  | { type: "delete", permanent: boolean }
  | { type: "label", addLabels: string[], removeLabels: string[] }
  | { type: "unsubscribe", method: "http" | "mailto", url: string }
  | { type: "report_spam" }
  | { type: "report_phishing" };
```

### Gmail Rate Limiting Strategy

**Gmail API Quotas (per user per day)**:
- 1 billion quota units/day
- Modify operations: ~10-50 units each
- Batch operations: More efficient than individual calls

**Rate Limiting Implementation**:
- **Exponential Backoff**: 1s, 2s, 4s, 8s, 16s delays on rate limit errors
- **Bulk Batching**: Group similar actions into single API calls where possible
- **Priority Processing**: Process dangerous email reports before newsletter deletions
- **Time-based Throttling**: Spread actions over time to avoid hitting rate limits
- **Quota Monitoring**: Track daily quota usage and warn users of limits

### Action Execution Workflow

1) **User Confirms Actions**: Bulk actions get queued with same `bulkGroupId`
2) **Queue Processing**: Background service processes actions by priority
3) **Batch Optimization**: Group similar actions for efficient API calls
4) **Rate Limit Handling**: Automatic retries with exponential backoff
5) **Error Recovery**: Failed actions stay queued for manual retry or investigation
6) **Progress Tracking**: Real-time status updates in UI
7) **Completion Notification**: User notified when action batches complete

### Action Priority System

```ts
const ACTION_PRIORITIES = {
  report_phishing: 1,    // Highest - security critical
  report_spam: 2,        // High - abuse prevention
  delete: 3,             // High - permanent action
  unsubscribe: 4,        // Medium-high - external API call required
  trash: 5,              // Medium - recoverable action
  label: 6               // Low - metadata only
} as const;
```

### Retry Logic & Error Handling

**Automatic Retries** (up to 3 attempts):
- **Rate Limited (429)**: Exponential backoff with jitter
- **Network Errors (5xx)**: Short delay, retry
- **Temporary Auth (401)**: Token refresh, retry

**Manual Investigation Required**:
- **Quota Exceeded**: Wait for daily reset or upgrade quota
- **Permanent Auth (403)**: Re-authentication required  
- **Invalid Request (400)**: Action configuration error
- **Not Found (404)**: Email no longer exists (mark as completed)

### Background Action Processing

```ts
export interface ActionProcessor {
  startProcessing(): Promise<void>;
  stopProcessing(): Promise<void>;
  processNextBatch(): Promise<ProcessingResult>;
  retryFailedActions(): Promise<RetryResult>;
  getQueueStatus(): Promise<QueueStatus>;
}

export interface QueueStatus {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  estimatedTimeRemaining: number; // minutes
  currentRateLimit?: {
    resetTime: string;
    remainingQuota: number;
  };
}
```

### User Experience for Queued Actions

- **Real-time Progress**: Show action queue status in UI
- **Completion Notifications**: Alert when bulk actions finish
- **Error Reporting**: Clear messages for failed actions with retry options
- **Queue Management**: Allow users to pause/resume action processing
- **Undo Capability**: Quick access to reverse recent actions (where possible)

---

## Classification Cues (Heuristics & Examples)
- **Keep**: Known contacts; invoices; threads you replied to; 2FA codes; receipts you’ve historically kept.
- **Newsletter/Promotion**: `List-Id`, `List-Unsubscribe`, coupon/promo language, templated layouts.
- **Spam**: mismatched display vs. domain; obfuscated links; no unsubscribe; spammy TLDs; mass misspellings.
- **Dangerous/Phishing**: credential-bait; brand impersonation; lookalike domains (`paypaI.com`); urgent wire/gift card asks; SPF/DKIM fail signals.

Return **succinct reasons** for user trust.

---

## Learning Rules
- If user clicks **Keep** for a sender/list ≥2 times → suggest **Always keep** rule.
- If user chooses **Unsubscribe & Delete** for a list once → suggest **Auto-triage future from this List-Id**.
- If user **Report Dangerous** for a domain → raise risk for sibling subdomains.
- Contacts raise keep-likelihood but do **not** suppress phishing checks.

```ts
export interface UserRules {
  alwaysKeep: { senders: string[]; domains: string[]; listIds: string[] };
  autoTrash:  { senders: string[]; domains: string[]; listIds: string[]; templates?: string[] };
  weights?:   { contactsBonus?: number; dangerSignals?: string[] };
  exclusions?: { neverAutoTrashImportant?: boolean; respectStarred?: boolean };
}
```

---

## LLM Usage Policy & Authentication
Use GPT-4o-mini for:
- **search query suggestions** (e.g., Gmail queries),
- **semantic classification** & **bulk grouping**,
- short **explanations** for the UI.

**Connection & Setup:**
- **Guided setup**: Step-by-step wizard for OpenAI access key setup
- **Embedded assistance**: In-app browser opens OpenAI pages at the right location
- **Connection testing**: Real-time validation with actual email classification tests
- **Secure storage**: All credentials encrypted on your device, never stored in plain text
- **Cost monitoring**: Track spending and provide daily/monthly estimates
- **Smart retry**: Handle rate limits and temporary failures automatically

**Classification output contract** (LLM → host app):
```json
{
  "batchId": "<id>",
  "items": [
    {
      "emailId": "<provider-id>",
      "classification": "spam",
      "likelihood": "very likely",
      "confidence": 0.97,
      "reasons": ["lookalike domain", "credential-bait", "SPF fail"],
      "bulk_key": "from:support@paypaI.com",
      "unsubscribe_method": {"type":"none"}
    }
  ],
  "rulesSuggestions": [
    {"type":"auto_trash_listid","value":"deals.brandx.io","rationale":"repeated deletions"}
  ]
}
```

---

## Gmail Search Builder (LLM-assisted examples)
- “likely newsletters, last 30d”: `newer_than:30d has:list-unsubscribe`
- “promotions not in contacts”: `category:promotions -from:({contacts})`
- “suspicious lookalikes”: `subject:("reset password" OR "suspend") -in:chats`
- “large attachments not from contacts”: `larger:10M -from:({contacts})`

---

## UI/UX Responsibilities (host app shell)
- Two-pane triage: list on the left, **safe preview** on the right.
- Non-numeric **likelihood chips**; color-coded categories.
- One-click **bulk** per group; per-item overrides.
- Rule management (“Always keep from X”, “Auto-trash list Y”).

### ASCII Wireframes

#### Main Side-Panel Triage Interface
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Smart Inbox Janitor    Progress: 1,250/45,000 processed    [⏸ Pause] [⚙ Settings] [⟳] │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ Filters: [All Groups] [Dangerous] [Spam] [Promotions] [Newsletters] [Keep] [Pending]    │
├──────────────────────────────────┬──────────────────────────────────────────────────────┤
│ Email Groups & Individual Items  │ Detail View                                          │
│──────────────────────────────────┼──────────────────────────────────────────────────────┤
│ ⚠️ DANGEROUS (3 emails)          │ Selected: PayPal Phishing Group (3 emails)          │
│ 🚨 [REPORT] 💀 [DEL] ✅ [KEEP]    │ ┌────────────────────────────────────────────────────┐ │
│ > paypaI.com lookalike           │ │ [🚨 REPORT ALL] [💀 DELETE ALL] [✅ KEEP ALL]       │ │
│                                  │ └────────────────────────────────────────────────────┘ │
│ 🏷️ PROMO: "Daily Deals" (127)    │                                                      │
│ 🗑️ [UNSUB] 💀 [DEL] ✅ [KEEP]     │ 📧 From: "PayPaI Security" <noreply@paypaI.com>     │
│ > deals@retailer.com             │    Subject: Urgent: Verify your account             │
│                                  │    Date: Aug 15, 2024                               │
│ 📰 NEWS: "TechCrunch" (89)       │    Reasons: • Lookalike domain (paypaI vs paypal)   │
│ 🗑️ [UNSUB] 💀 [DEL] ✅ [KEEP]     │            • Credential harvesting language         │
│ > newsletter@techcrunch.com      │            • Suspicious links                       │
│                                  │                                                      │
│ 🏷️ PROMO: "Flash Sale" (23)      │ 📧 From: "PayPaI Support" <help@paypaI.com>         │
│ 🗑️ [UNSUB] 💀 [DEL] ✅ [KEEP]     │    Subject: Account suspended - Act now             │
│ > sales@brandname.com            │    Date: Aug 12, 2024                               │
│                                  │                                                      │
│ ⚠️ SUSPICIOUS (1 email)          │ 📧 From: "PayPaI Team" <security@paypaI.com>        │
│ 🚨 [REPORT] 💀 [DEL] ✅ [KEEP]    │    Subject: Your payment was declined               │
│ > Unknown sender                 │    Date: Aug 10, 2024                               │
│                                  │                                                      │
│ ✅ KEEP: "GitHub" (45)           │ [📋 Show Raw Headers] [🔍 Show Full Content]        │
│ > notifications@github.com       │                                                      │
│                                  │ Preview (sanitized):                                 │
│ [Load More Groups...]            │ Dear PayPal User, Your account requires immediate   │
│                                  │ verification to avoid suspension. Click here: ...   │
│                                  │ [Remote images blocked] [Scripts disabled]          │
└──────────────────────────────────┴──────────────────────────────────────────────────────┘
```

#### Bulk Action Confirmation Dialog
```
┌───────────────── Bulk Action Confirmation ─────────────────┐
│                                                             │
│ Action: UNSUBSCRIBE_AND_DELETE                              │
│ Group: "Daily Deals" promotional emails                     │
│ Emails: 127 emails from deals@retailer.com                 │
│ Date Range: Jan 2023 - Aug 2024                           │
│                                                             │
│ Unsubscribe Method: HTTP link (List-Unsubscribe header)    │
│ ✅ Will verify 2xx response before deleting                 │
│                                                             │
│ ⚠️  This action will:                                       │
│   • Send unsubscribe request to retailer.com               │
│   • Move 127 emails to Trash (recoverable for 30 days)     │
│   • Add sender to auto-trash rules for future emails       │
│                                                             │
│ Estimated time: ~2-3 minutes (respecting rate limits)      │
│ API cost estimate: ~$0.02                                   │
│                                                             │
│ ☐ Also create rule: "Auto-trash future emails from this    │
│   sender" (recommended)                                     │
│                                                             │
│           [Cancel]    [Queue Action]    [Execute Now]      │
└─────────────────────────────────────────────────────────────┘
```


---

## Failure & Recovery
- If **unsubscribe** fails → fallback to **DELETE_ONLY** and show Retry.
- If **report phishing** API absent → mark `SPAM` + Trash; if user enabled, forward to abuse mailbox.
- Always offer **Undo/Restore** from Trash (within provider retention window).

---

## Acceptance Checklist
- [ ] Batches render with non-numeric **likelihood** chips.
- [ ] Preview pane shows **sanitized** content + **reasons**.
- [ ] One-click **bulk** for the same `bulk_key`; per-item override works.
- [ ] **Undo** from Trash honored within Gmail window.
- [ ] Learning reduces prompts for previously approved senders/lists.
- [ ] No destructive action without explicit confirmation.
- [ ] Tokens encrypted; no secrets in logs.
- [ ] LLM provider can be swapped (OpenAI ⇄ Claude ⇄ Llama) with no app changes.

---

## Tech Stack Recommendation (Electron Desktop App)

**Primary Target: Desktop Electron App**
- **Electron + React + TypeScript** for mature ecosystem and Gmail API integration
- **SQLite** via `better-sqlite3` for local storage with full SQL capabilities
- **Node.js OAuth libraries** for robust Gmail authentication flow
- **OS keychain integration** for secure token storage via `keytar`
- **Native file system access** for data export/import
- **System notifications** for background processing updates
- **System tray integration** for background operation

**Future Target: Browser Static Hosting (Architectural Compatibility)**
- Same **React + TypeScript** codebase with storage adapter pattern
- **IndexedDB** adapter implementing same `StorageProvider` interface
- **Web Crypto API** for client-side encryption (matching desktop security)
- **OAuth 2.0 PKCE flow** for browser-compatible Gmail authentication

### Architecture Benefits of Storage Abstraction

1. **Future-Proof Design**: Same interfaces work for both SQLite and IndexedDB
2. **Testability**: Easy to mock storage layer for unit testing
3. **Migration Path**: Clear upgrade path from desktop-only to desktop+browser
4. **Development Flexibility**: Can develop against either storage backend

### Electron Implementation Details

**Core Dependencies:**
- `electron`: Desktop app framework
- `better-sqlite3`: High-performance SQLite with Node.js
- `keytar`: Secure credential storage using OS keychain
- `googleapis`: Official Google API client for Gmail integration
- `electron-builder`: App packaging and distribution

**Development Stack:**
- `vite`: Fast build tool and dev server
- `electron-vite`: Vite integration for Electron
- `tailwindcss`: Utility-first CSS framework
- `zustand`: Lightweight state management with persistence

**OS Integration Features:**
- **Auto-updater**: Seamless app updates via `electron-updater`
- **Deep linking**: Handle custom URL schemes for OAuth callbacks
- **Menu bar integration**: Native menus and keyboard shortcuts
- **Window management**: Remember window positions and states

> **Recommendation**: Focus on Electron-first implementation with robust SQLite storage and OS integration. Design storage layer as pluggable interfaces for future browser compatibility without architectural changes.

---

## Example Host App Output Contract (per batch)
```json
{
  "batchId": "2025-08-19T15:04:00Z-1",
  "items": [/* classification items */],
  "suggestedBulkActions": [
    {"bulk_key":"listid:news.example.com","proposed_action":"UNSUBSCRIBE_AND_DELETE","count":42},
    {"bulk_key":"from:sales@brand.com","proposed_action":"DELETE_ONLY","count":13}
  ],
  "rulesSuggestions": [
    {"type":"always_keep_sender","value":"invoices@vendor.com"},
    {"type":"auto_trash_listid","value":"offers.brand.example"}
  ]
}
```
