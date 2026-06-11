'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Copy, Trash2, Plus, Shield, Hash, Key, Eye, EyeOff, RefreshCw, AlertTriangle, Info, Timer } from 'lucide-react';
import toast from 'react-hot-toast';

type Algorithm = 'SHA-1' | 'SHA-256' | 'SHA-512';
type Digits = 6 | 8;

interface Account {
  id: string;
  issuer: string;
  label: string;
  secret: string;
  algorithm: Algorithm;
  digits: Digits;
  period: number;
  code: string;
  remainingSeconds: number;
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function b32dec(s: string): Uint8Array {
  let t = s.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  const bits: number[] = [];
  for (let i = 0; i < t.length; i++) {
    const v = B32.indexOf(t[i]);
    if (v === -1) continue;
    bits.push((v >> 4) & 1, (v >> 3) & 1, (v >> 2) & 1, (v >> 1) & 1, v & 1);
  }
  const out = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < out.length; i++) {
    out[i] = 0;
    for (let j = 0; j < 8; j++) out[i] = (out[i] << 1) | bits[i * 8 + j];
  }
  return out;
}

async function hmac(k: Uint8Array, m: Uint8Array, a: Algorithm): Promise<ArrayBuffer> {
  const map: Record<Algorithm,string> = {'SHA-1':'SHA-1','SHA-256':'SHA-256','SHA-512':'SHA-512'};
  const keyBuf = new Uint8Array(k).buffer as ArrayBuffer;
  const msgBuf = new Uint8Array(m).buffer as ArrayBuffer;
  const ck = await crypto.subtle.importKey('raw', keyBuf, {name:'HMAC',hash:map[a]}, false, ['sign']);
  return crypto.subtle.sign('HMAC', ck, msgBuf);
}

function hotp(b: ArrayBuffer, d: Digits): string {
  const u = new Uint8Array(b);
  const o = u[u.length-1] & 0x0f;
  const n = ((u[o]&0x7f)<<24)|((u[o+1]&0xff)<<16)|((u[o+2]&0xff)<<8)|(u[o+3]&0xff);
  return (n % Math.pow(10,d)).toString().padStart(d,'0');
}

function ctr(p: number): Uint8Array {
  const c = Math.floor(Date.now()/1000/p);
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0,BigInt(c),false);
  return new Uint8Array(b);
}

async function gen(s: string, a: Algorithm, d: Digits, p: number) {
  try {
    const k = b32dec(s);
    if (k.length===0) return {code:'------',remainingSeconds:0};
    const r = p - (Math.floor(Date.now()/1000) % p);
    const c = hotp(await hmac(k,ctr(p),a), d);
    return {code:c,remainingSeconds:r};
  } catch { return {code:'ERROR',remainingSeconds:0}; }
}

function vld(s: string): string|null {
  const c = s.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  if (!c) return 'Secret is required';
  if (!/^[A-Z2-7]+$/.test(c)) return 'Invalid base32 chars';
  if (c.length<16) return 'Too short (min 16 chars)';
  return null;
}

function rnd(b=160): string {
  const d = new Uint8Array(b/8);
  crypto.getRandomValues(d);
  const r: string[] = [];
  let x=0,y=0;
  for(let i=0;i<d.length;i++){x=(x<<8)|d[i];y+=8;while(y>=5){y-=5;r.push(B32[(x>>y)&0x1f]);}}
  if(y>0) r.push(B32[(x<<(5-y))&0x1f]);
  return r.join('');
}

let nxt=0;
const nid=()=>'a'+(nxt++);

