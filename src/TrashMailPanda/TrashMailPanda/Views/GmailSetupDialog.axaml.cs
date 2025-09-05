using Avalonia.Controls;
using TrashMailPanda.ViewModels;

namespace TrashMailPanda.Views;

public partial class GmailSetupDialog : Window
{
    public GmailSetupDialog()
    {
        InitializeComponent();
    }

    public GmailSetupDialog(GmailSetupViewModel viewModel) : this()
    {
        DataContext = viewModel;
        
        // Subscribe to close request
        viewModel.RequestClose += (_, _) => Close(viewModel.DialogResult);
    }
}