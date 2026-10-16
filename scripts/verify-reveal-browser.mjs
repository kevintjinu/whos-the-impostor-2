import http from 'node:http'
const page = await new Promise((resolve, reject) => {
  const r = http.request('http://127.0.0.1:9340/json/new?about:blank', {method:'PUT'}, s=>{let b='';s.on('data',c=>{b+=c});s.on('end',()=>resolve(JSON.parse(b)))})
  r.on('error',reject);r.end()
})
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r=>{ws.onopen=r})
let i=0;const queue=new Map()
ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){queue.get(m.id)?.(m);queue.delete(m.id)}}
function send(method,params={}){const id=++i;ws.send(JSON.stringify({id,method,params}));return new Promise(r=>queue.set(id,r))}
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true});if(r.result.exceptionDetails)throw new Error('Browser evaluation failed');return r.result.result.value}
const pause=()=>new Promise(r=>setTimeout(r,35))
async function click(text,twice=false){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes(${JSON.stringify(text)}));b.click();${twice?'b.click();':''}})()`);await pause()}
await send('Page.enable');await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride',{width:320,height:568,mobile:true,deviceScaleFactor:1})
await send('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(crypto,'randomUUID',{value:undefined});const get=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=a=>a instanceof Uint32Array?(a.fill(0),a):get(a)`})
const appUrl=process.argv.find(arg=>/^https?:\/\//.test(arg))??'http://127.0.0.1:5175/'
await send('Page.navigate',{url:appUrl});await new Promise(r=>setTimeout(r,150))
await click('Start Game')
for(const name of ['ABCDEFGHIJKLMNOPQRSTUVWX','Ben','Chloe']){
 await evaluate(`(()=>{const i=document.querySelector('#player-name');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(name)});i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.player-form').requestSubmit()})()`);await pause()
}
await click('Continue');await click('Continue')
const revealOverflow=await evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
// Real keyboard hold/release, followed by interrupted controlled disclosure.
await evaluate(`document.querySelector('.hold-reveal-button').focus()`)
await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32})
await pause()
if(!await evaluate(`!!document.querySelector('.secret-content')`))throw new Error('Keyboard hold did not reveal')
await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32})
await pause()
if(await evaluate(`!!document.querySelector('.secret-content')`))throw new Error('Release did not hide')
await click('Use tap or assistive controls')
await evaluate(`window.dispatchEvent(new Event('blur'))`);await pause()
if(await evaluate(`!!document.querySelector('.secret-content')`))throw new Error('Blur did not hide')
await click('Use tap or assistive controls')
await evaluate(`Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))`);await pause()
if(await evaluate(`!!document.querySelector('.secret-content')`))throw new Error('Visibility change did not hide')
await evaluate(`delete document.visibilityState`)
await evaluate(`document.querySelector('.hold-reveal-button').focus()`)
await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});await pause()
await evaluate(`document.querySelector('.hold-reveal-button').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:99}))`);await pause()
if(await evaluate(`!!document.querySelector('.secret-content')`))throw new Error('Pointer cancellation did not hide')
await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32})
await click('Use tap or assistive controls');await click('Hide secret')
await click('I’ve seen my role',true)
const playerAfterDouble=await evaluate(`document.querySelector('.reveal-progress')?.getAttribute('aria-label')`)
// Complete the remaining valid handoffs regardless of whether the probe found a skipped player.
while(!await evaluate(`!!document.querySelector('.reveal-ready')`)){
 await click('Use tap or assistive controls');await click('Hide secret')
 const final=await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Finish reveals'))`)
 await click(final?'Finish reveals':'I’ve seen my role')
}
await click('Begin round')
const clueOverflow=await evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')
if(revealOverflow>1||clueOverflow>1||playerAfterDouble!=='Player 2 of 3')throw new Error('Long-name or duplicate handoff regression')
console.log(JSON.stringify({revealOverflow,playerAfterDouble,clueOverflow}))
ws.close()
