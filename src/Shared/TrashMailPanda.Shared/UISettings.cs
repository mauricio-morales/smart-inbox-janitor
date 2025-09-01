namespace TrashMailPanda.Shared;

public class UISettings
{
    public string? Theme { get; set; }
    public string? Language { get; set; }
    public bool ShowAdvancedOptions { get; set; } = false;
    public NotificationSettings? Notifications { get; set; }
}