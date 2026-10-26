"""Deterministic, non-generative sprite export from the approved RGB board.
Run with Python 3 + Pillow + numpy. Source crop positions and edits remain reviewable.
No full board enters the runtime public directory.
"""
from pathlib import Path
from collections import deque
from PIL import Image, ImageDraw
import numpy as np
import json, hashlib, sys

ROOT=Path(__file__).resolve().parents[1]
PUBLIC = ROOT.parent / "site/public"  # the site serves what the pipeline exports
BOARD=ROOT/'references/Asad and Storm Pixel Sprite Board.png'
OUT=PUBLIC/'sprites'; SOURCE=ROOT/'source'; PREVIEW=ROOT/'previews'
for p in [OUT,SOURCE,PREVIEW]:p.mkdir(parents=True,exist_ok=True)
board=Image.open(BOARD).convert('RGB')
CROPS={'asad':(17,85,111,193),'storm-idle':(754,90,840,187),'storm-sleeping':(752,263,858,343),'asad-coffee':(391,237,474,347),'storm-standing':(753,393,877,497),'storm-sit':(1113,393,1207,499)}

def extract(box):
    crop=board.crop(box); rgb=np.array(crop).astype(float);h,w=rgb.shape[:2]
    # Board background is near RGB(11,24,40), with <= 3-channel gradient variation.
    # Flood only connected exterior near that color: dark enclosed clothing survives.
    candidate=np.linalg.norm(rgb-np.array([11,24,40]),axis=2)<14
    seen=np.zeros((h,w),dtype=bool);q=deque()
    for y in range(h):q.extend([(y,0),(y,w-1)])
    for x in range(w):q.extend([(0,x),(h-1,x)])
    while q:
        y,x=q.popleft()
        if not(0<=x<w and 0<=y<h) or seen[y,x] or not candidate[y,x]:continue
        seen[y,x]=True;q.extend([(y-1,x),(y+1,x),(y,x-1),(y,x+1)])
    alpha=np.where(seen,0,255).astype('uint8')
    # Discard detached compression/noise clusters under 4 pixels, keep genuine fur tufts.
    checked=np.zeros((h,w),dtype=bool)
    for y in range(h):
      for x in range(w):
        if not alpha[y,x] or checked[y,x]:continue
        group=[];q=deque([(y,x)]);checked[y,x]=True
        while q:
          yy,xx=q.popleft();group.append((yy,xx))
          for dy,dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny,nx=yy+dy,xx+dx
            if 0<=ny<h and 0<=nx<w and alpha[ny,nx] and not checked[ny,nx]:checked[ny,nx]=True;q.append((ny,nx))
        if len(group)<12:
          for yy,xx in group:alpha[yy,xx]=0
    rgba=np.array(crop.convert('RGBA'));rgba[:,:,3]=alpha;rgba[alpha==0,:3]=0
    cut=Image.fromarray(rgba).crop(Image.fromarray(alpha).getbbox())
    canvas=Image.new('RGBA',(128,128));canvas.alpha_composite(cut,((128-cut.width)//2,120-cut.height))
    return canvas
use_masters = '--reextract' not in sys.argv and (SOURCE/'palette.json').exists()
masters = {key:Image.open(SOURCE/(key+'-master.png')).convert('RGBA') if use_masters and (SOURCE/(key+'-master.png')).exists() else extract(box) for key,box in CROPS.items()}
if any(im.size != (128,128) for im in masters.values()): raise ValueError('Editable masters must remain 128x128')
# One shared palette across all frames; no per-frame quantization or temporal dithering.
atlas=Image.new('RGB',(128*len(masters),128),(18,21,34))
for i,m in enumerate(masters.values()):atlas.paste(m,(128*i,0),m)
palette=atlas.quantize(colors=128,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE)
pal=palette.getpalette();pal[375:384]=[143,157,83,65,81,44,187,190,99];palette.putpalette(pal)
if use_masters:
    saved=json.loads((SOURCE/'palette.json').read_text())
    if len(saved)!=384:raise ValueError('Expected 128 RGB palette entries')
    palette.putpalette(saved+[0]*(768-len(saved)))
def quantize(im):
    # Exact palette lookup is idempotent. Pillow's approximate color cube can
    # remap already-quantized pixels on a second export and cause temporal drift.
    rgba=np.array(im.convert('RGBA'))
    colors,inverse=np.unique(rgba[:,:,:3].reshape(-1,3),axis=0,return_inverse=True)
    pal=np.array(palette.getpalette()[:384],dtype=np.int32).reshape(128,3)
    distances=((colors.astype(np.int32)[:,None,:]-pal[None,:,:])**2).sum(axis=2)
    rgba[:,:,:3]=pal[distances.argmin(axis=1)][inverse].reshape(rgba.shape[0],rgba.shape[1],3)
    rgba[rgba[:,:,3]==0,:3]=0
    return Image.fromarray(rgba)
for k,im in masters.items():
    if not use_masters or not (SOURCE/(k+'-master.png')).exists():quantize(im).save(SOURCE/(k+'-master.png'),optimize=True)
# Edits work on a canonical master: no whole-character translation between frames.
asad=masters['asad']; typing=asad.copy()
# One-pixel finger movement in two tiny skin-colored clusters, all other pixels invariant.
# Coordinates are on normalized 128px canvas and can be tuned without re-extracting.
a=np.array(asad);t=np.array(typing)
for x in range(59,65):
 for y in range(98,101):
    if a[y,x,3] and int(a[y,x,0])>int(a[y,x,1])*1.15:
        t[y-1,x]=a[y,x];t[y,x]=a[y+1,x]
typing=Image.fromarray(t)
# Blink uses sampled coat colors with a small dark lid, no head/body substitutions.
storm=masters['storm-idle'];blink=storm.copy();d=ImageDraw.Draw(blink)
# positions adjusted against the normalized canonical master preview
for x,y in [(69,61),(86,61)]:
    # Warm upper/lower fur colors, with a thin curved closed lid.
    d.ellipse((x-5,y-4,x+5,y+4),fill=(191,147,104,255))
    d.arc((x-5,y-6,x+5,y+1),0,180,fill=(62,39,37,255),width=2)
# Sleep: move a small interior coat patch one pixel for a quiet breath, not the silhouette.
sleep=masters['storm-sleeping'];breath=sleep.copy()
mask=Image.new('L',(128,128));md=ImageDraw.Draw(mask);md.ellipse((42,65,68,73),fill=255)
shift=Image.new('RGBA',sleep.size);shift.alpha_composite(sleep,(0,-1));breath.paste(shift,(0,0),mask)
# Re-apply original alpha so no frame changes its footprint, then quantize against shared palette.
breath.putalpha(sleep.getchannel('A'))
frames={'asad-idle':[asad,asad.copy()], 'asad-typing':[asad,typing], 'storm-idle':[storm,blink], 'storm-sleeping':[sleep,breath], 'asad-coffee':[masters['asad-coffee']]*2, 'storm-standing':[masters['storm-standing']]*2, 'storm-sit':[masters['storm-sit']]*2}
frames={k:[quantize(im) for im in seq] for k,seq in frames.items()}
manifest={'version':1,'logicalSize':[128,128],'paletteColors':128,'sourceSHA256':hashlib.sha256(BOARD.read_bytes()).hexdigest(),'cropBoxes':CROPS,'states':{}}
for name,seq in frames.items():
    sheet=Image.new('RGBA',(256,128))
    for i,im in enumerate(seq):
        sheet.alpha_composite(im,(128*i,0));im.save(SOURCE/f'{name}-{i}.png',optimize=True)
    sheet.save(OUT/(name+'.png'),optimize=True);seq[0].save(OUT/(name+'-still.png'),optimize=True)
    durations={'asad-idle':[3200,3200],'asad-typing':[1300,160],'storm-idle':[4400,140],'storm-sleeping':[2400,2400],'asad-coffee':[3200,3200],'storm-standing':[3200,3200],'storm-sit':[3200,3200]}[name]
    seq[0].save(PREVIEW/(name+'.gif'),save_all=True,append_images=seq[1:],duration=durations,loop=0,disposal=2,transparency=0)
    manifest['states'][name]={'sheet':f'/sprites/{name}.png','still':f'/sprites/{name}-still.png','frames':2,'frameWidth':128,'frameHeight':128,'durationsMs':durations,'anchor':[64,120]}
    # Checkerboard is preview-only, exports above have genuine alpha.
    bg=Image.new('RGBA',(768,384));bd=ImageDraw.Draw(bg)
    for y in range(0,384,24):
      for x in range(0,768,24):bd.rectangle((x,y,x+23,y+23),fill=('#eeeef3' if (x//24+y//24)%2 else '#a4a7b7'))
    bg.alpha_composite(sheet.resize((768,384),Image.Resampling.NEAREST));bg.convert('RGB').save(PREVIEW/(name+'-frames.png'))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(SOURCE/'palette.json').write_text(json.dumps(palette.getpalette()[:128*3])+'\n')
# Clean paired scene derived from masters, no backdrop.
scene=Image.new('RGBA',(184,128));scene.alpha_composite(frames['asad-idle'][0],(0,0));scene.alpha_composite(frames['storm-sit'][0].resize((64,64),Image.Resampling.NEAREST),(104,60));scene.save(OUT/'together.png',optimize=True)
print(json.dumps({k:{'bytes':(OUT/(k+'.png')).stat().st_size,'changedPixels':int(np.any(np.array(v[0])!=np.array(v[1]),axis=2).sum())} for k,v in frames.items()},indent=2))
