using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace TrashMailPanda.Shared;

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