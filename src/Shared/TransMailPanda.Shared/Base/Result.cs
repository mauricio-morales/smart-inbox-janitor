using System;

namespace TransMailPanda.Shared.Base;

/// <summary>
/// Represents the result of an operation that can either succeed or fail
/// Uses discriminated union pattern for type-safe error handling without exceptions
/// </summary>
/// <typeparam name="T">The type of the successful result value</typeparam>
public readonly record struct Result<T>
{
    private readonly bool _isSuccess;
    private readonly T? _value;
    private readonly ProviderError? _error;

    /// <summary>
    /// Gets a value indicating whether the operation was successful
    /// </summary>
    public bool IsSuccess => _isSuccess;

    /// <summary>
    /// Gets a value indicating whether the operation failed
    /// </summary>
    public bool IsFailure => !_isSuccess;

    /// <summary>
    /// Gets the successful result value
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when accessed on a failed result</exception>
    public T Value => _isSuccess ? _value! : throw new InvalidOperationException("Cannot access Value on a failed result. Check IsSuccess first.");

    /// <summary>
    /// Gets the error information for failed results
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when accessed on a successful result</exception>
    public ProviderError Error => !_isSuccess ? _error! : throw new InvalidOperationException("Cannot access Error on a successful result. Check IsFailure first.");

    /// <summary>
    /// Private constructor to ensure only factory methods can create instances
    /// </summary>
    /// <param name="isSuccess">Whether the operation was successful</param>
    /// <param name="value">The successful result value</param>
    /// <param name="error">The error information</param>
    private Result(bool isSuccess, T? value, ProviderError? error)
    {
        _isSuccess = isSuccess;
        _value = value;
        _error = error;
    }

    /// <summary>
    /// Creates a successful result with the specified value
    /// </summary>
    /// <param name="value">The successful result value</param>
    /// <returns>A successful result</returns>
    public static Result<T> Success(T value) => new(true, value, null);

    /// <summary>
    /// Creates a failed result with the specified error
    /// </summary>
    /// <param name="error">The error information</param>
    /// <returns>A failed result</returns>
    public static Result<T> Failure(ProviderError error) => new(false, default, error);

    /// <summary>
    /// Implicitly converts a value to a successful result
    /// </summary>
    /// <param name="value">The value to convert</param>
    public static implicit operator Result<T>(T value) => Success(value);

    /// <summary>
    /// Implicitly converts an error to a failed result
    /// </summary>
    /// <param name="error">The error to convert</param>
    public static implicit operator Result<T>(ProviderError error) => Failure(error);

    /// <summary>
    /// Matches the result and executes the appropriate function
    /// </summary>
    /// <typeparam name="TResult">The type of the result</typeparam>
    /// <param name="onSuccess">Function to execute for successful results</param>
    /// <param name="onFailure">Function to execute for failed results</param>
    /// <returns>The result of the executed function</returns>
    public TResult Match<TResult>(Func<T, TResult> onSuccess, Func<ProviderError, TResult> onFailure)
    {
        return _isSuccess ? onSuccess(_value!) : onFailure(_error!);
    }

    /// <summary>
    /// Matches the result and executes the appropriate action
    /// </summary>
    /// <param name="onSuccess">Action to execute for successful results</param>
    /// <param name="onFailure">Action to execute for failed results</param>
    public void Match(Action<T> onSuccess, Action<ProviderError> onFailure)
    {
        if (_isSuccess)
            onSuccess(_value!);
        else
            onFailure(_error!);
    }

    /// <summary>
    /// Transforms the successful value if the result is successful
    /// </summary>
    /// <typeparam name="TNew">The type of the transformed value</typeparam>
    /// <param name="transform">Function to transform the successful value</param>
    /// <returns>A new result with the transformed value or the same error</returns>
    public Result<TNew> Map<TNew>(Func<T, TNew> transform)
    {
        return _isSuccess ? Result<TNew>.Success(transform(_value!)) : Result<TNew>.Failure(_error!);
    }

    /// <summary>
    /// Transforms the successful value if the result is successful, allowing the transform to fail
    /// </summary>
    /// <typeparam name="TNew">The type of the transformed value</typeparam>
    /// <param name="transform">Function to transform the successful value</param>
    /// <returns>A new result with the transformed value or an error</returns>
    public Result<TNew> Bind<TNew>(Func<T, Result<TNew>> transform)
    {
        return _isSuccess ? transform(_value!) : Result<TNew>.Failure(_error!);
    }

    /// <summary>
    /// Returns the successful value or the specified default value
    /// </summary>
    /// <param name="defaultValue">The default value to return for failed results</param>
    /// <returns>The successful value or the default value</returns>
    public T GetValueOrDefault(T defaultValue = default(T)!)
    {
        return _isSuccess ? _value! : defaultValue;
    }

    /// <summary>
    /// Returns the successful value or the result of the specified function
    /// </summary>
    /// <param name="getDefaultValue">Function to get the default value for failed results</param>
    /// <returns>The successful value or the result of the function</returns>
    public T GetValueOrDefault(Func<ProviderError, T> getDefaultValue)
    {
        return _isSuccess ? _value! : getDefaultValue(_error!);
    }

    /// <summary>
    /// Returns a string representation of the result
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return _isSuccess ? $"Success({_value})" : $"Failure({_error})";
    }
}

