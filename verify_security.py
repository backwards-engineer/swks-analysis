"""Scan version-controlled files without printing any matched credential values."""
import pathlib,re,subprocess,zipfile,sys

patterns=[
 re.compile(r'-----BEGIN '+r'(?:OPENSSH|RSA|EC|DSA|PRIVATE).*?KEY-----'),
 re.compile(r'github_pat_'+r'[A-Za-z0-9_]{20,}'),
 re.compile(r'gh[pousr]_'+r'[A-Za-z0-9]{20,}'),
 re.compile(r'AKIA'+r'[0-9A-Z]{16}'),
 re.compile(r'sk-'+r'[A-Za-z0-9]{32,}'),
 re.compile(r'''(?i)(?:password|api_key|access_token|client_secret)\s*[:=]\s*["'][^"']{8,}["']'''),
]
files=sys.argv[1:] or subprocess.check_output(['git','ls-files','--cached'],text=True).splitlines()
issues=[]
for name in files:
 p=pathlib.Path(name)
 if any(part in ['.ssh','.aws','.codex','node_modules'] for part in p.parts) or p.suffix in ['.key','.pem'] or p.name.startswith('.env'):
  issues.append((name,'excluded path'));continue
 payloads=[]
 if p.suffix=='.xlsx':
  with zipfile.ZipFile(p) as z:
   payloads=[z.read(n).decode('utf8',errors='ignore') for n in z.namelist() if n.endswith(('.xml','.rels'))]
 elif p.suffix.lower() not in ['.png','.jpg','.pdf']:
  payloads=[p.read_text(encoding='utf8',errors='ignore')]
 if any(pattern.search(content) for pattern in patterns for content in payloads):issues.append((name,'credential pattern'))
print('Files scanned:',len(files))
print('Potential credential findings:',len(issues))
for name,reason in issues:print(name,reason)
if issues:raise SystemExit(1)
