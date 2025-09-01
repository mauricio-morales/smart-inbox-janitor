using Microsoft.Extensions.Logging;

namespace TrashMailPanda.Shared.Factories;

/// <summary>
/// Concrete implementation of provider registry
/// Type alias for ProviderRegistryImpl to maintain compatibility with existing code
/// </summary>
public class ProviderRegistry : ProviderRegistryImpl
{
    /// <summary>
    /// Initializes a new instance of the ProviderRegistry class
    /// </summary>
    /// <param name="logger">Logger for the registry</param>
    public ProviderRegistry(ILogger<ProviderRegistry> logger) : base(logger)
    {
    }
}