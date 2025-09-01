using System;

namespace TrashMailPanda.Services;

/// <summary>
/// Event arguments for provider status changes
/// </summary>
public class ProviderStatusChangedEventArgs : EventArgs
{
    public string ProviderName { get; init; } = string.Empty;
    public ProviderStatus Status { get; init; } = new();
    public ProviderStatus? PreviousStatus { get; init; }
}