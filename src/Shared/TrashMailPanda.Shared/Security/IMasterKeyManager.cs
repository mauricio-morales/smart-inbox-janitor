using System.Threading.Tasks;

namespace TrashMailPanda.Shared.Security;

/// <summary>
/// Interface for master key management operations
/// Provides centralized encryption key generation, derivation, and validation
/// </summary>
public interface IMasterKeyManager
{
    /// <summary>
    /// Generate a new 256-bit master key using cryptographically secure randomness
    /// </summary>
    /// <returns>Result containing the base64-encoded master key or error details</returns>
    Task<EncryptionResult<string>> GenerateMasterKeyAsync();

    /// <summary>
    /// Derive a master key from system entropy for deterministic key generation
    /// Uses platform-specific entropy sources for consistency across sessions
    /// </summary>
    /// <returns>Result containing the derived master key or error details</returns>
    Task<EncryptionResult<string>> DeriveMasterKeyAsync();

    /// <summary>
    /// Validate that a master key is properly formatted and usable for encryption
    /// </summary>
    /// <param name="masterKey">The master key to validate</param>
    /// <returns>Result indicating whether the master key is valid</returns>
    Task<EncryptionResult<bool>> ValidateMasterKeyAsync(string masterKey);

    /// <summary>
    /// Encrypt data using the provided master key
    /// </summary>
    /// <param name="plainText">The data to encrypt</param>
    /// <param name="masterKey">The master key to use for encryption</param>
    /// <returns>Result containing encrypted data or error details</returns>
    Task<EncryptionResult<string>> EncryptWithMasterKeyAsync(string plainText, string masterKey);

    /// <summary>
    /// Decrypt data using the provided master key
    /// </summary>
    /// <param name="encryptedData">The encrypted data to decrypt</param>
    /// <param name="masterKey">The master key to use for decryption</param>
    /// <returns>Result containing decrypted data or error details</returns>
    Task<EncryptionResult<string>> DecryptWithMasterKeyAsync(string encryptedData, string masterKey);
}