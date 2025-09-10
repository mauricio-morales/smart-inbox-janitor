using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Moq;
using Google.Apis.Gmail.v1.Data;
using TrashMailPanda.Providers.Email;
using TrashMailPanda.Providers.Email.Models;
using TrashMailPanda.Providers.Email.Services;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Security;

namespace TrashMailPanda.Tests.Utilities;

/// <summary>
/// Helper class for Gmail provider testing
/// Provides common mocking utilities, test data creation, and validation helpers
/// </summary>
public static class GmailTestHelper
{
    #region Test Data Creation

    /// <summary>
    /// Creates a valid Gmail provider configuration for testing
    /// </summary>
    /// <param name="clientId">Optional client ID (uses default if not provided)</param>
    /// <param name="clientSecret">Optional client secret (uses default if not provided)</param>
    /// <returns>A valid Gmail provider configuration</returns>
    public static GmailProviderConfig CreateValidConfig(string? clientId = null, string? clientSecret = null)
    {
        var config = new GmailProviderConfig();
        config.ClientId = clientId ?? "test_client_id_12345";
        config.ClientSecret = clientSecret ?? "test_client_secret_12345";
        config.ApplicationName = "Test Application";
        config.RequestTimeout = TimeSpan.FromSeconds(30);
        config.MaxRetries = 3;
        config.BaseRetryDelay = TimeSpan.FromMilliseconds(500);
        config.MaxRetryDelay = TimeSpan.FromSeconds(30);
        config.BatchSize = 25;
        config.DefaultPageSize = 50;
        return config;
    }

    /// <summary>
    /// Creates an invalid Gmail provider configuration for testing
    /// </summary>
    /// <returns>An invalid Gmail provider configuration</returns>
    public static GmailProviderConfig CreateInvalidConfig()
    {
        var config = new GmailProviderConfig();
        config.ClientId = ""; // Invalid - too short
        config.ClientSecret = ""; // Invalid - too short
        config.BatchSize = 150; // Invalid - exceeds Gmail API limit
        config.DefaultPageSize = 600; // Invalid - exceeds Gmail API limit
        return config;
    }

    /// <summary>
    /// Creates sample email summary data for testing
    /// </summary>
    /// <param name="count">Number of email summaries to create</param>
    /// <returns>List of sample email summaries</returns>
    public static IReadOnlyList<EmailSummary> CreateSampleEmailSummaries(int count = 5)
    {
        var summaries = new List<EmailSummary>();
        var baseTime = DateTime.UtcNow.AddDays(-1);

        for (int i = 0; i < count; i++)
        {
            summaries.Add(new EmailSummary
            {
                Id = $"test_msg_{i + 1}",
                ThreadId = $"test_thread_{(i / 2) + 1}",
                Subject = $"Test Subject {i + 1}",
                From = $"sender{i + 1}@example.com",
                To = "user@example.com",
                Snippet = $"This is test email snippet {i + 1}...",
                ReceivedDate = baseTime.AddHours(-i),
                HasAttachments = i % 3 == 0,
                SizeEstimate = (i + 1) * 1024,
                LabelIds = CreateSampleLabelIds(i)
            });
        }

        return summaries.AsReadOnly();
    }

    /// <summary>
    /// Creates sample label IDs for testing
    /// </summary>
    /// <param name="index">Index to vary the labels</param>
    /// <returns>List of sample label IDs</returns>
    private static IReadOnlyList<string> CreateSampleLabelIds(int index)
    {
        var labels = new List<string> { GmailLabels.INBOX };

        if (index % 2 == 0)
            labels.Add(GmailLabels.UNREAD);
        if (index % 3 == 0)
            labels.Add(GmailLabels.IMPORTANT);
        if (index % 5 == 0)
            labels.Add(GmailLabels.STARRED);

        return labels.AsReadOnly();
    }

    /// <summary>
    /// Creates a sample full email for testing
    /// </summary>
    /// <param name="messageId">Message ID for the email</param>
    /// <returns>Sample full email data</returns>
    public static EmailFull CreateSampleEmailFull(string messageId = "test_message_full")
    {
        return new EmailFull
        {
            Id = messageId,
            ThreadId = "test_thread_full",
            BodyText = "This is the full body content of the test email. It contains multiple lines and various content for testing purposes.",
            BodyHtml = "<html><body><p>This is the <strong>HTML</strong> body content of the test email.</p></body></html>",
            Attachments = CreateSampleAttachments(),
            Headers = CreateSampleHeaders(),
            LabelIds = new[] { GmailLabels.INBOX, GmailLabels.UNREAD },
            SizeEstimate = 5120
        };
    }

    /// <summary>
    /// Creates sample attachment data for testing
    /// </summary>
    /// <returns>List of sample attachments</returns>
    private static IReadOnlyList<EmailAttachment> CreateSampleAttachments()
    {
        return new List<EmailAttachment>
        {
            new EmailAttachment
            {
                AttachmentId = "att_1",
                FileName = "test_document.pdf",
                MimeType = "application/pdf",
                Size = 25600
            },
            new EmailAttachment
            {
                AttachmentId = "att_2",
                FileName = "image.png",
                MimeType = "image/png",
                Size = 8192
            }
        }.AsReadOnly();
    }

