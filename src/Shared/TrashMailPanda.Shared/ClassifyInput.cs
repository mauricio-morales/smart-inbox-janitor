using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class ClassifyInput
{
    public IReadOnlyList<EmailClassificationInput> Emails { get; init; } = Array.Empty<EmailClassificationInput>();
    public UserRules UserRulesSnapshot { get; init; } = new();
}