"""Render only real CDP captures; holds/acceleration are logged in the manifest."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib,json,re,subprocess,textwrap

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'raw/rendered';OUT.mkdir(parents=True,exist_ok=True)
DURATION=124.5
AUDIO_OFFSET=1.5
fonts={s:ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',s) for s in (15,16,19,30)}
# name, duration, source playback speed, extra initial explanatory hold
settings=[('1',27.5,1,8),('2',18.5,1,9),('3',18.8,1,6),('4',15.2,1,1),('5',14.0,1,4.5),('6',2.1,3.5,0),('6b',5.0,1,0),('6c',5.4,1,0),('7',18.0,1,0)]
segments=[];timeline=0.
for scene,total,speed,initial_hold in settings:
 source=sorted(json.loads((ROOT/f'raw/scene{scene}/frames.json').read_text()),key=lambda x:x['t'])
 elapsed=0.
 for index,item in enumerate(source):
  duration=(source[index+1]['t']-item['t'])/speed if index<len(source)-1 else total-elapsed
  if index==0:duration+=initial_hold
  if duration<=0:raise ValueError((scene,index,duration))
  segments.append({'scene':scene,'frame':item['name'],'start':round(timeline,6),'duration':round(duration,6),'source_timestamp':item['t'],'source_speed':speed,'initial_hold':initial_hold if index==0 else 0})
  timeline+=duration;elapsed+=duration
assert abs(timeline-DURATION)<.0001,timeline
cards=[
 (0,10.5,'FAULTLINE / NETWORK LAB','Break one link. Understand everything after.','An original MoonBit engine, compiled to real WebAssembly.'),
 (10.5,27.5,'01 / A BRIDGE GOES DARK','9 delivered. 3 lost. Every event explained.','Bridge failure at 52 ms · healthy-network comparison: 12 of 12 delivered.'),
 (27.5,46,'02 / ONE PACKET’S STORY','16 → 34 → 52 milliseconds.','P03 reaches the failure boundary. In this model, failure at arrival time wins.'),
 (46,64.8,'03 / CHANGE THE TIMING','An earlier failure can mean less loss.','25 actual MoonBit runs · before traffic starts, every packet takes a surviving route.'),
 (64.8,80,'04 / CONNECTED IS NOT THE SAME AS CAPABLE','A queue for 3. A burst of 12.','9 packets are rejected immediately, while every link remains healthy.'),
 (80,94,'05 / FIND THE MINIMAL CUT','Two failed links. No remaining path.','Burst parameters retained: 0 ms spacing, capacity 3. Graph cuts are separate from load.'),
 (94,96.1,'06 / RESTORE THE REFERENCE','Healthy conditions: all 12 delivered.','Reset to 8 ms spacing and capacity 4.'),
 (96.1,101.1,'07 / TAKE THE EVIDENCE WITH YOU','Export the experiment, not just a screenshot.','Topology · parameters · every packet event · healthy-network comparison'),
 (101.1,106.5,'08 / RECOMPUTE, DON’T TRUST A SAVED ANSWER','Import restores the healthy 12/12 experiment.','Actual file import confirmed. Results are recomputed by the MoonBit engine.'),
 (106.5,116,'OPEN THE BLACK BOX','A small model. Explicit assumptions.','No TCP, retransmission, real traffic or production-network prediction.'),
 (116,124.5,'FAULTLINE','Every consequence, visible.','github.com/ToukoUrsin/faultline  ·  toukoursin.github.io/faultline'),
]
concat=[];renders=[]
for seg in segments:
 start,end=seg['start'],seg['start']+seg['duration']
 for card in cards:
  a,b=max(start,card[0]),min(end,card[1])
  if b-a<.000001:continue
  original=ROOT/f"raw/scene{seg['scene']}/{seg['frame']}"
  source=Image.open(original).convert('RGB')
  source.thumbnail((1728,972),Image.Resampling.LANCZOS)
  canvas=Image.new('RGB',(1920,1080),'#0a101b');canvas.paste(source,((1920-source.width)//2,(972-source.height)//2))
  d=ImageDraw.Draw(canvas);d.rectangle((0,972,1920,1080),fill='#12243a');d.rectangle((0,972,1920,974),fill='#5e90bd')
  d.text((60,987),card[2],font=fonts[16],fill='#8bbdff')
  badge='REAL APP CAPTURE · SYNTHETIC NETWORK MODEL · INSTANT ROUTE UPDATES'
  d.text((1860-d.textlength(badge,font=fonts[15]),988),badge,font=fonts[15],fill='#afc2d9')
  d.text((60,1011),card[3],font=fonts[30],fill='#f1f6fd')
  d.text((60,1050),card[4],font=fonts[19],fill='#c6d4e6')
  target=OUT/f'{len(renders):04d}.jpg';canvas.save(target,quality=95,subsampling=0)
  concat += [f"file '{target}'",f'duration {b-a:.6f}']
  renders.append({**seg,'output_start':round(a,6),'output_duration':round(b-a,6),'caption':card[3],'source_sha256':hashlib.sha256(original.read_bytes()).hexdigest()})
concat.append(f"file '{target}'")
(OUT/'frames.ffconcat').write_text('ffconcat version 1.0\n'+'\n'.join(concat)+'\n')
# Align exact supplied narration; omit whitespace-only alignment tokens.
words=[w for w in json.loads((ROOT/'alignment.json').read_text())['words'] if w['text'].strip()]
cues=[];sentence=[]
for word in words:
 sentence.append(word)
 if word['text'].rstrip().endswith(('.', '!', '?')):
  cues.append((sentence[0]['start'],sentence[-1]['end'],' '.join(w['text'].strip() for w in sentence)))
  sentence=[]
assert len(cues)==34,len(cues)
zh=[
'网络图告诉我们哪些节点相连。',
'但它很少解释某一个分组为什么消失。',
'Faultline 让这条因果链变得可见。',
'这是一个原创 MoonBit 引擎，编译为 WebAssembly。',
'本实验中，12 个分组穿过一个六节点网络。',
'桥接链路在 52 毫秒时失效。',
'9 个分组成功送达。',
'3 个没有送达。',
'健康网络对照组则全部送达。',
'选择第三个分组。',
'它在 16 毫秒注入，34 毫秒到达 North，随后开始穿越桥接链路。',
'链路恰好在它应当到达的时刻失效。',
'按照本模型的明确规则，同时发生时，故障优先。',
'完整事件、精确时间和反事实结果都在这里。',
'现在改变故障发生的时间。',
'这些柱子对应 25 次独立的 MoonBit 仿真。',
'它们不是一条估计曲线。',
'如果桥接链路在流量开始前已经失效，12 个分组都会走替代路径到达。',
'更早的故障有时意味着更少的损失，因为没有分组被困在途中。',
'连通性只是问题的一部分。',
'把 12 个分组同时注入只能容纳 3 个分组的队列。',
'即使所有链路都正常，9 个分组也会立即被拒绝。',
'事件轨迹能够区分队列溢出与路径中断。',
'Faultline 还会计算最小故障集合。',
'应用这组双链路割之后，就不再存在路径。',
'从故障集合中移除任一链路，连通性便会恢复。',
'这是图结构的分析结果，与流量仿真分别计算。',
'重置为健康状态。',
'导出完整实验，包括拓扑、参数和事件证据。',
'导入时，MoonBit 会重新计算结果，而不是相信保存的答案。',
'一切都在本地运行。',
'无需服务、账号或 API 密钥。',
'这是一个假设明确的学习模型，不是生产网络预测器。',
'源码、测试和假设全部开放，每个结果都可以检查、复现和质疑。'
]
def stamp(t):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'
for lang in ('en','zh-CN'):
 entries=[]
 for i,(start,end,text) in enumerate(cues):
  text=textwrap.fill(text,70) if lang=='en' else zh[i]
  entries.append(f'{i+1}\n{stamp(start+AUDIO_OFFSET)} --> {stamp(end+AUDIO_OFFSET)}\n{text}\n')
 (ROOT/f'faultline-demo.{lang}.srt').write_text('\n'.join(entries))
manifest={'duration':DURATION,'resolution':[1920,1080],'fps':30,'source':'Actual CDP captures of the running Faultline app; no fabricated UI states.','editing':'Chronological by CDP timestamp within each scene; out-of-order capture arrivals sorted. Initial/final explanatory holds. Scene6 playback accelerated 3.5x. Editorial lower thirds. Audio delayed 1.5s.','disclosure':'Synthetic network model, instant route updates, no TCP or real traffic. Scene5 preserves burst parameters.','narration_sha256':hashlib.sha256((ROOT/'narration.mp3').read_bytes()).hexdigest(),'alignment_source':'ElevenLabs forced-alignment API with supplied exact transcript','segments':renders}
(ROOT/'edit-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Rendering',len(renders),'actual-source segments',flush=True)
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','warning','-f','concat','-safe','0','-i',str(OUT/'frames.ffconcat'),'-i',str(ROOT/'narration.mp3'),'-i',str(ROOT/'faultline-demo.en.srt'),'-i',str(ROOT/'faultline-demo.zh-CN.srt'),'-filter_complex',f'[0:v]fps=30,format=yuv420p,fade=t=in:st=0:d=0.5,fade=t=out:st={DURATION-.7}:d=0.7[v];[1:a]adelay=1500|1500,apad,alimiter=limit=0.95[a]','-map','[v]','-map','[a]','-map','2:0','-map','3:0','-t',str(DURATION),'-c:v','libx264','-preset','fast','-crf','18','-c:a','aac','-b:a','192k','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata:s:s:1','language=zho','-metadata','title=Faultline — Every consequence, visible','-metadata','comment=Actual app capture. Original MoonBit/WASM engine. Synthetic network model. Holds retimed; scene6 accelerated.','-movflags','+faststart',str(ROOT/'faultline-demo.mp4')],check=True)
print(ROOT/'faultline-demo.mp4')
