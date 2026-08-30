// Tests del juego sin navegador: se extrae el <script> de index.html y se corre
// en un vm con stubs mínimos de DOM/Audio/Image.  node test.js
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
const el=()=>({getContext:()=>noop,style:{},value:'',set textContent(v){},set innerHTML(v){},
  set src(v){this._s=v},get src(){return this._s},insertAdjacentHTML(){},blur(){},focus(){},width:0,height:0});
const ctx={console,Int16Array,performance:{now:()=>Date.now()},requestAnimationFrame:()=>0,
  setTimeout:()=>0,clearTimeout:()=>0,addEventListener:()=>0,innerWidth:375,
  visualViewport:{width:375,addEventListener:()=>0},
  Image:function(){this.complete=false;this.naturalWidth=0;this.decode=()=>Promise.resolve()},
  Audio:function(s){this.src=s;this.paused=true;this.muted=false;
                    this.play=()=>{this.paused=false;return Promise.resolve()}},
  css:{},
  document:{getElementById:el,documentElement:{style:{setProperty(k,v){ctx.css[k]=v}}}}};
ctx.window=ctx;

const harness=`
if(!BGM.paused) throw new Error('la musica no debe autoarrancar');
const press=k=>onkeydown({key:k,preventDefault(){}});
const wrong=()=>press([...POOL].find(c=>!Object.values(letters).includes(c)));
const cell=()=>p.y*C+p.x;
function path(from,to){const prev={},q=[from],seen=new Set([from]);
 while(q.length){const c=q.shift(); if(c===to)break; const cx=c%C,cy=c/C|0;
  [[0,-1,'n'],[1,0,'e'],[0,1,'s'],[-1,0,'w']].forEach(([dx,dy,w])=>{
   const nx=cx+dx,ny=cy+dy,n=ny*C+nx;
   if(nx>=0&&ny>=0&&nx<C&&ny<R&&!g[c][w]&&!seen.has(n)){seen.add(n);prev[n]=[c,w];q.push(n)}})}
 const out=[];for(let n=to;n!==from;){const [pv,w]=prev[n];out.unshift(w);n=pv}return out}

// 1) timer MM:SS:mmm
if(fmt(83456)!=='01:23:456'||fmt(0)!=='00:00:000') throw new Error('formato del timer');

// 2) reinicio sólo por botón: 'r' es una letra jugable
gen(); foes=[]; press('r');
if(!log.length) throw new Error("'r' deberia jugarse como letra");
if(typeof rst.onclick!=='function') throw new Error('boton reinicio sin handler');

// 3) UI: los chips de letra nunca caen sobre la celda del PJ ni fuera del canvas
for(let i=0;i<C*R;i++){const cx=i%C,cy=i/C|0;
 for(const d of ['n','e','s','w']){ if(g[i][d]) continue;
  const [X,Y]=LP[d](cx,cy), r=12;
  if(X+r>cx*S&&X-r<(cx+1)*S&&Y+r>cy*S&&Y-r<(cy+1)*S) throw new Error('letra sobre el PJ');
  if(X-r<0||Y-r<0||X+r>C*S||Y+r>R*S) throw new Error('letra fuera del canvas');
 }}

// 4) retroceso: 3 avances + 3 errores => de vuelta al inicio
gen(); foes=[]; const start=cell(), seen=[start];
for(let i=0;i<3;i++){ press(letters[Object.keys(letters)[0]]); seen.push(cell()) }
for(let i=0;i<3;i++){ wrong(); if(cell()!==seen[2-i]) throw new Error('retroceso mal') }
if(cell()!==start) throw new Error('no volvio al inicio');

// 5) dificultad escalada y margen por letra constante
gen(); const d0=[foeMs(),chaseP(),qteLen()];
got=5; const d5=[foeMs(),chaseP(),qteLen()];
if(!(d5[0]<d0[0]&&d5[1]>d0[1]&&d5[2]===8)) throw new Error('la dificultad no escala');
got=0; qteStart(); const m0=qte.ms/qte.seq.length; qte=null;
got=5; qteStart(); const m5=qte.ms/qte.seq.length; qte=null;
if(m0!==m5||m0!==MS_LETRA) throw new Error('margen por letra no constante');

// 6) QTE fallido: 3 pasos atras + congelado; exitoso: sin retroceso
gen(); foes=[]; const camino=[cell()];
for(let i=0;i<4;i++){ press(letters[Object.keys(letters)[0]]); camino.push(cell()) }
qteStart(); press([...POOL].find(c=>c!==qte.seq[0]));
if(qte||cell()!==camino[1]) throw new Error('el fallo no retrocedio 3');
if(!frozen) throw new Error('no congelo con el jumpscare');
const nlog=log.length; press('a');
if(log.length!==nlog) throw new Error('acepta teclas congelado');
scareHide(); if(frozen) throw new Error('no descongelo');
const cOK=cell(); qteStart(); qte.seq.slice().forEach(k=>press(k));
if(qte||cell()!==cOK) throw new Error('qte exitoso mal');

// 7) skill issue: pausa, baby mode, reloj congelado y cooldown
gen(); foes=[]; baby=0; nextAsk=12;
for(let i=0;i<12;i++) i%4===0?press(letters[Object.keys(letters)[0]]):wrong();
if(!paused||skill.style.display!=='grid') throw new Error('no aparecio el dialogo');
const nl=log.length; press('a');
if(log.length!==nl) throw new Error('acepta teclas en pausa');
const t0a=t0, sa=shownAt; pauseAt-=500; babyEnd(true);   // simula 500ms en pausa
if(baby!==1||paused) throw new Error('el "si" no aplico baby mode');
if(Math.abs((t0-t0a)-500)>50||Math.abs((shownAt-sa)-500)>50) throw new Error('la pausa no corrio el reloj');
const dB=dur(); qteStart(); const msB=qte.ms/qte.seq.length; qte=null;
baby=0; const dN=dur(); qteStart(); const msN=qte.ms/qte.seq.length; qte=null; baby=1;
if(!(dB>dN&&msB>msN)) throw new Error('baby mode no da mas tiempo');
const ask=nextAsk; wrong(); wrong();
if(paused) throw new Error('spam del dialogo dentro del cooldown');
while(hits+fails<ask) wrong();
if(!paused) throw new Error('no volvio a preguntar tras el cooldown');
babyEnd(false);
if(baby!==1||nextAsk<=ask) throw new Error('el "no" mal');

// 8) assets embebidos + preload
if(!PJ.src.startsWith('data:image/webp')||!FOE.src.startsWith('data:image/webp')) throw new Error('sprites');
if(!GIF.src.startsWith('data:image/gif')||!sgif.src.startsWith('data:image/gif')) throw new Error('gifs');
if(!BGM.loop||!(BGM.volume>0&&BGM.volume<1)) throw new Error('musica mal configurada');
if([SCREAM,BANG,BGM].some(a=>a.preload!=='auto')) throw new Error('falta preload de audio');
BGM.paused=true; press('a'); if(BGM.paused) throw new Error('la musica no arranco con la 1a tecla');
mus.onclick(); if(!BGM.muted) throw new Error('mute'); mus.onclick();

// 9) teclado de telefono: la ruta oninput mueve igual que keydown
gen(); foes=[]; baby=0;
const c0=cell(); kb.value=letters[Object.keys(letters)[0]].toUpperCase();  // soft keyboards mandan mayusculas
kb.oninput();
if(cell()===c0) throw new Error('el teclado de telefono no movio al PJ');
if(kb.value!=='') throw new Error('el input no se limpio');
if(typeof tec.onclick!=='function'||typeof cv.onclick!=='function') throw new Error('sin foco al teclado');
kb.value='ZZZ'; kb.oninput();
if(hits+fails<3) throw new Error('no proceso la cadena completa');

// 9b) layout: fit() nunca excede el viewport visible
fit();
if(parseInt(css['--w'])>visualViewport.width-16) throw new Error('el layout desborda: '+css['--w']);
visualViewport.width=1200; fit();
if(parseInt(css['--w'])!==510) throw new Error('no respeta el maximo de 510px');
visualViewport.width=375; fit();

// 9c) IA: con el campo de flujo el gato SIEMPRE alcanza al PJ por el camino mas corto
const rnd=Math.random;
for(let round=0;round<25;round++){
  Math.random=rnd; gen();                      // laberinto aleatorio...
  const src=far(); foes=[src]; prevFoe=[];
  Math.random=()=>0;                           // ...y persecucion pura
  const d0=flow()[src]; let pasos=0;
  while(foes[0]!==p.y*C+p.x){
    const antes=flow()[foes[0]];
    moveFoes(); qte=null;
    if(flow()[foes[0]]>=antes) throw new Error('el gato no se acerco');
    if(++pasos>C*R) throw new Error('el gato se atoro');
  }
  if(pasos!==d0) throw new Error('no tomo el camino mas corto: '+pasos+' vs '+d0);
}
Math.random=rnd;

// 10) partida completa
gen(); foes=[]; baby=0;
for(const t of [...coins,C*R-1]){ let guard=0;
  while(cell()!==t && guard++<400){
    if(paused){ babyEnd(false); continue }
    if(qte){ qte.seq.slice().forEach(k=>press(k)); continue }
    press(letters[path(cell(),t)[0]]);
  }
  if(guard>=400) throw new Error('el bot se atoro');
}
if(!win) throw new Error('no gano');
if(tEnd+pen<0) throw new Error('tiempo neto negativo');
if(log.length!==hits+fails) throw new Error('log descuadrado');
frame();
console.log('OK 10/10 | teclas',log.length,'precision',Math.round(acc()*100)+'%');
`;

vm.runInNewContext(src+harness,ctx);
