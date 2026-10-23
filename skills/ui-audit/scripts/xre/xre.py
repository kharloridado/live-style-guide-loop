"""Load an ODC context_graph (XRE) and walk it.

Library:   from xre import load, find, tree, props, name, path
CLI:       python xre.py extract <tool-result.json> [<more pages> ...] <out.xre>
           python xre.py summary <app.xre>

`context_graph` answers in pages: a JSON header block, then one text block per entry of its
`blocks` list. The harness usually saves a large answer as a JSON array of {type, text}.
`extract` concatenates the `xre` blocks of every page given, in order, into one XRE file.

XRE: `nodes` plus the parallel arrays `edgeSrc`, `edgeDst`, `edgeAttr`. An edge whose
`relationType` is "Parent" points src = parent -> dst = child; every other edge is a reference
(DataType, ReferedObject, Style, Role, ...).
"""
import collections
import json
import sys

SKIP = {'X', 'Y', 'CreatedBy', 'LastModifiedBy', 'LastModifiedDate', 'LastMergedBy', 'LastMergedDate',
        'CreatedByTool', 'LastModifiedByTool', 'ModifiedByTools', 'CreatedByAgent', 'LastModifiedByAgent',
        'ModifiedByAgents', '_key', '_type', 'Name', 'Description', 'Icon', 'IsDisabled', 'DisplayName'}


def load(path):
    x = json.load(open(path, encoding='utf-8'))
    N = x['nodes']
    kids = collections.defaultdict(list)
    par = {}
    refs = collections.defaultdict(list)
    for s, d, a in zip(x['edgeSrc'], x['edgeDst'], x['edgeAttr']):
        if a.get('relationType') == 'Parent':
            kids[s].append((a.get('index', 0), d, a.get('_type')))
            par[d] = s
        else:
            refs[s].append((d, a))
    for k in kids:
        kids[k].sort()
    return x, N, kids, par, refs


def name(N, i):
    n = N[i]
    return f"{n.get('_type')}:{n.get('Name', '')}"


def path(N, par, i):
    out = []
    while i in par:
        out.append(N[i].get('Name') or N[i].get('_type'))
        i = par[i]
    return '/'.join(reversed(out))


def props(n, w=120):
    return ' '.join(f"{k}={str(v)[:w]!r}" for k, v in n.items()
                    if k not in SKIP and v not in (None, '', False, 0, '0001-01-01T00:00:00'))


def tree(N, kids, i, depth=0, maxd=6, out=None, w=120):
    out = out if out is not None else []
    n = N[i]
    out.append('  ' * depth + f"[{i}] {n['_type'].replace('OutSystems.Plugin.NRWidgets.', 'W.')} {n.get('Name', '')}  {props(n, w)}")
    if depth < maxd:
        for _, c, _t in kids.get(i, []):
            tree(N, kids, c, depth + 1, maxd, out, w)
    return out


def find(N, t=None, name=None):
    return [i for i, n in enumerate(N) if (t is None or n['_type'] == t) and (name is None or n.get('Name') == name)]


def extract(pages, out):
    xre, header = [], None
    for p in pages:
        blocks = json.load(open(p, encoding='utf-8'))
        if isinstance(blocks, dict):          # already a bare XRE
            json.dump(blocks, open(out, 'w', encoding='utf-8'))
            return
        texts = [b['text'] for b in blocks]
        try:
            head = json.loads(texts[0])
            if 'blocks' in head:
                header = head
                kinds = head['blocks']
                xre += [t for k, t in zip(kinds, texts[1:]) if k == 'xre']
                continue
        except ValueError:
            pass
        xre.append(texts[0])               # an answer without a header is the whole graph
    open(out, 'w', encoding='utf-8').write(''.join(xre))
    if header:
        print(f"revision {header.get('revision')} of {header.get('latest_revision')}, has_more={header.get('has_more')}")


def summary(path_):
    x, N, kids, par, refs = load(path_)
    c = collections.Counter(n['_type'] for n in N)
    for t in ('IMobileScreen', 'IMobileBlock', 'IEntity', 'IServerAction', 'IDataAction', 'ITimer', 'IRole',
              'ISQLNode', 'IJavaScriptNode', 'OutSystems.Plugin.RESTService.RestService', 'OutSystems.Plugin.REST.RestClient'):
        print(f"{t}: {c.get(t, 0)}  {sorted(N[i].get('Name') or '' for i in find(N, t))[:30]}")
    for i in find(N, 'IValidationMessage'):
        print('-', N[i].get('Message'), '|', (N[i].get('Detail') or '')[:160])


if __name__ == '__main__':
    if len(sys.argv) >= 4 and sys.argv[1] == 'extract':
        extract(sys.argv[2:-1], sys.argv[-1])
    elif len(sys.argv) == 3 and sys.argv[1] == 'summary':
        summary(sys.argv[2])
    else:
        sys.exit(__doc__)
