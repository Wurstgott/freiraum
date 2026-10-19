from playwright.sync_api import sync_playwright
svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#EDEFE7"/>
<g stroke="#17241D" stroke-width="13" stroke-linecap="round" fill="none">
<path d="M92 430V150M140 430V112M188 430V176M324 430V164M372 430V100M420 430V140"/></g>
<g stroke="#17241D" stroke-width="3" opacity=".55">''' + "".join(f'<path d="M{x} 430V{y}"/>' for x,y in [(110,190),(122,210),(160,150),(170,200),(342,190),(354,180),(392,150),(402,200)]) + '''</g>
<path d="M236 150 196 430h120l-40-280z" fill="#E3B64E" opacity=".38"/>
<ellipse cx="256" cy="428" rx="74" ry="16" fill="#E3B64E" opacity=".7"/>
<circle cx="256" cy="118" r="34" fill="#E3B64E"/>
<path d="M150 430h212" stroke="#17241D" stroke-width="10" stroke-linecap="round"/></svg>'''
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":512,"height":512})
    pg.set_content(f'<html><body style="margin:0">{svg}</body></html>')
    for s,n in [(512,"icon-512.png"),(192,"icon-192.png"),(180,"apple-touch-icon.png")]:
        pg.set_viewport_size({"width":s,"height":s}); pg.evaluate(f"document.querySelector('svg').setAttribute('width',{s});document.querySelector('svg').setAttribute('height',{s})")
        pg.screenshot(path="/home/claude/lichtung/repo/"+n, clip={"x":0,"y":0,"width":s,"height":s})
    b.close()
