import React from 'react';
import { CustomerProfile, Language, Restaurant } from '../../types';
import { backendEnabled } from '../../services/api';
import { ReceiptLoyaltyDemo } from './ReceiptLoyaltyDemo';

interface Props {
  customer: CustomerProfile;
  restaurant: Restaurant;
  language: Language;
  onApplyOfferInCart?: (code: string) => void;
}

export const RewardsWallet: React.FC<Props> = props => backendEnabled
  ? <ReceiptLoyaltyDemo customer={props.customer} restaurant={props.restaurant} />
  : <p className="p-5 text-amber-200">La fidélité sera disponible après connexion du service.</p>;
