namespace TransMailPanda.Shared;

public class EmailAttachment
{
    public string FileName { get; init; } = string.Empty;
    public string MimeType { get; init; } = string.Empty;
    public long Size { get; init; }
    public string AttachmentId { get; init; } = string.Empty;
}