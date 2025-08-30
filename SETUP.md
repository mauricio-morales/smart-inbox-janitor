# TransMail Panda - Setup Guide

## 🚀 Quick Start

### Prerequisites

- **.NET 8.0 SDK** or later installed
- **Google Cloud Console** account
- **OpenAI API** account (optional - users can add this later)

### 1. Restore Dependencies

```bash
dotnet restore
```

### 2. Set Up Google OAuth

#### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Gmail API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and enable it

#### Step 2: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Desktop application"
4. Set name to "TransMail Panda"
5. **IMPORTANT**: Add redirect URI: `http://localhost:8080`
6. Download the credentials JSON or copy the Client ID and Secret

#### Step 3: Configure Application Settings

1. Copy the example settings file:

   ```bash
   cp src/TransMailPanda/appsettings.example.json src/TransMailPanda/appsettings.json
   ```

2. Edit `appsettings.json` and add your Google credentials:
   ```json
   {
     "GoogleOAuth": {
       "ClientId": "your_client_id_here.apps.googleusercontent.com",
       "ClientSecret": "your_client_secret_here",
       "RedirectUri": "http://localhost:8080"
     }
   }
   ```

### 3. Run the Application

#### Development Mode

```bash
dotnet run --project src/TransMailPanda
```

#### Build and Run Production

```bash
dotnet build --configuration Release
dotnet run --project src/TransMailPanda --configuration Release
```

## 🔧 Configuration Options

### Configuration Settings

- `GoogleOAuth:ClientId` - OAuth client ID from Google Cloud Console
- `GoogleOAuth:ClientSecret` - OAuth client secret from Google Cloud Console
- `GoogleOAuth:RedirectUri` - OAuth redirect URI (default: http://localhost:8080)
- `OpenAI:ApiKey` - OpenAI API key (optional, users can add during onboarding)
- `Environment` - Environment (Development/Production)
- `Database:ConnectionString` - SQLite database location (default: Data Source=./data/app.db)

### First Run Experience

1. **Gmail Setup**: App will guide you through OAuth flow
2. **OpenAI Setup**: Enter your API key during onboarding
3. **Email Classification**: Start using AI-powered email triage

## 🛠️ Development

### Available Commands

- `dotnet run --project src/TransMailPanda` - Start development server with hot reload
- `dotnet build` - Build the application
- `dotnet format --verify-no-changes` - Verify code formatting
- `dotnet format` - Format code
- `dotnet test` - Run xUnit tests
- `dotnet build --configuration Release` - Release build validation

### File Structure

```
src/
├── TransMailPanda/     # Main Avalonia application
│   ├── Views/          # Avalonia XAML views
│   ├── ViewModels/     # MVVM view models
│   └── Services/       # Application services
├── Shared/             # Shared utilities
└── Providers/          # Gmail, OpenAI, SQLite integrations
```

## 🔒 Security Notes

- OAuth tokens are encrypted using OS keychain (DPAPI, macOS Keychain, libsecret)
- No sensitive data is logged or exposed
- All API calls use secure HTTPS with certificate validation
- Desktop app runs locally (no cloud dependencies)
- SQLite database encrypted with SQLCipher

## 🐛 Troubleshooting

### Common Issues

**"OAuth client not initialized"**

- Check your `appsettings.json` file has correct Google credentials
- Verify the redirect URI matches Google Cloud Console

**"Gmail API not enabled"**

- Enable Gmail API in Google Cloud Console
- Wait a few minutes for propagation

**"Invalid OpenAI API key"**

- Verify key format starts with `sk-`
- Check OpenAI account has credits/quota

### Debug Mode

Set `"Logging:LogLevel:Default": "Debug"` in `appsettings.json` for verbose logging.

## 📞 Support

- Check the [GitHub Issues](https://github.com/your-repo/smart-inbox-janitor/issues)
- Review troubleshooting section above
- Ensure all prerequisites are met
- Verify .NET 8.0 SDK is properly installed with `dotnet --version`
