using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared;

public class GroupingInput
{
    public IReadOnlyList<ClassifyItem> ClassifiedEmails { get; init; } = Array.Empty<ClassifyItem>();
}