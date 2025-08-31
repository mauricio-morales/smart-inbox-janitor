namespace TransMailPanda.Shared;

public class BulkGroup
{
    public string Id { get; init; } = string.Empty;
    public string SimpleLabel { get; init; } = string.Empty; // "Daily deal emails from 5 stores"
    public int EmailCount { get; init; }
    public string StorageFreed { get; init; } = string.Empty; // "850 MB"
    public BulkActionType ActionType { get; init; } = BulkActionType.Keep;
    public bool Undoable { get; init; } = true;
}