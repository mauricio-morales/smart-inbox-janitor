namespace TransMailPanda.Services;

/// <summary>
/// Configuration class for Storage Provider
/// </summary>
public class StorageProviderConfig
{
    public string DatabasePath { get; set; } = "./data/transmail.db";
    public string EncryptionKey { get; set; } = string.Empty;
    public bool EnableWAL { get; set; } = true;
    public int CommandTimeoutSeconds { get; set; } = 30;
}