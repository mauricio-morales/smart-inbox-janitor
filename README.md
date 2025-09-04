# TrashMail Panda

An AI-powered email triage assistant that helps you clean your mailbox safely and efficiently. TrashMail Panda is focused on Gmail-first support with extensible architecture for other email providers.

## 🎯 Mission

TrashMail Panda helps users clean their mailbox through intelligent automation:

1. **Fetch** batches of emails from your Gmail account
2. **Score & explain** junk/spam/dangerous vs. keep classifications
3. **Propose bulk actions** for efficient email management
4. **Learn** from your explicit feedback to improve over time
5. **Execute** chosen actions via Gmail API with full user approval

**⚠️ Safety First**: Never permanently deletes or reports anything without explicit user approval in the current session.

## ✨ Key Features

### 🤖 AI-Powered Classification

- **Smart categorization**: keep, newsletter, promotion, spam, dangerous_phishing, unknown
- **Confidence scoring**: Clear likelihood ratings with explanations
- **Bulk grouping**: Automatically groups similar emails for efficient processing
- **Learning system**: Adapts to your preferences over time

### 🔒 Privacy & Security

- **Local storage**: All data stored locally on your device
- **Sanitized processing**: Blocks remote content while analyzing
- **Encrypted credentials**: Secure token storage using OS keychain
- **No cloud dependencies**: Your email data never leaves your device

### ⚡ Efficient Processing

- **Batch processing**: Handles thousands of emails efficiently
- **Resumable sessions**: Stop and resume processing anytime
- **Rate limiting**: Respects Gmail API limits with intelligent retry
- **Cost optimization**: Uses GPT-4o-mini for cost-effective classification

### 🎛️ Premium User Experience

- **Zero-configuration Gmail**: Simply sign in with existing credentials
- **Guided OpenAI setup**: Step-by-step wizard for API key configuration
- **Embedded authentication**: No external browser navigation required
- **Progress tracking**: Clear visibility into processing status

## 🏗️ Architecture

### Email Provider Support

- **Primary**: Gmail (full API integration)
- **Future**: IMAP and other providers via extensible interface

### AI Backend

- **Phase 1**: OpenAI GPT-4o-mini (fast, cost-effective)
- **Future**: Claude, Llama, and local models via pluggable interface

### Data Storage

- **Desktop**: SQLite with encrypted credentials
- **Future Browser**: IndexedDB with same interface for web compatibility

## 🚀 Getting Started

### Prerequisites

- Node.js and npm installed
- Gmail account
- OpenAI API key

### Setup Process

1. **Clone and install**:

   ```bash
   git clone https://github.com/mauricio-morales/trashmail-panda.git
   cd trashmail-panda
   npm install
   ```

2. **Gmail Authentication**:
   - Click "Connect Gmail" in the app
   - Sign in with your existing Gmail credentials
   - No developer configuration required

3. **OpenAI Setup**:
   - Follow the guided setup wizard
   - Get your API key from OpenAI dashboard
   - Test connection with sample classification

4. **Start Processing**:
   - Choose email folders to process
   - Review AI classifications
   - Approve bulk actions
   - Track progress across sessions

## 📊 Email Classifications

The AI categorizes emails into six types:

- **Keep** 📧: Important emails from contacts, receipts, 2FA codes
- **Newsletter** 📰: Legitimate newsletters with List-Unsubscribe headers
- **Promotion** 🏷️: Marketing emails and promotional content
- **Spam** 🗑️: Unwanted bulk emails, mass mailings
- **Dangerous** ⚠️: Phishing attempts, credential harvesting, malicious content
- **Unknown** ❓: Uncertain classifications requiring manual review

## ⚙️ Supported Actions

- **KEEP**: Preserve important emails
- **UNSUBSCRIBE_AND_DELETE**: Safely unsubscribe then delete
- **DELETE_ONLY**: Move to trash without unsubscribing
- **REPORT_DANGEROUS**: Report phishing/spam then delete

All actions include:

- ✅ **Bulk previews** with impact counts
- 🔄 **Undo capability** from Gmail trash
- 📝 **Rule suggestions** for future automation

## 🧠 Learning System

TrashMail Panda adapts to your preferences:

- **Always Keep Rules**: Auto-approve emails from trusted senders
- **Auto-Trash Rules**: Automatically handle unwanted senders/lists
- **Contact Weighting**: Boost trust for emails from your contacts
- **Pattern Recognition**: Learn from your approval/rejection patterns

## 🔐 Security & Privacy

- **Local-first**: All processing happens on your device
- **Encrypted storage**: Credentials secured with OS keychain
- **No remote logging**: Email content never sent to external services
- **Minimal LLM context**: Only essential data sent for classification
- **Reversible actions**: Everything can be undone from Gmail trash

## 🏃‍♂️ Development

### Tech Stack

- **Framework**: .NET 8.0 + Avalonia UI 11 (Cross-platform desktop)
- **MVVM**: CommunityToolkit.Mvvm for lightweight MVVM bindings
- **Database**: SQLite with SQLCipher encryption (Microsoft.Data.Sqlite)
- **Authentication**: Google OAuth with OS keychain secure storage
- **Email API**: Google.Apis.Gmail.v1 official client
- **HTML Preview**: Avalonia.WebView for safe, sandboxed email previews
- **DI/Logging**: Microsoft.Extensions.Hosting/DI/Logging
- **Resilience**: Polly for retries and exponential backoff
- **Security**: OS keychain APIs (DPAPI, macOS Keychain, libsecret)

### Project Structure

```
trashmail-panda/
├── src/
│   ├── TrashMailPanda/     # Main Avalonia application
│   │   ├── Views/          # Avalonia XAML views
│   │   ├── ViewModels/     # MVVM view models
│   │   ├── Models/         # Domain models
│   │   └── Services/       # Application services
│   ├── Shared/             # Shared types and utilities
│   │   ├── Base/           # IProvider architecture
│   │   ├── Models/         # Data transfer objects
│   │   ├── Extensions/     # Extension methods
│   │   └── Utils/          # Shared utilities
│   ├── Providers/          # Provider implementations
│   │   ├── Email/          # Gmail provider
│   │   ├── LLM/            # OpenAI provider
│   │   └── Storage/        # SQLite provider
│   └── Tests/              # xUnit test projects
├── data/                   # Local database storage
└── PRPs/                   # Project documentation
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Follow C# and Avalonia UI best practices
4. Add xUnit tests for new functionality
5. Submit a pull request

## 📈 Roadmap

### Phase 1: Core Foundation ✅

- Gmail integration with OAuth
- GPT-4o-mini classification
- SQLite local storage
- Basic email processing workflow

### Phase 2: Enhanced UX 🚧

- Advanced bulk operations
- Rule management interface
- Progress analytics
- Performance optimization

### Phase 3: Extensibility 🔮

- IMAP support for other providers
- Additional LLM backends (Claude, local)
- Browser-based version
- Mobile companion app

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🤝 Support

- **Issues**: Report bugs and request features on GitHub
- **Documentation**: Check the [app definition](trashmail-panda-app-definition.md) for detailed specs
- **Discussions**: Join community discussions for help and ideas

## ⚠️ Disclaimer

TrashMail Panda is designed to help manage your email safely. Always review AI suggestions before taking bulk actions. While the app prioritizes safety and reversibility, users are responsible for their email management decisions.

---

**Made with ❤️ for email productivity using .NET 8.0 and Avalonia UI 11**
