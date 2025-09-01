using Avalonia.Controls;
using TrashMailPanda.ViewModels;

namespace TrashMailPanda.Views;

public partial class WelcomeWizardWindow : Window
{
    public WelcomeWizardWindow()
    {
        InitializeComponent();
        DataContext = App.GetService<WelcomeWizardViewModel>();
    }
}