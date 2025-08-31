using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared;

public class ListOptions
{
    public string? Query { get; init; }
    public int? MaxResults { get; init; }
    public string? PageToken { get; init; }
    public IReadOnlyList<string>? LabelIds { get; init; }
    public DateTime? After { get; init; }
    public DateTime? Before { get; init; }
}