using Google.Apis.Auth.OAuth2;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using Google.Apis.Util.Store;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using TransMailPanda.Shared;

namespace TransMailPanda.Providers.Email;

/// <summary>
/// Gmail implementation of IEmailProvider
/// Provides Gmail-specific email operations using Google APIs
/// </summary>
public class GmailEmailProvider : IEmailProvider
{
    private GmailService? _service;
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _applicationName;
    private readonly string[] _scopes = { GmailService.Scope.GmailModify };

    public GmailEmailProvider(string clientId, string clientSecret, string applicationName = "TransMail Panda")
    {
        _clientId = clientId;
        _clientSecret = clientSecret;
        _applicationName = applicationName;
    }

    public async Task ConnectAsync()
    {
        try
        {
            // Create OAuth2 credentials
            var clientSecrets = new ClientSecrets
            {
                ClientId = _clientId,
                ClientSecret = _clientSecret
            };

            // Use file-based token storage for now (will be enhanced with OS keychain later)
            var credentialPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), 
                "TransMailPanda", "tokens");
            Directory.CreateDirectory(credentialPath);

            // Request OAuth2 authorization
            var credential = await GoogleWebAuthorizationBroker.AuthorizeAsync(
                clientSecrets,
                _scopes,
                "user",
                CancellationToken.None,
                new FileDataStore(credentialPath, true));

            // Create Gmail service
            _service = new GmailService(new BaseClientService.Initializer()
            {
                HttpClientInitializer = credential,
                ApplicationName = _applicationName
            });
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to connect to Gmail: {ex.Message}", ex);
        }
    }

    public async Task<IReadOnlyList<EmailSummary>> ListAsync(ListOptions options)
    {
        if (_service == null)
            throw new InvalidOperationException("Gmail service not initialized. Call ConnectAsync first.");

        var request = _service.Users.Messages.List("me");
        
        if (!string.IsNullOrEmpty(options.Query))
            request.Q = options.Query;
        
        if (options.MaxResults.HasValue)
            request.MaxResults = options.MaxResults.Value;
        
        if (!string.IsNullOrEmpty(options.PageToken))
            request.PageToken = options.PageToken;

        if (options.LabelIds?.Any() == true)
            request.LabelIds = options.LabelIds.ToList();

        var response = await request.ExecuteAsync();
        if (response.Messages == null)
            return Array.Empty<EmailSummary>();

        // Get detailed information for each message
        var emailSummaries = new List<EmailSummary>();
        foreach (var message in response.Messages)
        {
            var fullMessage = await _service.Users.Messages.Get("me", message.Id).ExecuteAsync();
            var summary = MapToEmailSummary(fullMessage);
            emailSummaries.Add(summary);
        }

        return emailSummaries;
    }

    public async Task<EmailFull> GetAsync(string id)
    {
        if (_service == null)
            throw new InvalidOperationException("Gmail service not initialized. Call ConnectAsync first.");

        var request = _service.Users.Messages.Get("me", id);
        request.Format = UsersResource.MessagesResource.GetRequest.FormatEnum.Full;

        var message = await request.ExecuteAsync();
        return MapToEmailFull(message);
    }

    public async Task BatchModifyAsync(BatchModifyRequest request)
    {
        if (_service == null)
            throw new InvalidOperationException("Gmail service not initialized. Call ConnectAsync first.");

        var batchRequest = new BatchModifyMessagesRequest
        {
            Ids = request.EmailIds.ToList()
        };

        if (request.AddLabelIds?.Any() == true)
            batchRequest.AddLabelIds = request.AddLabelIds.ToList();

        if (request.RemoveLabelIds?.Any() == true)
            batchRequest.RemoveLabelIds = request.RemoveLabelIds.ToList();

        await _service.Users.Messages.BatchModify(batchRequest, "me").ExecuteAsync();
    }

    public async Task DeleteAsync(string id)
    {
        if (_service == null)
            throw new InvalidOperationException("Gmail service not initialized. Call ConnectAsync first.");

        await _service.Users.Messages.Delete("me", id).ExecuteAsync();
    }

    public async Task ReportSpamAsync(string id)
    {
        if (_service == null)
            throw new InvalidOperationException("Gmail service not initialized. Call ConnectAsync first.");

        // Move to spam folder by adding SPAM label
        var modifyRequest = new ModifyMessageRequest
        {
            AddLabelIds = new List<string> { "SPAM" }
        };

        await _service.Users.Messages.Modify(modifyRequest, "me", id).ExecuteAsync();
    }

    public async Task ReportPhishingAsync(string id)
    {
        if (_service == null)
            throw new InvalidOperationException("Gmail service not initialized. Call ConnectAsync first.");

        // For phishing, move to spam and potentially report (Gmail doesn't have explicit phishing API)
        var modifyRequest = new ModifyMessageRequest
        {
            AddLabelIds = new List<string> { "SPAM" },
            RemoveLabelIds = new List<string> { "INBOX" }
        };

        await _service.Users.Messages.Modify(modifyRequest, "me", id).ExecuteAsync();
    }

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

    private static string? GetBodyText(MessagePart? payload)
    {
        if (payload == null) return null;

        // Check if this part is text/plain
        if (payload.MimeType == "text/plain" && payload.Body?.Data != null)
        {
            return DecodeBase64String(payload.Body.Data);
        }

        // Recursively check parts
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

    private static string? GetBodyHtml(MessagePart? payload)
    {
        if (payload == null) return null;

        // Check if this part is text/html
        if (payload.MimeType == "text/html" && payload.Body?.Data != null)
        {
            return DecodeBase64String(payload.Body.Data);
        }

        // Recursively check parts
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

    private static IReadOnlyList<EmailAttachment> GetAttachments(MessagePart? payload)
    {
        var attachments = new List<EmailAttachment>();
        CollectAttachments(payload, attachments);
        return attachments;
    }

    private static void CollectAttachments(MessagePart? part, List<EmailAttachment> attachments)
    {
        if (part == null) return;

        if (!string.IsNullOrEmpty(part.Filename) || part.Body?.AttachmentId != null)
        {
            attachments.Add(new EmailAttachment
            {
                FileName = part.Filename ?? "unknown",
                MimeType = part.MimeType ?? "application/octet-stream",
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

    private static string DecodeBase64String(string base64String)
    {
        try
        {
            // Gmail uses URL-safe base64 encoding
            base64String = base64String.Replace('-', '+').Replace('_', '/');
            
            // Add padding if necessary
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
}