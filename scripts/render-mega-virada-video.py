"""Reproduz vídeo sazonal silencioso em motion graphics. Requer Pillow, numpy e imageio-ffmpeg.
Uso: python3 scripts/render-mega-virada-video.py
Fonte factual: Caixa Notícias, 03/11/2026 (estimativa inicial, não prêmio final).
"""
from pathlib import Path
import math, random, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'media'
OUT.mkdir(parents=True, exist_ok=True)
W, H, FPS, DURATION = 960, 540, 24, 12
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font = lambda size, bold=False: ImageFont.truetype(BOLD if bold else FONT, size)
GOLD, GREEN, WHITE, MUTED = (234, 198, 121), (93, 224, 169), (245, 247, 241), (163, 179, 169)
y, x = np.mgrid[0:H, 0:W]
base = np.zeros((H,W,3), dtype=np.uint8)
base[:,:,0] = np.clip(7 + 11*(x/W) + 9*np.exp(-((x-810)**2+(y-60)**2)/90000),0,255)
base[:,:,1] = np.clip(17 + 27*(x/W) + 18*np.exp(-((x-820)**2+(y-130)**2)/120000),0,255)
base[:,:,2] = np.clip(18 + 13*(1-y/H),0,255)
rng = random.Random(2026)
stars = [(rng.randrange(20,W-20),rng.randrange(30,H-30), rng.random()*1.4+.4, rng.random()*6.28) for _ in range(75)]

def smooth(v):
    v=max(0,min(1,v)); return v*v*(3-2*v)
def opacity(t,a,b,c,d):
    return smooth((t-a)/(b-a))*(1-smooth((t-c)/(d-c)))
def text_layer(im, line, y_pos, size, color, alpha, *, bold=False, tracking=0):
    if alpha <= 0: return
    layer = Image.new('RGBA',(W,H)); draw=ImageDraw.Draw(layer)
    ft=font(size,bold)
    if tracking:
        width=sum(draw.textlength(ch,font=ft) for ch in line)+tracking*(len(line)-1)
        xx=(W-width)/2
        for ch in line:
            draw.text((xx,y_pos),ch,font=ft,fill=(*color,round(255*alpha)),stroke_width=0)
            xx+=draw.textlength(ch,font=ft)+tracking
    else:
        draw.text((W/2,y_pos),line,font=ft,anchor='ma',fill=(*color,round(255*alpha)))
    im.alpha_composite(layer)

def frame(t):
    im=Image.fromarray(base.copy(),'RGB').convert('RGBA')
    glow=Image.new('RGBA',(W,H));gd=ImageDraw.Draw(glow)
    cx=755+55*math.sin(t*.35); cy=270+25*math.cos(t*.45)
    gd.ellipse((cx-205,cy-205,cx+205,cy+205),fill=(41,190,128,22))
    glow=glow.filter(ImageFilter.GaussianBlur(60));im.alpha_composite(glow)
    d=ImageDraw.Draw(im,'RGBA')
    for sx,sy,r,ph in stars:
        v=.25+.45*(.5+.5*math.sin(t*1.3+ph))
        d.ellipse((sx-r,sy-r,sx+r,sy+r),fill=(235,211,155,round(130*v)))
    # Luxury orbital motif, intentionally abstract — not an official Caixa emblem.
    for j in range(3):
        rr=127+j*39+8*math.sin(t*.55+j)
        d.arc((W/2-rr,H/2-rr,W/2+rr,H/2+rr),int(t*16+j*76),int(t*16+j*76+125),fill=(216,181,104,42-j*8),width=2)
    # thin editorial rules and safe persistent disclosure
    d.line((54,51,W-54,51),fill=(196,167,104,90),width=1)
    d.text((56,67),'TITAN  /  LOTERIAS',font=font(14,True),fill=(*GOLD,180))
    d.text((W-56,67),'ESPECIAL  2026',font=font(13),anchor='ra',fill=(*MUTED,170))
    d.line((54,H-80,W-54,H-80),fill=(196,167,104,80),width=1)
    d.text((W/2,H-64),'ESTIMATIVA INICIAL DA CAIXA  ·  PRÊMIO SUJEITO A ATUALIZAÇÃO',font=font(11,True),anchor='ma',fill=(*MUTED,220))
    d.text((W/2,H-41),'NENHUM MÉTODO GARANTE ACERTOS  ·  APOSTE NOS CANAIS OFICIAIS',font=font(10),anchor='ma',fill=(*MUTED,180))
    a=opacity(t,0,.5,2.5,3.2)
    text_layer(im,'UM NOVO ANO. UMA GRANDE EXPECTATIVA.',183,28,GOLD,a,bold=True,tracking=2)
    text_layer(im,'MEGA DA VIRADA',245,60,WHITE,a,bold=True)
    text_layer(im,'2026',325,49,GREEN,a,bold=True,tracking=8)
    b=opacity(t,2.7,3.5,6.7,7.5)
    text_layer(im,'MEGA DA VIRADA 2026',169,27,GOLD,b,bold=True,tracking=2)
    text_layer(im,'MAIS DE',227,32,WHITE,b,bold=True,tracking=3)
    text_layer(im,'R$ 1 BILHÃO',277,80,GREEN,b,bold=True)
    text_layer(im,'PRÊMIO INICIALMENTE ESTIMADO',386,19,WHITE,b,bold=True,tracking=2)
    c=opacity(t,7.0,7.7,9.6,10.3)
    text_layer(im,'PLANEJE COM CLAREZA',187,47,WHITE,c,bold=True)
    text_layer(im,'JOGOS  ·  CUSTOS  ·  BOLÃO',266,34,GREEN,c,bold=True,tracking=2)
    text_layer(im,'SEM PROMESSAS DE RESULTADO',341,20,GOLD,c,bold=True,tracking=2)
    z=opacity(t,9.8,10.4,11.7,12.0)
    text_layer(im,'TITAN LOTERIAS',214,67,WHITE,z,bold=True)
    text_layer(im,'ORGANIZE. CONFIRA. DECIDA.',315,26,GREEN,z,bold=True,tracking=2)
    return im.convert('RGB')

poster=frame(5.3)
poster.save(OUT/'mega-virada-2026-poster.jpg',quality=88,optimize=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
cmd=[ffmpeg,'-y','-loglevel','error','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}',
     '-framerate',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','medium','-crf','24',
     '-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'mega-virada-2026.mp4')]
with subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE) as proc:
    try:
        for i in range(FPS*DURATION): proc.stdin.write(frame(i/FPS).tobytes())
        proc.stdin.close()
        err=proc.stderr.read().decode();code=proc.wait()
        if code: raise RuntimeError(err)
    except BaseException:
        proc.kill();raise
print('Rendered:',OUT/'mega-virada-2026.mp4')
