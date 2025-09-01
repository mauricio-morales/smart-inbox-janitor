using System;
using System.Collections.Generic;
using System.Threading.Tasks;

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
    Task ConnectAsync();

    /// <summary>
    /// List emails with filtering and pagination options
    /// </summary>
    /// <param name="options">Search and filter options</param>
    /// <returns>List of email summaries</returns>
    Task<IReadOnlyList<EmailSummary>> ListAsync(ListOptions options);

    /// <summary>
    /// Get full email content including headers and body
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>Complete email details</returns>
    Task<EmailFull> GetAsync(string id);

    /// <summary>
    /// Perform batch operations on multiple emails (labels, trash, etc.)
    /// </summary>
    /// <param name="request">Batch modification request</param>
    Task BatchModifyAsync(BatchModifyRequest request);

    /// <summary>
    /// Hard delete email (use sparingly, prefer trash)
    /// </summary>
    /// <param name="id">Email ID</param>
    Task DeleteAsync(string id);

    /// <summary>
    /// Report email as spam (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    Task ReportSpamAsync(string id);

    /// <summary>
    /// Report email as phishing (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    Task ReportPhishingAsync(string id);
}