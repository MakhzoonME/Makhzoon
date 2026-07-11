/* Boots shared chrome on every page. Loaded after seeds + sidebar + header. */
window.App = window.App || {};

App.Shell = {
  mount() {
    App.Sidebar.render();
    App.Header.render();
    App.ui.icons();
  },
};

App.Shell.mount();
