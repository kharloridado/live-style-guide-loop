import sys, collections
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from xre import load, find

x, N, kids, par, refs = load(sys.argv[1])
import json as _j
CR = _j.load(open(sys.argv[3], encoding='utf-8')) if len(sys.argv) > 3 else {}
out = open(sys.argv[2], 'w', encoding='utf-8')
P = lambda *a: print(*a, file=out)

def tname(i):
    for d, a in refs.get(i, []):
        if a.get('_type') in ('ReferedObject', 'ReferedRuntimeProp', 'Parameter', 'Target', 'Action', 'Destination', 'Screen', 'ReferedEntity', 'Entity', 'Source'):
            return N[d].get('Name') or N[d]['_type']
    return None

OPS = {'Eq': '=', 'NEq': '<>', 'LT': '<', 'LE': '<=', 'GT': '>', 'GE': '>=', 'NotEq': '<>', 'Plus': '+', 'Minus': '-', 'And': ' and ', 'Or': ' or ', 'Lt': '<', 'Le': '<=', 'Gt': '>', 'Ge': '>=',
       'Less': '<', 'LessEq': '<=', 'Greater': '>', 'GreaterEq': '>=', 'Times': '*', 'Mul': '*', 'Div': '/', 'Not': 'not ', 'Like': ' like ', 'Mod': ' mod '}

def ex(i):
    n = N[i]; t = n['_type']; ch = [c for _, c, _ in kids.get(i, [])]
    if t == 'ExpressionAST': return ' '.join(ex(c) for c in ch)
    if t == 'Text': return repr(n['TextValue']) if 'TextValue' in n else (repr(CR[n['TextHash']]) if n.get('TextHash') in CR else f"<txt{n.get('TextLength')}>")
    if t in ('Integer', 'Decimal', 'Boolean', 'Date', 'DateTime', 'Time', 'LongInteger', 'Currency'): return str(n.get('Value'))
    if t == 'Identifier': return tname(i) or '?'
    if t == 'CompoundIdentifier':
        base = tname(i)
        rest = '.'.join(ex(c) for c in ch)
        return f"{base}.{rest}" if base and rest else (base or rest)
    if t == 'BinaryOperation' and len(ch) == 2:
        op = n.get('Operator'); return f"({ex(ch[0])}{OPS.get(op, ' ' + str(op) + ' ')}{ex(ch[1])})"
    if t == 'UnaryOperation': return OPS.get(n.get('Operator'), str(n.get('Operator'))) + ''.join(ex(c) for c in ch)
    if t == 'Call': return f"{tname(i) or '?'}({', '.join(ex(c) for c in ch)})"
    if t in ('Argument', 'IArgument'): return ''.join(ex(c) for c in ch)
    if t == 'ListLiteral': return '[' + ', '.join(ex(c) for c in ch) + ']'
    return f"<{t}>" + ''.join(ex(c) for c in ch)

FLOWT = ('IExecuteServerActionNode', 'IAggregateNode', 'IForEachNode', 'IIfNode', 'IAssignNode', 'IStartNode', 'IEndNode', 'IJavaScriptNode',
         'ISQLNode', 'IExecuteClientActionNode', 'IDestinationNode', 'IExceptionHandlerNode', 'IRaiseExceptionNode', 'ISwitchNode',
         'IJSONSerializeNode', 'IJSONDeserializeNode', 'IRefreshDataNode', 'IExternalDestinationNode', 'ICheckRoleNode', 'IListAppendNode')

def args_of(i):
    r = []
    for _, c, t in kids.get(i, []):
        if N[c]['_type'] == 'IArgument':
            r.append(f"{tname(c) or '?'}={ex(c)}")
    return ', '.join(r)

def agg(i):
    parts = []
    for _, c, t in kids.get(i, []):
        if N[c]['_type'] == 'ICombineSources':
            srcs, filt = [], []
            for _, cc, tt in kids[c]:
                if N[cc]['_type'] == 'IAliasedSource': srcs.append(tname(cc) or N[cc].get('Name') or '?')
                elif N[cc]['_type'] == 'IAddSource': srcs.append('+' + (tname(cc) or '?'))
                elif N[cc]['_type'] == 'ExpressionAST': filt.append(ex(cc))
                elif N[cc]['_type'] == 'ISort': filt.append('SORT ' + ' '.join(ex(z) for _, z, _ in kids[cc]) + (' DESC' if N[cc].get('Direction') == 'Descending' else ''))
                elif N[cc]['_type'] == 'IGroupBy': filt.append('GROUP ' + str([N[z].get('Name') for _, z, _ in kids[cc]]))
            parts.append(f"from {srcs} where {filt}")
        elif t == 'MaxRecords': parts.append('max=' + ex(c))
    # sources may be direct children
    for _, c, t in kids.get(i, []):
        if N[c]['_type'] in ('IAliasedSource',): parts.append('src ' + (tname(c) or '?'))
    return '; '.join(parts)

