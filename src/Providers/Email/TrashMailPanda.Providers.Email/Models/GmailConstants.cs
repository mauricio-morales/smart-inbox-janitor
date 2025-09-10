namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// Gmail-specific constants including label IDs, API quotas, and configuration keys
/// Provides centralized constants for Gmail API operations and rate limiting
/// </summary>
[Obsolete("Use specific Gmail constant classes (GmailLabels, GmailQuotas, etc.) instead of nested classes. This class is kept for compatibility.")]
public static class GmailConstants
{
    /// <summary>
    /// Gmail label ID constants for standard system labels
    /// </summary>
    [Obsolete("Use GmailLabels class directly instead of GmailConstants.Labels")]
    public static class Labels
    {
        public const string INBOX = GmailLabels.INBOX;
        public const string TRASH = GmailLabels.TRASH;
        public const string SPAM = GmailLabels.SPAM;
        public const string UNREAD = GmailLabels.UNREAD;
        public const string STARRED = GmailLabels.STARRED;
        public const string IMPORTANT = GmailLabels.IMPORTANT;
        public const string SENT = GmailLabels.SENT;
        public const string DRAFT = GmailLabels.DRAFT;
        public const string ALL_MAIL = GmailLabels.ALL_MAIL;
        public const string CHAT = GmailLabels.CHAT;
        public const string CATEGORY_PERSONAL = GmailLabels.CATEGORY_PERSONAL;
        public const string CATEGORY_SOCIAL = GmailLabels.CATEGORY_SOCIAL;
        public const string CATEGORY_PROMOTIONS = GmailLabels.CATEGORY_PROMOTIONS;
        public const string CATEGORY_UPDATES = GmailLabels.CATEGORY_UPDATES;
        public const string CATEGORY_FORUMS = GmailLabels.CATEGORY_FORUMS;
    }

    /// <summary>
    /// Gmail API quota limits and operational constraints
    /// </summary>
    [Obsolete("Use GmailQuotas class directly instead of GmailConstants.Quotas")]
    public static class Quotas
    {
        public const int MAX_BATCH_SIZE = GmailQuotas.MAX_BATCH_SIZE;
        public const int RECOMMENDED_BATCH_SIZE = GmailQuotas.RECOMMENDED_BATCH_SIZE;
        public const int MAX_LIST_RESULTS = GmailQuotas.MAX_LIST_RESULTS;
        public const int DEFAULT_LIST_RESULTS = GmailQuotas.DEFAULT_LIST_RESULTS;
        public const int MAX_BATCH_MODIFY_MESSAGES = GmailQuotas.MAX_BATCH_MODIFY_MESSAGES;
        public const int QUOTA_UNITS_PER_PROJECT_MINUTE = GmailQuotas.QUOTA_UNITS_PER_PROJECT_MINUTE;
        public const int QUOTA_UNITS_PER_USER_MINUTE = GmailQuotas.QUOTA_UNITS_PER_USER_MINUTE;
        public const int QUOTA_UNITS_MESSAGE_GET = GmailQuotas.QUOTA_UNITS_MESSAGE_GET;
        public const int QUOTA_UNITS_MESSAGE_LIST = GmailQuotas.QUOTA_UNITS_MESSAGE_LIST;
        public const int QUOTA_UNITS_BATCH_MODIFY = GmailQuotas.QUOTA_UNITS_BATCH_MODIFY;
        public const int QUOTA_UNITS_MESSAGE_SEND = GmailQuotas.QUOTA_UNITS_MESSAGE_SEND;
        public const int QUOTA_UNITS_MESSAGE_DELETE = GmailQuotas.QUOTA_UNITS_MESSAGE_DELETE;
    }

    /// <summary>
    /// Secure storage key names for OAuth tokens and configuration
    /// </summary>
    [Obsolete("Use GmailStorageKeys class directly instead of GmailConstants.StorageKeys")]
    public static class StorageKeys
    {
        public const string KEY_PREFIX = GmailStorageKeys.KEY_PREFIX;
        public const string ACCESS_TOKEN = GmailStorageKeys.ACCESS_TOKEN;
        public const string REFRESH_TOKEN = GmailStorageKeys.REFRESH_TOKEN;
        public const string CLIENT_ID = GmailStorageKeys.CLIENT_ID;
        public const string CLIENT_SECRET = GmailStorageKeys.CLIENT_SECRET;
        public const string TOKEN_EXPIRY = GmailStorageKeys.TOKEN_EXPIRY;
        public const string TOKEN_TYPE = GmailStorageKeys.TOKEN_TYPE;
        public const string USER_EMAIL = GmailStorageKeys.USER_EMAIL;
        public const string LAST_AUTH_SUCCESS = GmailStorageKeys.LAST_AUTH_SUCCESS;
        public const string CONFIG_VERSION = GmailStorageKeys.CONFIG_VERSION;
    }

    /// <summary>
    /// Rate limiting and retry configuration constants
    /// </summary>
    [Obsolete("Use GmailRateLimitConstants class directly instead of GmailConstants.RateLimit")]
    public static class RateLimit
    {
        public const int HTTP_TOO_MANY_REQUESTS = GmailRateLimitConstants.HTTP_TOO_MANY_REQUESTS;
        public const int HTTP_FORBIDDEN = GmailRateLimitConstants.HTTP_FORBIDDEN;
        public const int HTTP_UNAUTHORIZED = GmailRateLimitConstants.HTTP_UNAUTHORIZED;
        public const int DEFAULT_BASE_DELAY_MS = GmailRateLimitConstants.DEFAULT_BASE_DELAY_MS;
        public const int MAX_BACKOFF_DELAY_MS = GmailRateLimitConstants.MAX_BACKOFF_DELAY_MS;
        public const int DEFAULT_MAX_RETRIES = GmailRateLimitConstants.DEFAULT_MAX_RETRIES;
        public const double JITTER_FACTOR = GmailRateLimitConstants.JITTER_FACTOR;
        public const double BACKOFF_MULTIPLIER = GmailRateLimitConstants.BACKOFF_MULTIPLIER;
        public const int DEFAULT_REQUEST_TIMEOUT_MS = GmailRateLimitConstants.DEFAULT_REQUEST_TIMEOUT_MS;
    }

