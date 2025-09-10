namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Rate limiting and retry configuration constants
/// </summary>
public static class GmailRateLimitConstants
{
    /// <summary>HTTP status code for rate limiting errors</summary>
    public const int HTTP_TOO_MANY_REQUESTS = 429;

    /// <summary>HTTP status code for forbidden access</summary>
    public const int HTTP_FORBIDDEN = 403;

    /// <summary>HTTP status code for unauthorized access</summary>
    public const int HTTP_UNAUTHORIZED = 401;

    /// <summary>Default base delay for exponential backoff (milliseconds)</summary>
    public const int DEFAULT_BASE_DELAY_MS = 1000;

    /// <summary>Maximum delay for exponential backoff (milliseconds)</summary>
    public const int MAX_BACKOFF_DELAY_MS = 120_000; // 2 minutes

    /// <summary>Default maximum retry attempts</summary>
    public const int DEFAULT_MAX_RETRIES = 5;

    /// <summary>Jitter factor for randomizing retry delays (0.0 to 1.0)</summary>
    public const double JITTER_FACTOR = 0.1;

    /// <summary>Backoff multiplier for exponential backoff</summary>
    public const double BACKOFF_MULTIPLIER = 2.0;

    /// <summary>Request timeout for individual API calls (milliseconds)</summary>
    public const int DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
}