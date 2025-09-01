using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class GroupingInput
{
    public IReadOnlyList<ClassifyItem> ClassifiedEmails { get; init; } = Array.Empty<ClassifyItem>();
}