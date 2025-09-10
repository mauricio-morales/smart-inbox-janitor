using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using Google;
using TrashMailPanda.Shared;
using TrashMailPanda.Shared.Base;
using TrashMailPanda.Shared.Models;
using TrashMailPanda.Shared.Security;
using TrashMailPanda.Providers.Email.Models;
using TrashMailPanda.Providers.Email.Services;

namespace TrashMailPanda.Providers.Email;

/// <summary>
/// Gmail implementation of IEmailProvider using BaseProvider pattern
/// Provides Gmail-specific email operations with robust error handling and rate limiting
/// </summary>
public class GmailEmailProvider : BaseProvider<GmailProviderConfig>, IEmailProvider
{
    private readonly ISecureStorageManager _secureStorageManager;
    private readonly IGmailRateLimitHandler _rateLimitHandler;
    private GmailService? _gmailService;
    private UserCredential? _credential;

    /// <summary>
    /// Gets the provider name
    /// </summary>
    public override string Name => "Gmail";

    /// <summary>
    /// Gets the provider version
    /// </summary>
    public override string Version => "1.0.0";

    /// <summary>
    /// Initializes a new instance of the GmailEmailProvider
    /// </summary>
    /// <param name="secureStorageManager">Secure storage manager for OAuth tokens</param>
    /// <param name="rateLimitHandler">Rate limiting handler for API calls</param>
    /// <param name="logger">Logger for the provider</param>
    public GmailEmailProvider(
        ISecureStorageManager secureStorageManager,
        IGmailRateLimitHandler rateLimitHandler,
        ILogger<GmailEmailProvider> logger)
        : base(logger)
    {
        _secureStorageManager = secureStorageManager ?? throw new ArgumentNullException(nameof(secureStorageManager));
        _rateLimitHandler = rateLimitHandler ?? throw new ArgumentNullException(nameof(rateLimitHandler));
    }

    #region BaseProvider Implementation

