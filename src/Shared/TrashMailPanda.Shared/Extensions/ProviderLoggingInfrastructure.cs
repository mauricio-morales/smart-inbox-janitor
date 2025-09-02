using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Shared.Extensions;

/// <summary>
/// Interface for provider log enrichment
/// Enables adding contextual information to provider logs
/// </summary>
public interface IProviderLogEnricher
{
    /// <summary>
    /// Enriches log data with provider-specific context
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <param name="operation">The operation being performed</param>
    /// <param name="data">Existing log data to enrich</param>
    /// <returns>Enriched log data</returns>
    Dictionary<string, object> EnrichLogData(Type providerType, string operation, Dictionary<string, object>? data = null);

    /// <summary>
    /// Gets contextual information for logging
    /// </summary>
    /// <returns>Context data for logging</returns>
    Dictionary<string, object> GetLoggingContext();
}

/// <summary>
/// Default implementation of provider log enricher
/// Provides standard contextual information for provider logs
/// </summary>
public sealed class DefaultProviderLogEnricher : IProviderLogEnricher
{
    private readonly string _applicationName;
    private readonly string _environment;
    private readonly string _machineName;

    public DefaultProviderLogEnricher()
    {
        _applicationName = System.Reflection.Assembly.GetEntryAssembly()?.GetName().Name ?? "Unknown";
        _environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        _machineName = Environment.MachineName;
    }

    /// <summary>
    /// Enriches log data with provider-specific context
    /// </summary>
    public Dictionary<string, object> EnrichLogData(Type providerType, string operation, Dictionary<string, object>? data = null)
    {
        var enrichedData = data ?? new Dictionary<string, object>();

        // Add provider-specific information
        enrichedData["ProviderType"] = providerType.Name;
        enrichedData["ProviderFullType"] = providerType.FullName ?? providerType.Name;
        enrichedData["Operation"] = operation;
        enrichedData["Timestamp"] = DateTimeOffset.UtcNow;

        // Add performance context if available
        var currentProcess = Process.GetCurrentProcess();
        enrichedData["ProcessId"] = currentProcess.Id;
        enrichedData["ThreadId"] = Environment.CurrentManagedThreadId;

        // Add memory information
        enrichedData["WorkingSetMB"] = Math.Round(currentProcess.WorkingSet64 / (1024.0 * 1024.0), 2);

        // Add application context
        enrichedData["ApplicationName"] = _applicationName;
        enrichedData["Environment"] = _environment;
        enrichedData["MachineName"] = _machineName;

        return enrichedData;
    }

    /// <summary>
    /// Gets contextual information for logging
    /// </summary>
    public Dictionary<string, object> GetLoggingContext()
    {
        return new Dictionary<string, object>
        {
            ["ApplicationName"] = _applicationName,
            ["Environment"] = _environment,
            ["MachineName"] = _machineName,
            ["ProcessId"] = Process.GetCurrentProcess().Id,
            ["ThreadId"] = Environment.CurrentManagedThreadId,
            ["ContextTimestamp"] = DateTimeOffset.UtcNow
        };
    }
}

/// <summary>
/// Structured logger for provider operations
/// Provides consistent logging patterns with performance tracking
/// </summary>
public sealed class ProviderOperationLogger
{
    private readonly ILogger _logger;
    private readonly IProviderLogEnricher _enricher;
    private readonly ProviderLoggingOptions _options;

    public ProviderOperationLogger(ILogger logger, IProviderLogEnricher enricher, ProviderLoggingOptions options)
    {
        _logger = logger;
        _enricher = enricher;
        _options = options;
    }

    /// <summary>
    /// Logs the start of a provider operation
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <param name="operation">The operation name</param>
    /// <param name="additionalData">Additional contextual data</param>
    /// <returns>A disposable operation tracker for performance logging</returns>
    public IDisposable LogOperationStart(Type providerType, string operation, Dictionary<string, object>? additionalData = null)
    {
        var data = _enricher.EnrichLogData(providerType, operation, additionalData);

        if (_options.EnableStructuredLogging)
        {
            _logger.Log(_options.LogLevel, "Starting provider operation {ProviderType}.{Operation}", providerType.Name, operation);

            // Log detailed data at debug level
            _logger.LogDebug("Provider operation start data: {@OperationData}", data);
        }

        return _options.EnablePerformanceLogging
            ? new ProviderOperationTracker(_logger, _enricher, _options, providerType, operation, data)
            : new NoOpDisposable();
    }

    /// <summary>
    /// Logs successful completion of a provider operation
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <param name="operation">The operation name</param>
    /// <param name="duration">Operation duration</param>
    /// <param name="additionalData">Additional contextual data</param>
    public void LogOperationSuccess(Type providerType, string operation, TimeSpan duration, Dictionary<string, object>? additionalData = null)
    {
        var data = _enricher.EnrichLogData(providerType, operation, additionalData);
        data["Duration"] = duration.TotalMilliseconds;
        data["Status"] = "Success";

        if (_options.EnableStructuredLogging)
        {
            _logger.Log(_options.LogLevel, "Provider operation {ProviderType}.{Operation} completed successfully in {Duration}ms",
                providerType.Name, operation, duration.TotalMilliseconds);
        }

        if (_options.EnablePerformanceLogging && _logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug("Provider operation success data: {@OperationData}", data);
        }
    }

