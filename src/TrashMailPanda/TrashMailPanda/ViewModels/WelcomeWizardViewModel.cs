using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using System.Threading.Tasks;
using TrashMailPanda.Shared;

namespace TrashMailPanda.ViewModels;

/// <summary>
/// ViewModel for the welcome wizard that guides users through initial setup
/// </summary>
public partial class WelcomeWizardViewModel : ViewModelBase
{
    [ObservableProperty]
    private OnboardingStep _currentStep = OnboardingStep.GmailSignin;

    [ObservableProperty]
    private bool _isGmailConnected = false;

    [ObservableProperty]
    private string _gmailAccountEmail = string.Empty;

    [ObservableProperty]
    private bool _isOpenAiConfigured = false;

    [ObservableProperty]
    private string _openAiKeyLastFour = string.Empty;

    [ObservableProperty]
    private bool _canProceedToNext = false;

    [ObservableProperty]
    private string _statusMessage = string.Empty;

    [ObservableProperty]
    private bool _isLoading = false;

    [ObservableProperty]
    private string _openAiApiKey = string.Empty;

    // Step titles for UI binding
    public string WelcomeTitle => "Welcome to TrashMail Panda";
    public string WelcomeMessage => "Let's get your email cleanup assistant set up. This will only take a few minutes.";

    public string GmailStepTitle => "Connect Your Gmail Account";
    public string GmailStepMessage => "Sign in with your existing Gmail credentials. No technical setup required.";

    public string OpenAiStepTitle => "Set Up AI Assistant";
    public string OpenAiStepMessage => "Configure OpenAI access for intelligent email classification. We'll guide you through getting an API key.";

    public string ReadyTitle => "You're All Set!";
    public string ReadyMessage => "TrashMail Panda is ready to help you clean your inbox safely and efficiently.";

    // Navigation
    public bool IsWelcomeStep => CurrentStep == OnboardingStep.GmailSignin;
    public bool IsGmailStep => CurrentStep == OnboardingStep.GmailSignin;
    public bool IsOpenAiStep => CurrentStep == OnboardingStep.OpenaiSetup;
    public bool IsReadyStep => CurrentStep == OnboardingStep.Ready;

    // Button text for proceed button
    public string ProceedButtonText => CurrentStep switch
    {
        OnboardingStep.Ready => "Start Using TrashMail Panda",
        _ => "Next →"
    };

    // Commands
    [RelayCommand]
    private async Task ConnectGmailAsync()
    {
        IsLoading = true;
        StatusMessage = "Connecting to Gmail...";

        try
        {
            // TODO: Implement Gmail connection through provider
            // This is a placeholder - actual implementation will use the Gmail provider
            await Task.Delay(2000); // Simulate OAuth flow

            IsGmailConnected = true;
            GmailAccountEmail = "user@example.com"; // This will come from actual OAuth response
            StatusMessage = "✅ Connected successfully!";
            CanProceedToNext = true;
        }
        catch (System.Exception ex)
        {
            StatusMessage = $"❌ Connection failed: {ex.Message}";
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private async Task TestOpenAiConnectionAsync()
    {
        if (string.IsNullOrWhiteSpace(OpenAiApiKey))
        {
            StatusMessage = "Please enter your OpenAI API key";
            return;
        }

        IsLoading = true;
        StatusMessage = "Testing OpenAI connection...";

        try
        {
            // TODO: Implement OpenAI connection test through provider
            // This is a placeholder - actual implementation will use the OpenAI provider
            await Task.Delay(1500); // Simulate API test

            IsOpenAiConfigured = true;
            OpenAiKeyLastFour = OpenAiApiKey.Length >= 4 ? OpenAiApiKey[^4..] : "****";
            StatusMessage = "✅ OpenAI connection successful!";
            CanProceedToNext = true;
        }
        catch (System.Exception ex)
        {
            StatusMessage = $"❌ Connection test failed: {ex.Message}";
            IsOpenAiConfigured = false;
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    private void NextStep()
    {
        switch (CurrentStep)
        {
            case OnboardingStep.GmailSignin when IsGmailConnected:
                CurrentStep = OnboardingStep.OpenaiSetup;
                ResetStepState();
                break;
            case OnboardingStep.OpenaiSetup when IsOpenAiConfigured:
                CurrentStep = OnboardingStep.Ready;
                StatusMessage = "Setup complete! You can now start cleaning your inbox.";
                break;
        }
    }

    [RelayCommand]
    private void PreviousStep()
    {
        switch (CurrentStep)
        {
            case OnboardingStep.OpenaiSetup:
                CurrentStep = OnboardingStep.GmailSignin;
                ResetStepState();
                break;
            case OnboardingStep.Ready:
                CurrentStep = OnboardingStep.OpenaiSetup;
                ResetStepState();
                break;
        }
    }

    [RelayCommand]
    private void Proceed()
    {
        if (CurrentStep == OnboardingStep.Ready)
        {
            FinishSetup();
        }
        else
        {
            NextStep();
        }
    }

    [RelayCommand]
    private void FinishSetup()
    {
        // This will be handled by the parent window/application
        // to transition to the main application view
    }

    [RelayCommand]
    private async Task OpenOpenAiDashboardAsync()
    {
        await Task.CompletedTask;

        // Open OpenAI dashboard in default browser
        try
        {
            var url = "https://platform.openai.com/api-keys";
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
        catch
        {
            StatusMessage = "Could not open browser. Please navigate to platform.openai.com/api-keys manually.";
        }
    }

    partial void OnCurrentStepChanged(OnboardingStep value)
    {
        // Update navigation properties when step changes
        OnPropertyChanged(nameof(IsWelcomeStep));
        OnPropertyChanged(nameof(IsGmailStep));
        OnPropertyChanged(nameof(IsOpenAiStep));
        OnPropertyChanged(nameof(IsReadyStep));
        OnPropertyChanged(nameof(ProceedButtonText));
    }

    private void ResetStepState()
    {
        CanProceedToNext = false;
        StatusMessage = string.Empty;
        IsLoading = false;
    }
}