import json
from collections import Counter

data = json.load(open('data/coral_spawning_data.json'))
species_db = json.load(open('data/coral_species.json'))

species_counts = Counter()
for e in data:
    key = f"{e.get('genus','')} {e.get('species','')}"
    species_counts[key] += 1

print('Top 30 species by record count:')
for sp, count in species_counts.most_common(30):
    print(f'  {sp}: {count}')

print(f'\nTotal unique species: {len(species_counts)}')
print(f'Species with 5+ records: {sum(1 for c in species_counts.values() if c >= 5)}')
print(f'Species with 10+ records: {sum(1 for c in species_counts.values() if c >= 10)}')

# Check which species already have distinct image_url in the spawning data
distinct_imgs = set()
for e in data:
    img = e.get('image_url', '')
    genus = e.get('genus', '')
    genus_img = species_db.get(genus, {}).get('image_url', '')
    if img and img != genus_img:
        distinct_imgs.add(f"{e['genus']} {e['species']}")

print(f'\nSpecies with distinct (non-genus-level) images: {len(distinct_imgs)}')
for s in sorted(distinct_imgs)[:15]:
    print(f'  {s}')
