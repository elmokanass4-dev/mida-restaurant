import {useEffect,useState,useRef} from 'react';
import {Order} from '../../types';
import {storage} from '../../services/storageAdapter';
import {demoEnabled} from '../../services/api';

export function ReceiptLoyaltyQR({order,onStatus}:{order:Order;onStatus?:(status:'loading'|'ready'|'error')=>void}){
  const [ticket,setTicket]=useState<{code:string;url:string;image:string}|null>(null);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  const callback=useRef(onStatus);callback.current=onStatus;
  useEffect(()=>{
    let alive=true;setTicket(null);setError('');callback.current?.('loading');
    storage.issueReceipt(order.id).then(async receipt=>{
      const code=receipt.token,url=new URL(import.meta.env.BASE_URL,window.location.origin);
      url.searchParams.set('restaurant',order.restaurantId);
      if(demoEnabled)url.searchParams.set('receipt',code);else url.hash=new URLSearchParams({receipt:code}).toString();
      const module=await import('qrcode');const image=await module.default.toDataURL(url.href,{width:256,margin:4,errorCorrectionLevel:'M'});
      if(alive)setTicket({code,url:url.href,image});
    }).catch(e=>{if(alive){setError(e instanceof Error?e.message:'Ticket indisponible.');callback.current?.('error');}});
    return()=>{alive=false;};
  },[order.id,order.restaurantId,attempt]);
  return <div className="receipt-loyalty text-center border-t border-dashed border-black pt-3 space-y-2">
    <strong className="block">FIDÉLITÉ {demoEnabled?'· TICKET DE DÉMONSTRATION':''}</strong>
    <p>Scannez dans Fidélité pour gagner des points après paiement.</p>
    {ticket?<><img src={ticket.image} alt={`QR fidélité unique du ticket ${order.orderNumber}`} width={180} height={180} onLoad={()=>callback.current?.('ready')} onError={()=>{setTicket(null);setError('Image QR indisponible. Réessayez avant impression.');callback.current?.('error');}} className="mx-auto"/><p className="font-bold break-all" data-testid="loyalty-receipt-code">{ticket.code}</p><a href={ticket.url} className="underline block print:hidden">{demoEnabled?'Ouvrir Fidélité pour tester ce ticket':'Ouvrir Fidélité'}</a><a href={ticket.image} download={`fidelite-${order.orderNumber}.png`} className="underline block print:hidden">Télécharger le QR</a></>:<div role={error?'alert':'status'}><p>{error||'Préparation du QR…'}</p>{error&&<button type="button" className="print:hidden" onClick={()=>setAttempt(n=>n+1)}>Réessayer le QR fidélité</button>}</div>}
    <p>Un seul crédit par achat · Connectez-vous dans Fidélité pour réclamer les points.</p>
  </div>;
}
