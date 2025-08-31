namespace TransMailPanda.Shared.Security;

/// <summary>
/// Result type for secure storage operations
/// </summary>
public class SecureStorageResult
{
    public bool IsSuccess { get; init; }
    public string? ErrorMessage { get; init; }
    public SecureStorageErrorType? ErrorType { get; init; }

    public static SecureStorageResult Success() => new() { IsSuccess = true };
    public static SecureStorageResult Failure(string errorMessage, SecureStorageErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}

/// <summary>
/// Generic result type for secure storage operations that return data
/// </summary>
public class SecureStorageResult<T> : SecureStorageResult
{
    public T? Value { get; init; }

    public static SecureStorageResult<T> Success(T value) => new() { IsSuccess = true, Value = value };
    public static new SecureStorageResult<T> Failure(string errorMessage, SecureStorageErrorType errorType) => 
        new() { IsSuccess = false, ErrorMessage = errorMessage, ErrorType = errorType };
}