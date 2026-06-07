'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import {
  Gamepad2, Gamepad, Activity, Zap, Monitor,
  Info, Radio, WifiOff, Vibrate,
} from 'lucide-react';

interface ButtonState { pressed: boolean; touched: boolean; value: number; }
interface GamepadDisplay {
  id: string; index: number; connected: boolean; mapping: string;
  buttons: ButtonState[]; axes: number[]; timestamp: number; vibrationActuator: boolean;
}
interface ConnectionEvent { type: 'connected'|'disconnected'; id: string; index: number; timestamp: Date; }

const BTN_LABELS = ['A','B','X','Y','L1','R1','L2','R2','Select','Start','L3','R3','D-Up','D-Down','D-Left','D-Right','Home'];
const BTN_COLORS = ['#22c55e','#ef4444','#3b82f6','#eab308','#8b5cf6','#8b5cf6','#f97316','#f97316','#94a3b8','#94a3b8','#ec4899','#ec4899','#64748b','#64748b','#64748b','#64748b','#f59e0b'];

const fmt = (v:number)=>Math.abs(v)<0.1?'0.00':v.toFixed(2);

function ButtonGrid({buttons}:{buttons:ButtonState[]}){
  return <div className="grid grid-cols-4 gap-2">{buttons.slice(0,17).map((b,i)=>{
    const l=BTN_LABELS[i]||`B${i}`,c=BTN_COLORS[i]||'#64748b',analog=i===6||i===7;
    const val=analog?b.value:(b.pressed?1:0),a=Math.round(val*60).toString(16).padStart(2,'0'),g=Math.round(val*16);
    return <div key={i} className="relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-75"
      style={{backgroundColor:val>0?`${c}${a}`:'rgb(30,41,59)',border:`2px solid ${val>0?c:'rgb(51,65,85)'}`,transform:val>0?'scale(1.05)':'scale(1)',boxShadow:val>0?`0 0 ${g}px ${c}40`:'none'}}>
      <span className="text-[10px] text-slate-500 leading-none">B{i}</span>
      <span className="text-[11px] text-center leading-tight font-medium" style={{color:val>0?'#fff':'#94a3b8'}}>{l}</span>
      {analog&&<div className="w-full h-1 rounded-full bg-slate-800 mt-0.5"><div className="h-1 rounded-full transition-all duration-75" style={{width:`${Math.round(val*100)}%`,backgroundColor:c}}/></div>}
      {b.pressed&&!analog&&<div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400"/>}
    </div>;
  })}</div>;
}

function AxisVisualizer({axes}:{axes:number[]}){
  const lx=axes[0]??0,ly=axes[1]??0,rx=axes[2]??0,ry=axes[3]??0;
  const stick=(x:number,y:number,l:string)=>(
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 rounded-full bg-slate-800 border-2 border-slate-600">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-600/50"/><div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-600/50"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-slate-600/30"/>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-slate-600/20"/>
        <div className="absolute w-5 h-5 rounded-full bg-brand-400/80 shadow-lg shadow-brand-500/30 transition-all duration-50" style={{top:`${50-y*42}%`,left:`${50+x*42}%`,transform:'translate(-50%,-50%)'}}/>
      </div>
      <div className="flex gap-3 text-xs text-slate-400 font-mono"><span>X: {fmt(x)}</span><span>Y: {fmt(y)}</span></div>
      <span className="text-[11px] text-slate-500">{l}</span>
    </div>);
  return <div>
    <div className="flex flex-wrap justify-center gap-8">{stick(lx,ly,'Left Stick')}{stick(rx,ry,'Right Stick')}</div>
    {axes.length>4&&<div className="mt-4 pt-4 border-t border-slate-700/50"><h4 className="text-xs text-slate-500 mb-2">Additional Axes</h4><div className="grid grid-cols-2 gap-2">{axes.slice(4).map((v,i)=><div key={i} className="flex items-center gap-2"><span className="text-[10px] text-slate-500 font-mono w-8">A{i+4}</span><div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-2 rounded-full bg-brand-400/60 transition-all duration-75" style={{width:`${Math.abs(v)*50}%`,marginLeft:v>=0?'50%':`${50-Math.abs(v)*50}%`}}/></div><span className="text-[10px] text-slate-500 font-mono w-10 text-right">{fmt(v)}</span></div>)}</div></div>}
  </div>;
}

function VibTest({gi,hv}:{gi:number;hv:boolean}){
  const [d,setD]=useState(300);const [sm,setSm]=useState(0.5);const [wm,setWm]=useState(0.3);const [vb,setVb]=useState(false);
  const t=useCallback(async()=>{const g=navigator.getGamepads()?.[gi];if(!g?.vibrationActuator)return;setVb(true);try{await(g.vibrationActuator as any).playEffect('dual-rumble',{duration:d,strongMagnitude:sm,weakMagnitude:wm})}catch{}setVb(false)},[gi,d,sm,wm]);
  const s=useCallback(async()=>{const g=navigator.getGamepads()?.[gi];if(!g?.vibrationActuator)return;try{await(g.vibrationActuator as any).reset()}catch{}setVb(false)},[gi]);
  if(!hv)return <div className="flex items-center gap-2 text-slate-500 text-sm p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"><WifiOff className="w-4 h-4"/>No vibration actuator</div>;
  return <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
    <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Vibrate className="w-4 h-4 text-brand-400"/>Vibration Tester</h4>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div><label className="block text-xs text-slate-400 mb-1">Duration (ms)</label><input type="range" min={50} max={2000} step={50} value={d} onChange={e=>setD(+e.target.value)} className="w-full accent-brand-400"/><span className="text-xs text-slate-500 font-mono">{d}ms</span></div>
      <div><label className="block text-xs text-slate-400 mb-1">Strong Motor</label><input type="range" min={0} max={1} step={0.05} value={sm} onChange={e=>setSm(+e.target.value)} className="w-full accent-brand-400"/><span className="text-xs text-slate-500 font-mono">{sm.toFixed(2)}</span></div>
      <div><label className="block text-xs text-slate-400 mb-1">Weak Motor</label><input type="range" min={0} max={1} step={0.05} value={wm} onChange={e=>setWm(+e.target.value)} className="w-full accent-brand-400"/><span className="text-xs text-slate-500 font-mono">{wm.toFixed(2)}</span></div>
    </div>
    <div className="flex gap-3">
      <button onClick={t} disabled={vb} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${vb?'bg-green-600 text-white animate-pulse':'bg-brand-500 hover:bg-brand-600 text-white'}`}>{vb?'Vibrating...':'Test Vibration'}</button>
      <button onClick={s} className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all">Stop</button>
    </div>
  </div>;
}

export default function GamepadApiTesterPage(){
  const [gps,setGps]=useState<Map<number,GamepadDisplay>>(new Map());
  const [evts,setEvts]=useState<ConnectionEvent[]>([]);
  const [ai,setAi]=useState<number|null>(null);
  const [pr,setPr]=useState(0);
  const rf=useRef(0);const gr=useRef(gps);const ir=useRef(ai);const lr=useRef(0);
  gr.current=gps;ir.current=ai;

  useEffect(()=>{
    const poll=()=>{
      const raw=navigator.getGamepads();if(!raw){rf.current=requestAnimationFrame(poll);return;}
      const n=performance.now();if(lr.current>0)setPr(Math.round(1000/(n-lr.current)));lr.current=n;
      const cur=new Map(gr.current);const seen=new Set<number>();let ch=false;
      for(let i=0;i<raw.length;i++){const g=raw[i];if(!g)continue;seen.add(i);
        const d:GamepadDisplay={id:g.id,index:g.index,connected:g.connected,mapping:g.mapping,buttons:Array.from(g.buttons).map((b:GamepadButton)=>({pressed:b.pressed,touched:b.touched,value:b.value})),axes:[...g.axes],timestamp:g.timestamp,vibrationActuator:!!g.vibrationActuator};
        const ex=cur.get(i);if(!ex||JSON.stringify(ex.buttons)!==JSON.stringify(d.buttons)||JSON.stringify(ex.axes)!==JSON.stringify(d.axes)){cur.set(i,d);ch=true;}
      }
      for(const[idx]of cur){if(!seen.has(idx)){cur.delete(idx);ch=true;}}
      if(ch){setGps(new Map(cur));if(ir.current===null&&cur.size>0)setAi(cur.keys().next().value!);else if(ir.current!==null&&!cur.has(ir.current))setAi(cur.size>0?cur.keys().next().value!:null);}
      rf.current=requestAnimationFrame(poll);
    };
    const hc=(e:Event)=>{const ge=e as GamepadEvent;setEvts(p=>[...p.slice(-49),{type:'connected',id:ge.gamepad.id,index:ge.gamepad.index,timestamp:new Date()}])};
    const hd=(e:Event)=>{const ge=e as GamepadEvent;setEvts(p=>[...p.slice(-49),{type:'disconnected',id:ge.gamepad.id,index:ge.gamepad.index,timestamp:new Date()}])};
    window.addEventListener('gamepadconnected',hc);window.addEventListener('gamepaddisconnected',hd);
    rf.current=requestAnimationFrame(poll);
    return ()=>{cancelAnimationFrame(rf.current);window.removeEventListener('gamepadconnected',hc);window.removeEventListener('gamepaddisconnected',hd);};
  },[]);

  const ag=ai!==null?gps.get(ai):null;const c=gps.size;
  return <ToolLayout title="Gamepad API Tester" description="Test and visualize connected gamepads in real-time — buttons, joysticks, triggers, and vibration. Built on the Web Gamepad API.">
    <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-surface-light border border-slate-700/50">
      <div className="flex items-center gap-3">
        {c>0?<><Gamepad2 className="w-5 h-5 text-green-400"/><span className="text-sm text-slate-300 font-medium">{c} gamepad{c>1?'s':''} connected</span><span className="text-xs text-slate-500 font-mono">Polling: {pr} Hz</span></>
          :<><Gamepad className="w-5 h-5 text-slate-500"/><span className="text-sm text-slate-400">No gamepad detected — press any button to connect</span></>}
      </div>
      {c>1&&<div className="flex items-center gap-2">{Array.from(gps.keys()).map(i=><button key={i} onClick={()=>setAi(i)} className={`px-3 py-1 rounded text-xs font-medium transition-all ${ai===i?'bg-brand-500 text-white':'bg-slate-700 text-slate-400 hover:text-white'}`}>Gamepad {i}</button>)}</div>}
    </div>
    {!ag?<div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-500"><Gamepad className="w-16 h-16 text-slate-700"/><p className="text-lg font-medium">No Gamepad Connected</p><p className="text-sm max-w-md text-center">Connect a gamepad via USB or Bluetooth, then press any button. Uses the <a href="https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">Web Gamepad API</a>.</p><div className="mt-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 max-w-md"><h4 className="text-sm font-semibold text-slate-400 mb-2 flex items-center gap-2"><Info className="w-4 h-4"/>Browser Support</h4><div className="text-xs text-slate-500 space-y-1"><div className="flex justify-between"><span>Chrome</span><span className="text-green-400">✓ Full support</span></div><div className="flex justify-between"><span>Firefox</span><span className="text-green-400">✓ Full support</span></div><div className="flex justify-between"><span>Edge</span><span className="text-green-400">✓ Full support</span></div><div className="flex justify-between"><span>Safari</span><span className="text-yellow-400">✓ 14.1+</span></div></div></div></div>
    :<>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50"><h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-brand-400"/>Buttons ({ag.buttons.length})</h3><ButtonGrid buttons={ag.buttons}/>{ag.mapping==='standard'&&<p className="text-[11px] text-slate-500 mt-3">Standard mapping — Xbox/PS/Switch layout</p>}</div>
        <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50"><h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-brand-400"/>Axes ({ag.axes.length})</h3><AxisVisualizer axes={ag.axes}/></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50"><h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Monitor className="w-4 h-4 text-brand-400"/>Gamepad Info</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-500">ID</span><span className="text-slate-300 font-mono text-xs max-w-[260px] truncate" title={ag.id}>{ag.id}</span></div><div className="flex justify-between"><span className="text-slate-500">Index</span><span className="text-slate-300 font-mono">{ag.index}</span></div><div className="flex justify-between"><span className="text-slate-500">Mapping</span><span className={`font-mono ${ag.mapping==='standard'?'text-green-400':'text-yellow-400'}`}>{ag.mapping||'none'}</span></div><div className="flex justify-between"><span className="text-slate-500">Buttons</span><span className="text-slate-300 font-mono">{ag.buttons.length}</span></div><div className="flex justify-between"><span className="text-slate-500">Axes</span><span className="text-slate-300 font-mono">{ag.axes.length}</span></div><div className="flex justify-between"><span className="text-slate-500">Vibration</span><span className={`font-mono ${ag.vibrationActuator?'text-green-400':'text-slate-500'}`}>{ag.vibrationActuator?'Supported':'Not supported'}</span></div><div className="flex justify-between"><span className="text-slate-500">Timestamp</span><span className="text-slate-300 font-mono text-xs">{ag.timestamp.toFixed(0)}</span></div></div></div>
        <VibTest gi={ai!} hv={ag.vibrationActuator}/>
      </div>
      <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50"><h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2"><Radio className="w-4 h-4 text-brand-400"/>Connection Log</h3>{evts.length===0?<p className="text-sm text-slate-500">No connection events yet</p>:<div className="space-y-1 max-h-48 overflow-y-auto">{evts.map((e,i)=><div key={i} className={`flex items-center gap-3 text-xs p-1.5 rounded ${e.type==='connected'?'text-green-400/80':'text-red-400/80'}`}><span className="w-2 h-2 rounded-full bg-current"/><span className="font-medium uppercase w-20">{e.type}</span><span className="text-slate-400 font-mono text-[11px] truncate max-w-[300px]">{e.id}</span><span className="text-slate-600 ml-auto">{e.timestamp.toLocaleTimeString()}</span></div>)}</div>}</div>
    </>}
  </ToolLayout>;
}
