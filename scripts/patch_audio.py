from pathlib import Path
import re, urllib.request

MUSIC = "https://cdn.jsdelivr.net/gh/t17067042-code/biome-world-tg@main/bg-music.mp3"
Path("publish").mkdir(exist_ok=True)

req = urllib.request.Request("https://biome-world-game.netlify.app/", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=60) as r:
    h = r.read().decode("utf-8", "replace")

def replace_fn(html, name, new_body):
    m = re.search(rf"function {name}\([^)]*\)\{{", html)
    if not m:
        print("MISSING", name)
        return html
    start = m.start()
    i = html.find("{", start)
    depth = 0
    end = i
    for j in range(i, len(html)):
        if html[j] == "{":
            depth += 1
        elif html[j] == "}":
            depth -= 1
            if depth == 0:
                end = j + 1
                break
    print("replaced", name, end - start)
    return html[:start] + new_body + html[end:]

new_start = f"""function startBackgroundMusic(){{\n  if(!musicEnabled) return;\n  let a=document.getElementById('bgMusic');\n  if(!a){{\n    a=document.createElement('audio');\n    a.id='bgMusic'; a.loop=true; a.preload='auto'; a.playsInline=true;\n    a.innerHTML='<source src=\"{MUSIC}\" type=\"audio/mpeg\">';\n    document.body.appendChild(a);\n  }}\n  try{{\n    a.src='{MUSIC}';\n    a.volume=Math.max(0.05, Math.min(1, musicVolume||0.32));\n    a.muted=false;\n    const p=a.play(); if(p&&p.catch) p.catch(()=>{{}});\n  }}catch(e){{}}\n}}"""

new_stop = """function stopBackgroundMusic(){\n  if(musicTimer){clearInterval(musicTimer);musicTimer=null}\n  if(musicGain){try{musicGain.disconnect()}catch(e){}musicGain=null}\n  const a=document.getElementById('bgMusic');\n  if(a){try{a.pause()}catch(e){}}\n}"""

new_update = """function updateAudioSettings(){\n  if(musicGain)musicGain.gain.value=musicEnabled?musicVolume:0;\n  const a=document.getElementById('bgMusic');\n  if(a){\n    a.volume=Math.max(0.05, Math.min(1, musicVolume||0.32));\n    if(!musicEnabled){try{a.pause()}catch(e){}}\n    else if(a.paused){try{a.play().catch(()=>{})}catch(e){}}\n  }\n}"""

h = replace_fn(h, "startBackgroundMusic", new_start)
h = replace_fn(h, "stopBackgroundMusic", new_stop)
h = replace_fn(h, "updateAudioSettings", new_update)

if 'id="bgMusic"' not in h:
    h = h.replace("<body>", f'<body><audio id="bgMusic" preload="auto" loop playsinline><source src="{MUSIC}" type="audio/mpeg"></audio>', 1)
else:
    h = re.sub(
        r'<audio[^>]*id="bgMusic"[^>]*>[\s\S]*?</audio>',
        f'<audio id="bgMusic" preload="auto" loop playsinline><source src="{MUSIC}" type="audio/mpeg"></audio>',
        h,
        count=1,
    )

wire = """<script>document.addEventListener('pointerdown',function(){try{if(typeof unlockGameAudio==='function')unlockGameAudio()}catch(e){}},{passive:true,once:true});</script>"""
h = h.replace("</body>", wire + "</body>", 1) if "</body>" in h else h + wire

Path("publish/.nojekyll").write_text("")
Path("publish/index.html").write_text(h, encoding="utf-8")
assert "function audioTone" in h and "function playChop" in h
assert "if(!musicEnabled) return" in h
print("OK", len(h))
