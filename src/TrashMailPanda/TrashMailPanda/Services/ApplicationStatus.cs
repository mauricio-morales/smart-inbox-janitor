using System;
using System.Collections.Generic;

namespace TrashMailPanda.Services;

/// <summary>
/// Application status information
/// </summary>
public class ApplicationStatus
{
    public bool IsInitialized { get; init; }
    public bool IsReady { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime LastUpdate { get; init; } = DateTime.UtcNow;
    public Dictionary<string, object> Details { get; init; } = new();
}