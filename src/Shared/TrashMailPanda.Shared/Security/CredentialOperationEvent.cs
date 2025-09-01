namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Event data for credential operations
/// </summary>
public class CredentialOperationEvent
{
    public required string Operation { get; init; } // Store, Retrieve, Remove, etc.
    public required string CredentialKey { get; init; }
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? UserContext { get; init; }
    public string? ApplicationVersion { get; init; }
    public string? Platform { get; init; }
    public string? SessionId { get; init; }
}