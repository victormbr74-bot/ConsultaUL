from pathlib import Path
path = Path('index.html')
text = path.read_text(encoding='latin-1')
old = '  <script src="auth.js"></script>'
new = '  <script type="module" src="src/firebaseClient.js"></script>\n  <script src="auth.js"></script>'
if old not in text:
    raise SystemExit('auth.js marker not found in index.html')
text = text.replace(old, new, 1)
path.write_text(text, encoding='latin-1')
