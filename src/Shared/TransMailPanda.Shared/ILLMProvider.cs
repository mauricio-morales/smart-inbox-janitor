using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Shared;

/// <summary>
/// Abstract interface for LLM providers (OpenAI, Claude, Llama, etc.)
/// Provides consistent AI operations for email classification
/// </summary>
public interface ILLMProvider
{
    /// <summary>
    /// Provider name identifier
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Initialize the LLM provider with authentication
    /// </summary>
    /// <param name="auth">Authentication configuration</param>
    Task InitAsync(LLMAuth auth);

    /// <summary>
    /// Classify emails using AI
    /// </summary>
    /// <param name="input">Email classification input</param>
    /// <returns>Classification results</returns>
    Task<ClassifyOutput> ClassifyEmailsAsync(ClassifyInput input);

    /// <summary>
    /// Suggest search queries for email discovery
    /// </summary>
    /// <param name="context">Query context</param>
    /// <returns>Suggested queries</returns>
    Task<IReadOnlyList<string>> SuggestSearchQueriesAsync(QueryContext context);

    /// <summary>
    /// Group emails for bulk operations
    /// </summary>
    /// <param name="input">Grouping input</param>
    /// <returns>Bulk grouping results</returns>
    Task<GroupOutput> GroupForBulkAsync(GroupingInput input);
}

public abstract class LLMAuth
{
    public sealed class ApiKey : LLMAuth
    {
        public string Key { get; init; } = string.Empty;
    }
    
    public sealed class OAuth : LLMAuth
    {
        public string AccessToken { get; init; } = string.Empty;
        public string? RefreshToken { get; init; }
    }
    
    public sealed class Local : LLMAuth
    {
        public string Endpoint { get; init; } = string.Empty; // e.g., http://localhost:11434 for Ollama
    }
}

public class ClassifyInput
{
    public IReadOnlyList<EmailClassificationInput> Emails { get; init; } = Array.Empty<EmailClassificationInput>();
    public UserRules UserRulesSnapshot { get; init; } = new();
}

public class EmailClassificationInput
{
    public string Id { get; init; } = string.Empty;
    public IReadOnlyDictionary<string, string> Headers { get; init; } = new Dictionary<string, string>();
    public string? BodyText { get; init; }
    public string? BodyHtml { get; init; } // sanitized
    public ProviderSignals? ProviderSignals { get; init; }
    public ContactSignal? ContactSignal { get; init; }
}

public class ProviderSignals
{
    public bool? HasListUnsubscribe { get; init; }
    public string? Spf { get; init; }
    public string? Dkim { get; init; }
    public string? Dmarc { get; init; }
}

public class ContactSignal
{
    public bool Known { get; init; }
    public RelationshipStrength Strength { get; init; }
}

public enum RelationshipStrength
{
    None,
    Weak,
    Strong
}

public class ClassifyItem
{
    public string EmailId { get; init; } = string.Empty;
    public EmailClassification Classification { get; init; }
    public Likelihood Likelihood { get; init; }
    public double Confidence { get; init; }
    public IReadOnlyList<string> Reasons { get; init; } = Array.Empty<string>();
    public string BulkKey { get; init; } = string.Empty;
    public UnsubscribeMethod? UnsubscribeMethod { get; init; }
}

public class ClassifyOutput
{
    public IReadOnlyList<ClassifyItem> Items { get; init; } = Array.Empty<ClassifyItem>();
    public IReadOnlyList<RuleSuggestion>? RulesSuggestions { get; init; }
}

public enum EmailClassification
{
    Keep,
    Newsletter,
    Promotion,
    Spam,
    DangerousPhishing,
    Unknown
}

public enum Likelihood
{
    VeryLikely,
    Likely,
    Unsure
}

public class UnsubscribeMethod
{
    public UnsubscribeType Type { get; init; }
    public string? Value { get; init; }
}

public enum UnsubscribeType
{
    HttpLink,
    Mailto,
    None
}

public class RuleSuggestion
{
    public string Type { get; init; } = string.Empty;
    public string Value { get; init; } = string.Empty;
    public string? Rationale { get; init; }
}

public class QueryContext
{
    public string? Intent { get; init; }
    public IReadOnlyList<string>? Keywords { get; init; }
    public DateTime? DateRange { get; init; }
}

public class GroupingInput
{
    public IReadOnlyList<ClassifyItem> ClassifiedEmails { get; init; } = Array.Empty<ClassifyItem>();
}

public class GroupOutput
{
    public IReadOnlyList<BulkGroup> BulkGroups { get; init; } = Array.Empty<BulkGroup>();
}

public class BulkGroup
{
    public string Id { get; init; } = string.Empty;
    public string SimpleLabel { get; init; } = string.Empty; // "Daily deal emails from 5 stores"
    public int EmailCount { get; init; }
    public string StorageFreed { get; init; } = string.Empty; // "850 MB"
    public BulkActionType ActionType { get; init; } = BulkActionType.Keep;
    public bool Undoable { get; init; } = true;
}

public enum BulkActionType
{
    Keep,
    Delete,
    UnsubscribeAndDelete
}

public class UserRules
{
    public AlwaysKeepRules AlwaysKeep { get; init; } = new();
    public AutoTrashRules AutoTrash { get; init; } = new();
    public WeightingRules? Weights { get; init; }
    public ExclusionRules? Exclusions { get; init; }
}

public class AlwaysKeepRules
{
    public IReadOnlyList<string> Senders { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> Domains { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> ListIds { get; init; } = Array.Empty<string>();
}

public class AutoTrashRules
{
    public IReadOnlyList<string> Senders { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> Domains { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> ListIds { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string>? Templates { get; init; }
}

public class WeightingRules
{
    public double? ContactsBonus { get; init; }
    public IReadOnlyList<string>? DangerSignals { get; init; }
}

public class ExclusionRules
{
    public bool? NeverAutoTrashImportant { get; init; }
    public bool? RespectStarred { get; init; }
}