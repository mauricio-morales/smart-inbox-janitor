namespace TrashMailPanda.Providers.Email.Models;

/// <summary>
/// MIME type constants for email content
/// </summary>
public static class GmailMimeTypes
{
    /// <summary>Plain text MIME type</summary>
    public const string TEXT_PLAIN = "text/plain";

    /// <summary>HTML MIME type</summary>
    public const string TEXT_HTML = "text/html";

    /// <summary>Multipart alternative MIME type</summary>
    public const string MULTIPART_ALTERNATIVE = "multipart/alternative";

    /// <summary>Multipart mixed MIME type</summary>
    public const string MULTIPART_MIXED = "multipart/mixed";

    /// <summary>Multipart related MIME type</summary>
    public const string MULTIPART_RELATED = "multipart/related";

    /// <summary>Application octet stream MIME type (generic binary)</summary>
    public const string APPLICATION_OCTET_STREAM = "application/octet-stream";

    /// <summary>PDF MIME type</summary>
    public const string APPLICATION_PDF = "application/pdf";

    /// <summary>Image JPEG MIME type</summary>
    public const string IMAGE_JPEG = "image/jpeg";

    /// <summary>Image PNG MIME type</summary>
    public const string IMAGE_PNG = "image/png";
}