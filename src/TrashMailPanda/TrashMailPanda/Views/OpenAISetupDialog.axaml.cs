using Avalonia.Controls;
using TrashMailPanda.ViewModels;

namespace TrashMailPanda.Views;

public partial class OpenAISetupDialog : Window
{
    public OpenAISetupDialog()
    {
        InitializeComponent();
    }

    public OpenAISetupDialog(OpenAISetupViewModel viewModel) : this()
    {
        DataContext = viewModel;
    }
}