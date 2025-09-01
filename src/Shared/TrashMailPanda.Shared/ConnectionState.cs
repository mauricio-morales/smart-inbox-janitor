namespace TrashMailPanda.Shared;

public class ConnectionState
{
    public GmailConnection Gmail { get; set; } = new();
    public OpenAiConnection OpenAi { get; set; } = new();
    public bool SetupComplete { get; set; }
    public OnboardingStep? OnboardingStep { get; set; }
}