// Apply the saved theme. Kept in its own file because MV3's CSP blocks inline scripts.
chrome.storage.sync.get('theme', (data) => {
  if (data.theme !== 'dark') {
    return;
  }
  const apply = () => document.body.classList.add('dark-mode');
  if (document.body) {
    apply();
  } else {
    document.addEventListener('DOMContentLoaded', apply);
  }
});
