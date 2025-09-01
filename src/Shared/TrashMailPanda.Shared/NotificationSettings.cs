namespace TrashMailPanda.Shared;

public class NotificationSettings
{
    public bool ProcessingComplete { get; set; } = true;
    public bool DangerousEmailsFound { get; set; } = true;
    public bool CostLimitWarning { get; set; } = true;
}