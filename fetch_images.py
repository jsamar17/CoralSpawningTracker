import json
import urllib.request
import urllib.parse
import time
import os
import sys

# Ensure UTF-8 output for Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        # Fallback for older python versions
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

GENERIC_IMAGE = "https://images.unsplash.com/photo-1583212292454-1fe6229603b7"

def get_wikipedia_image(title, search_suffix="(coral)"):
    # Try searching wikipedia for the given title
    url = "https://en.wikipedia.org/w/api.php?"
    
    search_titles = [f"{title} {search_suffix}", title]
    
    for t in search_titles:
        params = {
            "action": "query",
            "format": "json",
            "prop": "pageimages|extracts",
            "exintro": "True",
            "explaintext": "True",
            "piprop": "original",
            "titles": t,
            "redirects": "1"
        }
        
        query_string = urllib.parse.urlencode(params)
        req = urllib.request.Request(url + query_string, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                pages = data.get('query', {}).get('pages', {})
                
            for page_id, page_info in pages.items():
                if page_id != "-1":
                    if 'original' in page_info:
                        return page_info['original']['source']
        except Exception as e:
            print(f"Error fetching {t}: {e}")
        
        time.sleep(0.2) # Small delay between attempts
    
    return None

def main():
    species_json_path = "data/coral_species.json"
    spawning_json_path = "data/coral_spawning_data.json"
    
    # Load genus data
    with open(species_json_path, 'r', encoding='utf-8') as f:
        genus_data = json.load(f)
        
    # Load spawning data
    with open(spawning_json_path, 'r', encoding='utf-8') as f:
        spawning_data = json.load(f)
        
    print(f"Starting genus image fetch...")
    updated_genera = 0
    for idx, (genus, info) in enumerate(genus_data.items()):
        current_img = info.get('image_url', '')
        if not current_img or GENERIC_IMAGE in current_img:
            img_url = get_wikipedia_image(genus)
            if img_url:
                info['image_url'] = img_url
                print(f"Retrieved image for genus {genus}: {img_url}")
                updated_genera += 1
            else:
                print(f"No image found for genus {genus}")
            time.sleep(0.3)
            
    # Save updated genus data
    with open(species_json_path, 'w', encoding='utf-8') as f:
        json.dump(genus_data, f, indent=2)
        
    print(f"\nStarting species image fetch for spawning records...")
    # Find unique (genus, species) pairs that need images
    needs_image = {} # (genus, species) -> list of record indices
    
    for idx, record in enumerate(spawning_data):
        genus = record.get('genus')
        species = record.get('species')
        img_url = record.get('image_url', '')
        
        if genus and species and species.lower() not in ['sp', 'sp.', 'spp', 'spp.']:
            if not img_url or GENERIC_IMAGE in img_url:
                key = (genus, species)
                if key not in needs_image:
                    needs_image[key] = []
                needs_image[key].append(idx)

    updated_species = 0
    total_to_fetch = len(needs_image)
    print(f"Found {total_to_fetch} unique species lacking photos.")
    
    for idx, ((genus, species), record_indices) in enumerate(needs_image.items()):
        full_name = f"{genus} {species}"
        print(f"[{idx+1}/{total_to_fetch}] Fetching image for {full_name}...")
        
        img_url = get_wikipedia_image(full_name)
        if img_url:
            print(f"  Success: {img_url}")
            updated_species += 1
            for rec_idx in record_indices:
                spawning_data[rec_idx]['image_url'] = img_url
        else:
            print(f"  No species-specific image found.")
            
        time.sleep(0.5)
        
        # Periodic save just in case
        if (idx + 1) % 50 == 0:
             with open(spawning_json_path, 'w', encoding='utf-8') as f:
                json.dump(spawning_data, f, indent=2)

    # Final save
    with open(spawning_json_path, 'w', encoding='utf-8') as f:
        json.dump(spawning_data, f, indent=2)
        
    print(f"\nFinished!")
    print(f"Updated {updated_genera} genera.")
    print(f"Updated {updated_species} species across {sum(len(v) for v in needs_image.values()) if needs_image else 0} records.")

if __name__ == "__main__":
    main()
