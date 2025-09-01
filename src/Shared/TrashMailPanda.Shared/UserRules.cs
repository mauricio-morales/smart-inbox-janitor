namespace TrashMailPanda.Shared;

public class UserRules
{
    public AlwaysKeepRules AlwaysKeep { get; init; } = new();
    public AutoTrashRules AutoTrash { get; init; } = new();
    public WeightingRules? Weights { get; init; }
    public ExclusionRules? Exclusions { get; init; }
}