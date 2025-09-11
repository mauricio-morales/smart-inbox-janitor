using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TrashMailPanda.Shared.Models;
using TrashMailPanda.Shared.Base;

namespace TrashMailPanda.Shared;

/// <summary>
/// Abstract interface for email providers (Gmail, IMAP, etc.)
/// Provides consistent email operations across different providers
/// </summary>
public interface IEmailProvider
{
    /// <summary>
    /// Connect to the email provider using OAuth or other authentication
    /// </summary>
    /// <returns>A result indicating success or failure</returns>
    Task<Result<bool>> ConnectAsync();

    /// <summary>
    /// List emails with filtering and pagination options
    /// </summary>
    /// <param name="options">Search and filter options</param>
    /// <returns>A result containing the list of email summaries</returns>
    Task<Result<IReadOnlyList<EmailSummary>>> ListAsync(ListOptions options);

    /// <summary>
    /// Get full email content including headers and body
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>A result containing the complete email details</returns>
    Task<Result<EmailFull>> GetAsync(string id);

    /// <summary>
    /// Perform batch operations on multiple emails (labels, trash, etc.)
    /// </summary>
    /// <param name="request">Batch modification request</param>
    /// <returns>A result indicating success or failure</returns>
    Task<Result<bool>> BatchModifyAsync(BatchModifyRequest request);

    /// <summary>
    /// Hard delete email (use sparingly, prefer trash)
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>A result indicating success or failure</returns>
    Task<Result<bool>> DeleteAsync(string id);

    /// <summary>
    /// Report email as spam (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>A result indicating success or failure</returns>
    Task<Result<bool>> ReportSpamAsync(string id);

    /// <summary>
    /// Report email as phishing (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>A result indicating success or failure</returns>
    Task<Result<bool>> ReportPhishingAsync(string id);

    /// <summary>
    /// Get authenticated user information
    /// </summary>
    /// <returns>A result containing authenticated user details or null if not authenticated</returns>
    Task<Result<AuthenticatedUserInfo?>> GetAuthenticatedUserAsync();

    /// <summary>
    /// Check provider health status
    /// </summary>
    /// <returns>Health check result</returns>
    Task<Result<bool>> HealthCheckAsync();
}