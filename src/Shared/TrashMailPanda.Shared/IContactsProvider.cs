using System.Threading.Tasks;

namespace TrashMailPanda.Shared;

/// <summary>
/// Abstract interface for contacts providers
/// Provides contact information to enhance email classification
/// </summary>
public interface IContactsProvider
{
    /// <summary>
    /// Check if an email or domain is in the user's contacts
    /// </summary>
    /// <param name="emailOrDomain">Email address or domain to check</param>
    /// <returns>True if the contact is known</returns>
    Task<bool> IsKnownAsync(string emailOrDomain);

    /// <summary>
    /// Get the relationship strength with a contact
    /// </summary>
    /// <param name="email">Email address to check</param>
    /// <returns>Strength of relationship</returns>
    Task<RelationshipStrength> GetRelationshipStrengthAsync(string email);
}