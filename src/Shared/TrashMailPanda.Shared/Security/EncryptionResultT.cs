namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Generic result type for encryption operations that return data
/// </summary>
public class EncryptionResult<T> : EncryptionResult
{
    public T? Value { get; init; }

    public static EncryptionResult<T> Success(T value) => new() { IsSuccess = true, Value = value };
    public static new EncryptionResult<T> Failure(string errorMessage, EncryptionErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}