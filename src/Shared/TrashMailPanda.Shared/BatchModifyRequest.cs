using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class BatchModifyRequest
{
    public IReadOnlyList<string> EmailIds { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string>? AddLabelIds { get; init; }
    public IReadOnlyList<string>? RemoveLabelIds { get; init; }
}