/// <summary>
/// Non-generic result type for operations that don't return a value
/// </summary>
public readonly record struct Result
{
    private readonly bool _isSuccess;
    private readonly ProviderError? _error;

    /// <summary>
    /// Gets a value indicating whether the operation was successful
    /// </summary>
    public bool IsSuccess => _isSuccess;

    /// <summary>
    /// Gets a value indicating whether the operation failed
    /// </summary>
    public bool IsFailure => !_isSuccess;

    /// <summary>
    /// Gets the error information for failed results
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when accessed on a successful result</exception>
    public ProviderError Error => !_isSuccess ? _error! : throw new InvalidOperationException("Cannot access Error on a successful result. Check IsFailure first.");

    /// <summary>
    /// Private constructor to ensure only factory methods can create instances
    /// </summary>
    /// <param name="isSuccess">Whether the operation was successful</param>
    /// <param name="error">The error information</param>
    private Result(bool isSuccess, ProviderError? error)
    {
        _isSuccess = isSuccess;
        _error = error;
    }

    /// <summary>
    /// Creates a successful result
    /// </summary>
    /// <returns>A successful result</returns>
    public static Result Success() => new(true, null);

    /// <summary>
    /// Creates a failed result with the specified error
    /// </summary>
    /// <param name="error">The error information</param>
    /// <returns>A failed result</returns>
    public static Result Failure(ProviderError error) => new(false, error);

    /// <summary>
    /// Implicitly converts an error to a failed result
    /// </summary>
    /// <param name="error">The error to convert</param>
    public static implicit operator Result(ProviderError error) => Failure(error);

    /// <summary>
    /// Matches the result and executes the appropriate function
    /// </summary>
    /// <typeparam name="TResult">The type of the result</typeparam>
    /// <param name="onSuccess">Function to execute for successful results</param>
    /// <param name="onFailure">Function to execute for failed results</param>
    /// <returns>The result of the executed function</returns>
    public TResult Match<TResult>(Func<TResult> onSuccess, Func<ProviderError, TResult> onFailure)
    {
        return _isSuccess ? onSuccess() : onFailure(_error!);
    }

    /// <summary>
    /// Matches the result and executes the appropriate action
    /// </summary>
    /// <param name="onSuccess">Action to execute for successful results</param>
    /// <param name="onFailure">Action to execute for failed results</param>
    public void Match(Action onSuccess, Action<ProviderError> onFailure)
    {
        if (_isSuccess)
            onSuccess();
        else
            onFailure(_error!);
    }

    /// <summary>
    /// Transforms the result to a Result&lt;T&gt; if successful
    /// </summary>
    /// <typeparam name="T">The type of the new result value</typeparam>
    /// <param name="getValue">Function to get the value for successful results</param>
    /// <returns>A new result with the value or the same error</returns>
    public Result<T> Map<T>(Func<T> getValue)
    {
        return _isSuccess ? Result<T>.Success(getValue()) : Result<T>.Failure(_error!);
    }

    /// <summary>
    /// Transforms the result if successful, allowing the transform to fail
    /// </summary>
    /// <typeparam name="T">The type of the new result value</typeparam>
    /// <param name="getResult">Function to get the new result for successful results</param>
    /// <returns>A new result or an error</returns>
    public Result<T> Bind<T>(Func<Result<T>> getResult)
    {
        return _isSuccess ? getResult() : Result<T>.Failure(_error!);
    }

    /// <summary>
    /// Returns a string representation of the result
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return _isSuccess ? "Success" : $"Failure({_error})";
    }
}