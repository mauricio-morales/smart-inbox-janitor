using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class QueryContext
{
    public string? Intent { get; init; }
    public IReadOnlyList<string>? Keywords { get; init; }
    public DateTime? DateRange { get; init; }
}