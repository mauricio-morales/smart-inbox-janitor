using System;
using System.Collections.Generic;
using System.Linq;
using TransMailPanda.Shared.Base;

namespace TransMailPanda.Shared.Models;

/// <summary>
/// Represents the overall health status of a provider
/// </summary>
public enum HealthStatus
{
    /// <summary>
    /// Provider is healthy and operating normally
    /// </summary>
    Healthy = 0,

    /// <summary>
    /// Provider is functional but experiencing minor issues
    /// </summary>
    Degraded = 1,

    /// <summary>
    /// Provider has significant issues but is still partially functional
    /// </summary>
    Unhealthy = 2,

    /// <summary>
    /// Provider is completely non-functional
    /// </summary>
    Critical = 3,

    /// <summary>
    /// Provider health status is unknown or cannot be determined
    /// </summary>
    Unknown = 4
}

/// <summary>
/// Detailed health check result for a provider
/// </summary>
public sealed record HealthCheckResult
{
    /// <summary>
    /// Gets the overall health status
    /// </summary>
    public HealthStatus Status { get; init; } = HealthStatus.Unknown;

    /// <summary>
    /// Gets a human-readable status description
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Gets the timestamp when the health check was performed
    /// </summary>
    public DateTime CheckedAt { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets the duration of the health check
    /// </summary>
    public TimeSpan Duration { get; init; } = TimeSpan.Zero;

    /// <summary>
    /// Gets detailed check results for individual components
    /// </summary>
    public Dictionary<string, ComponentHealthStatus> ComponentStatuses { get; init; } = new();

    /// <summary>
    /// Gets performance metrics collected during the health check
    /// </summary>
    public Dictionary<string, double> Metrics { get; init; } = new();

    /// <summary>
    /// Gets any issues or warnings found during the health check
    /// </summary>
    public List<HealthIssue> Issues { get; init; } = new();

    /// <summary>
    /// Gets additional diagnostic information
    /// </summary>
    public Dictionary<string, object> Diagnostics { get; init; } = new();

    /// <summary>
    /// Gets or sets tags for categorizing health check results
    /// </summary>
    public List<string> Tags { get; init; } = new();

    /// <summary>
    /// Gets a value indicating whether the provider is considered healthy
    /// </summary>
    public bool IsHealthy => Status is HealthStatus.Healthy or HealthStatus.Degraded;

    /// <summary>
    /// Gets a value indicating whether immediate action is required
    /// </summary>
    public bool RequiresImmediateAction => Status is HealthStatus.Critical;

    /// <summary>
    /// Gets a value indicating whether the provider can still handle requests
    /// </summary>
    public bool CanHandleRequests => Status is not (HealthStatus.Critical or HealthStatus.Unknown);

    /// <summary>
    /// Gets the most severe issue level
    /// </summary>
    public HealthIssueLevel? MostSevereIssueLevel => Issues.Count > 0 ? Issues.Max(i => i.Level) : null;

    /// <summary>
    /// Creates a healthy health check result
    /// </summary>
    /// <param name="description">Optional description</param>
    /// <param name="duration">Health check duration</param>
    /// <returns>A healthy health check result</returns>
    public static HealthCheckResult Healthy(string description = "Provider is operating normally", TimeSpan? duration = null)
    {
        return new HealthCheckResult
        {
            Status = HealthStatus.Healthy,
            Description = description,
            Duration = duration ?? TimeSpan.Zero
        };
    }

    /// <summary>
    /// Creates a degraded health check result
    /// </summary>
    /// <param name="description">Description of degraded condition</param>
    /// <param name="issues">Issues causing degradation</param>
    /// <param name="duration">Health check duration</param>
    /// <returns>A degraded health check result</returns>
    public static HealthCheckResult Degraded(string description, List<HealthIssue>? issues = null, TimeSpan? duration = null)
    {
        return new HealthCheckResult
        {
            Status = HealthStatus.Degraded,
            Description = description,
            Issues = issues ?? new List<HealthIssue>(),
            Duration = duration ?? TimeSpan.Zero
        };
    }

    /// <summary>
    /// Creates an unhealthy health check result
    /// </summary>
    /// <param name="description">Description of unhealthy condition</param>
    /// <param name="issues">Issues causing unhealthy status</param>
    /// <param name="duration">Health check duration</param>
    /// <returns>An unhealthy health check result</returns>
    public static HealthCheckResult Unhealthy(string description, List<HealthIssue>? issues = null, TimeSpan? duration = null)
    {
        return new HealthCheckResult
        {
            Status = HealthStatus.Unhealthy,
            Description = description,
            Issues = issues ?? new List<HealthIssue>(),
            Duration = duration ?? TimeSpan.Zero
        };
    }

    /// <summary>
    /// Creates a critical health check result
    /// </summary>
    /// <param name="description">Description of critical condition</param>
    /// <param name="issues">Critical issues</param>
    /// <param name="duration">Health check duration</param>
    /// <returns>A critical health check result</returns>
    public static HealthCheckResult Critical(string description, List<HealthIssue>? issues = null, TimeSpan? duration = null)
    {
        return new HealthCheckResult
        {
            Status = HealthStatus.Critical,
            Description = description,
            Issues = issues ?? new List<HealthIssue>(),
            Duration = duration ?? TimeSpan.Zero
        };
    }

    /// <summary>
    /// Creates a health check result from an error
    /// </summary>
    /// <param name="error">The error that occurred during health check</param>
    /// <param name="duration">Health check duration</param>
    /// <returns>A health check result representing the error</returns>
    public static HealthCheckResult FromError(ProviderError error, TimeSpan? duration = null)
    {
        var status = error switch
        {
            NetworkError or TimeoutError => HealthStatus.Degraded,
            AuthenticationError or ConfigurationError => HealthStatus.Unhealthy,
            _ => HealthStatus.Critical
        };

        var issue = new HealthIssue
        {
            Level = status == HealthStatus.Critical ? HealthIssueLevel.Error : HealthIssueLevel.Warning,
            Message = error.Message,
            Details = error.Details,
            Source = "HealthCheck",
            Timestamp = DateTime.UtcNow
        };

        return new HealthCheckResult
        {
            Status = status,
            Description = $"Health check failed: {error.Message}",
            Issues = new List<HealthIssue> { issue },
            Duration = duration ?? TimeSpan.Zero,
            Diagnostics = new Dictionary<string, object>
            {
                ["ErrorCategory"] = error.Category,
                ["ErrorCode"] = error.ErrorCode,
                ["IsTransient"] = error.IsTransient,
                ["RequiresUserIntervention"] = error.RequiresUserIntervention
            }
        };
    }

    /// <summary>
    /// Gets a summary of the health check result
    /// </summary>
    /// <returns>A summary string</returns>
    public string GetSummary()
    {
        var summary = $"{Status}: {Description}";
        if (Issues.Count > 0)
            summary += $" ({Issues.Count} issues)";
        return summary;
    }

    /// <summary>
    /// Returns a string representation of the health check result
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return GetSummary();
    }
}

