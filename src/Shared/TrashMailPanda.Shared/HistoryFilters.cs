using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class HistoryFilters
{
    public DateTime? After { get; init; }
    public DateTime? Before { get; init; }
    public IReadOnlyList<string>? Classifications { get; init; }
    public IReadOnlyList<UserAction>? UserActions { get; init; }
    public int? Limit { get; init; }
}