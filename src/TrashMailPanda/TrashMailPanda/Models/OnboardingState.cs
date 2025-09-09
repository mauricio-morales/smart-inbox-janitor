using System;
using System.Collections.Generic;

namespace TrashMailPanda.Models;

/// <summary>
/// Tracks the overall onboarding progress and completion state
/// </summary>
public class OnboardingState
{
    /// <summary>
    /// Whether the welcome screen has been completed
    /// </summary>
    public bool IsWelcomeComplete { get; set; }

    /// <summary>
    /// Dictionary of provider names to their setup completion status
    /// </summary>
    public Dictionary<string, bool> ProviderSetupComplete { get; set; } = [];

    /// <summary>
    /// When the onboarding state was last updated
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether the user can access the main application with current provider setup
    /// </summary>
    public bool CanAccessMainApplication { get; set; }

    /// <summary>
    /// Whether the entire onboarding process has been completed
    /// </summary>
    public bool IsOnboardingComplete => IsWelcomeComplete && HasRequiredProvidersSetup;

    /// <summary>
    /// Whether at least one provider is set up and healthy
    /// </summary>
    public bool HasAnyWorkingProvider { get; set; }

    /// <summary>
    /// Whether all required providers have been set up successfully
    /// </summary>
    public bool HasRequiredProvidersSetup { get; set; }

    /// <summary>
    /// Current onboarding step/phase
    /// </summary>
    public OnboardingPhase CurrentPhase { get; set; } = OnboardingPhase.Welcome;

    /// <summary>
    /// Any error message from the onboarding process
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Additional metadata for the onboarding state
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = [];
}