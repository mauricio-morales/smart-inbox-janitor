namespace TrashMailPanda.Services;

/// <summary>
/// Startup steps enumeration
/// </summary>
public enum StartupStep
{
    Initializing,
    InitializingStorage,
    InitializingSecurity,
    InitializingEmailProvider,
    InitializingLLMProvider,
    CheckingProviderHealth,
    Ready,
    Failed
}