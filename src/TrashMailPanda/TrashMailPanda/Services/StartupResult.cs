using System;
using System.Collections.Generic;

namespace TrashMailPanda.Services;

/// <summary>
/// Result of the startup orchestration
/// </summary>
public class StartupResult
{
    public bool IsSuccess { get; init; }
    public string Status { get; init; } = string.Empty;
    public StartupFailureReason? FailureReason { get; init; }
    public string? ErrorMessage { get; init; }
    public TimeSpan Duration { get; init; }
    public Dictionary<string, object> Details { get; init; } = new();
}