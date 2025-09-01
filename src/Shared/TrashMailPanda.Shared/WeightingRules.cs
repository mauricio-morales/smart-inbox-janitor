using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class WeightingRules
{
    public double? ContactsBonus { get; init; }
    public IReadOnlyList<string>? DangerSignals { get; init; }
}