"""Generates levels/district-01..05.json: five themed districts of 33 levels each.

Each district runs in three acts of 11 levels. Every act climbs from a breather
to a landmark Big Build (levels 11, 22 and 33), and every act starts one tier
higher than the last. Later districts start higher, use scaffolds more often
(with new layouts), deal richer pieces and give less help in the starting pile.

Shot limits start as placeholders; `npm run balance -- --write` tunes them with
the bot so the target win rate falls gently through each district.
"""
import json
import math

# Collider diameters (table widths) per tier, mirroring src/core/tiers.ts x footprintScale 1.3.
FOOT = [0.08, 0.10, 0.12, 0.14, 0.16, 0.175, 0.19, 0.20, 0.21, 0.22, 0.225, 0.23, 0.235, 0.24, 0.24, 0.245, 0.25, 0.25]
rad = lambda t: FOOT[t - 1] * 1.3 / 2

# Back row then middle row. Duplicates go in the first two (far apart) slots.
SLOTS = [(-0.33, 1.6), (0.33, 1.6), (0.0, 1.6), (-0.17, 1.28), (0.17, 1.28)]
OB = {
    'center': [[0.0, 1.0, 0.22, 0.045]],
    'sides': [[-0.3, 1.0, 0.18, 0.045], [0.3, 1.0, 0.18, 0.045]],
    'stagger': [[-0.22, 0.92, 0.2, 0.045], [0.24, 1.05, 0.2, 0.045]],
    'gate': [[-0.29, 0.95, 0.26, 0.045], [0.29, 0.95, 0.26, 0.045]],
    'pillars': [[-0.26, 0.9, 0.1, 0.045], [0.0, 1.05, 0.1, 0.045], [0.26, 0.9, 0.1, 0.045]],
    'funnel': [[-0.33, 1.02, 0.2, 0.045], [0.0, 0.85, 0.14, 0.045], [0.33, 1.02, 0.2, 0.045]],
}
# 'gate', 'funnel' and 'pillars' proved too tight with big buildings (the pile jams in front of them).
OB_ORDER = ['center', 'sides', 'stagger']

THEMES = [
    # id, name, base tier, building names (tiers 1-18)
    (1, 'Construction Site', 3, ['Brick', 'Doghouse', 'Garden Shed', 'Log Cabin', 'Cottage', 'House', 'Big House', 'Mansion', 'Townhouses', 'Apartments', 'Apartment Block', 'Office Tower', 'Skyscraper', 'Twisted Tower', 'Megatower', 'Hero HQ', 'Sky Citadel', 'Space Elevator']),
    (2, 'Tropical Beach', 4, ['Sandcastle', 'Beach Hut', 'Lifeguard Tower', 'Tiki Hut', 'Surf Shack', 'Beach Cottage', 'Stilt House', 'Overwater Bungalow', 'Bungalow Pier', 'Pool Villa', 'Seaside Apartments', 'Beach Resort', 'Palm Hotel', 'Sail Tower', 'Lagoon Resort', 'Coral Palace', 'Island Citadel', 'Paradise Spire']),
    (3, 'Alpine Peaks', 5, ['Woodpile', 'Tent', "Hunter's Hut", 'A-Frame Cabin', 'Log Cabin', 'Big Log Cabin', 'Luxury Log Cabin', 'Chalet', 'Ski Lodge', 'Mountain Villa', 'Grand Chalet', 'Alpine Hotel', 'Cliff Villa', 'Peak Resort', 'Cable Car Station', 'Mountain Castle', 'Glacier Palace', 'Summit Observatory']),
    (4, 'Sweet Town', 6, ['Sugar Cube', 'Cupcake Hut', 'Candy Kiosk', 'Gingerbread Cabin', 'Cookie Cottage', 'Gingerbread House', 'Donut House', 'Layer Cake Manor', 'Macaron Row', 'Ice Cream Parlour', 'Chocolate Block', 'Lollipop Tower', 'Candy Cane Tower', 'Soft-Serve Swirl', 'Wedding Cake Tower', 'Candy Castle', 'Sundae Citadel', 'Rainbow Spire']),
    (5, 'Neon City', 6, ['Neon Cube', 'Pod Home', 'A-Frame Pod', 'Hexa Home', 'Wedge House', 'Stack House', 'Hover House', 'Sky Villa', 'Neon Rowhouses', 'Pod Tower', 'Arcology', 'Neon Tower', 'Holo Skyscraper', 'Helix Tower', 'Mega Spire', 'Cyber HQ', 'Sky Dome', 'Orbital Tower']),
    (6, 'Atlantis', 6, ['Seashell', 'Coral Hut', 'Clam House', 'Diving Bell', 'Bubble Dome', 'Reef Cottage', 'Sea Manor', 'Pearl Villa', 'Coral Terraces', 'Column Hall', 'Reef Apartments', 'Lighthouse Tower', 'Kelp Tower', 'Trident Tower', 'Conch Spire', "Poseidon's Temple", 'Crystal Palace', 'Atlantis Spire']),
    (7, 'Sakura Spring', 6, ['Stone Lantern', 'Tea Stall', 'Shrine Gate', 'Garden Teahouse', 'Paper House', 'Machiya', 'Ryokan Inn', 'Samurai House', 'Temple Hall', 'Moon Pavilion', 'Three-Tier Pagoda', 'Five-Tier Pagoda', 'Castle Keep', 'Blossom Tower', 'Golden Pavilion', 'Shogun Castle', 'Cloud Palace', 'Sakura Spire']),
    (8, 'Desert Oasis', 7, ['Mud Brick', 'Nomad Tent', 'Market Stall', 'Adobe Hut', 'Oasis House', 'Courtyard House', 'Domed Villa', 'Merchant House', 'Sandstone Row', 'Bazaar Palace', 'Obelisk', 'Temple of the Sun', 'Step Pyramid', 'Great Pyramid', 'Sphinx Temple', "Pharaoh's Palace", 'Golden Citadel', 'Sun Spire']),
]
MAX_CONTRACT = 10