/// <summary>
/// Health status for individual provider components
/// </summary>
public sealed record ComponentHealthStatus
{
    /// <summary>
    /// Gets the component name
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Gets the component health status
    /// </summary>
    public HealthStatus Status { get; init; } = HealthStatus.Unknown;

    /// <summary>
    /// Gets the component status description
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Gets component-specific metrics
    /// </summary>
    public Dictionary<string, double> Metrics { get; init; } = new();

    /// <summary>
    /// Gets component-specific issues
    /// </summary>
    public List<HealthIssue> Issues { get; init; } = new();

    /// <summary>
    /// Gets the last successful operation timestamp
    /// </summary>
    public DateTime? LastSuccessfulOperation { get; init; }

    /// <summary>
    /// Gets additional component details
    /// </summary>
    public Dictionary<string, object> Details { get; init; } = new();

    /// <summary>
    /// Gets a value indicating whether the component is healthy
    /// </summary>
    public bool IsHealthy => Status is HealthStatus.Healthy or HealthStatus.Degraded;

    /// <summary>
    /// Returns a string representation of the component health status
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{Name}: {Status} - {Description}";
    }
}

/// <summary>
/// Represents an issue found during a health check
/// </summary>
public sealed record HealthIssue
{
    /// <summary>
    /// Gets the issue severity level
    /// </summary>
    public HealthIssueLevel Level { get; init; } = HealthIssueLevel.Info;

