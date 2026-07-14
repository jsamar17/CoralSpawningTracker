import json

data = json.load(open('data/coral_spawning_data.json'))
species_imgs = {}

for e in data:
    genus = e.get('genus')
    species = e.get('species')
    if genus and species and species.lower() not in ['sp', 'sp.', 'spp', 'spp.']:
        sp = f"{genus} {species}"
        img = e.get('image_url', '')
        
        # Check if it has an image that is NOT the placeholder
        if img and '1583212292454-1fe6229603b7' not in img:
            species_imgs[sp] = img
        else:
            if sp not in species_imgs:
                species_imgs[sp] = None

missing = [sp for sp, img in species_imgs.items() if not img]
found = [sp for sp, img in species_imgs.items() if img]

print(f'Total valid species: {len(species_imgs)}')
print(f'Species with specific image: {len(found)}')
print(f'Species missing specific image: {len(missing)}')

for s in sorted(missing)[:10]:
    print(f"Missing: {s}")
