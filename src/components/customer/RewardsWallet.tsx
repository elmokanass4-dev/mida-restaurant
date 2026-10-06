import React, { useState } from 'react';
import { CustomerProfile, Language, Restaurant, LoyaltyLedgerEntry } from '../../types';
import { getTranslation } from '../../i18n/translations';
import { storage } from '../../services/storageAdapter';
import { Award, QrCode, Tag, Sparkles, Check, Clock, ChevronRight } from 'lucide-react';
import {demoEnabled} from '../../services/api';
import {ReceiptLoyaltyDemo} from './ReceiptLoyaltyDemo';

interface Props {
  customer: CustomerProfile;
  restaurant: Restaurant;
  language: Language;
  onApplyOfferInCart?: (code: string) => void;
}

export const RewardsWallet:React.FC<Props> = props=>demoEnabled?<ReceiptLoyaltyDemo customer={props.customer} restaurant={props.restaurant}/>:<LiveRewardsWallet {...props}/>;
const LiveRewardsWallet: React.FC<Props> = ({
  customer,
  restaurant,
  language,
  onApplyOfferInCart
}) => {
  const t = getTranslation(language);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showMemberQR, setShowMemberQR] = useState(false);

  const ledger: LoyaltyLedgerEntry[] = storage.getLoyaltyLedger(restaurant.id);

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    if (onApplyOfferInCart) onApplyOfferInCart(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="p-4 sm:p-5 max-w-lg mx-auto space-y-5 pb-24 text-neutral-100">
      <p role="status" className="p-3 rounded-xl bg-amber-950/30 text-amber-200 text-xs">Les points sont enregistrés après paiement et service. Les échanges de points et promotions ne sont pas encore activés.</p>
      {/* Loyalty Card Header */}
      <div className="rounded-3xl bg-gradient-to-br from-[#2a131c] via-[#1a0a12] to-[#11050a] border border-amber-500/40 p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Braise Club Fidélité</span>
            </div>
            <h2 className="text-xl font-extrabold text-white mt-1 font-sans">
              {customer.name}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">{customer.phone}</p>
          </div>

          <button
            onClick={() => setShowMemberQR(!showMemberQR)}
            className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 hover:text-white transition-colors"
            aria-label="Afficher QR Membre"
          >
            <QrCode size={20} />
          </button>
        </div>

        {/* Member QR Code modal display */}
        {showMemberQR && (
          <div className="my-4 p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center animate-in zoom-in-95 duration-150">
            {/* Clean SVG QR Code Representation */}
            <svg
              className="w-36 h-36"
              viewBox="0 0 100 100"
              fill="currentColor"
            >
              <rect x="5" y="5" width="25" height="25" />
              <rect x="10" y="10" width="15" height="15" fill="white" />
              <rect x="13" y="13" width="9" height="9" />
              <rect x="70" y="5" width="25" height="25" />
              <rect x="75" y="10" width="15" height="15" fill="white" />
              <rect x="78" y="78" width="9" height="9" />
              <rect x="5" y="70" width="25" height="25" />
              <rect x="10" y="75" width="15" height="15" fill="white" />
              <rect x="13" y="78" width="9" height="9" />
              <rect x="35" y="10" width="8" height="8" />
              <rect x="48" y="15" width="10" height="5" />
              <rect x="35" y="25" width="5" height="12" />
              <rect x="50" y="35" width="15" height="15" />
              <rect x="70" y="45" width="8" height="8" />
              <rect x="40" y="60" width="10" height="10" />
              <rect x="60" y="75" width="12" height="12" />
            </svg>
            <p className="text-[11px] font-bold text-neutral-800 mt-2 font-mono">
              MEMBRE: {customer.id}
            </p>
            <span className="text-[10px] text-neutral-500">
              Scannez en caisse à Meknès pour cumuler vos points
            </span>
          </div>
        )}

        {/* Points Display */}
        <div className="mt-5 pt-4 border-t border-amber-950/60 flex items-center justify-between">
          <div>
            <span className="text-3xl font-black text-amber-400 tabular-nums font-sans">
              {customer.loyaltyPoints}
            </span>
            <span className="text-xs text-neutral-300 ml-2 font-semibold">
              {t.points}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-neutral-400 block">Valeur estimée</span>
            <span className="text-xs font-bold text-emerald-400">
              ~{Math.floor(customer.loyaltyPoints / 100) * 15} MAD de réduction
            </span>
          </div>
        </div>
      </div>

      {/* Available Return Campaign Offers */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Tag size={14} className="text-amber-400" />
          <span>{t.availableVouchers}</span>
        </h3>

        {customer.availableOffers.length === 0 ? (
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 text-center">
            Aucun bon de réduction actif pour le moment. Commandez pour débloquer de nouveaux paliers !
          </div>
        ) : (
          customer.availableOffers.map((offer) => (
            <div
              key={offer.id}
              className={`p-4 rounded-3xl border transition-all ${
                offer.isRedeemed
                  ? 'bg-neutral-900/40 border-neutral-800 opacity-60'
                  : 'bg-[#180b12] border-amber-600/40 hover:border-amber-500'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-900/50 inline-block mb-1.5">
                    Offre Réactivation Mida
                  </span>
                  <h4 className="font-bold text-sm text-white">
                    {offer.title[language] || offer.title.fr}
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    {offer.description[language] || offer.description.fr}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <Clock size={13} />
                  <span>Expire le {new Date(offer.expiresAt).toLocaleDateString()}</span>
                </div>

                {!offer.isRedeemed ? (
                  <button
                    onClick={() => handleCopy(offer.code)}
                    className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-extrabold text-xs uppercase tracking-wide flex items-center gap-1.5 transition-colors"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <Check size={13} strokeWidth={3} />
                        <span>{t.copyCode}</span>
                      </>
                    ) : (
                      <>
                        <span>Code : {offer.code}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-neutral-500 font-semibold">Déjà utilisé</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Points History Ledger */}
      <div className="rounded-3xl bg-[#140a0f] border border-neutral-800/80 p-4 space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
          <Award size={14} className="text-amber-400" />
          <span>Historique des points fidélité</span>
        </h3>

        <div className="divide-y divide-neutral-900 text-xs">
          {ledger.map((entry) => (
            <div key={entry.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">{entry.description}</p>
                <span className="text-[11px] text-neutral-500">
                  {new Date(entry.timestamp).toLocaleDateString()} à{' '}
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <span
                className={`font-bold tabular-nums text-xs ${
                  entry.pointsDelta > 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {entry.pointsDelta > 0 ? `+${entry.pointsDelta}` : entry.pointsDelta} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy & Tenant isolation notice */}
      <p className="text-[11px] text-neutral-500 text-center leading-relaxed px-4">
        Données de fidélité exclusivement restreintes à {restaurant.name} (Meknès). Aucune
        donnée n'est partagée avec d'autres restaurants.
      </p>
    </div>
  );
};