export default function TotpGenerator() {
  const [acc,setAcc]=useState<Account[]>(()=>[{
    id:nid(),issuer:'Example',label:'user@example.com',
    secret:'JBSWY3DPEHPK3PXP',algorithm:'SHA-1',digits:6,period:30,
    code:'------',remainingSeconds:0,
  }]);
  const [open,setOpen]=useState(false);
  const [iss,setIss]=useState('');
  const [lbl,setLbl]=useState('');
  const [sec,setSec]=useState('');
  const [alg,setAlg]=useState<Algorithm>('SHA-1');
  const [dig,setDig]=useState<Digits>(6);
  const [per,setPer]=useState(30);
  const [uri,setUri]=useState('');
  const [vis,setVis]=useState<Record<string,boolean>>({});
  const [err,setErr]=useState('');
  const ref=useRef<NodeJS.Timeout|null>(null);

  const up=useCallback(async()=>{
    const u=await Promise.all(acc.map(async a=>{const r=await gen(a.secret,a.algorithm,a.digits,a.period);return{...a,...r};}));
    setAcc(u);
  },[acc]);

  useEffect(()=>{
    up();
    if(ref.current) clearInterval(ref.current);
    ref.current=setInterval(up,1000);
    return ()=>{if(ref.current) clearInterval(ref.current);};
  },[up]);

  const add=useCallback(()=>{
    const e=vld(sec);if(e){toast.error(e);return;}
    if(!lbl.trim()){toast.error('Label required');return;}
    setAcc(p=>[...p,{id:nid(),issuer:iss.trim(),label:lbl.trim(),secret:sec.toUpperCase().replace(/\s/g,''),algorithm:alg,digits:dig,period:per,code:'------',remainingSeconds:30-(Math.floor(Date.now()/1000)%per)}]);
    setIss('');setLbl('');setSec('');setOpen(false);
    toast.success('Account added');
  },[sec,lbl,iss,alg,dig,per]);

  const parse=useCallback(()=>{
    const m=uri.trim().match(/^otpauth:\/\/totp\/(.+?)(\?|$)/);
    if(!m){setErr('Invalid URL');return;}
    const lp=decodeURIComponent(m[1]);
    let is='',lb=lp;
    const ci=lp.indexOf(':');
    if(ci!==-1){is=lp.substring(0,ci).trim();lb=lp.substring(ci+1).trim();}
    const p=new URLSearchParams(uri.trim().split('?')[1]||'');
    const s=p.get('secret')||'';
    if(!s){setErr('No secret');return;}
    const as=(p.get('algorithm')||'SHA1').toUpperCase();
    const al:Algorithm=as==='SHA256'?'SHA-256':as==='SHA512'?'SHA-512':'SHA-1';
    const dl:Digits=parseInt(p.get('digits')||'6')===8?8:6;
    const pd=parseInt(p.get('period')||'30')||30;
    const pi=p.get('issuer')||'';
    setIss(pi||is);setLbl(lb);setSec(s);setAlg(al);setDig(dl);setPer(pd);
    setUri('');setErr('');setOpen(true);
    toast.success('Parsed!');
  },[uri]);

  return (
    <ToolLayout title="TOTP Code Generator" description="Generate time-based one-time passwords (RFC 6238) for 2FA testing. Works like Google Authenticator.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {acc.map(a=>{
          const dng=a.remainingSeconds<=5;
          const wrn=a.remainingSeconds<=10;
          return (
            <div key={a.id} className="card relative overflow-hidden">
              <div className="absolute top-0 left-0 h-1 transition-all duration-1000 ease-linear" style={{width:((a.remainingSeconds/a.period)*100)+'%',background:dng?'#ef4444':wrn?'#f59e0b':'#3b82f6'}}/>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-brand-400"/>
                    <h3 className="text-white font-semibold text-sm">
                      {a.issuer?<span className="text-slate-400">{a.issuer} / </span>:null}{a.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <span><Hash className="w-3 h-3 inline mr-1"/>{a.algorithm}</span>
                    <span><Key className="w-3 h-3 inline mr-1"/>{a.digits}d</span>
                    <span><Timer className="w-3 h-3 inline mr-1"/>{a.period}s</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={()=>setVis(p=>({...p,[a.id]:!p[a.id]}))} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-surface-lighter">
                    {vis[a.id]?<EyeOff className="w-3.5 h-3.5"/>:<Eye className="w-3.5 h-3.5"/>}
                  </button>
                  <button onClick={()=>setAcc(p=>p.filter(x=>x.id!==a.id))} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 flex justify-center gap-2">
                  {a.code.split('').map((c,i)=>(
                    <span key={i} className={'inline-flex items-center justify-center w-9 h-12 rounded-lg text-2xl font-mono font-bold '+(
                      a.code==='ERROR'?'bg-red-500/10 text-red-400':a.code==='------'?'bg-slate-800 text-slate-600':'bg-brand-500/10 text-brand-300'
                    )}>{c}</span>
                  ))}
                </div>
                <button onClick={()=>{navigator.clipboard.writeText(a.code);toast.success('Copied');}} className="btn-primary px-2.5 py-2 rounded-lg">
                  <Copy className="w-4 h-4"/>
                </button>
              </div>
              <div className="flex justify-between items-center mt-3">
                <span className={'text-xs font-medium '+(dng?'text-red-400':wrn?'text-yellow-400':'text-slate-500')}>
                  <RefreshCw className="w-3 h-3 inline mr-1"/>Next in {a.remainingSeconds}s
                </span>
                {vis[a.id]&&<span className="text-xs text-slate-500 font-mono bg-surface-lighter px-2 py-0.5 rounded">{a.secret}</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card mb-8">
        {!open?(
          <button onClick={()=>setOpen(true)} className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus className="w-4 h-4"/>Add Account
          </button>
        ):(
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-sm"><Plus className="w-4 h-4 inline mr-2"/>New Account</h3>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Paste OTP Auth URL (optional)</label>
              <div className="flex gap-2">
                <input value={uri} onChange={e=>{setUri(e.target.value);setErr('');}} placeholder="otpauth://totp/..." className="input-field flex-1 text-xs font-mono"/>
                <button onClick={parse} className="btn-primary px-3 py-2 text-xs">Parse</button>
              </div>
              {err&&<p className="text-xs text-red-400 mt-1"><AlertTriangle className="w-3 h-3 inline mr-1"/>{err}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs text-slate-400 block mb-1.5">Issuer</label><input value={iss} onChange={e=>setIss(e.target.value)} placeholder="GitHub" className="input-field w-full text-sm"/></div>
              <div><label className="text-xs text-slate-400 block mb-1.5">Label</label><input value={lbl} onChange={e=>setLbl(e.target.value)} placeholder="user@example.com" className="input-field w-full text-sm"/></div>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Secret Key (Base32)</label>
              <div className="flex gap-2">
                <input value={sec} onChange={e=>setSec(e.target.value.toUpperCase().replace(/[^A-Z2-7]/g,''))} placeholder="JBSWY3DPEHPK3PXP" className="input-field flex-1 text-sm font-mono"/>
                <button onClick={()=>setSec(rnd())} className="px-3 py-2 bg-surface-lighter text-slate-300 rounded-lg hover:bg-slate-700 text-xs flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5"/>Random
                </button>
              </div>
              {sec&&vld(sec)&&<p className="text-xs text-yellow-400 mt-1"><Info className="w-3 h-3 inline mr-1"/>{vld(sec)}</p>}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-400 block mb-1.5">Algorithm</label>
                <select value={alg} onChange={e=>setAlg(e.target.value as Algorithm)} className="input-field w-full text-sm">
                  <option value="SHA-1">SHA-1</option><option value="SHA-256">SHA-256</option><option value="SHA-512">SHA-512</option>
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1.5">Digits</label>
                <select value={dig} onChange={e=>setDig(parseInt(e.target.value) as Digits)} className="input-field w-full text-sm">
                  <option value={6}>6 digits</option><option value={8}>8 digits</option>
                </select>
              </div>
              <div><label className="text-xs text-slate-400 block mb-1.5">Period</label>
                <input type="number" value={per} onChange={e=>{const v=parseInt(e.target.value);if(v>=5&&v<=300)setPer(v);}} min={5} max={300} className="input-field w-full text-sm"/>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={add} className="btn-primary px-6 py-2 text-sm flex items-center gap-2"><Plus className="w-4 h-4"/>Add</button>
              <button onClick={()=>setOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 rounded-lg bg-surface-light border border-slate-700/50">
        <h3 className="text-white font-semibold text-sm mb-3"><Info className="w-4 h-4 text-brand-400 inline mr-2"/>How to use</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li><strong>Add accounts</strong> by entering a Base32 secret key or pasting an otpauth:// URL.</li>
          <li><strong>Test 2FA</strong> during development by configuring your app with the same secret.</li>
          <li><strong>100% client-side</strong> - uses Web Crypto API. No data sent anywhere.</li>
          <li><strong>RFC 6238</strong> compatible with Google Authenticator, Authy, 1Password, Bitwarden.</li>
        </ul>
      </div>
    </ToolLayout>
  );
}