import json
import urllib.request
import urllib.parse
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

def search_inaturalist_species(genus, species):
    full_name = f"{genus} {species}"
    query = urllib.parse.quote(full_name)
    headers = {'User-Agent': 'CoralTracker/1.1'}
    
    taxa_url = f"https://api.inaturalist.org/v1/taxa?q={query}&rank=species&per_page=5"
    
    # helper for api calling with retries
    def get_json(url):
        retries = 3
        delay = 2
        for i in range(retries):
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req) as response:
                    return json.loads(response.read().decode())
            except Exception as e:
                err_str = str(e)
                if '429' in err_str:
                    print(f"  [~] Rate limit hit. Sleeping {delay}s...")
                    time.sleep(delay)
                    delay *= 2
                else:
                    raise e
        return None

    try:
        data = get_json(taxa_url)
        if not data: return None
        results = data.get('results', [])
        
        if not results:
            return None
            
        best_match = None
        for r in results:
            if r.get('name', '').lower() == full_name.lower():
                best_match = r
                break
                
        if not best_match:
            return None
            
        taxon_id = best_match['id']
        time.sleep(1) # Extra buffer between queries
        
        obs_url = f"https://api.inaturalist.org/v1/observations?taxon_id={taxon_id}&photo_licensed=true&photo_license=cc-by,cc-by-nc,cc0&quality_grade=research&per_page=1&order_by=votes"
        obs_data = get_json(obs_url)
        if not obs_data: return None
        obs_results = obs_data.get('results', [])
            
        if obs_results and obs_results[0].get('observation_photos'):
            photo = obs_results[0]['observation_photos'][0]['photo']
            return photo['url'].replace('square', 'medium')
            
    except Exception as e:
        print(f"  [X] Error {full_name}: {e}")
        return None
    return None

def main():
    spawning_file = 'data/coral_spawning_data.json'
    with open(spawning_file, 'r', encoding='utf-8') as f:
        spawning_data = json.load(f)

    PLACEHOLDER = '1583212292454-1fe6229603b7'
    
    valid_species_urls = {}
    for e in spawning_data:
        g, s = e.get('genus'), e.get('species')
        img = e.get('image_url', '')
        if g and s and img and PLACEHOLDER not in img:
            valid_species_urls[f"{g} {s}"] = img

    missing_species = set()
    for e in spawning_data:
        g, s, img = e.get('genus'), e.get('species'), e.get('image_url', '')
        if g and s and s.lower() not in ['sp', 'sp.', 'spp', 'spp.']:
            if not img or PLACEHOLDER in img:
                if '*' not in s and '?' not in s:
                    if f"{g} {s}" not in valid_species_urls:
                        missing_species.add((g, s))

    to_fetch = list(missing_species)
    print(f"Species left to fetch: {len(to_fetch)}\n")
    
    updates_made = 0
    for i, (g, s) in enumerate(to_fetch):
        print(f"[{i+1}/{len(to_fetch)}] {g} {s}...")
        
        time.sleep(1.5) # Gentle rate limit
        
        url = search_inaturalist_species(g, s)
        if url:
            print(f"  [+] Found: {url}")
            updates_made += 1
            for e in spawning_data:
                if e.get('genus') == g and e.get('species') == s:
                    curr = e.get('image_url', '')
                    if not curr or PLACEHOLDER in curr:
                        e['image_url'] = url
            
            if updates_made % 5 == 0:
                with open(spawning_file, 'w', encoding='utf-8') as f:
                    json.dump(spawning_data, f, indent=2)
                    
    with open(spawning_file, 'w', encoding='utf-8') as f:
        json.dump(spawning_data, f, indent=2)
        
    print(f"\nFinished. Updated {updates_made} species.")

if __name__ == '__main__':
    main()
