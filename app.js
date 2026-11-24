import {FFmpeg} from "./vendor/ffmpeg/index.js";
import {toBlobURL} from "./vendor/util/index.js";
const $=id=>document.getElementById(id);

/* ---------- mouse-reactive background ---------- */
(()=>{const cv=$("bg"),cx=cv.getContext("2d"),m={x:-999,y:-999},R=matchMedia("(prefers-reduced-motion: reduce)").matches;
let W,H,P=[],D=Math.min(devicePixelRatio||1,2);
const size=()=>{W=innerWidth;H=innerHeight;cv.width=W*D;cv.height=H*D;cx.setTransform(D,0,0,D,0,0);
P=Array.from({length:Math.min(110,Math.floor(W*H/14000))},()=>({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,r:Math.random()*1.6+.6}))};
size();addEventListener("resize",size);
const mv=e=>{const t=e.touches?e.touches[0]:e;m.x=t.clientX;m.y=t.clientY;document.documentElement.style.setProperty("--mx",m.x+"px");document.documentElement.style.setProperty("--my",m.y+"px")};
addEventListener("mousemove",mv);addEventListener("touchmove",mv,{passive:true});
const f=()=>{cx.clearRect(0,0,W,H);
P.forEach((p,i)=>{const dx=p.x-m.x,dy=p.y-m.y,d=Math.hypot(dx,dy);
if(d<140&&d>0){p.vx+=dx/d*.12;p.vy+=dy/d*.12}p.vx*=.985;p.vy*=.985;
if(!R){p.x+=p.vx;p.y+=p.vy}if(p.x<0)p.x=W;if(p.x>W)p.x=0;if(p.y<0)p.y=H;if(p.y>H)p.y=0;
cx.fillStyle="rgba(190,175,255,.75)";cx.beginPath();cx.arc(p.x,p.y,p.r,0,7);cx.fill();
for(let j=i+1;j<P.length;j++){const q=P[j],a=p.x-q.x,b=p.y-q.y,dd=a*a+b*b;
if(dd<14400){cx.strokeStyle=`rgba(124,92,255,${.28*(1-dd/14400)})`;cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(q.x,q.y);cx.stroke()}}
if(d<170){cx.strokeStyle=`rgba(77,240,196,${.55*(1-d/170)})`;cx.beginPath();cx.moveTo(p.x,p.y);cx.lineTo(m.x,m.y);cx.stroke()}});
if(!R)requestAnimationFrame(f)};f()})();

/* ---------- saved settings (this browser only) ---------- */
const DEF={anthropic:"claude-sonnet-5-5",openai:"gpt-4o-mini",gemini:"gemini-2.5-flash",groq:"llama-3.3-70b-versatile",openrouter:"anthropic/claude-sonnet-4.5"};
const SK="reelcut-settings";
const get=()=>{try{return JSON.parse(localStorage.getItem(SK)||"{}")}catch(e){return{}}};
const put=()=>{try{localStorage.setItem(SK,JSON.stringify({tp:$("tp").value,tk:$("tk").value,hp:$("hp").value,hk:$("hk").value,hm:$("hm").value}))}catch(e){}};
const s=get();
["tp","tk","hp","hk","hm"].forEach(k=>{if(s[k])$(k).value=s[k]});
if(!$("hm").value)$("hm").value=DEF[$("hp").value];
$("hp").onchange=()=>{$("hm").value=DEF[$("hp").value];put()};
["tp","tk","hk","hm"].forEach(k=>$(k).onchange=put);

/* ---------- file input ---------- */
let picked=null;const drop=$("drop"),fi=$("file");
drop.onclick=()=>fi.click();drop.onkeydown=e=>{if(e.key==="Enter"||e.key===" ")fi.click()};
const setFile=f=>{picked=f;drop.textContent=f?f.name+" ("+(f.size/1048576).toFixed(0)+" MB)":"Drop a video file here or click to choose"};
fi.onchange=()=>setFile(fi.files[0]);
drop.ondragover=e=>{e.preventDefault();drop.classList.add("on")};drop.ondragleave=()=>drop.classList.remove("on");
drop.ondrop=e=>{e.preventDefault();drop.classList.remove("on");if(e.dataTransfer.files[0])setFile(e.dataTransfer.files[0])};

