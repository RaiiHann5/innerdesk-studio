// Sets the colour theme before the page paints, so there is no flash of the wrong theme.
// This is a separate file (not an inline script) so the production Content-Security-Policy can say script-src 'self'
// with no 'unsafe-inline' and no hashes. Keep it free of anything that needs the network.
try {
  var s = (JSON.parse(localStorage.getItem('pos:ui') || '{}').state) || {};
  var t = s.theme || 'system';
  var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
} catch (e) {}
