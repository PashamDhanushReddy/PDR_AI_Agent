import urllib.request
import urllib.parse
import re

def test():
    query = "ceiling design"
    search_url = f"https://in.pinterest.com/search/pins/?q={urllib.parse.quote(query)}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    req = urllib.request.Request(search_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            html = response.read().decode('utf-8')
            
            # Pinterest stores initial images in the SSR state or __PWS_DATA__
            urls = re.findall(r'"(https://i\.pinimg\.com/originals/[^"]+\.jpg)"', html)
            # Remove duplicates
            urls = list(set(urls))
            
            print("Found images:", len(urls))
            for u in urls[:5]:
                print(u)
                
    except Exception as e:
        print("Error:", e)

test()