/* ---------- helpers ---------- */
const log=$("log"),bar=$("bar");let cur=null;
const step=t=>{if(cur)cur.className="ok";cur=document.createElement("li");cur.className="run";cur.textContent=t;log.appendChild(cur)};
const fail=t=>{if(cur){cur.className="bad";cur.textContent=t}$("err").textContent=t};
const pct=v=>{bar.style.display="block";bar.firstElementChild.style.width=Math.round(Math.max(0,Math.min(1,v))*100)+"%"};
const mmss=t=>Math.floor(t/60)+":"+String(Math.floor(t%60)).padStart(2,"0");
const ts=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=(t%60).toFixed(3).replace(".",",");return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+s.padStart(6,"0")};
const dur=f=>new Promise((res,rej)=>{const v=document.createElement("video"),u=URL.createObjectURL(f);v.preload="metadata";
v.onloadedmetadata=()=>{URL.revokeObjectURL(u);res(v.duration)};v.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("Could not read the video length. Try an MP4 file."))};v.src=u});
async function api(url,opt,what){let r;try{r=await fetch(url,opt)}catch(e){throw new Error(what+" request was blocked or offline. Check your key and connection.")}
if(!r.ok){let t="";try{t=(await r.text()).slice(0,200)}catch(e){}throw new Error(what+" failed ("+r.status+"). "+t)}return r.json()}

/* ---------- AI calls ---------- */
async function transcribe(blob,off){
const prov=$("tp").value,key=$("tk").value.trim(),fd=new FormData();
fd.append("file",blob,"a.mp3");fd.append("model",prov==="groq"?"whisper-large-v3-turbo":"whisper-1");
fd.append("response_format","verbose_json");fd.append("timestamp_granularities[]","segment");
const u=prov==="groq"?"https://api.groq.com/openai/v1/audio/transcriptions":"https://api.openai.com/v1/audio/transcriptions";
const j=await api(u,{method:"POST",headers:{Authorization:"Bearer "+key},body:fd},"Transcription");
return (j.segments||[]).map(g=>({s:g.start+off,e:g.end+off,t:g.text.trim()}))}
async function ask(prompt){
const p=$("hp").value,k=$("hk").value.trim(),m=$("hm").value.trim();
if(p==="anthropic"){const j=await api("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:m,max_tokens:2000,messages:[{role:"user",content:prompt}]})},"Highlight model");return j.content.map(c=>c.text||"").join("")}
if(p==="gemini"){const j=await api(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(k)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})},"Highlight model");return j.candidates[0].content.parts.map(c=>c.text||"").join("")}
const u={openai:"https://api.openai.com/v1/chat/completions",groq:"https://api.groq.com/openai/v1/chat/completions",openrouter:"https://openrouter.ai/api/v1/chat/completions"}[p];
const j=await api(u,{method:"POST",headers:{"content-type":"application/json",Authorization:"Bearer "+k},body:JSON.stringify({model:m,messages:[{role:"user",content:prompt}]})},"Highlight model");return j.choices[0].message.content}

/* ---------- main flow ---------- */
let ff=null;
async function loadFF(){if(ff)return ff;ff=new FFmpeg();
const base=["https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd","https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd"];
let last;for(const b of base){try{await ff.load({coreURL:await toBlobURL(b+"/ffmpeg-core.js","text/javascript"),wasmURL:await toBlobURL(b+"/ffmpeg-core.wasm","application/wasm")});return ff}catch(e){last=e}}
ff=null;throw new Error("Could not load the video engine. Check your connection and try again.")}

