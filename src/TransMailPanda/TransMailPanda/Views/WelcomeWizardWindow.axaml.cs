using Avalonia.Controls;
using TransMailPanda.ViewModels;

namespace TransMailPanda.Views;

public partial class WelcomeWizardWindow : Window
{
    public WelcomeWizardWindow()
    {
        InitializeComponent();
        DataContext = App.GetService<WelcomeWizardViewModel>();
    }
}