    /// <summary>
    /// Gmail API endpoints and configuration
    /// </summary>
    [Obsolete("Use GmailApiConstants class directly instead of GmailConstants.Api")]
    public static class Api
    {
        public const string BASE_URL = GmailApiConstants.BASE_URL;
        public const string OAUTH_AUTH_URL = GmailApiConstants.OAUTH_AUTH_URL;
        public const string OAUTH_TOKEN_URL = GmailApiConstants.OAUTH_TOKEN_URL;
        public const string SCOPE_READONLY = GmailApiConstants.SCOPE_READONLY;
        public const string SCOPE_MODIFY = GmailApiConstants.SCOPE_MODIFY;
        public const string SCOPE_COMPOSE = GmailApiConstants.SCOPE_COMPOSE;
        public const string SCOPE_SEND = GmailApiConstants.SCOPE_SEND;
        public const string SCOPE_FULL_ACCESS = GmailApiConstants.SCOPE_FULL_ACCESS;
        public const string USER_ID_ME = GmailApiConstants.USER_ID_ME;
    }

    /// <summary>
    /// Error message templates and constants
    /// </summary>
    [Obsolete("Use GmailErrorMessages class directly instead of GmailConstants.ErrorMessages")]
    public static class ErrorMessages
    {
        public const string SERVICE_NOT_INITIALIZED = GmailErrorMessages.SERVICE_NOT_INITIALIZED;
        public const string AUTHENTICATION_REQUIRED = GmailErrorMessages.AUTHENTICATION_REQUIRED;
        public const string RATE_LIMIT_EXCEEDED = GmailErrorMessages.RATE_LIMIT_EXCEEDED;
        public const string INVALID_CONFIGURATION = GmailErrorMessages.INVALID_CONFIGURATION;
        public const string NETWORK_ERROR = GmailErrorMessages.NETWORK_ERROR;
        public const string QUOTA_EXCEEDED = GmailErrorMessages.QUOTA_EXCEEDED;
        public const string INVALID_MESSAGE_ID = GmailErrorMessages.INVALID_MESSAGE_ID;
        public const string BATCH_SIZE_EXCEEDED = GmailErrorMessages.BATCH_SIZE_EXCEEDED;
        public const string TOKEN_REFRESH_FAILED = GmailErrorMessages.TOKEN_REFRESH_FAILED;
        public const string PERMISSION_DENIED = GmailErrorMessages.PERMISSION_DENIED;
    }

    /// <summary>
    /// Search query helpers for Gmail operations
    /// </summary>
    [Obsolete("Use GmailSearchQueries class directly instead of GmailConstants.SearchQueries")]
    public static class SearchQueries
    {
        public const string UNREAD = GmailSearchQueries.UNREAD;
        public const string READ = GmailSearchQueries.READ;
        public const string STARRED = GmailSearchQueries.STARRED;
        public const string IMPORTANT = GmailSearchQueries.IMPORTANT;
        public const string HAS_ATTACHMENTS = GmailSearchQueries.HAS_ATTACHMENTS;
        public const string IN_INBOX = GmailSearchQueries.IN_INBOX;
        public const string IN_TRASH = GmailSearchQueries.IN_TRASH;
        public const string IN_SPAM = GmailSearchQueries.IN_SPAM;
        public const string FROM_SENDER = GmailSearchQueries.FROM_SENDER;
        public const string TO_RECIPIENT = GmailSearchQueries.TO_RECIPIENT;
        public const string SUBJECT_CONTAINS = GmailSearchQueries.SUBJECT_CONTAINS;
        public const string AFTER_DATE = GmailSearchQueries.AFTER_DATE;
        public const string BEFORE_DATE = GmailSearchQueries.BEFORE_DATE;
        public const string LARGER_THAN = GmailSearchQueries.LARGER_THAN;
        public const string SMALLER_THAN = GmailSearchQueries.SMALLER_THAN;
    }

    /// <summary>
    /// MIME type constants for email content
    /// </summary>
    [Obsolete("Use GmailMimeTypes class directly instead of GmailConstants.MimeTypes")]
    public static class MimeTypes
    {
        public const string TEXT_PLAIN = GmailMimeTypes.TEXT_PLAIN;
        public const string TEXT_HTML = GmailMimeTypes.TEXT_HTML;
        public const string MULTIPART_ALTERNATIVE = GmailMimeTypes.MULTIPART_ALTERNATIVE;
        public const string MULTIPART_MIXED = GmailMimeTypes.MULTIPART_MIXED;
        public const string MULTIPART_RELATED = GmailMimeTypes.MULTIPART_RELATED;
        public const string APPLICATION_OCTET_STREAM = GmailMimeTypes.APPLICATION_OCTET_STREAM;
        public const string APPLICATION_PDF = GmailMimeTypes.APPLICATION_PDF;
        public const string IMAGE_JPEG = GmailMimeTypes.IMAGE_JPEG;
        public const string IMAGE_PNG = GmailMimeTypes.IMAGE_PNG;
    }
}