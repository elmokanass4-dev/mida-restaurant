export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new ApiError(status, message); };
export const text = (value, max = 200, required = false) => {
  if (value !== undefined && typeof value !== 'string') fail(400, 'Texte invalide.');
  const result = (value ?? '').trim();
  if (result.length > max || (required && !result)) fail(400, 'Champ manquant ou trop long.');
  return result;
};
export function priceOrder(restaurant, dishes, input) {
  if (!restaurant.isOpen) fail(409, 'Restaurant fermé.');
  if (!['table', 'pickup', 'delivery'].includes(input.mode) || !restaurant.orderingModes[input.mode]) fail(400, 'Mode indisponible.');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 40) fail(400, 'Panier invalide.');
  const items = input.items.map(item => {
    if(!item||typeof item!=='object'||Array.isArray(item))fail(400,'Article invalide.');
    const dish = dishes.find(d => d.id === item.dishId && d.restaurantId === restaurant.id);
    if (!dish || !dish.isAvailable) fail(409, 'Un plat est indisponible.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 30) fail(400, 'Quantité invalide.');
    if (!Array.isArray(item.selectedModifiers) || item.selectedModifiers.length > 30) fail(400, 'Options invalides.');
    const seen = new Set();
    const modifiers = item.selectedModifiers.map(mod => {
      if(!mod||typeof mod!=='object'||Array.isArray(mod))fail(400,'Option invalide.');
      const group = dish.modifierGroups.find(g => g.id === mod.groupId);
      const option = group?.options.find(o => o.id === mod.optionId);
      const key = `${mod.groupId}:${mod.optionId}`;
      if (!option || seen.has(key)) fail(400, 'Option inconnue ou en double.');
      seen.add(key);
      return {groupId: group.id, groupName: group.name.fr, optionId: option.id, optionName: option.name.fr, priceMAD: option.priceMAD};
    });
    for (const group of dish.modifierGroups) {
      const count = modifiers.filter(m => m.groupId === group.id).length;
      if (count < Math.max(group.minSelections, group.required ? 1 : 0) || count > group.maxSelections) fail(400, `Choisissez les options : ${group.name.fr}`);
    }
    const unitPriceMAD = dish.priceMAD + modifiers.reduce((sum, m) => sum + m.priceMAD, 0);
    return {dishId: dish.id, dishName: dish.name.fr, image: dish.image, quantity: item.quantity, selectedModifiers: modifiers, unitPriceMAD, lineTotalMAD: unitPriceMAD * item.quantity, itemNotes: text(item.itemNotes, 300)};
  });
  const subtotalMAD = items.reduce((sum, i) => sum + i.lineTotalMAD, 0);
  let deliveryFeeMAD = 0;
  if (input.mode === 'delivery') {
    const settings = restaurant.deliverySettings;
    const zone = settings.zones.find(z => z.id === input.deliveryZoneId && z.active);
    if (settings.isPaused || !zone) fail(400, 'Zone de livraison indisponible.');
    if (subtotalMAD < Math.max(settings.minOrderMAD, zone.minSpendMAD)) fail(400, 'Minimum de livraison non atteint.');
    deliveryFeeMAD = zone.feeMAD;
  }
  if (input.offerCode || input.appliedOfferId) fail(400, 'Les promotions ne sont pas encore activées.');
  const totalMAD = Math.round((subtotalMAD + deliveryFeeMAD) * 100) / 100;
  const taxRatePercent = restaurant.taxRatePercent ?? 0;
  return {verifiedItems: items, subtotalMAD, discountMAD: 0, deliveryFeeMAD, taxRatePercent, taxAmountMAD: Math.round((totalMAD - totalMAD / (1 + taxRatePercent / 100)) * 100) / 100, totalMAD};
}
