using System;
using System.Collections.Generic;

namespace TransMailPanda.Shared;

public class ClassifyOutput
{
    public IReadOnlyList<ClassifyItem> Items { get; init; } = Array.Empty<ClassifyItem>();
    public IReadOnlyList<RuleSuggestion>? RulesSuggestions { get; init; }
}