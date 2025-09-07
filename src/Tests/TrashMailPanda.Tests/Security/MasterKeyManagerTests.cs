using Microsoft.Extensions.Logging;
using Moq;
using System;
using System.Threading.Tasks;
using TrashMailPanda.Shared.Security;
using Xunit;

namespace TrashMailPanda.Tests.Security;

/// <summary>
/// Comprehensive tests for MasterKeyManager functionality
/// Tests cover key generation, derivation, validation, encryption/decryption, and error handling
/// </summary>
public class MasterKeyManagerTests
{
    private readonly Mock<ILogger<MasterKeyManager>> _mockLogger;
    private readonly MasterKeyManager _masterKeyManager;

    public MasterKeyManagerTests()
    {
        _mockLogger = new Mock<ILogger<MasterKeyManager>>();
        _masterKeyManager = new MasterKeyManager(_mockLogger.Object);
    }

    [Fact]
    public async Task GenerateMasterKeyAsync_ShouldReturnValidBase64Key()
    {
        // Act
        var result = await _masterKeyManager.GenerateMasterKeyAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.NotEmpty(result.Value);

        // Verify it's valid base64
        var keyBytes = Convert.FromBase64String(result.Value);
        Assert.Equal(32, keyBytes.Length); // 256-bit key
    }

    [Fact]
    public async Task GenerateMasterKeyAsync_ShouldGenerateDifferentKeysEachTime()
    {
        // Act
        var result1 = await _masterKeyManager.GenerateMasterKeyAsync();
        var result2 = await _masterKeyManager.GenerateMasterKeyAsync();

        // Assert
        Assert.True(result1.IsSuccess);
        Assert.True(result2.IsSuccess);
        Assert.NotEqual(result1.Value, result2.Value);
    }

    [Fact]
    public async Task DeriveMasterKeyAsync_ShouldReturnValidKey()
    {
        // Act
        var result = await _masterKeyManager.DeriveMasterKeyAsync();

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.NotEmpty(result.Value);

        // Verify it's valid base64
        var keyBytes = Convert.FromBase64String(result.Value);
        Assert.Equal(32, keyBytes.Length); // 256-bit key
    }

    [Fact]
    public async Task EncryptDecryptRoundTrip_WithEmptyString_ShouldFail()
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;

        // Act
        var encryptResult = await _masterKeyManager.EncryptWithMasterKeyAsync("", masterKey);

        // Assert
        Assert.False(encryptResult.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, encryptResult.ErrorType);
        Assert.Contains("Plain text cannot be null or empty", encryptResult.ErrorMessage);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task ValidateMasterKeyAsync_WithInvalidInput_ShouldReturnFailure(string? invalidKey)
    {
        // Act
        var result = await _masterKeyManager.ValidateMasterKeyAsync(invalidKey);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
    }

    [Fact]
    public async Task ValidateMasterKeyAsync_WithInvalidBase64_ShouldReturnFailure()
    {
        // Act
        var result = await _masterKeyManager.ValidateMasterKeyAsync("invalid-base64!");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
        Assert.Contains("not valid base64", result.ErrorMessage);
    }

    [Fact]
    public async Task ValidateMasterKeyAsync_WithWrongKeyLength_ShouldReturnFailure()
    {
        // Arrange - Create a valid base64 string but wrong length (16 bytes instead of 32)
        var shortKey = Convert.ToBase64String(new byte[16]);

        // Act
        var result = await _masterKeyManager.ValidateMasterKeyAsync(shortKey);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
        Assert.Contains("must be 256 bits", result.ErrorMessage);
    }

    [Fact]
    public async Task ValidateMasterKeyAsync_WithValidKey_ShouldReturnSuccess()
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var validKey = keyResult.Value!;

