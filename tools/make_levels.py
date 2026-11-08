"""Generates levels/district-01..03.json from a compact design table.
Shot limits start as placeholders; `npm run balance -- --write` tunes them with the bot."""
import json

# Back row then middle row. Duplicates go in the first two (far apart) slots.
SLOTS = [(-0.33, 1.6), (0.33, 1.6), (0.0, 1.6), (-0.17, 1.28), (0.17, 1.28)]
OB = {
    'center': [[0.0, 1.0, 0.22, 0.045]],
    'sides': [[-0.3, 1.0, 0.18, 0.045], [0.3, 1.0, 0.18, 0.045]],
    'stagger': [[-0.22, 0.92, 0.2, 0.045], [0.24, 1.05, 0.2, 0.045]],
}

# Later districts deal richer pieces (weights for tiers 1-5), so big builds stay a few minutes long.
SPAWN = {
    (2, 2): [25, 30, 25, 14, 6], (2, 3): [15, 25, 30, 20, 10],
    (3, 1): [20, 28, 27, 17, 8], (3, 2): [12, 22, 30, 24, 12], (3, 3): [8, 18, 30, 28, 16],
}

def lvl(did, n, name, contracts, start=(), obstacles=None, hint=None, spawn=None):
    l = {'id': f'{did}-{n}', 'name': name, 'shots': 99, 'contracts': [{'tier': t, 'count': c} for t, c in contracts]}
    band = (did, (n - 1) // 5 + 1)
    if spawn or band in SPAWN:
        l['spawn'] = spawn or SPAWN[band]
    if start:
        l['start'] = [[t, *SLOTS[i]] for i, t in enumerate(start)]
    if obstacles:
        l['obstacles'] = OB[obstacles]
    if hint:
        l['hint'] = hint
    return l

D1 = [
    lvl(1, 1, 'First Shed', [(3, 1)], hint='Drag to aim, let go to slide. Two matching pieces merge!'),
    lvl(1, 2, 'Two Sheds', [(3, 2)], hint='Aim at a matching piece to merge it.'),
    lvl(1, 3, 'Log Cabin', [(4, 1)], start=(2, 2, 1), hint='Watch the NEXT card to plan your shot.'),
    lvl(1, 4, 'Neighbours', [(4, 1), (3, 2)]),
    lvl(1, 5, 'Big Build: Cottage', [(5, 1)], start=(3, 3, 2), hint='Big Build! Chain merges for bonus points.'),
    lvl(1, 6, 'Breather', [(4, 1)], start=(3, 3)),
    lvl(1, 7, 'Cabin Row', [(4, 2)]),
    lvl(1, 8, 'Cottage Garden', [(5, 1), (3, 2)]),
    lvl(1, 9, 'Two Cottages', [(5, 2)], start=(4, 4, 3)),
    lvl(1, 10, 'Big Build: House', [(6, 1)], start=(4, 4, 3, 2)),
    lvl(1, 11, 'Breather', [(5, 1)], start=(4, 4)),
    lvl(1, 12, 'Street Corner', [(6, 1), (4, 2)], start=(5, 3)),
    lvl(1, 13, 'Big House', [(7, 1)], start=(6, 5, 4)),
    lvl(1, 14, 'House Pair', [(6, 2)], start=(5, 5, 4, 3)),
    lvl(1, 15, 'Big Build: Mansion', [(8, 1)], start=(7, 6, 5, 4, 3), hint='Chain reaction! Build the smallest link and push it into the next.'),
]
D2 = [
    lvl(2, 1, 'Welcome to the Suburbs', [(5, 1)], hint='Every level has a shot limit. Finish early for more stars!'),
    lvl(2, 2, 'Fresh Paint', [(6, 1)], start=(5, 4, 3)),
    lvl(2, 3, 'Block Party', [(6, 1), (5, 1)], start=(4, 4, 5)),
    lvl(2, 4, 'Garage Sale', [(7, 1)], start=(6, 5, 4, 3)),
    lvl(2, 5, 'Big Build: Mansion', [(8, 1)], start=(7, 6, 5, 4), hint='Chain reaction! Build the smallest link and push it into the next.'),
    lvl(2, 6, 'Breather', [(6, 1)], start=(5, 5)),
    lvl(2, 7, 'Twin Houses', [(7, 2)], start=(6, 6, 5, 4)),
    lvl(2, 8, 'Estate Agent', [(8, 1), (6, 1)], start=(7, 5, 5, 4)),
    lvl(2, 9, 'Row Houses', [(9, 1)], start=(8, 7, 6, 5, 4)),
    lvl(2, 10, 'Big Build: Townhouses', [(9, 1)], start=(8, 7, 6, 5, 4)),
    lvl(2, 11, 'Breather', [(7, 1)], start=(6, 6)),
    lvl(2, 12, 'Two Mansions', [(8, 2)], start=(7, 7, 6, 5)),
    lvl(2, 13, 'Cul-de-sac', [(8, 1), (7, 1)], start=(6, 6, 7, 5, 4)),
    lvl(2, 14, 'Row Houses II', [(9, 1)], start=(8, 7, 6, 5)),
    lvl(2, 15, 'Big Build: Apartments', [(10, 1)], start=(9, 8, 7, 6, 5), spawn=[5, 15, 30, 30, 20], hint='The biggest build in the Suburbs. Follow the chain!'),
]
D3 = [
    lvl(3, 1, 'Scaffolding Up', [(6, 1)], start=(5, 4), obstacles='center', hint='Scaffolds stop shots dead. Aim around them!'),
    lvl(3, 2, 'Narrow Lanes', [(7, 1)], start=(6, 5, 4), obstacles='center'),
    lvl(3, 3, 'Market Square', [(7, 1), (6, 1)], start=(5, 5, 6, 4), obstacles='sides'),
    lvl(3, 4, 'Behind the Scaffold', [(8, 1)], start=(7, 6, 5, 4), obstacles='center'),
    lvl(3, 5, 'Big Build: Townhouses', [(9, 1)], start=(8, 7, 6, 5, 4), obstacles='sides'),
    lvl(3, 6, 'Breather', [(7, 1)], start=(6, 6)),
    lvl(3, 7, 'Old Mansions', [(8, 1), (7, 1)], start=(7, 6, 5), obstacles='stagger'),
    lvl(3, 8, 'Clock Tower Lane', [(8, 2)], start=(7, 7, 6, 5), obstacles='stagger'),
    lvl(3, 9, 'Canal Houses', [(9, 1)], start=(8, 7, 6, 5), obstacles='center'),
    lvl(3, 10, 'Big Build: Townhouse Row', [(9, 1), (8, 1)], start=(8, 7, 6, 5), obstacles='sides'),
    lvl(3, 11, 'Breather', [(8, 1)], start=(7, 7)),
    lvl(3, 12, 'Twin Rows', [(8, 2), (7, 1)], start=(7, 7, 6, 5), obstacles='stagger'),
    lvl(3, 13, 'Town Hall', [(9, 1), (7, 1)], start=(8, 6, 6, 5), obstacles='center'),
    lvl(3, 14, 'High Street', [(9, 2)], start=(8, 8, 7, 6), obstacles='center', spawn=[5, 15, 30, 30, 20]),
    lvl(3, 15, 'Big Build: Apartments', [(10, 1)], start=(9, 8, 7, 6, 5), obstacles='center', spawn=[5, 15, 30, 30, 20], hint='The tallest build in Old Town. Plan your merges!'),
]
for did, name, time, levels in [(1, 'Backyard', 'morning', D1), (2, 'Suburbs', 'noon', D2), (3, 'Old Town', 'golden', D3)]:
    with open(f'levels/district-{did:02d}.json', 'w') as f:
        json.dump({'id': did, 'name': name, 'time': time, 'levels': levels}, f, indent=2)
        f.write('\n')
print('ok')