    /// <summary>
    /// Performs Gmail-specific initialization including OAuth authentication
    /// </summary>
    /// <param name="config">Gmail provider configuration</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating success or failure</returns>
    protected override async Task<Result<bool>> PerformInitializationAsync(GmailProviderConfig config, CancellationToken cancellationToken)
    {
        try
        {
            // Initialize secure storage
            var storageResult = await _secureStorageManager.InitializeAsync();
            if (!storageResult.IsSuccess)
            {
                return Result<bool>.Failure(new InitializationError(
                    $"Failed to initialize secure storage: {storageResult.ErrorMessage}"));
            }

            // Attempt to retrieve existing credentials
            var credentialResult = await TryRetrieveStoredCredentialsAsync(config);
            if (credentialResult.IsFailure)
            {
                return Result<bool>.Failure(credentialResult.Error);
            }

            // Create Gmail service
            var serviceResult = await CreateGmailServiceAsync(config, cancellationToken);
            if (serviceResult.IsFailure)
            {
                return Result<bool>.Failure(serviceResult.Error);
            }

            _gmailService = serviceResult.Value;

            // Test the connection
            var testResult = await TestGmailConnectionAsync(cancellationToken);
            if (testResult.IsFailure)
            {
                return testResult;
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(ex.ToProviderError("Gmail provider initialization failed"));
        }
    }

    /// <summary>
    /// Performs Gmail-specific shutdown cleanup
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A result indicating success or failure</returns>
    protected override async Task<Result<bool>> PerformShutdownAsync(CancellationToken cancellationToken)
    {
        try
        {
            _gmailService?.Dispose();
            _gmailService = null;
            _credential = null;

            await Task.CompletedTask; // Placeholder for any async cleanup
            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(ex.ToProviderError("Gmail provider shutdown failed"));
        }
    }

    /// <summary>
    /// Performs Gmail-specific health checks
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health check result</returns>
    protected override async Task<Result<HealthCheckResult>> PerformHealthCheckAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (_gmailService == null)
            {
                return Result<HealthCheckResult>.Success(
                    HealthCheckResult.Critical("Gmail service not initialized"));
            }

            // Test basic connectivity by getting user profile
            var profileResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var profile = await _gmailService.Users.GetProfile(GmailApiConstants.USER_ID_ME).ExecuteAsync(cancellationToken);
                return profile;
            }, cancellationToken);

            if (profileResult.IsFailure)
            {
                return Result<HealthCheckResult>.Success(
                    HealthCheckResult.FromError(profileResult.Error, TimeSpan.Zero));
            }

            var profile = profileResult.Value;
            var healthData = new Dictionary<string, object>
            {
                { "EmailAddress", profile.EmailAddress ?? "Unknown" },
                { "MessagesTotal", profile.MessagesTotal ?? 0 },
                { "ThreadsTotal", profile.ThreadsTotal ?? 0 },
                { "HistoryId", profile.HistoryId ?? 0 }
            };

            return Result<HealthCheckResult>.Success(
                HealthCheckResult.Healthy("Gmail API connection successful") with
                {
                    Diagnostics = healthData
                });
        }
        catch (Exception ex)
        {
            return Result<HealthCheckResult>.Success(
                HealthCheckResult.FromError(ex.ToProviderError("Health check failed"), TimeSpan.Zero));
        }
    }

    #endregion

    #region IEmailProvider Implementation

    /// <summary>
    /// Connect to Gmail using OAuth2 authentication
    /// </summary>
    public async Task ConnectAsync()
    {
        var result = await ExecuteOperationAsync("Connect", async (cancellationToken) =>
        {
            if (Configuration == null)
            {
                return Result<bool>.Failure(new ConfigurationError("Provider not initialized with configuration"));
            }

            // Check if already connected
            if (_gmailService != null)
            {
                return Result<bool>.Success(true);
            }

            // Attempt OAuth flow
            var authResult = await PerformOAuthFlowAsync(Configuration, cancellationToken);
            if (authResult.IsFailure)
            {
                return authResult;
            }

            return Result<bool>.Success(true);
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to connect to Gmail: {result.Error.Message}", result.Error.InnerException);
        }
    }

    /// <summary>
    /// List emails with filtering and pagination options
    /// </summary>
    /// <param name="options">Search and filter options</param>
    /// <returns>List of email summaries</returns>
    public async Task<IReadOnlyList<EmailSummary>> ListAsync(ListOptions options)
    {
        var result = await ExecuteOperationAsync("List", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<IReadOnlyList<EmailSummary>>.Failure(
                    new InvalidOperationError(GmailErrorMessages.SERVICE_NOT_INITIALIZED));
            }

            var listResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var request = _gmailService.Users.Messages.List(GmailApiConstants.USER_ID_ME);

                // Apply search options
                if (!string.IsNullOrEmpty(options.Query))
                    request.Q = options.Query;

                if (options.MaxResults.HasValue)
                    request.MaxResults = Math.Min(options.MaxResults.Value, GmailQuotas.MAX_LIST_RESULTS);
                else
                    request.MaxResults = Configuration?.DefaultPageSize ?? GmailQuotas.DEFAULT_LIST_RESULTS;

                if (!string.IsNullOrEmpty(options.PageToken))
                    request.PageToken = options.PageToken;

                if (options.LabelIds?.Any() == true)
                    request.LabelIds = options.LabelIds.ToList();

                var response = await request.ExecuteAsync(cancellationToken);
                return response;
            }, cancellationToken);

            if (listResult.IsFailure)
            {
                return Result<IReadOnlyList<EmailSummary>>.Failure(listResult.Error);
            }

            var messageList = listResult.Value;
            if (messageList.Messages == null || !messageList.Messages.Any())
            {
                return Result<IReadOnlyList<EmailSummary>>.Success(Array.Empty<EmailSummary>());
            }

            // Get detailed information for each message in batches
            var summaries = await GetMessageSummariesAsync(messageList.Messages, cancellationToken);
            return Result<IReadOnlyList<EmailSummary>>.Success(summaries);
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to list emails: {result.Error.Message}", result.Error.InnerException);
        }

        return result.Value;
    }

    /// <summary>
    /// Get full email content including headers and body
    /// </summary>
    /// <param name="id">Email ID</param>
    /// <returns>Complete email details</returns>
    public async Task<EmailFull> GetAsync(string id)
    {
        var result = await ExecuteOperationAsync("Get", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<EmailFull>.Failure(
                    new InvalidOperationError(GmailErrorMessages.SERVICE_NOT_INITIALIZED));
            }

            if (string.IsNullOrWhiteSpace(id))
            {
                return Result<EmailFull>.Failure(
                    new ValidationError(string.Format(GmailErrorMessages.INVALID_MESSAGE_ID, id)));
            }

            var messageResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var request = _gmailService.Users.Messages.Get(GmailApiConstants.USER_ID_ME, id);
                request.Format = UsersResource.MessagesResource.GetRequest.FormatEnum.Full;

                var message = await request.ExecuteAsync(cancellationToken);
                return message;
            }, cancellationToken);

            if (messageResult.IsFailure)
            {
                return Result<EmailFull>.Failure(messageResult.Error);
            }

            var emailFull = MapToEmailFull(messageResult.Value);
            return Result<EmailFull>.Success(emailFull);
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to get email: {result.Error.Message}", result.Error.InnerException);
        }

        return result.Value;
    }

    /// <summary>
    /// Perform batch operations on multiple emails (labels, trash, etc.)
    /// </summary>
    /// <param name="request">Batch modification request</param>
    public async Task BatchModifyAsync(BatchModifyRequest request)
    {
        var result = await ExecuteOperationAsync("BatchModify", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<bool>.Failure(
                    new InvalidOperationError(GmailErrorMessages.SERVICE_NOT_INITIALIZED));
            }

            if (request.EmailIds == null || !request.EmailIds.Any())
            {
                return Result<bool>.Success(true); // Nothing to do
            }

            // Split into batches if necessary
            var batchSize = Configuration?.BatchSize ?? GmailQuotas.RECOMMENDED_BATCH_SIZE;
            var batches = request.EmailIds.Batch(batchSize);

            foreach (var batch in batches)
            {
                var batchResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
                {
                    var batchRequest = new BatchModifyMessagesRequest
                    {
                        Ids = batch.ToList()
                    };

                    if (request.AddLabelIds?.Any() == true)
                        batchRequest.AddLabelIds = request.AddLabelIds.ToList();

                    if (request.RemoveLabelIds?.Any() == true)
                        batchRequest.RemoveLabelIds = request.RemoveLabelIds.ToList();

                    await _gmailService.Users.Messages.BatchModify(batchRequest, GmailApiConstants.USER_ID_ME)
                        .ExecuteAsync(cancellationToken);

                    return true;
                }, cancellationToken);

                if (batchResult.IsFailure)
                {
                    return Result<bool>.Failure(batchResult.Error);
                }
            }

            return Result<bool>.Success(true);
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to batch modify emails: {result.Error.Message}", result.Error.InnerException);
        }
    }

    /// <summary>
    /// Hard delete email (use sparingly, prefer trash)
    /// </summary>
    /// <param name="id">Email ID</param>
    public async Task DeleteAsync(string id)
    {
        var result = await ExecuteOperationAsync("Delete", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<bool>.Failure(
                    new InvalidOperationError(GmailErrorMessages.SERVICE_NOT_INITIALIZED));
            }

            if (string.IsNullOrWhiteSpace(id))
            {
                return Result<bool>.Failure(
                    new ValidationError(string.Format(GmailErrorMessages.INVALID_MESSAGE_ID, id)));
            }

            var deleteResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                await _gmailService.Users.Messages.Delete(GmailApiConstants.USER_ID_ME, id)
                    .ExecuteAsync(cancellationToken);
                return true;
            }, cancellationToken);

            return deleteResult;
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to delete email: {result.Error.Message}", result.Error.InnerException);
        }
    }

    /// <summary>
    /// Report email as spam (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    public async Task ReportSpamAsync(string id)
    {
        var result = await ExecuteOperationAsync("ReportSpam", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<bool>.Failure(
                    new InvalidOperationError(GmailErrorMessages.SERVICE_NOT_INITIALIZED));
            }

            var spamResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var modifyRequest = new ModifyMessageRequest
                {
                    AddLabelIds = new List<string> { GmailLabels.SPAM },
                    RemoveLabelIds = new List<string> { GmailLabels.INBOX }
                };

                await _gmailService.Users.Messages.Modify(modifyRequest, GmailApiConstants.USER_ID_ME, id)
                    .ExecuteAsync(cancellationToken);

                return true;
            }, cancellationToken);

            return spamResult;
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to report spam: {result.Error.Message}", result.Error.InnerException);
        }
    }

    /// <summary>
    /// Report email as phishing (provider-dependent)
    /// </summary>
    /// <param name="id">Email ID</param>
    public async Task ReportPhishingAsync(string id)
    {
        var result = await ExecuteOperationAsync("ReportPhishing", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<bool>.Failure(
                    new InvalidOperationError(GmailErrorMessages.SERVICE_NOT_INITIALIZED));
            }

            // Gmail doesn't have explicit phishing API, so we fall back to spam labeling
            var phishingResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var modifyRequest = new ModifyMessageRequest
                {
                    AddLabelIds = new List<string> { GmailLabels.SPAM },
                    RemoveLabelIds = new List<string> { GmailLabels.INBOX }
                };

                await _gmailService.Users.Messages.Modify(modifyRequest, GmailApiConstants.USER_ID_ME, id)
                    .ExecuteAsync(cancellationToken);

                return true;
            }, cancellationToken);

            return phishingResult;
        });

        if (result.IsFailure)
        {
            throw new InvalidOperationException($"Failed to report phishing: {result.Error.Message}", result.Error.InnerException);
        }
    }

    /// <summary>
    /// Get authenticated user information
    /// </summary>
    /// <returns>Authenticated user details or null if not authenticated</returns>
    public async Task<AuthenticatedUserInfo?> GetAuthenticatedUserAsync()
    {
        var result = await ExecuteOperationAsync("GetAuthenticatedUser", async (cancellationToken) =>
        {
            if (_gmailService == null)
            {
                return Result<AuthenticatedUserInfo?>.Success(null);
            }

            var profileResult = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var profile = await _gmailService.Users.GetProfile(GmailApiConstants.USER_ID_ME)
                    .ExecuteAsync(cancellationToken);
                return profile;
            }, cancellationToken);

            if (profileResult.IsFailure)
            {
                return Result<AuthenticatedUserInfo?>.Success(null);
            }

            var profile = profileResult.Value;
            var userInfo = new AuthenticatedUserInfo
            {
                Email = profile.EmailAddress ?? string.Empty,
                MessagesTotal = (int)(profile.MessagesTotal ?? 0),
                ThreadsTotal = (int)(profile.ThreadsTotal ?? 0),
                HistoryId = profile.HistoryId?.ToString() ?? string.Empty
            };

            return Result<AuthenticatedUserInfo?>.Success(userInfo);
        });

        return result.IsSuccess ? result.Value : null;
    }

    /// <summary>
    /// Check provider health status
    /// </summary>
    /// <returns>Health check result</returns>
    public async Task<Result<bool>> HealthCheckAsync()
    {
        var healthResult = await PerformHealthCheckAsync(CancellationToken.None);
        if (healthResult.IsFailure)
        {
            return Result<bool>.Failure(healthResult.Error);
        }

        var health = healthResult.Value;
        return health.Status == HealthStatus.Healthy ?
            Result<bool>.Success(true) :
            Result<bool>.Failure(new ServiceUnavailableError(health.Description));
    }

    #endregion

    #region Private Helper Methods

    /// <summary>
    /// Attempts to retrieve stored OAuth credentials
    /// </summary>
    private async Task<Result<bool>> TryRetrieveStoredCredentialsAsync(GmailProviderConfig config)
    {
        try
        {
            var accessTokenResult = await _secureStorageManager.RetrieveCredentialAsync(GmailStorageKeys.ACCESS_TOKEN);
            var refreshTokenResult = await _secureStorageManager.RetrieveCredentialAsync(GmailStorageKeys.REFRESH_TOKEN);

            // If we have stored tokens, attempt to use them
            if (accessTokenResult.IsSuccess && refreshTokenResult.IsSuccess)
            {
                // TODO: Implement token-based credential creation
                // For now, we'll proceed with OAuth flow
            }

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(ex.ToProviderError("Failed to retrieve stored credentials"));
        }
    }

    /// <summary>
    /// Performs OAuth2 authentication flow
    /// </summary>
    private async Task<Result<bool>> PerformOAuthFlowAsync(GmailProviderConfig config, CancellationToken cancellationToken)
    {
        try
        {
            var clientSecrets = new ClientSecrets
            {
                ClientId = config.ClientId,
                ClientSecret = config.ClientSecret
            };

            _credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                clientSecrets,
                config.Scopes,
                "user",
                cancellationToken,
                new FileDataStore("TrashMailPanda", true));

            // Store tokens securely
            await StoreCredentialsAsync(_credential);

            return Result<bool>.Success(true);
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(ex.ToProviderError("OAuth authentication failed"));
        }
    }

    /// <summary>
    /// Creates a Gmail service instance
    /// </summary>
    private async Task<Result<GmailService>> CreateGmailServiceAsync(GmailProviderConfig config, CancellationToken cancellationToken)
    {
        try
        {
            if (_credential == null)
            {
                var authResult = await PerformOAuthFlowAsync(config, cancellationToken);
                if (authResult.IsFailure)
                {
                    return Result<GmailService>.Failure(authResult.Error);
                }
            }

            var service = new GmailService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = _credential,
                ApplicationName = config.ApplicationName
            });

            return Result<GmailService>.Success(service);
        }
        catch (Exception ex)
        {
            return Result<GmailService>.Failure(ex.ToProviderError("Failed to create Gmail service"));
        }
    }

    /// <summary>
    /// Tests the Gmail connection
    /// </summary>
    private async Task<Result<bool>> TestGmailConnectionAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (_gmailService == null)
            {
                return Result<bool>.Failure(new InvalidOperationError("Gmail service not created"));
            }

            var result = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
            {
                var profile = await _gmailService.Users.GetProfile(GmailApiConstants.USER_ID_ME)
                    .ExecuteAsync(cancellationToken);
                return profile != null && !string.IsNullOrEmpty(profile.EmailAddress);
            }, cancellationToken);

            return result;
        }
        catch (Exception ex)
        {
            return Result<bool>.Failure(ex.ToProviderError("Gmail connection test failed"));
        }
    }

    /// <summary>
    /// Stores OAuth credentials securely
    /// </summary>
    private async Task StoreCredentialsAsync(UserCredential credential)
    {
        try
        {
            if (credential.Token != null)
            {
                await _secureStorageManager.StoreCredentialAsync(
                    GmailStorageKeys.ACCESS_TOKEN,
                    credential.Token.AccessToken);

                if (!string.IsNullOrEmpty(credential.Token.RefreshToken))
                {
                    await _secureStorageManager.StoreCredentialAsync(
                        GmailStorageKeys.REFRESH_TOKEN,
                        credential.Token.RefreshToken);
                }

                await _secureStorageManager.StoreCredentialAsync(
                    GmailStorageKeys.TOKEN_EXPIRY,
                    credential.Token.ExpiresInSeconds?.ToString() ?? "0");
            }
        }
        catch (Exception ex)
        {
            // Log but don't fail - we can still function without stored tokens
            RecordMetric("credential_storage_errors", 1);
            // Note: Exception logged via metrics, not throwing to maintain functionality
            _ = ex; // Suppress unused variable warning
        }
    }

    /// <summary>
    /// Gets message summaries for a list of messages
    /// </summary>
    private async Task<IReadOnlyList<EmailSummary>> GetMessageSummariesAsync(
        IList<Message> messages,
        CancellationToken cancellationToken)
    {
        var summaries = new List<EmailSummary>();

        // Process messages in batches to avoid overwhelming the API
        var batchSize = Math.Min(10, Configuration?.BatchSize ?? 10);
        var batches = messages.Batch(batchSize);

        foreach (var batch in batches)
        {
            var batchTasks = batch.Select(async message =>
            {
                var result = await _rateLimitHandler.ExecuteWithRetryAsync(async () =>
                {
                    var fullMessage = await _gmailService!.Users.Messages
                        .Get(GmailApiConstants.USER_ID_ME, message.Id)
                        .ExecuteAsync(cancellationToken);
                    return fullMessage;
                }, cancellationToken);

                return result.IsSuccess ? MapToEmailSummary(result.Value) : null;
            });

            var batchResults = await Task.WhenAll(batchTasks);
            summaries.AddRange(batchResults.Where(s => s != null)!);
        }

        return summaries;
    }

    /// <summary>
    /// Maps a Gmail Message to EmailSummary
    /// </summary>
    private static EmailSummary MapToEmailSummary(Message message)
    {
        var headers = message.Payload?.Headers?.ToDictionary(h => h.Name, h => h.Value) ?? new Dictionary<string, string>();

        return new EmailSummary
        {
            Id = message.Id,
            ThreadId = message.ThreadId,
            LabelIds = message.LabelIds?.ToArray() ?? Array.Empty<string>(),
            Snippet = message.Snippet ?? string.Empty,
            HistoryId = (long)(message.HistoryId ?? 0),
            InternalDate = (long)(message.InternalDate ?? 0),
            Subject = headers.GetValueOrDefault("Subject", string.Empty),
            From = headers.GetValueOrDefault("From", string.Empty),
            To = headers.GetValueOrDefault("To", string.Empty),
            ReceivedDate = DateTimeOffset.FromUnixTimeMilliseconds((long)(message.InternalDate ?? 0)).DateTime,
            HasAttachments = HasAttachments(message.Payload),
            SizeEstimate = (long)(message.SizeEstimate ?? 0)
        };
    }

    /// <summary>
    /// Maps a Gmail Message to EmailFull
    /// </summary>
    private static EmailFull MapToEmailFull(Message message)
    {
        var headers = message.Payload?.Headers?.ToDictionary(h => h.Name, h => h.Value) ?? new Dictionary<string, string>();
        var bodyText = GetBodyText(message.Payload);
        var bodyHtml = GetBodyHtml(message.Payload);
        var attachments = GetAttachments(message.Payload);

        return new EmailFull
        {
            Id = message.Id,
            ThreadId = message.ThreadId,
            LabelIds = message.LabelIds?.ToArray() ?? Array.Empty<string>(),
            Snippet = message.Snippet ?? string.Empty,
            HistoryId = (long)(message.HistoryId ?? 0),
            InternalDate = (long)(message.InternalDate ?? 0),
            Headers = headers,
            BodyText = bodyText,
            BodyHtml = bodyHtml,
            Attachments = attachments,
            SizeEstimate = (long)(message.SizeEstimate ?? 0)
        };
    }

    /// <summary>
    /// Checks if a message has attachments
    /// </summary>
    private static bool HasAttachments(MessagePart? payload)
    {
        if (payload == null) return false;

        if (payload.Parts != null)
        {
            return payload.Parts.Any(part =>
                !string.IsNullOrEmpty(part.Filename) ||
                (part.Body?.AttachmentId != null));
        }

        return !string.IsNullOrEmpty(payload.Filename) || (payload.Body?.AttachmentId != null);
    }

    /// <summary>
    /// Extracts plain text body from message
    /// </summary>
    private static string? GetBodyText(MessagePart? payload)
    {
        if (payload == null) return null;

        if (payload.MimeType == GmailMimeTypes.TEXT_PLAIN && payload.Body?.Data != null)
        {
            return DecodeBase64String(payload.Body.Data);
        }

        if (payload.Parts != null)
        {
            foreach (var part in payload.Parts)
            {
                var text = GetBodyText(part);
                if (!string.IsNullOrEmpty(text))
                    return text;
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts HTML body from message
    /// </summary>
    private static string? GetBodyHtml(MessagePart? payload)
    {
        if (payload == null) return null;

        if (payload.MimeType == GmailMimeTypes.TEXT_HTML && payload.Body?.Data != null)
        {
            return DecodeBase64String(payload.Body.Data);
        }

        if (payload.Parts != null)
        {
            foreach (var part in payload.Parts)
            {
                var html = GetBodyHtml(part);
                if (!string.IsNullOrEmpty(html))
                    return html;
            }
        }

        return null;
    }

    /// <summary>
    /// Extracts attachments from message
    /// </summary>
    private static IReadOnlyList<EmailAttachment> GetAttachments(MessagePart? payload)
    {
        var attachments = new List<EmailAttachment>();
        CollectAttachments(payload, attachments);
        return attachments;
    }

    /// <summary>
    /// Recursively collects attachments from message parts
    /// </summary>
    private static void CollectAttachments(MessagePart? part, List<EmailAttachment> attachments)
    {
        if (part == null) return;

        if (!string.IsNullOrEmpty(part.Filename) || part.Body?.AttachmentId != null)
        {
            attachments.Add(new EmailAttachment
            {
                FileName = part.Filename ?? "unknown",
                MimeType = part.MimeType ?? GmailMimeTypes.APPLICATION_OCTET_STREAM,
                Size = part.Body?.Size ?? 0,
                AttachmentId = part.Body?.AttachmentId ?? string.Empty
            });
        }

        if (part.Parts != null)
        {
            foreach (var childPart in part.Parts)
            {
                CollectAttachments(childPart, attachments);
            }
        }
    }

    /// <summary>
    /// Decodes Gmail's URL-safe base64 encoding
    /// </summary>
    private static string DecodeBase64String(string base64String)
    {
        try
        {
            base64String = base64String.Replace('-', '+').Replace('_', '/');

            switch (base64String.Length % 4)
            {
                case 2: base64String += "=="; break;
                case 3: base64String += "="; break;
            }

            var bytes = Convert.FromBase64String(base64String);
            return Encoding.UTF8.GetString(bytes);
        }
        catch
        {
            return string.Empty;
        }
    }

    #endregion
}

/// <summary>
/// Extension methods for batch processing
/// </summary>
internal static class EnumerableExtensions
{
    /// <summary>
    /// Splits an enumerable into batches of the specified size
    /// </summary>
    public static IEnumerable<IEnumerable<T>> Batch<T>(this IEnumerable<T> source, int batchSize)
    {
        var batch = new List<T>(batchSize);
        foreach (var item in source)
        {
            batch.Add(item);
            if (batch.Count == batchSize)
            {
                yield return batch;
                batch = new List<T>(batchSize);
            }
        }
        if (batch.Count > 0)
            yield return batch;
    }
}