$("go").onclick=async()=>{
const go=$("go");$("err").textContent="";log.innerHTML="";$("clips").innerHTML="";cur=null;bar.style.display="none";
if(!$("tk").value.trim()||!$("hk").value.trim())return $("err").textContent="Add both API keys in step 1.";
if(!picked&&!$("url").value.trim())return $("err").textContent="Add a video file or a direct video link.";
put();go.disabled=true;go.textContent="Working…";
try{
let file=picked;
if(!file){step("Downloading the video");let r;try{r=await fetch($("url").value.trim())}catch(e){throw new Error("That link can’t be read by a browser. Download the video and add the file instead.")}
if(!r.ok)throw new Error("The link returned an error ("+r.status+").");const b=await r.blob();file=new File([b],"input.mp4",{type:b.type})}
step("Loading the video engine (first time takes a moment)");const f=await loadFF();
const ext=(file.name.split(".").pop()||"mp4").replace(/[^a-z0-9]/gi,"")||"mp4";
const inp=new File([file],"input."+ext,{type:file.type});
await f.createDir("/in").catch(()=>{});await f.mount("WORKERFS",{files:[inp]},"/in");const IN="/in/input."+ext;
f.on("progress",({progress})=>{if(progress>=0&&progress<=1)pct(progress)});
const total=await dur(file),CH=600;let segs=[];
step("Extracting and transcribing audio");
for(let o=0;o<total;o+=CH){cur.textContent=`Extracting and transcribing audio (${mmss(o)} of ${mmss(total)})`;
await f.exec(["-ss",String(o),"-t",String(CH),"-i",IN,"-vn","-ac","1","-ar","16000","-b:a","32k","a.mp3"]);
const a=await f.readFile("a.mp3");await f.deleteFile("a.mp3");segs=segs.concat(await transcribe(new Blob([a],{type:"audio/mpeg"}),o))}
if(!segs.length)throw new Error("No speech found in this video.");
step("Finding the best moments");pct(0);
const n=+$("cnt").value,L=+$("len").value;
let tx=segs.map(g=>`[${Math.floor(g.s)}] ${g.t}`).join("\n");if(tx.length>90000)tx=tx.slice(0,90000);
const out=await ask(`You are an expert short-form video editor. Below is a transcript with start times in seconds in brackets.
Pick the ${n} best moments for viral vertical shorts. Each should run about ${L} seconds (between ${L-15} and ${L+15}), start on a strong hook within its first 3 seconds, make sense on its own, and end at a natural sentence end. Do not overlap clips.
Reply with ONLY a JSON array, no other text: [{"start":number,"end":number,"title":"short title","hook":"why it works","score":1-100}]
Times are seconds in the original video (video length ${Math.floor(total)}s).

${tx}`);
let picks;try{picks=JSON.parse(out.slice(out.indexOf("["),out.lastIndexOf("]")+1))}catch(e){throw new Error("The AI model did not return usable clip times. Try again or use a stronger model.")}
picks=picks.map(p=>({...p,start:Math.max(0,+p.start),end:Math.min(total,+p.end)})).filter(p=>p.end-p.start>=8).slice(0,n);
if(!picks.length)throw new Error("No usable moments were found. Try another video or model.");
const fill="crop=min(iw\\,ih*9/16):min(ih\\,iw*16/9),scale=720:1280,setsar=1";
const fit="[0:v]split[a][b];[a]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,boxblur=20:2[bg];[b]scale=720:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]";
for(let i=0;i<picks.length;i++){const p=picks[i],d=p.end-p.start;
step(`Cutting clip ${i+1} of ${picks.length}`);pct(0);
const v=$("lay").value==="fill"?["-vf",fill]:["-filter_complex",fit,"-map","[v]","-map","0:a?"];
await f.exec(["-ss",String(p.start),"-i",IN,"-t",String(d),...v,"-c:v","libx264","-preset","ultrafast","-crf","27","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k","-movflags","+faststart","c.mp4"]);
const data=await f.readFile("c.mp4");await f.deleteFile("c.mp4");
const mp4=URL.createObjectURL(new Blob([data],{type:"video/mp4"}));
const lines=segs.filter(g=>g.e>p.start&&g.s<p.end).map((g,k)=>`${k+1}\n${ts(Math.max(0,g.s-p.start))} --> ${ts(Math.min(d,g.e-p.start))}\n${g.t}\n`).join("\n");
const srt=URL.createObjectURL(new Blob([lines],{type:"text/plain"}));
const safe=(p.title||"clip").replace(/[^\w ]+/g,"").trim().replace(/ +/g,"-").toLowerCase()||"clip";
const el=document.createElement("div");el.className="clip";
el.innerHTML=`<video controls playsinline src="${mp4}"></video><h3></h3><small></small><div class="row"><a class="btn" download="${safe}.mp4" href="${mp4}">Download MP4</a><a class="btn g" download="${safe}.srt" href="${srt}">Captions</a></div>`;
el.querySelector("h3").textContent=p.title||"Clip "+(i+1);
el.querySelector("small").textContent=`${mmss(p.start)}–${mmss(p.end)} · ${p.score||"–"} hook score`;
$("clips").appendChild(el)}
if(cur)cur.className="ok";cur.textContent="Done. Your clips are ready below.";pct(1);
await f.unmount("/in").catch(()=>{});
}catch(e){fail(e.message||"Something went wrong.")}
go.disabled=false;go.textContent="Create clips"};
