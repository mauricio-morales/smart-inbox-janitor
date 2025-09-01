using System;
using System.Collections.Generic;

namespace TrashMailPanda.Shared;

public class AutoTrashRules
{
    public IReadOnlyList<string> Senders { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> Domains { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string> ListIds { get; init; } = Array.Empty<string>();
    public IReadOnlyList<string>? Templates { get; init; }
}