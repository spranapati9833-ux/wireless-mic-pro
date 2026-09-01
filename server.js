
const express=require('express'), path=require('path'), crypto=require('crypto');
const app=express(); app.use(express.json()); app.use(express.static(__dirname));
const h=v=>crypto.createHash('sha256').update(String(v??'')).digest('hex');
const PH='dd1152f79701d48969c08e4f4ab4c05d036f72f1c2588f02287861e95d0d28e4', PW='7e1db8744cadba6e4256ef9b8dcef00e36d80b118fc89d5e760d9630245bcda1';
app.post('/api/master-login',(req,res)=>{const b=req.body||{};res.json({ok:h(b.phone)===PH&&h(b.password)===PW})});
app.get('/api/youtube-search',async(req,res)=>{try{const q=String(req.query.q||'').trim(),key=process.env.YOUTUBE_API_KEY;if(!q)return res.status(400).json({error:'Search text required'});if(!key)return res.status(503).json({error:'YOUTUBE_API_KEY not configured'});const u='https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q='+encodeURIComponent(q)+'&key='+encodeURIComponent(key);const r=await fetch(u),d=await r.json();if(!r.ok)return res.status(r.status).json({error:d?.error?.message||'Search failed'});res.json({items:(d.items||[]).map(x=>({id:x.id.videoId,title:x.snippet.title,channel:x.snippet.channelTitle,thumb:x.snippet.thumbnails?.medium?.url||''}))})}catch(e){res.status(500).json({error:'YouTube search error'})}});
app.get('/health',(_,res)=>res.send('OK')); app.get('/',(_,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(process.env.PORT||3000,'0.0.0.0');
