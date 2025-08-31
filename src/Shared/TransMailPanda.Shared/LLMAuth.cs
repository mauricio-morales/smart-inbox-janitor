namespace TransMailPanda.Shared;

public abstract class LLMAuth
{
    public sealed class ApiKey : LLMAuth
    {
        public string Key { get; init; } = string.Empty;
    }
    
    public sealed class OAuth : LLMAuth
    {
        public string AccessToken { get; init; } = string.Empty;
        public string? RefreshToken { get; init; }
    }
    
    public sealed class Local : LLMAuth
    {
        public string Endpoint { get; init; } = string.Empty; // e.g., http://localhost:11434 for Ollama
    }
}