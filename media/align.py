"""Optional subtitle alignment; run with a narrowly scoped ElevenLabs key."""
import json,os,urllib.request,uuid
from pathlib import Path
root=Path(__file__).resolve().parent
boundary='faultline-'+uuid.uuid4().hex
body=(f'--{boundary}\r\nContent-Disposition: form-data; name="text"\r\n\r\n'.encode()+(root/'narration.txt').read_bytes()+f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="narration.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode()+(root/'narration.mp3').read_bytes()+f'\r\n--{boundary}--\r\n'.encode())
request=urllib.request.Request('https://api.elevenlabs.io/v1/forced-alignment',data=body,headers={'xi-api-key':os.environ['ELEVENLABS_API_KEY'],'Content-Type':'multipart/form-data; boundary='+boundary},method='POST')
with urllib.request.urlopen(request,timeout=120) as response: result=json.load(response)
(root/'alignment.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'words':len(result['words']),'last_word_end':result['words'][-1]['end']}))
