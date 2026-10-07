import {useState} from 'react';
import {storage} from '../services/storageAdapter';
export function MenuBuilder({restaurantId}:{restaurantId:string}){
  const categories=storage.getCategories(restaurantId);
  const [category,setCategory]=useState(''),[dish,setDish]=useState({categoryId:'',name:'',description:'',priceMAD:0,image:''});
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function save(kind:'categories'|'dishes'){
    setBusy(true);setMessage('');
    const trans=(fr:string)=>({fr,ar:'',en:''});
    try{await storage.mutate(`/restaurants/${restaurantId}/${kind}`,'POST',kind==='categories'?{name:trans(category)}:{...dish,categoryId:dish.categoryId||categories[0]?.id,name:trans(dish.name),description:trans(dish.description)});if(kind==='categories')setCategory('');else setDish({...dish,name:'',description:'',priceMAD:0,image:''});setMessage('Carte enregistrée.');}catch(e){setMessage(e instanceof Error?e.message:'Erreur');}finally{setBusy(false);}
  }
  return <section className="bg-neutral-900 rounded-xl p-4 space-y-4"><h2 className="font-bold">Ajouter à la carte</h2><p className="text-xs text-neutral-400">Les traductions peuvent être complétées dans l’éditeur de plats. Confirmez les ingrédients et allergènes avec le restaurant avant le service.</p>
    <form onSubmit={e=>{e.preventDefault();void save('categories');}} className="space-y-2"><label className="block">Nouvelle catégorie<input required value={category} onChange={e=>setCategory(e.target.value)} className="block w-full bg-black p-2 rounded"/></label><button disabled={busy} className="bg-amber-400 text-black p-2 rounded">Ajouter la catégorie</button></form>
    <form onSubmit={e=>{e.preventDefault();void save('dishes');}} className="space-y-2"><label className="block">Catégorie du nouveau plat<select required value={dish.categoryId||categories[0]?.id||''} onChange={e=>setDish({...dish,categoryId:e.target.value})} className="block w-full bg-black p-2 rounded">{!categories.length&&<option value="">Ajoutez une catégorie</option>}{categories.map(c=><option key={c.id} value={c.id}>{c.name.fr}</option>)}</select></label>
      {(['name','description','image'] as const).map((key,i)=><label className="block" key={key}>{['Nom du nouveau plat','Description du nouveau plat','Image du plat (URL HTTPS ou chemin local)'][i]}<input required={key==='name'} value={dish[key]} onChange={e=>setDish({...dish,[key]:e.target.value})} className="block w-full bg-black p-2 rounded"/></label>)}
      <label className="block">Prix du nouveau plat (MAD)<input required type="number" min={0} max={10000} step={0.01} value={dish.priceMAD} onChange={e=>setDish({...dish,priceMAD:Number(e.target.value)})} className="block w-full bg-black p-2 rounded"/></label><button disabled={busy||!categories.length} className="bg-amber-400 text-black p-2 rounded">Ajouter le plat</button></form>{message&&<p role="status">{message}</p>}
  </section>;
}
