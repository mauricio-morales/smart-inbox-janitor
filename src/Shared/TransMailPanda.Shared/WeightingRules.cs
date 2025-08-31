using System.Collections.Generic;

namespace TransMailPanda.Shared;

public class WeightingRules
{
    public double? ContactsBonus { get; init; }
    public IReadOnlyList<string>? DangerSignals { get; init; }
}