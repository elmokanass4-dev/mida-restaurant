import {useEffect,useState} from 'react';
export function TableQRCode({restaurantId,tableNumber,token}:{restaurantId:string;tableNumber:number;token:string}){
  const [image,setImage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let alive=true;const url=new URL(import.meta.env.BASE_URL,window.location.origin);url.search=new URLSearchParams({restaurant:restaurantId,table:String(tableNumber),token}).toString();import('qrcode').then(module=>module.default.toDataURL(url.href,{width:256,margin:4})).then(value=>{if(alive)setImage(value);}).catch(()=>{if(alive)setError('QR indisponible.');});return()=>{alive=false;};},[restaurantId,tableNumber,token]);
  return image?<div><img src={image} width={160} height={160} alt={`QR de commande de la table ${tableNumber}`}/><a href={image} download={`table-${tableNumber}.png`} className="text-xs underline">Télécharger le QR de table</a></div>:<p>{error||'Préparation du QR…'}</p>;
}
