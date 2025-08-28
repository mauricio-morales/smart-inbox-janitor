# Smart Inbox Janitor - Setup Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** installed
- **Google Cloud Console** account
- **OpenAI API** account (optional - users can add this later)

### 1. Install Dependencies

```bash
npm install
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
4. Set name to "Smart Inbox Janitor"
5. **IMPORTANT**: Add redirect URI: `http://localhost:8080`
6. Download the credentials JSON or copy the Client ID and Secret

#### Step 3: Configure Environment

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Google credentials:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8080
   ```

### 3. Run the Application

#### Development Mode

```bash
npm run dev
```

#### Build and Run Production

```bash
npm run build
npm start
```

## 🔧 Configuration Options

### Environment Variables

- `GOOGLE_CLIENT_ID` - OAuth client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - OAuth client secret from Google Cloud Console
- `GOOGLE_REDIRECT_URI` - OAuth redirect URI (default: http://localhost:8080)
- `OPENAI_API_KEY` - OpenAI API key (optional, users can add during onboarding)
- `NODE_ENV` - Environment (development/production)
- `DATABASE_PATH` - SQLite database location (default: ./data/app.db)

### First Run Experience

1. **Gmail Setup**: App will guide you through OAuth flow
2. **OpenAI Setup**: Enter your API key during onboarding
3. **Email Classification**: Start using AI-powered email triage

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run ci:quick` - Fast validation (lint + types + build)

### File Structure

```
src/
├── main/           # Electron main process
│   ├── oauth/      # OAuth implementation
│   └── security/   # Secure storage
├── renderer/       # React frontend
└── providers/      # Gmail, OpenAI, SQLite integrations
```

## 🔒 Security Notes

- OAuth tokens are encrypted using OS keychain
- No sensitive data is logged or exposed
- All API calls use secure HTTPS
- Desktop app runs locally (no cloud dependencies)

## 🐛 Troubleshooting

### Common Issues

**"OAuth client not initialized"**

- Check your `.env` file has correct Google credentials
- Verify the redirect URI matches Google Cloud Console

**"Gmail API not enabled"**

- Enable Gmail API in Google Cloud Console
- Wait a few minutes for propagation

**"Invalid OpenAI API key"**

- Verify key format starts with `sk-`
- Check OpenAI account has credits/quota

### Debug Mode

Set `DEBUG=true` in `.env` for verbose logging.

## 📞 Support

- Check the [GitHub Issues](https://github.com/your-repo/smart-inbox-janitor/issues)
- Review troubleshooting section above
- Ensure all prerequisites are met
