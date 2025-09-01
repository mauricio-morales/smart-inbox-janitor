using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class GroupOutput
{
    public IReadOnlyList<BulkGroup> BulkGroups { get; init; } = Array.Empty<BulkGroup>();
}