# Spawn weights for tiers 1-5 by "richness" (0 = default weights).
SPAWN = [None, [28, 30, 24, 13, 5], [20, 28, 27, 17, 8], [12, 22, 30, 24, 12], [8, 18, 30, 28, 16], [5, 15, 30, 30, 20]]

HINTS = {
    (1, 1): 'Drag to aim, let go to slide. Two matching pieces merge!',
    (1, 2): 'Aim at a matching piece to merge it. A glowing ring shows a merge.',
    (1, 3): 'Watch the NEXT card to plan your shot.',
    (1, 4): 'Every level has a shot limit. Finish early for more stars!',
    (1, 11): 'Big Build! Chain merges: build the smallest link and push it into the next.',
    (2, 1): 'Welcome to the beach! Bigger buildings, bigger rewards.',
    (3, 1): 'Alpine Peaks: scaffolds everywhere. Aim around them!',
    (4, 1): 'Sweet Town: tight gaps and sweet chains.',
    (5, 1): 'Neon City: every shot counts!',
    (6, 1): 'Welcome to Atlantis! Bubbles, pearls and big chains.',
    (7, 1): 'Sakura Spring: calm petals, tricky pagodas.',
    (8, 1): 'Desert Oasis: the final district. Build to the sun!',
}


def plural(name):
    if name.endswith('s'):
        return name
    if name.endswith('y') and not name.endswith('ay'):
        return name[:-1] + 'ies'
    if name.endswith(('sh', 'ch')):
        return name + 'es'
    return name + 's'


def fit_start(tiers, obstacles):
    """Places the starting pile in the slots, dropping pieces that would overlap (largest first)."""
    tiers = [t for t in tiers if t >= 1]
    while tiers:
        pts = [(t, *SLOTS[i]) for i, t in enumerate(tiers)]
        ok = True
        for i, (t, x, y) in enumerate(pts):
            if abs(x) + rad(t) > 0.5 or y + rad(t) > 1.8:
                ok = False
            for (t2, x2, y2) in pts[i + 1:]:
                if math.hypot(x - x2, y - y2) < rad(t) + rad(t2) + 0.005:
                    ok = False
            for (ox, oy, w, h) in obstacles:
                dx = max(abs(x - ox) - w / 2, 0)
                dy = max(abs(y - oy) - h / 2, 0)
                if math.hypot(dx, dy) < rad(t) + 0.01:
                    ok = False
        if ok:
            return [[t, x, y] for (t, x, y) in pts]
        tiers = tiers[:-1]
    return []


