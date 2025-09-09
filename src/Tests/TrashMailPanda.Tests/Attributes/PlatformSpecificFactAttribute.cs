using TrashMailPanda.Shared.Platform;
using Xunit;

namespace TrashMailPanda.Tests.Attributes;

/// <summary>
/// Custom xUnit fact attribute that only runs tests on specific platforms
/// Uses the centralized platform detection system from TrashMailPanda.Shared.Platform
/// </summary>
public class PlatformSpecificFactAttribute : FactAttribute
{
    public PlatformSpecificFactAttribute(params SupportedPlatform[] platforms)
    {
        if (!PlatformInfo.IsOneOf(platforms))
        {
            Skip = $"Test only runs on: {string.Join(", ", platforms)}. Current platform: {PlatformInfo.CurrentDisplayName}";
        }
    }
}