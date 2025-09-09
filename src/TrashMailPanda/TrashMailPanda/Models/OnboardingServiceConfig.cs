using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using TrashMailPanda.Shared.Models;

namespace TrashMailPanda.Models;

/// <summary>
/// Configuration for the onboarding service
/// </summary>
public class OnboardingServiceConfig : BaseProviderConfig
{
    /// <summary>
    /// Whether to show the welcome screen on first run
    /// </summary>
    [Required]
    public bool ShowWelcomeScreen { get; set; } = true;

    /// <summary>
    /// Timeout in minutes for provider setup operations
    /// </summary>
    [Range(1, 60)]
    public int SetupTimeoutMinutes { get; set; } = 10;

    /// <summary>
    /// List of provider names that are required for basic functionality
    /// </summary>
    public List<string> RequiredProviders { get; set; } = ["Gmail", "OpenAI"];

    /// <summary>
    /// Whether to allow partial functionality when not all providers are healthy
    /// </summary>
    public bool AllowPartialFunctionality { get; set; } = true;

    /// <summary>
    /// Whether to automatically retry failed provider setups
    /// </summary>
    public bool AutoRetryFailedSetups { get; set; } = false;

    /// <summary>
    /// Number of automatic retry attempts for failed setups
    /// </summary>
    [Range(0, 5)]
    public new int MaxRetryAttempts { get; set; } = 2;
}