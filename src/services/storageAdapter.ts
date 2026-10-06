import { Restaurant, Dish, Category, Order, CustomerProfile, LoyaltyLedgerEntry, StaffCallRequest, OrderItem, OrderStatus, PaymentStatus } from '../types';
import { SEED_RESTAURANTS, SEED_CATEGORIES, SEED_DISHES } from '../data/seedData';
import { api, backendEnabled, StaffUser } from './api';
export const SYNC_EVENT_NAME='mida_sync_event';
export const ERROR_EVENT_NAME='mida_service_error';
interface Snapshot {user:StaffUser|null; restaurants:Restaurant[]; dishes:Dish[]; categories:Category[]; orders:Order[]; customers:CustomerProfile[]; ledger:LoyaltyLedgerEntry[]; calls:StaffCallRequest[]}
const emptyCustomer=(restaurantId:string):CustomerProfile=>({id:'guest',restaurantId,name:'Client',phone:'',loyaltyPoints:0,favoriteDishIds:[],totalOrdersCount:0,totalSpentMAD:0,marketingConsent:false,availableOffers:[]});
class StorageAdapter {
  private snapshot:Snapshot={user:null,restaurants:SEED_RESTAURANTS.map(r=>({...r,tables:[],returnCampaigns:[]})),dishes:SEED_DISHES,categories:SEED_CATEGORIES,orders:[],customers:[],ledger:[],calls:[]};
  private generation=0;
  public user:StaffUser|null=null;
  public connected=false;
  public async refresh() {
    if(!backendEnabled) return;
    const generation=this.generation;
    const next=await api<Snapshot>('/snapshot');
    if(generation!==this.generation) return;
    const newOrders=next.orders.some(o=>!this.snapshot.orders.some(old=>old.id===o.id));
    this.snapshot=next; this.user=next.user; this.connected=true;
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME,{detail:{type:newOrders?'ORDER_SUBMITTED':'SYNC'}}));
  }
  public async login(email:string,password:string) {this.generation++; await api('/login','POST',{email,password}); this.generation++; await this.refresh();}
  public async logout() {
    this.generation++;
    await api('/logout','POST');
    this.generation++;
    this.snapshot={...this.snapshot,user:null,orders:[],customers:[],calls:[],ledger:[],restaurants:this.snapshot.restaurants.map(r=>({...r,tables:[],returnCampaigns:[]}))}; this.user=null;
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME)); await this.refresh();
  }
  public async mutate<T>(path:string,method:string,body?:unknown,headers?:Record<string,string>):Promise<T> {
    const result=await api<T>(path,method,body,headers);
    try {await this.refresh();} catch {window.dispatchEvent(new CustomEvent(ERROR_EVENT_NAME,{detail:'Enregistrement effectué, mais la synchronisation est interrompue.'}));}
    return result;
  }
  public report(error:unknown) {window.dispatchEvent(new CustomEvent(ERROR_EVENT_NAME,{detail:error instanceof Error?error.message:'Action impossible.'}));}
  public getRestaurants(){return this.snapshot.restaurants;}
  public getCategories(id:string){return this.snapshot.categories.filter(c=>c.restaurantId===id).sort((a,b)=>a.sortOrder-b.sortOrder);}
  public getDishes(id:string){return this.snapshot.dishes.filter(d=>d.restaurantId===id);}
  public getDishById(id:string){return this.snapshot.dishes.find(d=>d.id===id);}
  public getOrders(id:string){return this.snapshot.orders.filter(o=>o.restaurantId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
  public getOrderByRef(ref:string){return this.snapshot.orders.find(o=>o.secureRef===ref);}
  public getCustomer(id:string){return this.snapshot.customers.find(c=>c.restaurantId===id)??emptyCustomer(id);}
  public getLoyaltyLedger(id:string){return this.snapshot.ledger.filter(l=>l.restaurantId===id);}
  public getStaffCalls(id:string){return this.snapshot.calls.filter(c=>c.restaurantId===id&&!c.resolved);}
  public updateCustomer(customer:CustomerProfile){return this.mutate(`/profile/${encodeURIComponent(customer.restaurantId)}`,'PATCH',{marketingConsent:customer.marketingConsent});}
  public async submitOrder(data:Omit<Order,'id'|'orderNumber'|'secureRef'|'createdAt'|'status'>,requestKey:string) {
    const order=await this.mutate<Order>('/orders','POST',{...data,expectedTotalMAD:data.totalMAD},{'Idempotency-Key':requestKey});
    if(!this.snapshot.orders.some(o=>o.id===order.id))this.snapshot.orders.unshift(order);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT_NAME));
    return order;
  }
  public updateOrderStatus(params:{orderId:string;status:OrderStatus;staffAttribution?:string;prepMinutesAdded?:number;rejectionReason?:string}){return this.mutate(`/orders/${encodeURIComponent(params.orderId)}/status`,'PATCH',params);}
  public updatePaymentStatus(params:{orderId:string;paymentStatus:PaymentStatus;refundReason?:string;staffAttribution?:string}){return this.mutate(`/orders/${encodeURIComponent(params.orderId)}/payment`,'PATCH',params);}
  public toggleDishAvailability(id:string){const dish=this.getDishById(id); if(!dish) throw new Error('Plat introuvable.'); return this.mutate(`/dishes/${encodeURIComponent(id)}/availability`,'PATCH',{isAvailable:!dish.isAvailable});}
  public submitStaffCall(params:{restaurantId:string;tableNumber:number;type:'call_waiter'|'request_bill'|'allergen_question';notes?:string}){return this.mutate<{success:boolean;message:string}>('/calls','POST',params);}
  public resolveStaffCall(id:string){return this.mutate(`/calls/${encodeURIComponent(id)}`,'PATCH');}
  public setService(id:string,isOpen:boolean){return this.mutate(`/restaurants/${encodeURIComponent(id)}/service`,'PATCH',{isOpen});}
  // Estimate only. The server independently validates every submitted order.
  public verifyAndCalculateOrder(params:{restaurantId:string;mode:'table'|'pickup'|'delivery';items:OrderItem[];deliveryZoneId?:string;offerCode?:string}) {
    const restaurant=this.getRestaurants().find(r=>r.id===params.restaurantId);
    if(!restaurant) throw new Error('Restaurant introuvable.');
    const subtotalMAD=params.items.reduce((sum,item)=>{
      const dish=this.getDishById(item.dishId);
      if(!dish||!dish.isAvailable)throw new Error('Un plat du panier est indisponible.');
      const additions=item.selectedModifiers.reduce((price,mod)=>price+(dish.modifierGroups.find(g=>g.id===mod.groupId)?.options.find(o=>o.id===mod.optionId)?.priceMAD??0),0);
      return sum+(dish.priceMAD+additions)*item.quantity;
    },0);
    const zone=restaurant.deliverySettings.zones.find(z=>z.id===params.deliveryZoneId);
    const deliveryFeeMAD=params.mode==='delivery'?(zone?.feeMAD??restaurant.deliverySettings.deliveryFeeMAD):0;
    const totalMAD=subtotalMAD+deliveryFeeMAD, taxRatePercent=restaurant.taxRatePercent??0;
    return {subtotalMAD,discountMAD:0,deliveryFeeMAD,totalMAD,taxRatePercent,taxAmountMAD:Math.round((totalMAD-totalMAD/(1+taxRatePercent/100))*100)/100,appliedOfferId:undefined};
  }
}
export const storage=new StorageAdapter();
