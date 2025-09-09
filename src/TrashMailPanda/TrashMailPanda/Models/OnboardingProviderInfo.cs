using System;
using System.ComponentModel.DataAnnotations;
using TrashMailPanda.Services;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Models;

/// <summary>
/// Represents provider information specific to the onboarding process
/// </summary>
public class OnboardingProviderInfo
{
    /// <summary>
    /// Internal provider name (e.g., "Gmail", "OpenAI")
    /// </summary>
    [Required]
    public string ProviderName { get; set; } = string.Empty;

    /// <summary>
    /// Display name shown to users
    /// </summary>
    [Required]
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Description of what this provider does
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Current provider status
    /// </summary>
    public ProviderStatus Status { get; set; } = new();

    /// <summary>
    /// Whether this provider is required for basic functionality
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// Setup instructions shown to users
    /// </summary>
    public string SetupInstructions { get; set; } = string.Empty;

    /// <summary>
    /// Icon name or path for the provider
    /// </summary>
    public string IconName { get; set; } = string.Empty;

    /// <summary>
    /// Order for displaying providers (lower numbers first)
    /// </summary>
    public int DisplayOrder { get; set; }

    /// <summary>
    /// Whether this provider's setup has been attempted
    /// </summary>
    public bool SetupAttempted { get; set; }

    /// <summary>
    /// When this provider's setup was last attempted
    /// </summary>
    public DateTime? LastSetupAttempt { get; set; }

    /// <summary>
    /// Setup-specific error message if setup failed
    /// </summary>
    public string? SetupErrorMessage { get; set; }
}