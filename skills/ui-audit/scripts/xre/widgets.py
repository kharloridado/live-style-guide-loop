import sys, json
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from xre import load, find

x, N, kids, par, refs = load(sys.argv[1])
CR = json.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else {}
out = open(sys.argv[2], 'w', encoding='utf-8')
P = lambda *a: print(*a, file=out)

def tname(i):
    for d, a in refs.get(i, []):
        if a.get('_type') != 'DataType':
            return N[d].get('Name') or N[d]['_type']
    return None

OPS = {'Eq': '=', 'NEq': '<>', 'Plus': '+', 'Minus': '-', 'And': ' and ', 'Or': ' or ', 'LT': '<', 'LE': '<=', 'GT': '>', 'GE': '>=', 'Mul': '*', 'Div': '/', 'Not': 'not ', 'Mod': ' mod '}

def txt(n):
    if 'TextValue' in n: return repr(n['TextValue'])
    h = n.get('TextHash')
    if h in CR: return repr(CR[h])
    return f"<txt{n.get('TextLength')}>"

def ex(i):
    if i is None: return ''
    n = N[i]; t = n['_type']; ch = [c for _, c, _ in kids.get(i, [])]
    if t == 'ExpressionAST': return ' '.join(ex(c) for c in ch)
    if t == 'Text': return txt(n)
    if t in ('Integer', 'Decimal', 'Boolean', 'Date', 'DateTime', 'Time', 'LongInteger', 'Currency'): return str(n.get('Value'))
    if t == 'Identifier': return tname(i) or '?'
    if t == 'CompoundIdentifier':
        base = tname(i); rest = '.'.join(ex(c) for c in ch)
        return f"{base}.{rest}" if base and rest else (base or rest)
    if t == 'BinaryOperation' and len(ch) == 2:
        op = n.get('Operator'); return f"({ex(ch[0])}{OPS.get(op, ' ' + str(op) + ' ')}{ex(ch[1])})"
    if t == 'UnaryOperation': return OPS.get(n.get('Operator'), str(n.get('Operator'))) + ''.join(ex(c) for c in ch)
    if t == 'Call': return f"{tname(i) or '?'}({', '.join(ex(c) for c in ch)})"
    if t in ('Argument', 'IArgument'): return ''.join(ex(c) for c in ch)
    return f"<{t}>" + ''.join(ex(c) for c in ch)

WT = lambda n: n['_type'].replace('OutSystems.Plugin.NRWidgets.', '').replace('INR', '').replace('Widget', '').replace('IMobileBlockInstance', 'Block')

def style(i):
    for d, a in refs.get(i, []):
        if a.get('_type') == 'Style': return ex(d)
    return ''

def wline(i):
    n = N[i]; t = WT(n); bits = [t]
    if n.get('Name'): bits.append(n['Name'])
    st = style(i)
    if st and st not in ("''",): bits.append('class=' + st)
    for _, c, rel in kids.get(i, []):
        cn = N[c]
        if rel == 'Visible':
            v = ex(c)
            if v and v != 'True': bits.append('visible=' + v)
        elif rel == 'Enabled':
            v = ex(c)
            if v and v != 'True': bits.append('enabled=' + v)
        elif rel in ('Value', 'Condition', 'Content') and cn['_type'] == 'ExpressionAST': bits.append(f"{rel.lower()}=" + ex(c))
        elif rel == 'ExtendedProperties':
            v = [ex(z) for _, z, r in kids[c] if r == 'Value']
            bits.append(f"@{cn.get('Property')}=" + (v[0] if v else ''))
        elif rel == 'StyleClasses': bits.append('class=' + ex(c))
        elif rel in ('OnClick', 'OnChange', 'OnScrollEnding') or cn['_type'] == 'INRBuiltinEvent':
            h = tname(c)
            if h: bits.append(f"{rel}->{h}")
        elif rel == 'Arguments':
            bits.append(f"arg {tname(c)}=" + ex(c))
    if t == 'Text': bits.append('text=' + txt(n) if 'Text' in n or 'TextValue' in n else '')
    for k in ('Text', 'Tag', 'Mode', 'IconName', 'Size', 'HtmlTag', 'Tag', 'InputType', 'Mandatory', 'MaxLength', 'Prompt', 'Transition', 'Example'):
        if n.get(k) not in (None, '', False) and k not in ('Text',): bits.append(f"{k}={n[k]!r}")
    if t == 'Text' and n.get('Text') is not None: bits.append(f"text={n['Text']!r}")
    for d, a in refs.get(i, []):
        if a.get('_type') in ('SourceBlock', 'Source', 'Variable', 'TargetWidget', 'Placeholder'): bits.append(f"{a['_type']}={N[d].get('Name') or ex(d)}")
    return ' '.join(b for b in bits if b)

def walk(i, d):
    P('  ' * d + wline(i))
    for _, c, rel in kids.get(i, []):
        if rel in ('Widgets', 'TrueBranch', 'FalseBranch', 'PlaceholdersContent', 'Content') and N[c]['_type'] != 'ExpressionAST':
            if rel in ('TrueBranch', 'FalseBranch'): P('  ' * (d + 1) + f'<{rel}>')
            walk(c, d + 1)

for t in ('IMobileBlock', 'IMobileScreen'):
    for s in find(N, t):
        n = N[s]
        P(f"\n## {t[1:]} {n['Name']}  title={n.get('Title')!r}")
        ins = [f"{N[c].get('Name')}" for _, c, r in kids[s] if N[c]['_type'] in ('IInputParameter',)]
        lv = [f"{N[c].get('Name')}" for _, c, r in kids[s] if N[c]['_type'] in ('ILocalVariable',)]
        P('  inputs:', ins, ' locals:', lv)
        for _, c, r in kids[s]:
            if r == 'Widgets' or N[c]['_type'].startswith('OutSystems.Plugin.NRWidgets') or N[c]['_type'] in ('IMobileBlockInstanceWidget', 'INRPlaceholderWidget'):
                walk(c, 1)
out.close()
