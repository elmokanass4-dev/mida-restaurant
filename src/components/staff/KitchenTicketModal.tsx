import React from 'react';
import { Order, Restaurant } from '../../types';
import { Printer, X } from 'lucide-react';
import {demoEnabled} from '../../services/api';
import {ReceiptLoyaltyQR} from './ReceiptLoyaltyQR';

interface Props {
  order: Order | null;
  restaurant: Restaurant;
  onClose: () => void;
}

export const KitchenTicketModal: React.FC<Props> = ({ order, restaurant, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-neutral-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Aperçu Ticket de Caisse / Cuisine (80mm)
          </span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Printable thermal ticket content */}
        <div className="p-4 bg-white text-black font-mono text-xs overflow-y-auto max-h-[70vh]">
          <div id="printable-kitchen-ticket" className="space-y-3">
            {/* Header */}
            <div className="text-center border-b border-dashed border-black pb-2">
              <h2 className="font-bold text-base uppercase tracking-tight">{restaurant.name}</h2>
              <p className="text-[10px] text-neutral-600">{restaurant.address}</p>
              <p className="text-[10px] text-neutral-600">{restaurant.phone}</p>
              <div className="mt-1 font-bold text-sm">
                {order.mode === 'table' ? `*** TABLE #${order.tableNumber} ***` : order.mode === 'pickup' ? '*** À EMPORTER ***' : '*** LIVRAISON ***'}
              </div>
              <p className="text-[10px] mt-0.5">
                Ticket N° {order.orderNumber} · Ref: {order.secureRef}
              </p>
              <p className="text-[10px]">
                {new Date(order.createdAt).toLocaleDateString()} -{' '}
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Customer Details */}
            <div className="text-[11px] pb-1 border-b border-dashed border-black">
              <div>Client : {order.customerName}</div>
              <div>Tél : {order.customerPhone}</div>
              {order.deliveryAddress && <div>Adresse : {order.deliveryAddress}</div>}
              {order.customerNotes && (
                <div className="font-bold mt-1 bg-neutral-200 p-1">
                  NOTE : {order.customerNotes}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="space-y-2 py-1 border-b border-dashed border-black">
              {order.items.map((item, idx) => (
                <div key={idx} className="leading-tight">
                  <div className="flex justify-between font-bold">
                    <span>{item.quantity}x {item.dishName}</span>
                    <span>{item.lineTotalMAD} MAD</span>
                  </div>
                  {item.selectedModifiers.map((mod, mIdx) => (
                    <div key={mIdx} className="text-[10px] pl-2 text-neutral-700">
                      + {mod.groupName}: {mod.optionName} {mod.priceMAD > 0 ? `(${mod.priceMAD} MAD)` : ''}
                    </div>
                  ))}
                  {item.itemNotes && (
                    <div className="text-[10px] pl-2 italic">» {item.itemNotes}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] pt-1">
              <div className="flex justify-between">
                <span>Sous-total HT :</span>
                <span>{order.subtotalMAD - order.taxAmountMAD} MAD</span>
              </div>
              <div className="flex justify-between">
                <span>TVA (10%) :</span>
                <span>{order.taxAmountMAD} MAD</span>
              </div>
              {order.discountMAD > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Remise promo :</span>
                  <span>-{order.discountMAD} MAD</span>
                </div>
              )}
              {order.deliveryFeeMAD > 0 && (
                <div className="flex justify-between">
                  <span>Frais livraison :</span>
                  <span>{order.deliveryFeeMAD} MAD</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
                <span>TOTAL TTC :</span>
                <span>{order.totalMAD} MAD</span>
              </div>
            </div>

            {/* Payment footer */}
            {demoEnabled&&order.paymentStatus==='paid'&&!['cancelled','rejected'].includes(order.status)&&<ReceiptLoyaltyQR order={order}/>}
            <div className="text-center pt-2 border-t border-dashed border-black text-[10px]">
              <p>Paiement : {order.paymentMethod.toUpperCase()} ({order.paymentStatus})</p>
              <p className="mt-1">Merci de votre visite chez {restaurant.name} !</p>
              <p className="text-[9px] text-neutral-500">Logiciel Mida Food Operations</p>
            </div>
          </div>
        </div>

        {/* Modal actions */}
        <div className="p-3 bg-neutral-800 border-t border-neutral-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-neutral-700 text-neutral-200 text-xs font-semibold hover:bg-neutral-600"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Imprimer Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
