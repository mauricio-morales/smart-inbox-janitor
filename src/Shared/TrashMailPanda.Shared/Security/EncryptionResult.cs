namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Result type for encryption operations
/// </summary>
public class EncryptionResult
{
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public EncryptionErrorType? ErrorType { get; init; }

    public static EncryptionResult Success() => new() { IsSuccess = true };
    public static EncryptionResult Failure(string errorMessage, EncryptionErrorType errorType) =>
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}