        // Act
        var result = await _masterKeyManager.ValidateMasterKeyAsync(validKey);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.Value);
    }

    [Theory]
    [InlineData("Hello, World!")]
    [InlineData("Test credential with special characters: áéíóú")]
    [InlineData("Multi\nLine\nText")]
    public async Task EncryptDecryptRoundTrip_ShouldPreserveOriginalText(string originalText)
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;

        // Act
        var encryptResult = await _masterKeyManager.EncryptWithMasterKeyAsync(originalText, masterKey);
        Assert.True(encryptResult.IsSuccess);

        var decryptResult = await _masterKeyManager.DecryptWithMasterKeyAsync(encryptResult.Value!, masterKey);

        // Assert
        Assert.True(decryptResult.IsSuccess);
        Assert.Equal(originalText, decryptResult.Value);
    }

    [Fact]
    public async Task EncryptWithMasterKeyAsync_WithInvalidKey_ShouldReturnFailure()
    {
        // Act
        var result = await _masterKeyManager.EncryptWithMasterKeyAsync("test", "invalid-key");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task EncryptWithMasterKeyAsync_WithInvalidPlainText_ShouldReturnFailure(string? invalidPlainText)
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;

        // Act
        var result = await _masterKeyManager.EncryptWithMasterKeyAsync(invalidPlainText, masterKey);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
    }

    [Fact]
    public async Task DecryptWithMasterKeyAsync_WithInvalidKey_ShouldReturnFailure()
    {
        // Act
        var result = await _masterKeyManager.DecryptWithMasterKeyAsync("dummydata", "invalid-key");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task DecryptWithMasterKeyAsync_WithInvalidEncryptedData_ShouldReturnFailure(string? invalidData)
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;

        // Act
        var result = await _masterKeyManager.DecryptWithMasterKeyAsync(invalidData, masterKey);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal(EncryptionErrorType.InvalidInput, result.ErrorType);
    }

    [Fact]
    public async Task DecryptWithMasterKeyAsync_WithWrongKey_ShouldReturnFailure()
    {
        // Arrange
        var keyResult1 = await _masterKeyManager.GenerateMasterKeyAsync();
        var keyResult2 = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey1 = keyResult1.Value!;
        var masterKey2 = keyResult2.Value!;

        var encryptResult = await _masterKeyManager.EncryptWithMasterKeyAsync("test", masterKey1);
        Assert.True(encryptResult.IsSuccess);

        // Act - Try to decrypt with wrong key
        var decryptResult = await _masterKeyManager.DecryptWithMasterKeyAsync(encryptResult.Value!, masterKey2);

        // Assert
        Assert.False(decryptResult.IsSuccess);
        Assert.Equal(EncryptionErrorType.DecryptionFailed, decryptResult.ErrorType);
    }

    [Fact]
    public async Task EncryptWithMasterKeyAsync_ShouldProduceDifferentOutputsForSameInput()
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;
        const string plainText = "test data";

        // Act
        var encryptResult1 = await _masterKeyManager.EncryptWithMasterKeyAsync(plainText, masterKey);
        var encryptResult2 = await _masterKeyManager.EncryptWithMasterKeyAsync(plainText, masterKey);

        // Assert
        Assert.True(encryptResult1.IsSuccess);
        Assert.True(encryptResult2.IsSuccess);
        Assert.NotEqual(encryptResult1.Value, encryptResult2.Value); // Should be different due to random IV
    }

    [Fact]
    public async Task MasterKeyManager_MultipleOperations_ShouldWorkCorrectly()
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;

        // Act & Assert - Multiple encrypt/decrypt operations
        for (int i = 0; i < 10; i++)
        {
            var testData = $"Test data {i}";

            var encryptResult = await _masterKeyManager.EncryptWithMasterKeyAsync(testData, masterKey);
            Assert.True(encryptResult.IsSuccess);

            var decryptResult = await _masterKeyManager.DecryptWithMasterKeyAsync(encryptResult.Value!, masterKey);
            Assert.True(decryptResult.IsSuccess);
            Assert.Equal(testData, decryptResult.Value);
        }
    }

    [Fact]
    public async Task ValidateMasterKeyAsync_ShouldTestKeyUsability()
    {
        // Arrange
        var keyResult = await _masterKeyManager.GenerateMasterKeyAsync();
        var masterKey = keyResult.Value!;

        // Act
        var validationResult = await _masterKeyManager.ValidateMasterKeyAsync(masterKey);

        // Assert
        Assert.True(validationResult.IsSuccess);
        Assert.True(validationResult.Value);
    }
}