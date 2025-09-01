using System;

namespace TrashMailPanda.Shared;

public class GmailConnection
{
    public bool IsSignedIn { get; set; }
    public string? AccountEmail { get; set; }
    public string? AccountName { get; set; }
    public string? ProfilePicture { get; set; }
    public DateTime? SessionExpiresAt { get; set; }
    public DateTime? LastRefreshAt { get; set; }
    public bool NeedsReSignIn { get; set; }
}