def node(i):
    n = N[i]; t = n['_type']; nm = n.get('Name') or n.get('Label') or ''
    if t == 'IAssignNode':
        a = []
        for _, c, _ in kids[i]:
            if N[c]['_type'] == 'IAssignment':
                cs = [ex(z) for _, z, _ in kids[c]]
                a.append(' := '.join(cs))
        return f"Assign {nm}: " + ' ; '.join(a)
    if t == 'IIfNode':
        cond = [ex(c) for _, c, _ in kids[i] if N[c]['_type'] == 'ExpressionAST']
        return f"If {cond}"
    if t == 'IForEachNode':
        lst = [ex(c) for _, c, _ in kids[i] if N[c]['_type'] == 'ExpressionAST']
        return f"ForEach {lst}"
    if t in ('IExecuteServerActionNode', 'IExecuteClientActionNode'):
        return f"Call {nm} -> {tname(i)}({args_of(i)})"
    if t == 'IAggregateNode': return f"Aggregate {nm}: {agg(i)}"
    if t == 'ISQLNode': return f"SQL {nm}: {n.get('SQL')}  params({args_of(i)})"
    if t == 'IJavaScriptNode': return f"JS {nm}: {n.get('JsSourceText')}"
    if t == 'IDestinationNode': return f"Destination -> {tname(i)}({args_of(i)}) transition={n.get('Transition')}"
    if t == 'IEndNode': return 'End'
    if t == 'IStartNode': return 'Start'
    return f"{t} {nm}"

def flow(a):
    nodes = [c for _, c, _ in kids.get(a, []) if N[c]['_type'] in FLOWT]
    S = set(nodes)
    E = collections.defaultdict(list)
    for s, d, at in zip(x['edgeSrc'], x['edgeDst'], x['edgeAttr']):
        if s in S and d in S: E[s].append((d, at))
    start = [c for c in nodes if N[c]['_type'] == 'IStartNode']
    seen = set(); lines = []
    def walk(i, depth):
        if i in seen: lines.append('  ' * depth + f'↩ (loop back to {node(i)[:40]})'); return
        seen.add(i)
        lines.append('  ' * depth + node(i))
        outs = E.get(i, [])
        for d, at in outs:
            lab = at.get('Label') or at.get('ConnectorType') or at.get('Branch') or ''
            extra = {k: v for k, v in at.items() if k not in ('_type', 'relationType', 'index')}
            if len(outs) > 1: lines.append('  ' * (depth + 1) + f'[{extra or at.get("_type")}]')
            walk(d, depth + (1 if len(outs) > 1 else 0))
    for s in start: walk(s, 1)
    for c in nodes:
        if c not in seen and N[c]['_type'] == 'IExceptionHandlerNode':
            lines.append('  ON EXCEPTION:'); walk(c, 2)
    return lines

def params(a):
    r = []
    for _, c, t in kids.get(a, []):
        if N[c]['_type'] in ('IInputParameter', 'IOutputParameter', 'ILocalVariable'):
            dt = [N[d].get('Name') for d, at in refs.get(c, []) if at.get('_type') == 'DataType']
            r.append(f"{N[c]['_type'][1:-9] if N[c]['_type'] != 'ILocalVariable' else 'Local'} {N[c].get('Name')}:{dt[0] if dt else '?'}")
    return r

def owner(i):
    while i in par:
        i = par[i]
        if N[i]['_type'] in ('IMobileScreen', 'IMobileBlock', 'IESpace', 'ITimer'): return N[i].get('Name')
    return ''

for t in ('IServerAction', 'IClientAction', 'IDataAction', 'IClientScreenAction', 'OutSystems.Plugin.RESTService.RestServiceAction', 'ISystemEvent'):
    for a in find(N, t):
        P(f"\n### {t[1:] if t.startswith('I') else t} {N[a].get('Name')}  [{owner(a)}]  {'Function' if N[a].get('Function') else ''}")
        if N[a].get('Description'): P('  desc:', N[a]['Description'])
        P('  vars:', '; '.join(params(a)))
        for l in flow(a): P(l)
out.close()