def district(did, theme, base, names):
    nm = lambda t: names[t - 1]
    levels = []
    seen_ob = did > 1
    ob_i = did  # rotate layouts, offset per district
    for n in range(1, 34):
        act = (n - 1) // 11  # 0, 1, 2
        pos = (n - 1) % 11 + 1  # 1..11
        t0 = base + act
        # How many of the optional levels get scaffolds in this district.
        ob_slots = {1: set(), 2: {9}, 3: {5, 9}, 4: {2, 5, 9}, 5: {2, 5, 9, 10}}.get(did, {2, 5, 9})
        if did == 1 and act == 2:
            ob_slots = {5, 9}
        # Starting piles help less as the district goes on.
        help_ = 1 if act < 2 else 0
        if pos == 1:
            name, contracts, start = 'Breather' if n > 1 else f'Welcome to {theme}', [(t0, 1)], [t0 - 1, t0 - 1]
        elif pos == 2:
            name, contracts, start = f'{nm(t0 + 1)}', [(t0 + 1, 1)], [t0, t0 - 1, t0 - 2][: 2 + help_]
        elif pos == 3:
            name, contracts, start = f'{nm(t0 + 1)} & {nm(t0)}', [(t0 + 1, 1), (t0, 1)], [t0 - 1, t0 - 1, t0][: 2 + help_]
        elif pos == 4:
            name, contracts, start = f'Two {plural(nm(t0))}', [(t0, 2)], [t0 - 1, t0 - 1, t0 - 2]
        elif pos == 5:
            name, contracts, start = f'{nm(t0 + 1)} Lane', [(t0 + 1, 1)], [t0, t0 - 1, t0 - 2]
        elif pos == 6:
            name, contracts, start = f'{nm(t0 + 2)}', [(t0 + 2, 1)], [t0 + 1, t0, t0 - 1, t0 - 2][: 3 + help_]
        elif pos == 7:
            name, contracts, start = f'{nm(t0 + 2)} & {nm(t0)}', [(t0 + 2, 1), (t0, 1)], [t0 + 1, t0 - 1, t0 - 1, t0][: 3 + help_]
        elif pos == 8:
            name, contracts, start = f'Two {plural(nm(t0 + 1))}', [(t0 + 1, 2)], [t0, t0, t0 - 1, t0 - 2]
        elif pos == 9:
            name, contracts, start = f'{nm(t0 + 2)} Square', [(t0 + 2, 1)], [t0 + 1, t0, t0 - 1]
        elif pos == 10:
            # In the last act the second building is a size smaller (two big builds jam the table).
            second = t0 + 1 if act < 2 else t0
            name, contracts, start = f'{nm(t0 + 2)} & {nm(second)}', [(t0 + 2, 1), (second, 1)], [t0 + 1, t0, t0, t0 - 1]
        else:
            top = t0 + 3
            name, contracts, start = f'Big Build: {nm(min(top, MAX_CONTRACT))}', [(top, 1)], [top - 1, top - 2, top - 3, top - 4, top - 5]
        contracts = [(min(t, MAX_CONTRACT), c) for t, c in contracts]
        # Big Builds keep a full chain so the landmark always has a path to it.
        if pos == 11:
            top = contracts[0][0]
            start = [top - 1, top - 2, top - 3, top - 4, top - 5]
        # Big buildings crowd the table: high-tier levels start with a smaller pile.
        if pos != 11 and max(t for t, _ in contracts) >= 9:
            start = start[:3]
        obstacles = []
        if pos in ob_slots:
            key = OB_ORDER[ob_i % len(OB_ORDER)]
            ob_i += 1
            obstacles = OB[key]
            start = start[:2]
            # Scaffold levels top out a tier lower: the table jams in front of them otherwise.
            capped = [(min(t, 9), c) for t, c in contracts]
            if capped != contracts:
                contracts = capped
                name = f'{nm(contracts[0][0])} Scaffolds'
        level = {'id': f'{did}-{n}', 'name': name, 'shots': 99, 'contracts': [{'tier': t, 'count': c} for t, c in contracts]}
        richness = min(4, max(0, did - 1 + act + (1 if pos >= 6 else 0) - (1 if pos == 1 else 0)))
        # Rich spawns jam the table in front of scaffolds and around big landmark piles.
        if obstacles or pos == 11:
            richness = min(richness, 2)
        if SPAWN[richness]:
            level['spawn'] = SPAWN[richness]
        pile = fit_start(start, obstacles)
        if pile:
            level['start'] = pile
        if obstacles:
            level['obstacles'] = obstacles
        hint = HINTS.get((did, n))
        if obstacles and not seen_ob:
            hint = 'Scaffolds stop shots dead. Aim around them!'
            seen_ob = True
        if hint:
            level['hint'] = hint
        levels.append(level)
    return {'id': did, 'name': theme, 'time': 'noon', 'levels': levels}


import os
ONLY = {int(x) for x in os.environ.get('ONLY', '').split(',') if x}
for did, theme, base, names in THEMES:
    if ONLY and did not in ONLY:
        continue
    with open(f'levels/district-{did:02d}.json', 'w') as f:
        json.dump(district(did, theme, base, names), f, indent=2)
        f.write('\n')
print('ok')