    /// <summary>
    /// Gets the issue message
    /// </summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// Gets additional issue details
    /// </summary>
    public string? Details { get; init; }

    /// <summary>
    /// Gets the source component that reported the issue
    /// </summary>
    public string Source { get; init; } = string.Empty;

    /// <summary>
    /// Gets the timestamp when the issue was detected
    /// </summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;

    /// <summary>
    /// Gets suggested remediation actions
    /// </summary>
    public List<string> SuggestedActions { get; init; } = new();

    /// <summary>
    /// Gets additional context about the issue
    /// </summary>
    public Dictionary<string, object> Context { get; init; } = new();

    /// <summary>
    /// Returns a string representation of the health issue
    /// </summary>
    /// <returns>A string representation</returns>
    public override string ToString()
    {
        return $"{Level}: {Message} ({Source})";
    }
}

/// <summary>
/// Severity levels for health issues
/// </summary>
public enum HealthIssueLevel
{
    /// <summary>
    /// Informational message
    /// </summary>
    Info = 0,

    /// <summary>
    /// Warning that should be monitored
    /// </summary>
    Warning = 1,

    /// <summary>
    /// Error that affects functionality
    /// </summary>
    Error = 2,

    /// <summary>
    /// Critical error that requires immediate attention
    /// </summary>
    Critical = 3
}

/// <summary>
/// Extension methods for working with health check results
/// </summary>
public static class HealthCheckExtensions
{
    /// <summary>
    /// Combines multiple health check results into a single result
    /// </summary>
    /// <param name="results">The health check results to combine</param>
    /// <param name="overallDescription">Optional overall description</param>
    /// <returns>A combined health check result</returns>
    public static HealthCheckResult Combine(this IEnumerable<HealthCheckResult> results, string? overallDescription = null)
    {
        var resultsList = results.ToList();
        if (!resultsList.Any())
            return HealthCheckResult.Healthy("No health checks performed");

        var worstStatus = resultsList.Max(r => r.Status);
        var allIssues = resultsList.SelectMany(r => r.Issues).ToList();
        var allMetrics = new Dictionary<string, double>();
        var allDiagnostics = new Dictionary<string, object>();
        var totalDuration = TimeSpan.Zero;

        foreach (var result in resultsList)
        {
            foreach (var metric in result.Metrics)
                allMetrics[$"{result.Tags.FirstOrDefault() ?? "Unknown"}.{metric.Key}"] = metric.Value;

            foreach (var diagnostic in result.Diagnostics)
                allDiagnostics[$"{result.Tags.FirstOrDefault() ?? "Unknown"}.{diagnostic.Key}"] = diagnostic.Value;

            totalDuration = totalDuration.Add(result.Duration);
        }

        return new HealthCheckResult
        {
            Status = worstStatus,
            Description = overallDescription ?? $"Combined health check: {worstStatus}",
            Issues = allIssues,
            Metrics = allMetrics,
            Diagnostics = allDiagnostics,
            Duration = totalDuration,
            Tags = resultsList.SelectMany(r => r.Tags).Distinct().ToList()
        };
    }

    /// <summary>
    /// Determines if a health status is better than another
    /// </summary>
    /// <param name="status">The status to compare</param>
    /// <param name="other">The status to compare against</param>
    /// <returns>True if the first status is better than the second</returns>
    public static bool IsBetterThan(this HealthStatus status, HealthStatus other)
    {
        return (int)status < (int)other;
    }

    /// <summary>
    /// Determines if a health status is worse than another
    /// </summary>
    /// <param name="status">The status to compare</param>
    /// <param name="other">The status to compare against</param>
    /// <returns>True if the first status is worse than the second</returns>
    public static bool IsWorseThan(this HealthStatus status, HealthStatus other)
    {
        return (int)status > (int)other;
    }
}