namespace TrashMailPanda.Shared.Models;

/// <summary>
/// Types of providers in the TrashMail Panda system
/// </summary>
public enum ProviderType
{
    /// <summary>
    /// Data storage provider (SQLite, cloud storage, etc.)
    /// </summary>
    Storage,

    /// <summary>
    /// Email provider (Gmail, IMAP, etc.)
    /// </summary>
    Email,

    /// <summary>
    /// AI/LLM provider (OpenAI, Claude, local models, etc.)
    /// </summary>
    LLM
}
