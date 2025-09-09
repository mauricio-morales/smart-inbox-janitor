using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using TrashMailPanda.Models;
using TrashMailPanda.Shared.Base;

namespace TrashMailPanda.Services;

/// <summary>
/// Interface for managing onboarding state and guiding users through provider setup
/// </summary>
public interface IOnboardingService
{
    /// <summary>
    /// Event fired when the overall onboarding state changes
    /// </summary>
    event EventHandler<OnboardingStateChangedEventArgs>? OnboardingStateChanged;

    /// <summary>
    /// Gets the current onboarding state
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The current onboarding state</returns>
    Task<Result<OnboardingState>> GetOnboardingStateAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets provider information tailored for the onboarding process
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of providers with onboarding-specific information</returns>
    Task<Result<List<OnboardingProviderInfo>>> GetOnboardingProvidersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks the welcome screen as completed
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result indicating success or failure</returns>
    Task<Result<bool>> MarkWelcomeCompleteAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks a specific provider setup as completed
    /// </summary>
    /// <param name="providerName">Name of the provider</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result indicating success or failure</returns>
    Task<Result<bool>> MarkProviderSetupCompleteAsync(string providerName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if the onboarding process is complete
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if onboarding is complete, false otherwise</returns>
    Task<Result<bool>> IsOnboardingCompleteAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Determines if the user can access the main application with current provider setup
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if main application can be accessed, false otherwise</returns>
    Task<Result<bool>> CanAccessMainApplicationAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Resets the onboarding state to start fresh
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result indicating success or failure</returns>
    Task<Result<bool>> ResetOnboardingAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the onboarding phase
    /// </summary>
    /// <param name="phase">New onboarding phase</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result indicating success or failure</returns>
    Task<Result<bool>> UpdateOnboardingPhaseAsync(OnboardingPhase phase, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a setup attempt for a provider
    /// </summary>
    /// <param name="providerName">Name of the provider</param>
    /// <param name="success">Whether the setup attempt was successful</param>
    /// <param name="errorMessage">Error message if setup failed</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Result indicating success or failure</returns>
    Task<Result<bool>> RecordProviderSetupAttemptAsync(string providerName, bool success, string? errorMessage = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refreshes the onboarding state by checking current provider statuses
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated onboarding state</returns>
    Task<Result<OnboardingState>> RefreshOnboardingStateAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Event arguments for onboarding state changes
/// </summary>
public class OnboardingStateChangedEventArgs : EventArgs
{
    /// <summary>
    /// The updated onboarding state
    /// </summary>
    public OnboardingState OnboardingState { get; set; } = new();

    /// <summary>
    /// Previous phase before the change
    /// </summary>
    public OnboardingPhase? PreviousPhase { get; set; }

    /// <summary>
    /// What specifically changed in this update
    /// </summary>
    public string ChangeDescription { get; set; } = string.Empty;

    /// <summary>
    /// Additional context about the change
    /// </summary>
    public Dictionary<string, object> Context { get; set; } = new();
}