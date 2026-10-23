import sys, json, hashlib, itertools, re, glob, string
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from xre import load

x, N, kids, par, refs = load(sys.argv[1])
want = {}
for i, n in enumerate(N):
    if n['_type'] == 'Text' and 'TextValue' not in n and n.get('TextHash'):
        want.setdefault(n['TextHash'], set()).add(n.get('TextLength'))
print('hashes', len(want))
found = {}

def test(s):
    h = hashlib.sha1(s.encode('utf-8', 'surrogatepass')).hexdigest()[:10]
    if h in want and h not in found:
        found[h] = s

cs = string.printable[:95] + '·—–→…’“”•✓✕×'
for L in (0, 1, 2, 3):
    for t in itertools.product(cs, repeat=L):
        test(''.join(t))

cands = set()
pat = re.compile(r'"((?:[^"\\]|\\.){0,400})"|\'((?:[^\'\\]|\\.){0,400})\'|`([^`]{0,3000})`')
for f in glob.glob(sys.argv[2] + '/*'):
    src = open(f, encoding='utf-8', errors='ignore').read()
    for m in pat.finditer(src):
        s = m.group(1) or m.group(2) or m.group(3) or ''
        cands.add(s)
        if '\\' in s:
            try:
                cands.add(json.loads('"' + s.replace('"', '\\"') + '"'))
            except Exception:
                cands.add(s.encode().decode('unicode_escape', errors='ignore'))
words = set()
for s in list(cands):
    for w in re.split(r'[\s,.;:()]+', s):
        words.add(w)
for s in cands | words:
    for v in (s, ' ' + s, s + ' ', ' ' + s + ' ', s.lower(), s.upper(), s.title()):
        test(v)
print('found', len(found))
json.dump(found, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
