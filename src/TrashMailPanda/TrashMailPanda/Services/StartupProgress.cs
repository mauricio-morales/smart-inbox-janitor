namespace TrashMailPanda.Services;

/// <summary>
/// Current startup progress information
/// </summary>
public class StartupProgress
{
    public StartupStep CurrentStep { get; init; }
    public string StepName { get; init; } = string.Empty;
    public string StepDescription { get; init; } = string.Empty;
    public int CompletedSteps { get; init; }
    public int TotalSteps { get; init; }
    public double ProgressPercentage { get; init; }
    public bool IsComplete { get; init; }
    public bool HasError { get; init; }
    public string? ErrorMessage { get; init; }
}