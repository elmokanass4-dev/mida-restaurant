import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountWebsite(app,store,directory=path.resolve('dist')){
  const find=req=>{const key=req.query.restaurant;return store.list('restaurant').find(r=>key?r.id===key||r.data.slug===key:true)?.data;};
  app.get('/mida-restaurant/manifest.webmanifest',(req,res)=>{
    const r=find(req);if(!r)return res.status(404).json({error:'Restaurant introuvable.'});
    const start=`/mida-restaurant/?restaurant=${encodeURIComponent(r.slug)}`;
    res.set('Cache-Control','no-store').type('application/manifest+json').json({id:start,name:r.name,short_name:r.name.slice(0,30),start_url:start,scope:'/mida-restaurant/',display:'standalone',theme_color:r.accentColor,background_color:'#080305',icons:[{src:r.logoImage||'/mida-restaurant/menu-placeholder.svg',sizes:'any',purpose:'any'}]});
  });
  app.get(['/mida-restaurant','/mida-restaurant/'],async(req,res,next)=>{try{
    const r=find(req);if(!r)return res.status(404).type('html').send('<!doctype html><html lang="fr"><title>Restaurant introuvable</title><h1>Restaurant introuvable</h1><p>Vérifiez votre lien.</p></html>');
    const title=req.query.surface==='platform'?'MIDA · Administration':r.name;
    const description=`${r.name} · Menu et commandes`;
    let html=await fs.readFile(path.join(directory,'index.html'),'utf8');
    html=html.replace(/<title>[^<]*<\/title>/,()=>`<title>${escape(title)}</title>`)
      .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*/g,(_m,p)=>p+escape(description))
      .replace(/(<meta property="og:title" content=")[^"]*/,(_m,p)=>p+escape(title))
      .replace(/(<meta name="theme-color" content=")[^"]*/,(_m,p)=>p+escape(r.accentColor))
      .replace(/<link rel="manifest"[^>]*>/,()=>`<link rel="manifest" href="/mida-restaurant/manifest.webmanifest?restaurant=${encodeURIComponent(r.slug)}"/>`)
      .replace('</head>',()=>`<link rel="icon" href="${escape(r.logoImage||'/mida-restaurant/menu-placeholder.svg')}"/></head>`);
    res.set('Cache-Control','no-store').type('html').send(html);
  }catch(e){next(e);}});
  app.use('/mida-restaurant',express.static(directory,{index:false}));
  app.get('/',(_req,res)=>res.redirect('/mida-restaurant/'));
}
