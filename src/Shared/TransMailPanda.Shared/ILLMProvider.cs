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