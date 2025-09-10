using System;
using TrashMailPanda.Shared.Base;

namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Rate limiting error specific to Gmail API operations
/// Used when Gmail API rate limits are exceeded
/// </summary>
public sealed record RateLimitError(string Message, string? Details = null, Exception? InnerException = null)
    : ProviderError(Message, Details, InnerException)
{
    public override string Category => "RateLimit";
    public override string ErrorCode => "RATE_LIMIT_EXCEEDED";
    public override bool IsTransient => true;

    /// <summary>
    /// Gets the suggested retry delay if provided by the service
    /// </summary>
    public TimeSpan? RetryAfter { get; init; }

    public override string GetUserFriendlyMessage()
    {
        var retryMessage = RetryAfter.HasValue ? $" Please wait {RetryAfter.Value.TotalSeconds:F0} seconds before trying again." : "";
        return $"Gmail API rate limit exceeded.{retryMessage}";
    }

    public override string GetDetailedDescription()
    {
        var description = base.GetDetailedDescription();
        if (RetryAfter.HasValue)
            description += $" | Retry After: {RetryAfter.Value.TotalSeconds:F0}s";
        return description;
    }
}