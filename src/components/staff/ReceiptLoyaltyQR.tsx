import {useEffect,useState} from 'react';
import {Order} from '../../types';
import {storage} from '../../services/storageAdapter';
import {demoEnabled} from '../../services/api';

export function ReceiptLoyaltyQR({order}:{order:Order}){
  const [ticket,setTicket]=useState<{code:string;url:string;image:string}|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    let alive=true;
    storage.issueReceipt(order.id).then(async receipt=>{
      const code=receipt.token,url=new URL(import.meta.env.BASE_URL,window.location.origin);
      url.searchParams.set('restaurant',order.restaurantId);
      if(demoEnabled)url.searchParams.set('receipt',code);else url.hash=new URLSearchParams({receipt:code}).toString();
      const module=await import('qrcode');const image=await module.default.toDataURL(url.href,{width:256,margin:4,errorCorrectionLevel:'M'});
      if(alive)setTicket({code,url:url.href,image});
    }).catch(e=>{if(alive)setError(e instanceof Error?e.message:'Ticket indisponible.');});
    return()=>{alive=false;};
  },[order.id]);
  return <div className="text-center border-t border-dashed border-black pt-3 space-y-2">
    <strong className="block">FIDÉLITÉ {demoEnabled?'· TICKET DE DÉMONSTRATION':''}</strong>
    <p>Scannez dans Fidélité pour gagner des points après paiement.</p>
    {ticket?<><img src={ticket.image} alt={`QR fidélité unique du ticket ${order.orderNumber}`} width={180} height={180} className="mx-auto"/><p className="font-bold break-all" data-testid="loyalty-receipt-code">{ticket.code}</p><a href={ticket.url} className="underline block print:hidden">{demoEnabled?'Ouvrir Fidélité pour tester ce ticket':'Ouvrir Fidélité'}</a><a href={ticket.image} download={`fidelite-${order.orderNumber}.png`} className="underline block print:hidden">Télécharger le QR</a></>:<p>{error||'Préparation du QR…'}</p>}
    <p>Un seul crédit par achat · Connectez-vous dans Fidélité pour réclamer les points.</p>
  </div>;
}
