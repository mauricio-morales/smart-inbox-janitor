using System;

namespace TrashMailPanda.Services;

/// <summary>
/// Event arguments for startup progress changes
/// </summary>
public class StartupProgressChangedEventArgs : EventArgs
{
    public StartupProgress Progress { get; init; } = new();
}