    /// <summary>
    /// Creates sample email headers for testing
    /// </summary>
    /// <returns>Dictionary of sample headers</returns>
    private static IReadOnlyDictionary<string, string> CreateSampleHeaders()
    {
        return new Dictionary<string, string>
        {
            ["Message-ID"] = "<test123@example.com>",
            ["Date"] = DateTime.UtcNow.AddHours(-2).ToString("R"),
            ["Subject"] = "Test Full Email Subject",
            ["From"] = "fulltest@example.com",
            ["To"] = "recipient@example.com",
            ["Cc"] = "cc@example.com",
            ["Reply-To"] = "reply@example.com",
            ["X-Mailer"] = "Test Mailer v1.0",
            ["X-Priority"] = "3",
            ["Content-Type"] = "multipart/mixed; boundary=test123"
        };
    }

    #endregion

    #region Mock Setup Helpers

    /// <summary>
    /// Sets up a mock secure storage manager with valid credentials
    /// </summary>
    /// <param name="mockSecureStorage">Mock secure storage manager to setup</param>
    public static void SetupValidCredentials(Mock<ISecureStorageManager> mockSecureStorage)
    {
        mockSecureStorage
            .Setup(x => x.StoreCredentialAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(SecureStorageResult.Success());

        mockSecureStorage
            .Setup(x => x.RetrieveCredentialAsync(It.IsAny<string>()))
            .ReturnsAsync(SecureStorageResult<string>.Success("mock_credential_value"));

        mockSecureStorage
            .Setup(x => x.RemoveCredentialAsync(It.IsAny<string>()))
            .ReturnsAsync(SecureStorageResult.Success());

        mockSecureStorage
            .Setup(x => x.CredentialExistsAsync(It.IsAny<string>()))
            .ReturnsAsync(SecureStorageResult<bool>.Success(true));
    }

    /// <summary>
    /// Sets up a mock secure storage manager with missing credentials
    /// </summary>
    /// <param name="mockSecureStorage">Mock secure storage manager to setup</param>
    public static void SetupMissingCredentials(Mock<ISecureStorageManager> mockSecureStorage)
    {
        mockSecureStorage
            .Setup(x => x.RetrieveCredentialAsync(It.IsAny<string>()))
            .ReturnsAsync(SecureStorageResult<string>.Failure("Credentials not found", SecureStorageErrorType.CredentialNotFound));

        mockSecureStorage
            .Setup(x => x.CredentialExistsAsync(It.IsAny<string>()))
            .ReturnsAsync(SecureStorageResult<bool>.Success(false));
    }

    /// <summary>
    /// Sets up a mock rate limit handler for successful operations
    /// </summary>
    /// <param name="mockRateLimitHandler">Mock rate limit handler to setup</param>
    public static void SetupSuccessfulRateLimitHandler(Mock<IGmailRateLimitHandler> mockRateLimitHandler)
    {
        // Setup for operations returning email summaries
        mockRateLimitHandler
            .Setup(x => x.ExecuteWithRetryAsync(It.IsAny<Func<Task<Result<IReadOnlyList<EmailSummary>>>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<IReadOnlyList<EmailSummary>>.Success(CreateSampleEmailSummaries()));

        // Setup for operations returning full email
        mockRateLimitHandler
            .Setup(x => x.ExecuteWithRetryAsync(It.IsAny<Func<Task<Result<EmailFull>>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<EmailFull>.Success(CreateSampleEmailFull()));

        // Setup for operations returning boolean success
        mockRateLimitHandler
            .Setup(x => x.ExecuteWithRetryAsync(It.IsAny<Func<Task<Result<bool>>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<bool>.Success(true));
    }

    /// <summary>
    /// Sets up a mock rate limit handler that returns rate limit errors
    /// </summary>
    /// <param name="mockRateLimitHandler">Mock rate limit handler to setup</param>
    public static void SetupRateLimitedHandler(Mock<IGmailRateLimitHandler> mockRateLimitHandler)
    {
        var rateLimitError = new RateLimitError("Rate limit exceeded", "API quota exceeded")
        {
            RetryAfter = TimeSpan.FromMinutes(1)
        };

        mockRateLimitHandler
            .Setup(x => x.ExecuteWithRetryAsync(It.IsAny<Func<Task<Result<object>>>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<object>.Failure(rateLimitError));
    }

    /// <summary>
    /// Sets up a mock logger that doesn't interfere with tests
    /// </summary>
    /// <typeparam name="T">Type for the logger</typeparam>
    /// <returns>Mock logger instance</returns>
    public static Mock<ILogger<T>> SetupMockLogger<T>()
    {
        var mockLogger = new Mock<ILogger<T>>();

        // Setup the logger to not interfere with tests
        mockLogger.Setup(x => x.IsEnabled(It.IsAny<LogLevel>())).Returns(true);

        return mockLogger;
    }

    #endregion

    #region Validation Helpers

    /// <summary>
    /// Validates that a Gmail provider configuration contains expected values
    /// </summary>
    /// <param name="config">Configuration to validate</param>
    /// <param name="expectedClientId">Expected client ID</param>
    /// <param name="expectedClientSecret">Expected client secret</param>
    /// <returns>True if configuration is valid</returns>
    public static bool ValidateConfig(GmailProviderConfig config, string expectedClientId, string expectedClientSecret)
    {
        if (config == null) return false;
        if (config.ClientId != expectedClientId) return false;
        if (config.ClientSecret != expectedClientSecret) return false;
        if (config.Name != "Gmail") return false;
        if (config.Scopes == null || config.Scopes.Length == 0) return false;

        return true;
    }

    /// <summary>
    /// Validates that an email summary contains expected basic fields
    /// </summary>
    /// <param name="summary">Email summary to validate</param>
    /// <returns>True if email summary is valid</returns>
    public static bool ValidateEmailSummary(EmailSummary summary)
    {
        if (summary == null) return false;
        if (string.IsNullOrEmpty(summary.Id)) return false;
        if (string.IsNullOrEmpty(summary.Subject)) return false;
        if (string.IsNullOrEmpty(summary.From)) return false;
        if (summary.ReceivedDate == default) return false;

        return true;
    }

    /// <summary>
    /// Validates that a full email contains expected fields and structure
    /// </summary>
    /// <param name="email">Full email to validate</param>
    /// <returns>True if full email is valid</returns>
    public static bool ValidateEmailFull(EmailFull email)
    {
        if (email == null) return false;
        if (string.IsNullOrEmpty(email.Id)) return false;
        if (string.IsNullOrEmpty(email.BodyText) && string.IsNullOrEmpty(email.BodyHtml)) return false;

        return true;
    }

    #endregion

    #region Error Simulation Helpers

    /// <summary>
    /// Creates a network error for testing error handling
    /// </summary>
    /// <param name="message">Error message</param>
    /// <returns>Network error instance</returns>
    public static NetworkError CreateNetworkError(string message = "Network connection failed")
    {
        return new NetworkError(message, "Simulated network failure for testing");
    }

    /// <summary>
    /// Creates an authentication error for testing error handling
    /// </summary>
    /// <param name="message">Error message</param>
    /// <returns>Authentication error instance</returns>
    public static AuthenticationError CreateAuthenticationError(string message = "Authentication failed")
    {
        return new AuthenticationError(message, "Simulated authentication failure for testing");
    }

    /// <summary>
    /// Creates a validation error for testing error handling
    /// </summary>
    /// <param name="message">Error message</param>
    /// <returns>Validation error instance</returns>
    public static ValidationError CreateValidationError(string message = "Validation failed")
    {
        return new ValidationError(message);
    }

    /// <summary>
    /// Creates a rate limit error for testing error handling
    /// </summary>
    /// <param name="message">Error message</param>
    /// <param name="retryAfter">Retry delay</param>
    /// <returns>Rate limit error instance</returns>
    public static RateLimitError CreateRateLimitError(string message = "Rate limit exceeded", TimeSpan? retryAfter = null)
    {
        return new RateLimitError(message, "Simulated rate limit for testing")
        {
            RetryAfter = retryAfter ?? TimeSpan.FromMinutes(1)
        };
    }

    #endregion

    #region Gmail API Test Data

    /// <summary>
    /// Creates sample Gmail API message data for testing
    /// </summary>
    /// <param name="messageId">Message ID</param>
    /// <returns>Sample Gmail API message</returns>
    public static Message CreateSampleGmailMessage(string messageId = "sample_gmail_msg")
    {
        return new Message
        {
            Id = messageId,
            ThreadId = "sample_thread",
            LabelIds = new[] { "INBOX", "UNREAD" },
            Snippet = "This is a sample email snippet...",
            HistoryId = 12345,
            InternalDate = DateTimeOffset.UtcNow.AddHours(-1).ToUnixTimeMilliseconds(),
            SizeEstimate = 2048,
            Payload = CreateSampleMessagePart()
        };
    }

    /// <summary>
    /// Creates sample Gmail API message part for testing
    /// </summary>
    /// <returns>Sample message part</returns>
    private static MessagePart CreateSampleMessagePart()
    {
        return new MessagePart
        {
            PartId = "0",
            MimeType = "multipart/alternative",
            Headers = new[]
            {
                new MessagePartHeader { Name = "Subject", Value = "Sample Email Subject" },
                new MessagePartHeader { Name = "From", Value = "sender@example.com" },
                new MessagePartHeader { Name = "To", Value = "recipient@example.com" },
                new MessagePartHeader { Name = "Date", Value = DateTime.UtcNow.AddHours(-1).ToString("R") }
            },
            Body = new MessagePartBody
            {
                Size = 1024,
                Data = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("Sample email body content"))
            }
        };
    }

    #endregion
}