    /// <summary>
    /// Logs failure of a provider operation
    /// </summary>
    /// <param name="providerType">The provider type</param>
    /// <param name="operation">The operation name</param>
    /// <param name="duration">Operation duration</param>
    /// <param name="error">The error that occurred</param>
    /// <param name="additionalData">Additional contextual data</param>
    public void LogOperationFailure(Type providerType, string operation, TimeSpan duration, Exception error, Dictionary<string, object>? additionalData = null)
    {
        var data = _enricher.EnrichLogData(providerType, operation, additionalData);
        data["Duration"] = duration.TotalMilliseconds;
        data["Status"] = "Failed";
        data["ErrorType"] = error.GetType().Name;
        data["ErrorMessage"] = error.Message;

        _logger.LogError(error, "Provider operation {ProviderType}.{Operation} failed after {Duration}ms: {ErrorMessage}",
            providerType.Name, operation, duration.TotalMilliseconds, error.Message);

        if (_logger.IsEnabled(LogLevel.Debug))
        {
            _logger.LogDebug("Provider operation failure data: {@OperationData}", data);
        }
    }
}

/// <summary>
/// Tracks provider operation performance and logs completion
/// </summary>
internal sealed class ProviderOperationTracker : IDisposable
{
    private readonly ILogger _logger;
    private readonly IProviderLogEnricher _enricher;
    private readonly ProviderLoggingOptions _options;
    private readonly Type _providerType;
    private readonly string _operation;
    private readonly Dictionary<string, object> _startData;
    private readonly Stopwatch _stopwatch;
    private bool _disposed;

    public ProviderOperationTracker(
        ILogger logger,
        IProviderLogEnricher enricher,
        ProviderLoggingOptions options,
        Type providerType,
        string operation,
        Dictionary<string, object> startData)
    {
        _logger = logger;
        _enricher = enricher;
        _options = options;
        _providerType = providerType;
        _operation = operation;
        _startData = startData;
        _stopwatch = Stopwatch.StartNew();
    }

    /// <summary>
    /// Completes the operation tracking and logs performance data
    /// </summary>
    public void Dispose()
    {
        if (_disposed) return;

        _stopwatch.Stop();
        var duration = _stopwatch.Elapsed;

        try
        {
            var completionData = new Dictionary<string, object>(_startData)
            {
                ["CompletedAt"] = DateTimeOffset.UtcNow,
                ["Duration"] = duration.TotalMilliseconds,
                ["Status"] = "Completed"
            };

            if (_options.EnablePerformanceLogging)
            {
                // Log performance metrics
                if (duration.TotalSeconds > 5) // Long-running operation
                {
                    _logger.LogWarning("Long-running provider operation {ProviderType}.{Operation} took {Duration}ms",
                        _providerType.Name, _operation, duration.TotalMilliseconds);
                }

                if (_logger.IsEnabled(LogLevel.Debug))
                {
                    _logger.LogDebug("Provider operation performance data: {@PerformanceData}", completionData);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging provider operation completion for {ProviderType}.{Operation}",
                _providerType.Name, _operation);
        }

        _disposed = true;
    }
}

/// <summary>
/// No-operation disposable for when performance logging is disabled
/// </summary>
internal sealed class NoOpDisposable : IDisposable
{
    public void Dispose()
    {
        // No operation
    }
}

/// <summary>
/// Extension methods for simplified provider logging
/// </summary>
public static class ProviderLoggingExtensions
{
    /// <summary>
    /// Creates a provider operation logger for the specified logger
    /// </summary>
    /// <param name="logger">The base logger</param>
    /// <param name="enricher">Log enricher (optional)</param>
    /// <param name="options">Logging options (optional)</param>
    /// <returns>Provider operation logger</returns>
    public static ProviderOperationLogger CreateProviderLogger(
        this ILogger logger,
        IProviderLogEnricher? enricher = null,
        ProviderLoggingOptions? options = null)
    {
        enricher ??= new DefaultProviderLogEnricher();
        options ??= new ProviderLoggingOptions
        {
            EnablePerformanceLogging = true,
            EnableStructuredLogging = true,
            LogLevel = LogLevel.Information
        };

        return new ProviderOperationLogger(logger, enricher, options);
    }

    /// <summary>
    /// Logs a provider operation with automatic performance tracking
    /// </summary>
    /// <param name="logger">The logger</param>
    /// <param name="providerType">The provider type</param>
    /// <param name="operation">The operation name</param>
    /// <param name="action">The operation to perform</param>
    /// <param name="additionalData">Additional contextual data</param>
    public static void LogProviderOperation(
        this ILogger logger,
        Type providerType,
        string operation,
        Action action,
        Dictionary<string, object>? additionalData = null)
    {
        var providerLogger = logger.CreateProviderLogger();

        using var tracker = providerLogger.LogOperationStart(providerType, operation, additionalData);

        try
        {
            action();
        }
        catch (Exception ex)
        {
            var stopwatch = Stopwatch.StartNew();
            stopwatch.Stop();
            providerLogger.LogOperationFailure(providerType, operation, stopwatch.Elapsed, ex, additionalData);
            throw;
        }
    }

    /// <summary>
    /// Logs an async provider operation with automatic performance tracking
    /// </summary>
    /// <param name="logger">The logger</param>
    /// <param name="providerType">The provider type</param>
    /// <param name="operation">The operation name</param>
    /// <param name="action">The async operation to perform</param>
    /// <param name="additionalData">Additional contextual data</param>
    public static async Task LogProviderOperationAsync(
        this ILogger logger,
        Type providerType,
        string operation,
        Func<Task> action,
        Dictionary<string, object>? additionalData = null)
    {
        var providerLogger = logger.CreateProviderLogger();

        using var tracker = providerLogger.LogOperationStart(providerType, operation, additionalData);

        try
        {
            await action();
        }
        catch (Exception ex)
        {
            var stopwatch = Stopwatch.StartNew();
            stopwatch.Stop();
            providerLogger.LogOperationFailure(providerType, operation, stopwatch.Elapsed, ex, additionalData);
            throw;
        }
    }
}