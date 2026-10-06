import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import QRCode from 'qrcode';
import {createRequire} from 'node:module';

test('receipt demo requires payment, credits once, never auto-awards, and reverses refunds',async()=>{
  const bundled=await build({entryPoints:['src/services/demoPersistence.ts'],bundle:true,platform:'node',format:'esm',write:false,loader:{'.jpg':'empty'}});
  const {DemoPersistence}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
  const values=new Map();const previous=globalThis.window;
  globalThis.window={localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},dispatchEvent:()=>true};
  try{
    const store=new DemoPersistence();store.initializeIfEmpty(true);
    const id='braise-burger';const paid=store.getOrders(id).find(o=>o.paymentStatus==='paid'&&!['cancelled','rejected'].includes(o.status));
    const unpaid=store.getOrders(id).find(o=>o.paymentStatus==='unpaid');
    assert.ok(paid&&unpaid);
    assert.throws(()=>store.issueReceipt(unpaid.id),/payée/);
    store.updateOrderStatus({orderId:paid.id,status:'completed'});
    assert.equal(store.getCustomer(id).loyaltyPoints,0,'completion must not credit automatically');
    const code=store.issueReceipt(paid.id);assert.equal(store.issueReceipt(paid.id),code,'reprints keep the same code');
    assert.throws(()=>store.claimReceipt('other-restaurant',code),/inconnu/);
    assert.throws(()=>store.claimReceipt(id,'invented'),/inconnu/);
    const points=store.claimReceipt(id,`https://example.test/demo/?receipt=${code}`);
    assert.equal(points,Math.floor(paid.totalMAD-paid.deliveryFeeMAD));
    assert.equal(store.getCustomer(id).loyaltyPoints,points);
    assert.throws(()=>store.claimReceipt(id,code),/déjà/);
    store.updateOrderStatus({orderId:paid.id,status:'completed'});
    assert.equal(store.getCustomer(id).loyaltyPoints,points);
    store.updatePaymentStatus({orderId:paid.id,paymentStatus:'refunded'});
    assert.equal(store.getCustomer(id).loyaltyPoints,0);
    assert.throws(()=>store.claimReceipt(id,code),/remboursé/);
    assert.throws(()=>store.issueReceipt(paid.id),/payée/);
    store.initializeIfEmpty(true);
    assert.throws(()=>store.claimReceipt(id,code),/inconnu/);
    assert.equal(store.getLoyaltyLedger(id).length,0);
  }finally{globalThis.window=previous;}
});

test('generated QR can be decoded back to its receipt link',()=>{
  const {RGBLuminanceSource,BinaryBitmap,HybridBinarizer,QRCodeReader}=createRequire(import.meta.resolve('@zxing/browser'))('@zxing/library');
  const link='https://elmokanass4-dev.github.io/mida-restaurant/demo/?receipt=0123456789ABCDEF1234';
  const qr=QRCode.create(link,{errorCorrectionLevel:'M'}),scale=5,margin=4,width=(qr.modules.size+margin*2)*scale;
  const pixels=new Uint8ClampedArray(width*width).fill(255);
  for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++)pixels[((y+margin)*scale+dy)*width+(x+margin)*scale+dx]=0;
  const bitmap=new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixels,width,width)));
  assert.equal(new QRCodeReader().decode(bitmap).getText(),link);
});
