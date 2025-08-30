using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TransMailPanda.Shared;

/// <summary>
/// Abstract interface for local storage providers (SQLite, IndexedDB, etc.)
/// Provides consistent data persistence across different storage backends
/// </summary>
public interface IStorageProvider
{
    /// <summary>
    /// Initialize the storage provider
    /// </summary>
    Task InitAsync();

    // User rules and learning data
    Task<UserRules> GetUserRulesAsync();
    Task UpdateUserRulesAsync(UserRules rules);

    // Email metadata cache (for classification history)
    Task<EmailMetadata?> GetEmailMetadataAsync(string emailId);
    Task SetEmailMetadataAsync(string emailId, EmailMetadata metadata);
    Task BulkSetEmailMetadataAsync(IReadOnlyList<EmailMetadataEntry> entries);

    // Classification history and analytics
    Task<IReadOnlyList<ClassificationHistoryItem>> GetClassificationHistoryAsync(HistoryFilters? filters = null);
    Task AddClassificationResultAsync(ClassificationHistoryItem result);

    // Encrypted token storage
    Task<IReadOnlyDictionary<string, string>> GetEncryptedTokensAsync();
    Task SetEncryptedTokenAsync(string provider, string encryptedToken);

    // Configuration
    Task<AppConfig> GetConfigAsync();
    Task UpdateConfigAsync(AppConfig config);
}

public record EmailMetadataEntry(string Id, EmailMetadata Metadata);

public class EmailMetadata
{
    public string Id { get; set; } = string.Empty;
    public string? Classification { get; set; }
    public double? Confidence { get; set; }
    public IReadOnlyList<string>? Reasons { get; set; }
    public string? BulkKey { get; set; }
    public DateTime LastClassified { get; set; }
    public UserAction? UserAction { get; set; }
    public DateTime? UserActionTimestamp { get; set; }
}

public class ClassificationHistoryItem
{
    public DateTime Timestamp { get; set; }
    public string EmailId { get; set; } = string.Empty;
    public string Classification { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public IReadOnlyList<string> Reasons { get; set; } = Array.Empty<string>();
    public string? UserAction { get; set; }
    public UserFeedback? UserFeedback { get; set; }
}

public enum UserAction
{
    Kept,
    Deleted,
    Unsubscribed,
    Reported
}

public enum UserFeedback
{
    Correct,
    Incorrect,
    Partial
}

public class HistoryFilters
{
    public DateTime? After { get; init; }
    public DateTime? Before { get; init; }
    public IReadOnlyList<string>? Classifications { get; init; }
    public IReadOnlyList<UserAction>? UserActions { get; init; }
    public int? Limit { get; init; }
}

public class AppConfig
{
    public ConnectionState? ConnectionState { get; set; }
    public ProcessingSettings? ProcessingSettings { get; set; }
    public UISettings? UISettings { get; set; }
}

public class ConnectionState
{
    public GmailConnection Gmail { get; set; } = new();
    public OpenAiConnection OpenAi { get; set; } = new();
    public bool SetupComplete { get; set; }
    public OnboardingStep? OnboardingStep { get; set; }
}

public class GmailConnection
{
    public bool IsSignedIn { get; set; }
    public string? AccountEmail { get; set; }
    public string? AccountName { get; set; }
    public string? ProfilePicture { get; set; }
    public DateTime? SessionExpiresAt { get; set; }
    public DateTime? LastRefreshAt { get; set; }
    public bool NeedsReSignIn { get; set; }
}

public class OpenAiConnection
{
    public bool HasValidKey { get; set; }
    public string? KeyLastFour { get; set; } // Only show last 4 chars for privacy
    public DateTime? LastValidated { get; set; }
    public decimal? MonthlySpendingUSD { get; set; }
    public decimal? EstimatedDailyRate { get; set; }
}

public enum OnboardingStep
{
    GmailSignin,
    OpenaiSetup,
    Ready
}

public class ProcessingSettings
{
    public int BatchSize { get; set; } = 1000;
    public decimal? DailyCostLimit { get; set; }
    public bool AutoProcessNewEmails { get; set; } = false;
    public IReadOnlyList<string>? FoldersToProcess { get; set; }
}

public class UISettings
{
    public string? Theme { get; set; }
    public string? Language { get; set; }
    public bool ShowAdvancedOptions { get; set; } = false;
    public NotificationSettings? Notifications { get; set; }
}

public class NotificationSettings
{
    public bool ProcessingComplete { get; set; } = true;
    public bool DangerousEmailsFound { get; set; } = true;
    public bool CostLimitWarning { get; set; } = true;
}