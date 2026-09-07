const S = 34,
	POOL = "abcdefghijklmnopqrstuvwxyz";
let C = 15,
	R = 11; // el tamaño del tablero lo fija setLevel()
const $ = (i) => document.getElementById(i);
const cv = $("cv"),
	x = cv.getContext("2d"),
	logEl = $("log"),
	boom = $("boom"),
	scare = $("scare"),
	rst = $("rst"),
	mus = $("mus"),
	skill = $("skill"),
	sacc = $("sacc"),
	byes = $("byes"),
	bno = $("bno"),
	sgif = $("sgif"),
	kb = $("kb"),
	tec = $("tec"),
	how = $("how"),
	vibe = $("vibe"),
	rpop = $("rpop"),
	nvl = $("nvl"),
	bname = $("bname"),
	bpb = $("bpb"),
	bstat = $("bstat"),
	bmax = $("bmax"),
	bar = $("bar"),
	bt = $("bt"),
	bc = $("bc"),
	bx = $("bx"),
	bfill = $("bfill"),
	brank = $("brank"),
	bcombo = $("bcombo"),
	burger = $("burger"),
	menu = $("menu"),
	mstats = $("mstats"),
	fsb = $("fs"),
	bcbar = $("bcbar"),
	bcfill = $("bcfill"),
	bmeow = $("bmeow"),
	bmfill = $("bmfill"),
	res = $("res"),
	rtag = $("rtag"),
	rttl = $("rttl"),
	repi = $("repi"),
	rtime = $("rtime"),
	rsub = $("rsub"),
	rgrid = $("rgrid"),
	rpb = $("rpb"),
	rnext = $("rnext"),
	ragain = $("ragain"),
	rlvls = $("rlvls"),
	lvl = $("lvl"),
	llist = $("llist"),
	ltag = $("ltag"),
	lname = $("lname"),
	ldesc = $("ldesc"),
	lpts = $("lpts"),
	lmeta = $("lmeta"),
	lpic = $("lpic"),
	lgo = $("lgo"),
	tut = $("tut"),
	tmsg = $("tmsg"),
	tnum = $("tnum"),
	tfill = $("tfill"),
	tskip = $("tskip"),
	brief = $("brief"),
	bok = $("bok"),
	hab = $("hab"),
	hok = $("hok"),
	skb = $("skb"),
	lskb = $("lskb"),
	lbm = $("lbm"),
	lbv = $("lbv"),
	lbp = $("lbp"),
	lbh = $("lbh");
const RAGE = "assets/rage.gif";
// el gif del diálogo (158KB) no se baja al abrir la página: se carga la primera
// vez que el diálogo aparece (ver checkSkill) y ahí queda para las siguientes
function rageOn() {
	if (!sgif.src) sgif.src = RAGE;
	else {
		sgif.src = "";
		sgif.src = RAGE; // el gif arranca desde el frame 1
	}
}

// ---- resolución del tablero -------------------------------------------------
// TODO el dibujo habla en "coordenadas de tablero": S píxeles por celda, BW x BH
// el tablero entero.  El canvas puede guardar K píxeles por cada uno de esos, y
// el cuadro arranca con un setTransform(K, ...) que hace la conversión sola: así
// el laberinto crece en pantalla —en escritorio se lleva el alto que dejó la fila
// de botones— sin quedar borroso, y ni una cuenta del dibujo cambia.  En el
// teléfono K se queda en 1: allá el tablero ya entra justo y los píxeles de más
// se pagan en cuadros.
let BW = C * S,
	BH = R * S,
	K = 1;
// Deja el canvas del tamaño que piden el nivel y K.  Devuelve true si cambió: eso
// borra el contenido y obliga a rehornear las paredes (ver bakeMaze).
function sizeCanvas() {
	BW = C * S;
	BH = R * S;
	if (cv.width === BW * K && cv.height === BH * K) return false;
	cv.width = BW * K;
	cv.height = BH * K;
	return true;
}
sizeCanvas();

// ---- perfil de rendimiento -------------------------------------------------
// En el teléfono lo caro no es la lógica del juego: es shadowBlur en cada dibujo,
// reescribir innerHTML 60 veces por segundo y animar box-shadow con --bop.
// TODO lo que se nota a la vista va detras de MOBILE; en escritorio PERF deja el
// juego pixel por pixel como estaba.  Los numeros de gameplay no se tocan.
const MOBILE = (() => {
	try {
		if (
			typeof matchMedia === "function" &&
			matchMedia("(pointer:coarse)").matches
		)
			return true;
		return (
			typeof navigator !== "undefined" &&
			/Android|iPhone|iPad|iPod|Mobile/i.test(
				navigator.userAgent || "",
			)
		);
	} catch (e) {
		return false;
	}
})();
const PERF = MOBILE
	? //  glow: factor de shadowBlur · scan: las scanlines las pinta el CSS
		//  dust: cuántas partículas · hudMs: cada cuánto se reescribe el reloj
		//  fps: tope de cuadros (pantallas de 120Hz) · pre: preload de los mp3 grandes
		{
			glow: 0.5,
			scan: 0,
			dust: 0.6,
			hudMs: 66,
			fps: 61,
			pre: "none",
			lazy: 1,
		}
	: { glow: 1, scan: 0, dust: 1, hudMs: 0, fps: 0, pre: "auto", lazy: 0 };
const GLOW = PERF.glow;
if (MOBILE) document.documentElement.classList.add("lite");

const now = () => performance.now();
const pad = (n, w) => String(n | 0).padStart(w, "0");
const fmt = (ms) => {
	const t = Math.max(0, ms); // MM:SS:mmm
	return `${pad(t / 60000, 2)}:${pad((t / 1000) % 60, 2)}:${pad(t % 1000, 3)}`;
};
const CLS = {
	ok: "k",
	bad: "b",
	late: "l",
	qte: "q",
	qtebad: "b",
	parry: "m", // el ♪ que devolvió un QTE
	back: "w", // ...y el ⌫ que volvió un paso: ni acierto ni error, apagado
};

// Tipografía del tablero: la misma que la GUI, no el monoespaciado de antes.
// CF es el condensado de sistema y se lleva todo lo que hay que LEER a las
// apuradas (las letras de las salidas, la secuencia del QTE); DF es el display
// del rango de combo y se queda sólo con los titulares, que es lo único que
// tiene que gritar.  Nada de esto se descarga: son fuentes que ya están.
const CF =
	"'Arial Narrow','Roboto Condensed','Avenir Next Condensed','Liberation Sans Narrow'," +
	"'Helvetica Neue',Helvetica,Arial,sans-serif";
const DF =
	"Impact,Haettenschweiler,'Franklin Gothic Heavy','Arial Black','Roboto Condensed',sans-serif";

// ---- LA PALETA DEL CANVAS ---------------------------------------------------
// El azul del laberinto estaba escrito a mano en cada dibujo, así que "que la UI se
// vuelva de terror" era imposible sin tocar veinte literales.  Ahora los colores
// que cambian con la cacería viven acá y el cuadro los lee de PAL; los que NO
// cambian (el verde de la salida, el amarillo de las monedas, el violeta de la
// determinación) se quedan donde estaban, que es lo que los deja gritar cuando el
// resto de la pantalla es de un solo color.
//
// El CSS hace lo mismo por su lado con la clase .hunt en <html> (ver style.css):
// las dos mitades de la GUI cambian de piel con el mismo interruptor.
const PALS = {
	base: {
		wall: "#39f", // las paredes (horneadas, ver bakeLayer)
		glow: "#2af",
		pj: "#0ff", // el halo del gato
		pjFill: "0,220,255",
		foe: "#f36", // el que te caza
		prey: "#9ff", // el que huye
		key: "#9ff", // las letras de las salidas, con tiempo de sobra
		edge: "120,235,255", // el borde del tablero que late
	},
	hunt: {
		wall: "#8d1226",
		glow: "#ff2440",
		pj: "#f2223c",
		pjFill: "255,40,60",
		foe: "#ff4d63",
		prey: "#ffc9d0",
		key: "#ffb3bd",
		edge: "255,70,90",
	},
};
let PAL = PALS.base;

const PJ = new Image(),
	FOE = new Image();
PJ.src = "assets/jugador.webp";
FOE.src = "assets/gato.webp";
const ready = (i) => i.complete && i.naturalWidth > 0;
const BIG = new Image();
BIG.src = "assets/gato-qte.webp"; // enemigo a pantalla completa
// El ACECHADOR del sótano es el ÚNICO enemigo que no se juega en ningún otro
// nivel, así que no puede tener la misma cara ni el mismo grito que el resto:
// sprite propio en el tablero y jumpscare propio (ver scareShow).  La cara y el
// grito los baja gen() al generar el primer sótano y no antes —son ~270KB que en
// los niveles 1 y 2 no se miran nunca—, y hasta que estén ready() da false y se
// dibuja el gato negro de siempre.
const STALK = new Image();
// la demo del cartel usa el MISMO gato del QTE, sin un byte extra: si lo que
// se ve ahí no fuera el de la partida, la demo enseñaría otra cosa
$("bdcat").src = BIG.src;
// ...y por lo mismo las dos demos de habilidades usan el gato blanco y los
// negros del tablero: son las imágenes que ya están cargadas
$("hdcat").src = $("hmcat").src = PJ.src;
$("hmf1").src = $("hmf2").src = FOE.src;
// LA CACERÍA trae dos imágenes propias: la torre de nuggets del buildup y el gato
// ya transformado.  Se bajan igual que la cara del acechador —recién al generar un
// nivel con `hunt`— y TODO su uso pasa por ready(): mientras los archivos no estén,
// la torre se dibuja procedural y el gato rojo son los ojos encendidos sobre el
// sprite de siempre.  La cacería se juega entera con o sin ellas.
const NUGG = new Image(),
	REDPJ = new Image();
const BOOM = "assets/boom.gif";
const SCREAM = new Audio("assets/scream.mp3"),
	BANG = new Audio("assets/bang.mp3");
// el grito del acechador: ~120KB que sólo hacen falta en el sótano, así que la
// URL se la pone gen() al generar un nivel que tenga acechador
const LOBO = new Audio();
LOBO.preload = "none";
// ...y el tema de la cacería, que es el más pesado de todo el repo (2,3 MB): mismo
// trato, y encima sólo se usa en la segunda mitad de UN nivel.  Los niveles 1 y 2
// no bajan un byte de esto.
const HUNT_SRC = "assets/hunt.mp3";
const HUNT = new Audio();
HUNT.preload = "none";
HUNT.v0 = HUNT.volume = 0.42;
// EL LATIDO.  Un mp3 propio (256KB), y mismo trato que los otros dos pesados: se
// baja al entrar a la cacería y en ningún otro momento.  Es el ÚNICO audio de la
// segunda mitad del sótano que no es música: sube al acercarte a una presa, ocupa
// el lugar del ruido blanco durante el QTE, y cuando ya no queda más que el
// acechador se queda solo en la pista (ver heartSet y huntHeart).
const HEART_SRC = "assets/heartbeat.mp3";
const HEART = new Audio();
HEART.preload = "none";
HEART.loop = true;
HEART.v0 = 0.95; // el tope: con el acechador encima esto TIENE que tapar todo
HEART.volume = 0;
// EL MORDISCO.  El sonido de la boca cuando le arrancás un pedazo a una presa: un
// mp3 propio, corto y sucio, y es lo único de la cacería que no está sintetizado.
// Va en POOL y no en un solo <audio> porque los mordiscos salen EN RÁFAGA —uno por
// letra del anillo, y las últimas caen casi juntas— y un elemento suelto se corta a
// sí mismo: el segundo mordisco mataría al primero y se oiría media dentellada.
// Tres clones rotando alcanzan para que se pisen sin cortarse, que es exactamente
// como suena comer.  La URL se la pone gen() al generar un nivel con cacería, igual
// que la cara del acechador: los niveles 1 y 2 no bajan un byte de esto.
const NOM_SRC = "assets/nom.mp3";
const NOM = [new Audio(), new Audio(), new Audio()];
NOM.forEach((a) => (a.preload = "none"));
let nomI = 0;
const play = (a) => {
	try {
		a.currentTime = 0;
		return a.play();
	} catch (e) {
		return Promise.reject(e);
	}
};
const GIF = new Image();
GIF.src = BOOM; // gif de explosión ya decodificado
const BGM_SRC = "assets/vibes.mp3"; // el tema principal ahora ES el de extra vibes
const BGM = new Audio();
BGM.loop = true;
BGM.v0 = BGM.volume = 0.32; // v0: el volumen "normal" al que vuelve el ducking
SCREAM.preload = BANG.preload = "auto"; // cortos: vale la pena tenerlos listos
BGM.preload = PERF.pre; // ~730KB de mp3: en móvil se baja al tocar
const VIBE_SRC = "assets/vibes.mp3";
const VIBE = new Audio();
VIBE.loop = true;
VIBE.v0 = VIBE.volume = 0.34;
VIBE.preload = "none"; // las vibes se bajan al pedirlas, también en escritorio
// Las dos pistas se crean VACÍAS: pasarle la URL al constructor arranca la descarga
// ahí mismo, y ahí el preload="none" del teléfono llega tarde.  srcOn() se la pone a
// la que va a sonar —el BGM con la 1ª tecla, las vibes recién al pedirlas—; en
// escritorio el BGM se carga de entrada, las vibes no (otros ~730KB ahorrados).
const srcOn = (a) => {
	if (!a.src)
		a.src =
			a === HUNT
				? HUNT_SRC
				: a === HEART
					? HEART_SRC
					: a === VIBE
						? VIBE_SRC
						: BGM_SRC;
};
// La dentellada, con su tono y su volumen: los pone QUIEN muerde, así que dos
// mordiscos nunca salen iguales —el bicho se va quedando sin cuerpo y la boca se
// va acercando al hueso: más grave y más fuerte cada vez—.  Rota el pool y devuelve
// el elemento que sonó (los tests leen de ahí; el juego lo ignora).
function nom(rate, vol) {
	if (BGM.muted) return null;
	const a = NOM[nomI++ % NOM.length];
	srcNom(a);
	try {
		a.playbackRate = rate;
		a.volume = Math.max(0, Math.min(1, vol));
	} catch (e) {}
	play(a).catch(() => {});
	return a;
}
const srcNom = (a) => {
	if (!a.src) a.src = NOM_SRC;
};
if (!PERF.lazy) srcOn(BGM);
mus.onclick = () => {
	BGM.muted = !BGM.muted;
	VIBE.muted = BGM.muted;
	HUNT.muted = BGM.muted;
	HEART.muted = BGM.muted;
	NOM.forEach((a) => (a.muted = BGM.muted)); // ...y el que estuviera masticando
	mus.textContent = (BGM.muted ? "♫̸" : "♫") + " MUSICA";
	mus.blur();
};
// ---- la música durante el QTE y el jumpscare --------------------------------
// Un QTE es el momento en que el laberinto deja de existir, así que la música se
// HUNDE mientras dura: arranca en su volumen y baja sin parar hasta quedar casi
// muda justo cuando el gato ya te tiene encima.  Ganarlo la devuelve enseguida;
// terminar en jumpscare la deja abajo y la trae de vuelta de a poco, con el
// silencio del susto todavía puesto.
//
// ponytail: esto es un ducking, no un filtro.  Un lowpass de verdad ("muffled" en
// serio) pide meter las dos pistas en un MediaElementSource de WebAudio, y un
// AudioContext suspendido —que en el teléfono es lo normal hasta el primer
// gesto— deja la música MUDA en vez de apagada.  Si algún día vale la pena, el
// enganche es acá: BGM/VIBE -> BiquadFilter(lowpass) -> destination, y `muf`
// pasa a manejar la frecuencia de corte en vez del volumen.
const MUF_MAX = 0.88, // cuánto se hunde, como fracción del volumen normal
	MUF_IN = 2600, // fade-in largo: el de después del jumpscare
	MUF_OUT = 650; // y el corto, el de un QTE ganado
let muf = 0, // 0 = volumen normal · 1 = hundida del todo
	mufAt = 0, // último cuadro contado
	mufV = -1, // volumen ya escrito en la pista (para no tocarla por gusto)
	mufSlow = 0; // el fade-in que viene es el largo (hubo jumpscare)

// ---- SFX sintetizados con WebAudio: cortos y bajitos, sin embeber otro mp3 ----
let AC = null;
function sfx(f, ms, type = "square", vol = 0.06, to = 0) {
	if (BGM.muted) return;
	try {
		AC = AC || new (window.AudioContext || window.webkitAudioContext)();
		if (AC.state === "suspended") AC.resume();
		const o = AC.createOscillator(),
			g = AC.createGain(),
			t = AC.currentTime,
			s = ms / 1000;
		o.type = type;
		o.frequency.setValueAtTime(f, t);
		if (to)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(30, to),
				t + s,
			);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + s);
		o.connect(g).connect(AC.destination);
		o.start(t);
		o.stop(t + s + 0.03);
	} catch (e) {} // sin WebAudio el juego sigue igual
}
// el acierto sube de tono con el combo: es lo que hace que la racha se sienta
const sfxOk = () =>
	sfx(440 * Math.pow(2, Math.min(combo, 12) / 12), 55, "square", 0.045);
const sfxBad = () => sfx(200, 150, "sawtooth", 0.07, 90);
const sfxLate = () => sfx(300, 110, "triangle", 0.05, 150);
const sfxCoin = () => {
	sfx(988, 70, "triangle", 0.06);
	setTimeout(() => sfx(1319, 110, "triangle", 0.06), 70);
};
const sfxUnlock = () =>
	[523, 659, 784, 1047].forEach((f, i) =>
		setTimeout(() => sfx(f, 140, "triangle", 0.07), i * 90),
	);

// ---- EL TERROR DEL QTE: latido y ruido blanco ENTRANDO con la música yéndose ----
// El ducking de arriba deja el QTE casi en silencio, y el silencio no asusta: lo
// que asusta es lo que ocupa ese lugar.  Estos dos suben con la MISMA curva con
// la que `muf` hunde la música —frame() les pasa el propio `muf`—, así que no es
// un fade y después el otro: es un REEMPLAZO.  El latido además se acelera según
// se hunde la música, que es lo que hace que el reloj del QTE se sienta sin
// mirarlo, y sigue acelerando ronda tras ronda en la tanda del acechador (`muf`
// no se reinicia entre rondas: la tanda entera es un solo hundimiento).
//
// Van SINTETIZADOS con WebAudio: cero bytes de descarga y suenan aunque no haya
// mp3.  Si algún día hay archivos propios, poné las URLs en DREAD_SRC —un loop
// de latidos, un loop de ruido— y se usan ésos con este mismo fade-in, sin tocar
// nada más: dreadOn/dreadSet/dreadOff ya manejan las dos formas.  El mp3 del
// latido trae su propio ritmo, así que ahí el sintetizado no suena.
const DREAD_SRC = { heart: "", noise: "" }; // p.ej. assets/latido.mp3
const DREAD_NOISE = 0.33, // volumen tope del ruido blanco (triplicado)
	DREAD_HEART = 0.14, // ...y del latido
	DREAD_LP = 900, // el ruido va filtrado: siseo de sótano, no de tele vieja
	HEART_SLOW = 900, // ms entre latidos al empezar el QTE
	HEART_FAST = 330; // ...y con la música ya hundida del todo
let NOISE = null, // el buffer de ruido, horneado una sola vez
	dreadN = null, // el ruido sonando: {s,g} de WebAudio o el <audio> del mp3
	dreadH = null, // el <audio> del latido, si hay mp3
	dreadAt = 0, // 0 = el terror no está sonando
	heartAt = 0; // cuándo toca el próximo latido
function dreadOn() {
	if (dreadAt || BGM.muted) return;
	dreadAt = now();
	heartAt = 0;
	try {
		if (DREAD_SRC.noise) {
			dreadN = dreadN || new Audio(DREAD_SRC.noise);
			dreadN.loop = true;
			dreadN.volume = 0;
			dreadN.play().catch(() => {});
		} else {
			AC = AC || new (window.AudioContext || window.webkitAudioContext)();
			if (AC.state === "suspended") AC.resume();
			if (!NOISE) {
				// 2 s de ruido en loop: se hornea una vez y se reusa toda la partida
				NOISE = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
				const d = NOISE.getChannelData(0);
				for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
			}
			const so = AC.createBufferSource(),
				g = AC.createGain(),
				f = AC.createBiquadFilter();
			so.buffer = NOISE;
			so.loop = true;
			f.type = "lowpass";
			f.frequency.value = DREAD_LP;
			g.gain.value = 0; // entra desde cero: el fade-in lo hace dreadSet
			so.connect(f).connect(g).connect(AC.destination);
			so.start();
			dreadN = { s: so, g };
		}
		if (DREAD_SRC.heart) {
			dreadH = dreadH || new Audio(DREAD_SRC.heart);
			dreadH.loop = true;
			dreadH.volume = 0;
			dreadH.play().catch(() => {});
		}
	} catch (e) {} // sin WebAudio el QTE se juega igual, mudo
}
// k = 0..1, el MISMO `muf` que está hundiendo la música
function dreadSet(k) {
	if (!dreadAt) return;
	if (BGM.muted) return dreadOff(); // el ♫ del menú apaga esto también
	try {
		if (dreadN) {
			if (dreadN.g) dreadN.g.gain.value = DREAD_NOISE * k;
			else dreadN.volume = Math.min(1, k);
		}
		if (dreadH) {
			dreadH.volume = Math.min(1, k);
			return; // el mp3 late solo: no hay que marcarle el pulso
		}
		const T = now();
		if (!heartAt) heartAt = T;
		if (T >= heartAt) {
			heartAt = T + (HEART_SLOW + (HEART_FAST - HEART_SLOW) * k);
			const v = DREAD_HEART * (0.25 + 0.75 * k);
			sfx(58, 120, "sine", v, 34); // lub...
			setTimeout(() => sfx(46, 170, "sine", v * 0.7, 26), 155); // ...dub
		}
	} catch (e) {}
}
function dreadOff() {
	if (!dreadAt) return;
	dreadAt = 0;
	heartAt = 0;
	try {
		if (dreadN) {
			if (dreadN.g) {
				dreadN.g.gain.value = 0;
				dreadN.s.stop();
				dreadN = null; // un BufferSource no se vuelve a arrancar
			} else {
				dreadN.pause();
				dreadN.volume = 0;
			}
		}
		if (dreadH) {
			dreadH.pause();
			dreadH.volume = 0;
		}
	} catch (e) {}
}

// ---- EL LATIDO DE LA CACERÍA: el mp3, con su propio volumen y su propia prisa ----
// El terror sintetizado de arriba es el de la PRIMERA mitad del sótano —y el de los
// niveles 1 y 2—: ahí el jugador es la presa y lo que lo rodea es siseo.  En la
// cacería los papeles están dados vuelta y el sonido también: no hay ruido blanco,
// hay un corazón, y es el de la cosa que está buscando.  Un solo mando, `k` de 0 a 1
// (lo arma huntHeart), y con él van las DOS cosas que pidió el balance: suena MÁS
// FUERTE y late MÁS RÁPIDO cuanto más cerca esté la presa.
//
// La prisa sale de playbackRate y no de un pulso propio: el mp3 ya trae su ritmo, y
// marcarle otro encima daría dos corazones desfasados.  `heartPh` es sólo el reflejo
// visual de ese mismo ritmo (ver el ping del acechador), y avanza con el mismo factor.
const HEART_RATE = 0.85, // cuánto acelera el latido con la presa encima
	HEART_BPS = 1.15; // latidos por segundo del mp3, para que el ping vaya al compás
let heartV = -1, // el volumen ya escrito en el elemento (no se toca por gusto)
	heartK = 0, // el último `k`: lo lee el ping del acechador para ir al compás
	heartPh = 0, // la fase del latido, 0..1: la usa el dibujo, no el audio
	// el freno del epílogo: durante la cacería vale 1 y no se toca.  Es el único
	// lugar del juego donde el corazón va MÁS LENTO que su propio mp3, y por eso no
	// sale de `k`: acá el volumen baja y la prisa baja, pero no a la misma velocidad
	heartSl = 1;
function heartSet(k) {
	if (BGM.muted || !hunt) return heartOff();
	heartK = k = Math.max(0, Math.min(1, k));
	try {
		srcOn(HEART); // los 256KB recién acá, y sólo acá
		HEART.muted = BGM.muted;
		if (HEART.paused) HEART.play().catch(() => {});
		const v = +(HEART.v0 * k).toFixed(3);
		if (v !== heartV) HEART.volume = heartV = v;
		HEART.playbackRate = heartRate();
	} catch (e) {} // sin audio la cacería se juega igual, muda
}
// la prisa del corazón, y la MISMA para el mp3 y para el ping que se dibuja
const heartRate = () => (1 + HEART_RATE * heartK) * heartSl;
function heartOff() {
	heartSl = 1;
	if (heartV < 0) return; // ya estaba apagado: no se toca el elemento por gusto
	heartV = -1;
	heartK = 0;
	try {
		HEART.pause();
		HEART.volume = 0;
		HEART.playbackRate = 1;
	} catch (e) {}
}

// ---- extra vibes: sólo estética, el bop sale del reloj del propio mp3 ----
const BPM = 120,
	BEAT = 60 / BPM;
// el bombo del mp3 cae en 0.174s + n*0.5 (medido con un lowpass de 120Hz sobre el propio
// archivo), asi que el beat se adelanta 0.326s. ponytail: si el bop va corrido, mové esto.
let VIBE_OFF = 0.326;
const bopAt = (t) =>
	Math.pow(1 - (((((t + VIBE_OFF) / BEAT) % 1) + 1) % 1), 1.8);
let vibes = false,
	bop = 0;
// LA CACERÍA vive acá arriba y no en el bloque de estado de la partida porque
// track() —que está tres renglones abajo— la lee: si se declarara después, la
// primera llamada caería en la zona muerta del `let`.  El objeto entero lo arma
// huntStart() y lo desarma huntReset(); null = partida normal.
let hunt = null;
// con la cacería encendida la pista ES la cacería: el ducking del QTE, el mute del
// menú y el "arranca con la primera tecla" siguen funcionando sin saber cuál suena
const track = () => (hunt ? HUNT : vibes ? VIBE : BGM);
vibe.onclick = () => {
	vibes = !vibes;
	vibe.className = vibes ? "on" : "";
	// de acá cuelgan TODAS las reglas del latido: sin la clase el CSS ni las mira
	document.documentElement.classList[vibes ? "add" : "remove"]("vibes");
	if (vibes) {
		srcOn(VIBE);
		bakeBop();
	} // recién acá se pagan el mp3 y la capa del latido
	const on = track(),
		off = vibes ? BGM : VIBE,
		sonaba = !off.paused;
	mufV = -1; // la pista nueva no hereda el volumen cacheado de la otra
	off.pause();
	if (sonaba) on.play().catch(() => {});
	vibe.blur();
};

// ---- niveles y modos -------------------------------------------------------
// Todo lo que cambia entre partidas vive acá: el resto del juego lee LV y nunca
// pregunta "en qué nivel estoy".  Un nivel nuevo = un objeto más en esta lista.
//   C,R          tamaño del tablero
//   coins        monedas que abren la salida · mid: moneda que trae un gato más
//   foes         gatos negros al empezar
//   dur0/durMin  ventana por letra con combo 0 / con el combo al tope
//   foe0/foeMin  ms entre pasos de los gatos con 0 monedas / con todas
//   fog          radio de visión en celdas · lamps: faroles que la abren un rato
//   stalk        acechadores: persiguen SIEMPRE, pero van a medio paso
//   tut          el nivel se juega guiado paso a paso
const LEVELS = [
	{
		id: "tutorial",
		pic: "assets/nivel1.png",
		name: "PRIMEROS PASOS",
		tag: "NIVEL 1 · TUTORIAL",
		col: "#6f9",
		C: 9,
		R: 7,
		coins: 3,
		foes: 0,
		mid: 99,
		dur0: 2400,
		durMin: 1400,
		foe0: 900,
		foeMin: 700,
		tut: 1,
		desc: "El laberinto en chiquito y explicado paso a paso: mover, el reloj, el combo, el gato negro y la salida.",
		pts: [
			"El juego te va diciendo qué hacer",
			"El reloj recién aparece cuando toca explicarlo",
			"Se puede saltar en cualquier momento",
		],
	},
	{
		id: "clasico",
		pic: "assets/nivel2.png",
		name: "EL LABERINTO",
		tag: "NIVEL 2 · CLÁSICO",
		col: "#4cf",
		C: 15,
		R: 11,
		coins: 5,
		foes: 2,
		mid: 3,
		dur0: 1700,
		durMin: 650,
		foe0: 750,
		foeMin: 300,
		desc: "La partida de siempre: 15x11, cinco monedas y dos gatos negros que calculan el camino más corto hasta vos.",
		pts: [
			"Un tercer gato entra a la mitad",
			"Cada moneda acelera la cacería",
			"La salida abre con las 5 monedas",
		],
	},
	{
		id: "sotano",
		pic: "assets/nivel3.png",
		name: "EL SÓTANO",
		tag: "NIVEL 3 · MODO HISTORIA",
		col: "#f4a",
		C: 17,
		R: 13,
		coins: 7,
		foes: 3,
		mid: 4,
		dur0: 1700,
		durMin: 650,
		foe0: 700,
		foeMin: 280,
		fog: 4.2,
		lamps: 3,
		stalk: 1,
		hunt: 1, // llegar a la puerta con todo no termina el nivel: lo da vuelta
		desc: "Un sótano el doble de grande y a oscuras: sólo ves lo que tenés al lado y algo ahí adentro no deja de seguirte nunca. Y juntar las siete monedas no es escapar: es la mitad de la historia.",
		pts: [
			"<b>NIEBLA</b>: el mapa te lo acordás vos",
			"<b>FAROLES</b>: pisá uno y el sótano se enciende 5 segundos",
			"<b>ACECHADOR</b>: nunca despista, no lo para ni el maullido, y te agarra con una tanda de QTEs cortos",
			"<b>MAULLIDO</b>: acá además es radar de monedas y gatos",
			"El único nivel con <b>final</b>: la puerta no es la salida",
		],
	},
];
// Los modos todavía no se juegan: el selector ya los lista para que el día que
// existan sólo haya que sacarles el soon.
const MODES = [
	{
		id: "contra",
		name: "CONTRARRELOJ",
		tag: "MODO · PRÓXIMAMENTE",
		col: "#fd0",
		soon: 1,
		desc: "Un solo reloj para todo el laberinto: cada moneda te devuelve segundos y cada error te los cobra.",
		pts: [
			"El combo pasa a ser tiempo, no sólo estilo",
			"Sin retroceso: el castigo es el reloj",
		],
	},
	{
		id: "infinito",
		name: "SUPERVIVENCIA",
		tag: "MODO · PRÓXIMAMENTE",
		col: "#f66",
		soon: 1,
		desc: "Laberintos encadenados sin fin: al escapar de uno te espera el siguiente, más grande y con un gato más.",
		pts: [
			"El combo y el rango no se reinician entre laberintos",
			"Ranking por cuántos pisos aguantás",
		],
	},
];
const ALL = [...LEVELS, ...MODES];
let LV = LEVELS[1],
	bests = {};
// setLevel deja listo el tablero del nivel: tamaño del canvas y la proporción con
// la que el CSS del teléfono saca el ancho que entra en la pantalla.
function setLevel(id) {
	LV = ALL.find((l) => l.id === id && !l.soon) || LEVELS[1];
	C = LV.C;
	R = LV.R;
	root.style.setProperty("--ar", (C / R).toFixed(4));
	fit(); // fija --w, la resolución del canvas y, si cambió, rehornea
}

let tutOn = false,
	tstep = 0,
	tflag = 0,
	tAt = 0, // estado del tutorial guiado
	tpush = 0, // empujones dados en el paso actual (ver TUT_PUSH)
	tthru = 0, // muros atravesados con DETERMINACIÓN en el paso actual
	tmeow = 0, // maullidos soltados en el paso actual
	briefSeen = 0; // el primer encuentro ya se explicó
let g,
	p,
	vis,
	coins,
	lamps,
	revealT,
	got,
	win,
	t0,
	tEnd,
	parts,
	letters,
	phase,
	shownAt,
	durBase,
	combo,
	maxCombo,
	hits,
	fails,
	pen,
	shake,
	flash,
	cpop,
	unlockT,
	foes,
	prevFoe,
	foeTick,
	foeBeat,
	qte,
	log,
	trail,
	frozen,
	scareT,
	note,
	graceT = 0,
	qteWins = 0,
	det = 0,
	scareUntil = 0,
	meowAt = -1e9,
	meowOn = false,
	radar = null,
	stl = 0,
	maxStl = 0, // el medidor de ESTILO y su tope de la partida
	stlSum = 0,
	stlT = 0, // integral del estilo y tiempo jugado: de ahí sale el promedio
	stlAt = 0, // último cuadro contado (para el dt del promedio y del escurrido)
	kills = 0, // gatos vencidos SEGUIDOS: la cadena que paga cada vez más
	maxKills = 0, // ...y la cadena más larga de la partida, para el resumen
	baby = 0,
	noes = 0, // cuántas veces se dijo "así está bien" (ver checkSkill)
	dodges = 0, // gatos esquivados al cruce
	parries = 0, // ...y gatos devueltos con el maullido en el primer instante
	gore = [], // las partículas del mordisco (van aparte: ver spray)
	pfrom = null, // la celda que el jugador acaba de dejar, y cuándo
	paused = false,
	pauseAt = 0,
	nextAsk = 12;

// ---- balance: detector de skill issue ----
const COMBO_MAX = 15; // a 15 el reloj de reacción ya toca su mínimo
const comboFill = () => Math.min(1, combo / COMBO_MAX);
// ---- los dos medidores ------------------------------------------------------
// COMBO es la racha: sube de a uno, manda la ventana de reacción y el tono del
// blip, y CUALQUIER error lo borra entero.  ESTILO es el otro, el que da el
// rango: un error apenas lo abolla (STYLE_ERR) y lo que de verdad lo hunde es
// perder contra un gato (STYLE_LOSS).  Antes eran la misma variable, así que una
// tecla mal tirada te bajaba de SSS a D: la racha se pierde de una, el estilo se
// gasta de a poco.
//
// Pero el estilo TAMPOCO se regala.  Tres reglas lo vuelven un juicio y no un
// contador, y las tres se leen en la barra mientras se juega:
//
//   1. TECHO DE LAS LETRAS.  Teclear bien sube el medidor, pero sólo hasta un
//      techo que sale del COMBO (styleCap): sin racha el techo es cero y con la
//      racha llena llega justo a S.  Caminar el laberinto, por limpio que sea,
//      no pasa de ahí: es el piso del estilo, no el techo.
//   2. LOS GATOS SON EL RESTO.  SS y SSS salen de VENCER gatos, y encadenarlos
//      sin perder ninguno paga cada vez más (STYLE_CHAIN).  Perder un QTE corta
//      la cadena y hunde el medidor.
//   3. LO QUE PASA DEL TECHO SE ESCURRE.  Cada segundo por encima de styleCap()
//      se van STYLE_DECAY puntos, así que un rango alto no se guarda: o se
//      sostiene la racha y se sigue cazando, o se cae solo.
const STYLE_ERR = 3, // letra equivocada o tarde: un mordisco
	STYLE_LOSS = 10, // perder el QTE: eso sí duele
	STYLE_HIT = 0.5, // lo que suma una letra DENTRO del techo del combo
	STYLE_QTE = 4, // vencer un gato vale ocho letras...
	STYLE_CHAIN = 2, // ...y cada gato encadenado suma esto de más
	STYLE_CHAIN_MAX = 4, // hasta el 5º seguido (+8): más sería infinito
	STYLE_DECAY = 0.45; // puntos por segundo que se va lo que pasa del techo
// el tope deja al SSS a cinco puntos de distancia: sin él, media partida buena
// dejaba el medidor tan arriba que ningún castigo se notaba
const STYLE_MAX = 26;
// El techo que las letras solas pueden llenar.  Sale del combo y topa en S: de
// ahí para arriba el estilo lo dan los gatos.  Con el combo roto el techo es 0 y
// TODO el medidor queda escurriéndose: eso es lo que hace que la racha tenga que
// ser constante y no un pico.
const styleCap = () => RANKS[4].c * Math.sqrt(comboFill());
// lo que paga vencer un gato, con la cadena de gatos seguidos encima
const qteStyle = () =>
	STYLE_QTE + Math.min(STYLE_CHAIN_MAX, kills - 1) * STYLE_CHAIN;
const styleUp = (n) => {
	stl = Math.min(STYLE_MAX, stl + n);
	maxStl = Math.max(maxStl, stl);
};
// las letras no pasan del techo: si el medidor ya está arriba, teclear no suma
const styleHit = () => styleUp(Math.max(0, Math.min(STYLE_HIT, styleCap() - stl)));
const styleDown = (n) => {
	stl = Math.max(0, stl - n);
};
// EL PROMEDIO.  El rango que te llevás no es el que tocaste un segundo ni el que
// quedó al final: es la integral del medidor dividida por el tiempo jugado, o
// sea el estilo PROMEDIO de la partida entera.  Un pico de SSS en el último
// pasillo ya no tapa cuatro minutos en D, y sostener S de punta a punta vale más
// que rozar SSS una vez.  Se acumula en frame() con el reloj del juego, así que
// las pausas (menú, selector, carteles) no cuentan.
const avgStl = () => (stlT ? stlSum / stlT : stl);
// subir el combo es también lo que ARMA el maullido: se carga una vez y queda
function comboUp() {
	combo++;
	maxCombo = Math.max(maxCombo, combo);
	if (combo >= MEOW_ARM && !meowOn) {
		meowOn = true;
		sfxUnlock();
		say(
			"AHUYENTADOR LISTO",
			"ESPACIO O ENTER SUELTA EL MAULLIDO",
			"#9ff",
		);
	}
}
// Rangos al estilo Devil May Cry: la racha deja de ser un número y pasa a ser un
// grado con nombre.  El tope de la dificultad sigue en COMBO_MAX; SS y SSS son
// puro flex, para que siempre quede algo arriba que perseguir.
const RANKS = [
	{ c: 0, k: "D", n: "DORMIDO", col: "#8ad" },
	{ c: 3, k: "C", n: "CURIOSO", col: "#4cf" },
	{ c: 6, k: "B", n: "BRAVO", col: "#6f9" },
	{ c: 9, k: "A", n: "ARRASANDO", col: "#fd0" },
	{ c: 12, k: "S", n: "SALVAJE", col: "#f80" },
	{ c: 16, k: "SS", n: "SUPREMO", col: "#f4a" },
	{ c: 21, k: "SSS", n: "SIN PIEDAD", col: "#fff" },
];
// el rango sale del ESTILO (v: para leer el rango de otro valor, como el máximo
// de la partida en la pantalla de resultados)
const rankI = (v) => {
	const q = v === undefined ? stl : v;
	let i = 0;
	while (i + 1 < RANKS.length && q >= RANKS[i + 1].c) i++;
	return i;
};
// el medidor muestra lo que falta para el rango SIGUIENTE: se vacía y vuelve a
// llenarse en cada ascenso, que es lo que hace que la racha se sienta
const rankFill = () => {
	const i = rankI(),
		a = RANKS[i].c,
		b = RANKS[i + 1] && RANKS[i + 1].c;
	return b === undefined ? 1 : Math.min(1, (stl - a) / (b - a));
};
const comboCol = () => RANKS[rankI()].col;
// ---- las dos habilidades ----------------------------------------------------
// DETERMINACIÓN: cada 3 gatos vencidos en un QTE, una carga.  Con carga, los muros
// de tu celda también muestran letra (en violeta) y teclearla te cruza el muro.
// AHUYENTADOR: ESPACIO o ENTER sueltan un maullido que pone a los gatos cercanos
// a correr para el otro lado (y en el sótano deja un radar).  Se ARMA la primera
// vez que el combo llega a MEOW_ARM y queda armado toda la partida: el costo no
// es el combo sino el cooldown desde el último maullido.
//
// Pedía el combo AL TOPE (x15) para armarlo y 45 s de espera entre uno y otro, y
// las dos cosas lo dejaban afuera de la partida justo cuando hacía falta: llegar
// a x15 sin errarle a nada es no necesitar ya el ahuyentador, y 45 s son media
// partida.  Ahora se arma a la mitad del combo y cada gato vencido le come un tajo
// al cooldown: es una herramienta, no un premio.
//
// La espera arrancó en 25 s y son 32: a 25 s el maullido volvía tan seguido que la
// decisión de cuándo soltarlo no existía —se tiraba apenas estaba— y los gatos
// negros dejaban de dar miedo en la segunda mitad de la partida, que es justo
// donde más rápido se mueven.  Con 32 s hay que elegir el momento, y el descuento
// por gato vencido pasa a valer de verdad.
// ---- EL TEMBLOR DEL QTE -----------------------------------------------------
// Un QTE es el momento en que el laberinto deja de existir y la música se hunde,
// pero la GUI se quedaba quieta: el único que temblaba era el canvas, y con un solo
// golpe al empezar (shake = 10) que se apagaba en medio segundo.  Ahora la pantalla
// ENTERA —barra, tablero y log— se sacude durante todo el QTE y la sacudida CRECE
// según se vacía el reloj: arranca casi imperceptible y termina violenta.
//
// Y el techo depende de CUÁNTO DURA el QTE, que es el pedido puntual: una ronda del
// acechador son 2 letras x 700 ms = 1400 ms y una secuencia larga son 8 x 700 =
// 5600 ms.  Si las dos sacudieran igual, el reloj corto llegaría a su máximo casi
// de entrada y la pantalla estaría gritando lo mismo en los dos casos.  Con el techo
// atado a la duración, un temporizador corto nunca llega a temblar como uno largo:
// la violencia de la pantalla ES cuánto tiempo llevás adentro, no en qué QTE estás.
const QS_MIN = 3, // techo del QTE más corto que existe (una ronda del acechador)
	QS_MAX = 14, // ...y el del más largo (8 letras, o el de la cacería con lastre)
	QS_T0 = 1400, // las dos duraciones de referencia, en ms
	QS_T1 = 6000;
const qsCap = (ms) =>
	QS_MIN + (QS_MAX - QS_MIN) * Math.max(0, Math.min(1, (ms - QS_T0) / (QS_T1 - QS_T0)));
// `gone` al cuadrado: la primera mitad del reloj casi no se siente y la última se
// va de las manos.  Lineal daba una rampa pareja que se lee como un motor, no como
// un ataque de pánico.
const qShake = (T) => {
	if (!qte) return 0;
	const gone = Math.max(0, Math.min(1, 1 - (qte.until - T) / qte.ms));
	return qsCap(qte.ms) * gone * gone;
};

const GRACE_MS = 2000, // respiro sin reloj al ganar un QTE
	TUT_GRACE_MS = 5000, // en el tutorial el respiro es más largo (ver qteEnd)
	DET_EVERY = 3,
	DET_MAX = 3,
	MEOW_MS = 2500,
	MEOW_ARM = 8, // combo que lo ARMA (de COMBO_MAX = 15)
	MEOW_CD = 32000,
	MEOW_KILL = 6000, // lo que cada gato vencido le descuenta al cooldown
	MEOW_R = 7, // MEOW_R: "cercano" en celdas de laberinto
	// EL PARRY: la ventana desde que se abre el QTE (la agranda el baby mode, como
	// todo reloj de reacción del juego) y lo que paga sacárselo de encima así
	PARRY_MS = 420,
	STYLE_PARRY = 10;
// el eco del maullido en el sótano: cuánto dura y cuánto miente (en celdas)
const RADAR_MS = 4500,
	RADAR_J = 0.45;
const ping = (i, k) => ({
	x: (i % C) + 0.5 + (Math.random() * 2 - 1) * RADAR_J,
	y: ((i / C) | 0) + 0.5 + (Math.random() * 2 - 1) * RADAR_J,
	k,
});
const DV = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const meowCd = (T) => Math.max(0, MEOW_CD - (T - meowAt));
// pedía el combo AL TOPE en el momento de maullar, y eso lo volvía inservible:
// justo cuando un gato te alcanza es cuando el combo se está por romper.  Ahora
// se ARMA la primera vez que llega a MEOW_ARM y de ahí sólo lo frena el cooldown.
const meowReady = (T) => meowOn && meowCd(T === undefined ? now() : T) <= 0;
// cómo se leen las dos habilidades: entero en escritorio y en el menú, en iconos
// en la barra del teléfono, donde no hay renglón para una frase
const habTxt = (T) =>
	(det ? `  ·  DETERMINACIÓN ${"\u25C8".repeat(det)}` : "") +
	(!meowOn
		? combo >= MEOW_ARM - 4
			? `  ·  MAULLIDO A x${MEOW_ARM}`
			: "" // callado si falta mucho
		: meowCd(T)
			? `  ·  MAULLIDO EN ${Math.ceil(meowCd(T) / 1000)}s`
			: // con un gato encima el mismo botón hace otra cosa, y el renglón lo
				// grita: es la única pista escrita de que el QTE se puede devolver
				qte && !qte.ring && !qte.st
				? "  ·  ¡PARRY! [ESPACIO]"
				: "  ·  MAULLIDO LISTO [ESPACIO]");
// en el teléfono el ♪ tiene su propio botón en la barra (#bmeow), así que acá
// queda sólo la determinación, que no tiene otro lugar donde leerse
const habIco = () => (det ? "  " + "\u25C8".repeat(det) : "");

// única condición para escapar: las monedas... salvo en la cacería, donde NO HAY
// salida.  Es lo que hace que la puerta sea un punto de no retorno y no una puerta
// giratoria: sin esto, volver a pisar la casilla verde con la cacería a medias
// terminaba el nivel como si nada hubiera pasado.  Y de paso apaga solo todo lo que
// hablaba de la salida —la casilla verde, el color de las fichas, el renglón de la
// barra—, porque todo eso ya leía de acá.
const exitOpen = () => got >= LV.coins && !hunt;
// cada baby point = 35% más de tiempo.  Toma un valor suelto para que el selector
// de nivel pueda mostrar lo que van a valer los que todavía no se aplicaron.
const babyK = (n) => 1 + 0.35 * (n === undefined ? baby : n);
const dur = () => durBase * babyK();
const acc = () => (hits + fails ? hits / (hits + fails) : 1);
// Decir "NO, ASÍ ESTÁ BIEN" y que el cartel vuelva a los 25 teclazos es no haber
// escuchado la respuesta.  Cada NO hace las dos cosas: alarga la espera (60 teclas
// por cada uno) y baja el umbral de precisión con el que el cartel se anima a
// aparecer, así que al segundo NO prácticamente hay que jugar el doble de mal para
// volver a verlo.  El SÍ sigue con el cooldown corto de siempre: ése lo pidió.
const skillAcc = () => Math.max(0.45, 0.8 - 0.12 * noes);
function checkSkill() {
	const n = hits + fails;
	if (
		skillOff ||
		paused ||
		qte ||
		frozen ||
		win ||
		tutOn ||
		hunt || // en la cacería no: es una escena, no una partida que se pueda ajustar
		n < 12 ||
		n < nextAsk ||
		acc() >= skillAcc()
	)
		return;
	paused = true;
	pauseAt = now();
	if (MOBILE) kb.blur(); // el teclado taparía el diálogo
	sacc.textContent = Math.round(acc() * 100) + "%";
	rageOn();
	skill.style.display = "grid";
}
// con cualquier panel abierto el reloj se congela; al cerrarlo se devuelve lo pausado
function unpause() {
	const d = now() - pauseAt;
	if (t0) {
		t0 += d;
		shownAt += d;
		foeTick += d;
	} // sin primera tecla no hay reloj que correr
	graceT += d;
	scareUntil += d;
	meowAt += d; // ni el respiro, ni el maullido, ni su cooldown
	tAt += d; // ni el empujón del tutorial, que si no salta al cerrar el panel
	if (qte) qte.until += d; // ni el QTE, que si no se pierde solo al cerrar el panel
	if (revealT) revealT += d; // ni el farol, que si no se gasta en la pausa
	if (radar) radar.t += d;
	if (resAt) resAt += d; // ni el resumen, que si no salta sobre el menú
	if (hunt) {
		hunt.t0 += d; // ni la cinemática de la cacería (el mp3 lo para frame())
		(hunt.marks || []).forEach((m) => {
			if (m.at) m.at += d; // ...ni el fogonazo de una marca a medio encender
		});
	}
	paused = false;
}
function babyEnd(yes) {
	if (yes) baby++;
	else noes++;
	nextAsk = hits + fails + (yes ? 25 : 60 * noes);
	skill.style.display = "none";
	unpause();
	if (MOBILE) kbFocus(); // devolver el teclado que cerró el diálogo
}
byes.onclick = () => babyEnd(true);
bno.onclick = () => babyEnd(false);

// ...y para el que no lo quiere ver NUNCA, el interruptor.  Vive en los dos
// lugares donde se decide cómo se va a jugar —el menú de ESC y el selector de
// nivel— y es el mismo estado en los dos, así que da igual dónde se toque.  Se
// recuerda entre partidas, como el tutorial ya visto.
let skillOff = (() => {
	try {
		return localStorage.getItem("lg.skill") === "0";
	} catch (e) {
		return false;
	}
})();
function skillSync() {
	const t = (skillOff ? "\u2610" : "\u2611") + " SKILL ISSUE";
	skb.textContent = t;
	skb.className = skillOff ? "" : "on";
	lskb.textContent = t;
	lskb.className = skillOff ? "" : "on";
}
function skillSet(v) {
	skillOff = v;
	try {
		localStorage.setItem("lg.skill", v ? "0" : "1");
	} catch (e) {}
	if (v && skill.style.display === "grid") {
		skill.style.display = "none"; // si justo estaba abierto, se va con su pausa
		unpause();
	}
	skillSync();
}
skb.onclick = () => {
	skillSet(!skillOff);
	skb.blur();
};
lskb.onclick = () => skillSet(!skillOff);
skillSync();

function gen() {
	g = [...Array(C * R)].map((_) => ({ n: 1, e: 1, s: 1, w: 1, v: 0 }));
	const st = [0];
	g[0].v = 1;
	while (st.length) {
		const c = st[st.length - 1],
			cx = c % C,
			cy = (c / C) | 0;
		const nb = [
			[0, -1, "n", "s"],
			[1, 0, "e", "w"],
			[0, 1, "s", "n"],
			[-1, 0, "w", "e"],
		]
			.map(([dx, dy, a, b]) => [cx + dx, cy + dy, a, b])
			.filter(
				([nx, ny]) =>
					nx >= 0 &&
					ny >= 0 &&
					nx < C &&
					ny < R &&
					!g[ny * C + nx].v,
			);
		if (!nb.length) {
			st.pop();
			continue;
		}
		const [nx, ny, a, b] = nb[(Math.random() * nb.length) | 0],
			n = ny * C + nx;
		g[c][a] = 0;
		g[n][b] = 0;
		g[n].v = 1;
		st.push(n);
	}
	p = { x: 0, y: 0 };
	vis = { x: 0, y: 0 };
	got = 0;
	win = false;
	t0 = null;
	tEnd = 0;
	parts = [];
	combo = 0;
	maxCombo = 0;
	stl = 0;
	maxStl = 0;
	stlSum = 0;
	stlT = 0;
	stlAt = 0;
	kills = 0;
	maxKills = 0;
	hits = 0;
	fails = 0;
	pen = 0;
	shake = 0;
	flash = 0;
	cpop = 0;
	unlockT = 0;
	qte = null;
	foeTick = 0;
	foeBeat = 0;
	log = [];
	logEl.innerHTML = "";
	dreadOff(); // partida nueva: sin latido colgado de la anterior
	trail = [];
	frozen = false;
	clearTimeout(scareT);
	scare.style.display = "none";
	boom.style.display = "none";
	paused = false;
	nextAsk = 12;
	skill.style.display = "none"; // el baby mode sí se conserva
	graceT = 0;
	qteWins = 0;
	dodges = 0;
	parries = 0;
	gore = [];
	backAt = 0;
	pfrom = null;
	det = 0;
	scareUntil = 0;
	meowAt = -1e9;
	note = null; // habilidades de cero
	meowOn = false;
	radar = null;
	resHide();
	newPB = false;
	coins = [];
	lamps = [];
	revealT = 0;
	foes = [];
	briefSeen = 0;
	brief.className = ""; // el cartel del primer encuentro, de cero
	huntReset(); // ...y la cacería, con su paleta y su tema, antes de hornear nada
	// en el tutorial las monedas y los gatos los va soltando cada paso, no el gen()
	if (!LV.tut) {
		spawn(coins, LV.coins);
		spawn(lamps, LV.lamps || 0);
		// de a uno y no con un map: así cada gato ve dónde quedaron los otros
		for (let i = 0; i < LV.foes; i++) foes.push(far());
	}
	prevFoe = [];
	// la cara y el grito del acechador se bajan al generar el primer sótano
	if (LV.stalk) {
		if (!STALK.src) STALK.src = "assets/acechador.png";
		if (!LOBO.src) LOBO.src = "assets/lobotomy.mp3";
	}
	// ...y las dos imágenes de la cacería, con el mismo criterio.  La pista NO: son
	// 2,3 MB y no hacen falta hasta que se pisa la puerta (ver huntStart).
	if (LV.hunt) {
		if (!NUGG.src) NUGG.src = "assets/nuggets.jpg";
		if (!REDPJ.src) REDPJ.src = "assets/gato-rojo.jpg";
		NOM.forEach(srcNom); // ...y el mp3 del mordisco, que son 7KB y suena mucho
	}
	bakeMaze(); // el laberinto nuevo se hornea una sola vez
	deal();
	tutStart(); // arma (o apaga) el tutorial del nivel
}
// ---- reparto en el tablero --------------------------------------------------
// Antes cada moneda, farol o gato caía en una celda al azar y listo: podían
// salir dos monedas pegadas en el mismo rincón, o un gato negro a dos pasos
// tuyos apenas arrancaba el nivel.  Ahora todo pasa por place(): se tiran
// SPREAD_K celdas al azar y gana la primera que cumple los DOS mínimos —lo que
// hay que caminar desde el gato blanco y lo que la separa de todo lo que ya
// está puesto—.  Sigue siendo aleatorio, pero repartido: entre un encuentro y
// el siguiente siempre queda tramo de laberinto para reaccionar y respirar.
const SPREAD_K = 160; // tiros por objeto antes de conformarse con el menos malo
// separación entre dos cosas del tablero: va en línea recta porque es la que se VE
const SEP = () => Math.max(2, ((C + R) / 6) | 0);
// caminata mínima hasta una moneda o un farol
const NEAR = () => Math.max(3, ((C + R) / 3) | 0);
// Y la de un gato negro, que a diferencia de una moneda viene caminando hacia
// vos: ésa se mide en SEGUNDOS, no en celdas.  Diez celdas son una eternidad en
// el nivel 1 (900 ms por paso) y un suspiro en el sótano con todas las monedas
// (280 ms), así que un número fijo de celdas daba un respiro distinto en cada
// nivel y en cada tramo de la partida.  FAR devuelve las celdas que, a la
// velocidad de caza de ESTE momento, le cuestan al gato REST_MS de camino: el
// rato para reaccionar al encuentro anterior y prepararse para el siguiente.
// Antes eran 8 celdas EN LÍNEA RECTA, y en línea recta el laberinto miente: un
// gato "a ocho celdas" puede tener las paredes abiertas y caerte encima ya.
const REST_MS = 8000;
const FAR = () => Math.max(6, Math.round(REST_MS / foeMs()));
const sep = (a, b) =>
	Math.abs((a % C) - (b % C)) + Math.abs(((a / C) | 0) - ((b / C) | 0));
// place(d, min, otros): d = campo de distancias desde el PJ (flow), min = celdas
// que como mínimo hay que caminar, otros = lo que ya está en el tablero.  El
// puntaje se recorta en 0 a propósito: apenas una celda cumple los dos mínimos
// ya está bien y gana ésa, así que el reparto no termina SIEMPRE en el rincón
// más lejano.  Si ninguna llega, vuelve la menos mala y, si ni eso, la primera
// libre: en un tablero apretado el reparto se achica, pero nunca se cuelga.
function place(d, min, otros) {
	const gap = SEP();
	let best = -1,
		bs = -1e9;
	for (let k = 0; k < SPREAD_K; k++) {
		const i = (Math.random() * C * R) | 0;
		if (!i || i === C * R - 1 || d[i] < 1 || otros.includes(i)) continue;
		const s = Math.min(
			0,
			d[i] - min,
			...otros.map((o) => sep(i, o) - gap),
		);
		if (s > bs) {
			bs = s;
			best = i;
		}
		if (!s) return i; // cumple los dos mínimos: no hace falta buscar más
	}
	if (best < 0)
		for (let i = 1; i < C * R - 1; i++) if (!otros.includes(i)) return i;
	return best;
}
// monedas y faroles: repartidos, y ninguno en la falda del jugador
function spawn(arr, n) {
	const d = flow(),
		min = NEAR();
	let guard = 0;
	while (arr.length < n && guard++ < 999) {
		const i = place(d, min, [...coins, ...lamps]);
		if (i < 0) break;
		arr.push(i);
	}
}
// un gato negro lejos: lejos del jugador Y lejos de los gatos que ya están
function far() {
	return Math.max(0, place(flow(), FAR(), foes || []));
}

const DIRS = [
	[0, -1, "n"],
	[1, 0, "e"],
	[0, 1, "s"],
	[-1, 0, "w"],
];
const open = (i) =>
	DIRS.filter(([, , w]) => !g[i][w])
		.map(([dx, dy]) =>
			((i / C) | 0) + dy >= 0 &&
			((i / C) | 0) + dy < R &&
			(i % C) + dx >= 0 &&
			(i % C) + dx < C
				? (((i / C) | 0) + dy) * C + (i % C) + dx
				: -1,
		)
		.filter((n) => n >= 0);

// dificultad: sube con cada moneda recogida, entre los topes del nivel
const foeMs = () => LV.foe0 - ((LV.foe0 - LV.foeMin) * got) / LV.coins;
const chaseP = () => 0.7 + (0.25 * got) / LV.coins; // 70% -> 95% de persecución
const qteLen = () => 3 + Math.round((5 * got) / LV.coins); // 3 -> 8 letras
const MS_LETRA = 700; // margen constante por letra

// campo de flujo: distancia REAL por el laberinto desde el PJ (BFS).
// Con Manhattan los gatos se metían en callejones porque la línea recta miente.
// se corre entero en cada paso de los gatos: con open() eran 4 arrays por celda
// (165 celdas x 3/seg).  Los vecinos van inline, el resultado es idéntico.
function flow() {
	const d = new Int16Array(C * R).fill(-1),
		src = p.y * C + p.x,
		q = [src];
	d[src] = 0;
	for (let i = 0; i < q.length; i++) {
		const c = q[i],
			cx = c % C,
			cy = (c / C) | 0,
			k = g[c],
			nd = d[c] + 1;
		if (!k.n && cy > 0 && d[c - C] < 0) {
			d[c - C] = nd;
			q.push(c - C);
		}
		if (!k.s && cy < R - 1 && d[c + C] < 0) {
			d[c + C] = nd;
			q.push(c + C);
		}
		if (!k.w && cx > 0 && d[c - 1] < 0) {
			d[c - 1] = nd;
			q.push(c - 1);
		}
		if (!k.e && cx < C - 1 && d[c + 1] < 0) {
			d[c + 1] = nd;
			q.push(c + 1);
		}
	}
	return d;
}
// ESQUIVE AL CRUCE.  El gato venía desde `f` hacia tu casilla y vos, casi en el
// mismo instante —normalmente por equivocarte y retroceder justo ahí—, saliste
// hacia la suya: se cruzan de frente, cada uno se queda con la casilla del otro y
// el gato pasa de largo sin tocarte.  Ninguna de las dos comprobaciones de choque
// lo agarra (stepBack no mira gatos, y moveFoes mira tu casilla DESPUÉS de que se
// movió), así que hasta ahora era un agujero que el jugador descubría solo y no
// pagaba nada.  Es la jugada más difícil que tiene el juego: ahora paga.
const DODGE_MS = 1200, // "casi al mismo tiempo": el margen entre las dos movidas
	STYLE_DODGE = 9; // más que vencer un gato de QTE (STYLE_QTE), y con razón
function dodge(f, next) {
	if (
		!pfrom ||
		next !== pfrom.c || // el gato entra justo a la casilla que dejaste...
		f !== p.y * C + p.x || // ...y vos te quedaste con la que él dejó
		now() - pfrom.t > DODGE_MS
	)
		return;
	dodges++;
	styleUp(STYLE_DODGE);
	shake = 11;
	sfx(300, 90, "square", 0.05, 900);
	setTimeout(() => sfx(1200, 240, "triangle", 0.06, 700), 90);
	burst(p.x * S + S / 2, p.y * S + S / 2, "#9ff", 26);
	say(
		"¡LO ESQUIVASTE AL CRUCE!",
		`+${STYLE_DODGE} DE ESTILO · ESO NO SE APRENDE`,
		"#9ff",
	);
}
function moveFoes() {
	const d = flow();
	foeBeat++;
	const huyen = now() < scareUntil, // ahuyentador activo
		caza = huntOn(); // la cacería: los papeles están dados vuelta
	foes = foes.map((f, i) => {
		const st = i < (LV.stalk || 0); // acechador del sótano
		// EL RITMO.  El acechador va a medio paso, y va a medio paso SIEMPRE: antes
		// el maullido se lo sacaba (`!huyen`) y ahora que es inmune eso lo dejaría
		// inmune y al doble de velocidad, que es lo peor de los dos mundos.  En la
		// cacería el ritmo lo pone huntPace(): cada presa arrastra el lastre de los
		// escapes que le regalaste.
		const ve = caza && huntSees(i, st, d, f); // ¿te siente venir?
		if (foeBeat % (caza ? huntPace(i, st, ve) : st ? 2 : 1)) return f;
		let nb = open(f);
		if (!nb.length) return f;
		// LA CACERÍA: el mismo campo de flujo.  La presa que te siente lo SUBE —huye—;
		// la que no, lo BAJA: se te viene encima sin saberlo (ver huntSees).  Y el
		// acechador, cuando ya es el último, lo baja a propósito: te carga.
		if (caza) {
			// EL RUGIDO (ver meow): lo que era huida acá es parálisis.  Alcanza a todas
			// las presas cercanas, acechador incluido —en esta mitad del nivel el que
			// mete miedo sos vos—.
			if (huyen && d[f] >= 0 && d[f] <= MEOW_R) return f;
			const pv = prevFoe[i]; // de dónde viene, ANTES de pisar la marca
			prevFoe[i] = f;
			if (ve && !huntCharge(i, st))
				return nb.reduce((a, b) => (d[b] > d[a] ? b : a));
			// sin volverse sobre sus pasos salvo callejón: si no, en cada bifurcación
			// se queda oscilando entre dos celdas y no llega nunca
			const av = nb.filter((n) => n !== pv);
			return (av.length ? av : nb).reduce((a, b) => (d[b] < d[a] ? b : a));
		}
		// AHUYENTADOR: el mismo campo de flujo, leído al revés.  Sólo lo escuchan los
		// que están cerca (el maullido no llega al otro lado del laberinto) y NUNCA lo
		// escucha el acechador: es el único enemigo del juego al que no se ahuyenta.
		// Un maullido es un susto, y a él los sustos no le hacen nada.
		if (huyen && !st && d[f] >= 0 && d[f] <= MEOW_R) {
			prevFoe[i] = f;
			return nb.reduce((a, b) => (d[b] > d[a] ? b : a));
		}
		const fwd = nb.filter((n) => n !== prevFoe[i]); // no se devuelve salvo callejón
		if (fwd.length) nb = fwd;
		const next =
			st || Math.random() < chaseP() // ...pero nunca despista
				? nb.reduce((a, b) => (d[b] < d[a] ? b : a)) // baja por el campo de flujo
				: nb[(Math.random() * nb.length) | 0]; // despista
		prevFoe[i] = f;
		dodge(f, next); // ¿se cruzaron sin tocarse? eso se paga
		return next;
	});
	// EL CONTACTO.  En la cacería lo decide el ZARPAZO —basta con quedar al lado, ver
	// huntGrab—.  Fuera de ella hay que compartir celda, y con el maullido encima el
	// único que igual te alcanza es el acechador: los índices por debajo de LV.stalk
	// son los suyos (ver spawn en gen()), así que indexOf ya devuelve el que manda.
	if (caza) return huntGrab(d);
	const i = foes.indexOf(p.y * C + p.x);
	if (i > -1 && (!huyen || i < (LV.stalk || 0))) qteStart();
}

// ---- el maullido -----------------------------------------------------------
// No gasta combo: el precio es el cooldown (ver MEOW_CD arriba).
//
// Lo que CUESTA un maullido, salga como ahuyentador o como parry: eso y nada más.
// Va en su propia función porque las dos formas lo pagan igual —un parry no es una
// habilidad nueva, es el mismo maullido tirado en otro momento— y porque el radar
// del sótano tampoco distingue: el eco sale igual.
function meowSpend() {
	meowAt = now();
	scareUntil = meowAt + MEOW_MS;
	// RADAR: a oscuras el maullido vuelve con algo más que gatos asustados.  Las
	// monedas son las que quedan; los gatos son los que HABÍA al maullar (para
	// cuando el eco se apaga ya se corrieron, que es justo la gracia).  No se
	// guarda la celda sino un punto con ruido: es una pista, no un mapa.
	if (LV.fog)
		radar = {
			t: meowAt,
			pts: [
				...coins.map((i) => ping(i, 0)),
				...foes.map((i) => ping(i, 1)),
			],
		};
	tmeow++; // el paso del tutorial que enseña el maullido espera esto
}
const growl = () => {
	sfx(120, 180, "sine", 0.035, 80);
	return false;
};
// Devuelve true sólo si salió, para que quien lo llame sepa si hacer otra cosa (en
// el teléfono, el botón que no maulló abre el teclado).
function meow() {
	// durante el buildup de la cacería el ESPACIO no maulla: saltea la cinemática
	// (y sólo si ya se vio entera alguna vez, ver huntSkip).  En el epílogo, ídem.
	if (huntHold()) return huntSkip();
	if (huntFin()) return huntFinSkip();
	// EL PARRY.  Con un QTE abierto el maullido no ahuyenta a nadie —el gato ya te
	// tiene— así que hace lo otro: se lo devuelve.  Mismo botón, mismo cooldown, y
	// sólo en el primer instante del encuentro (ver parry).
	if (qte) return parry();
	if (win || frozen || paused || tutHold()) return false;
	if (!meowReady()) return growl(); // negado: un gruñido
	meowSpend();
	// EL RUGIDO.  En la cacería el mismo botón hace lo contrario: no ahuyenta, PARALIZA.
	// Dejarlo como estaba lo habría vuelto un botón muerto que además miente —el cartel
	// diría "los gatos se alejan" mientras la mecánica de huida ni siquiera se lee en
	// esa mitad del nivel (ver moveFoes)—, y apagarlo del todo habría tirado la única
	// herramienta que el jugador se ganó en la primera mitad justo cuando pasa a ser el
	// que caza.  Mismo cooldown, mismo `scareUntil`, sentido invertido: las presas
	// cercanas se quedan clavadas del terror el tiempo que dura.
	if (huntOn()) {
		sfx(90, 520, "sawtooth", 0.085, 34);
		setTimeout(() => sfx(62, 700, "sine", 0.07, 26), 120);
		shake = 20;
		burst(p.x * S + S / 2, p.y * S + S / 2, PAL.foe, 40);
		say("¡RUGIDO!", "LAS PRESAS CERCANAS NO SE PUEDEN MOVER", PAL.foe);
		return true;
	}
	// maullido de verdad: sube y después cae, no un beep
	sfx(520, 240, "sawtooth", 0.055, 900);
	setTimeout(() => sfx(900, 420, "sawtooth", 0.05, 280), 150);
	shake = 13;
	burst(p.x * S + S / 2, p.y * S + S / 2, "#9ff", 34);
	say(
		"¡MAULLIDO!",
		LV.stalk
			? "LOS GATOS NEGROS SE ALEJAN · EL ACECHADOR NO"
			: "LOS GATOS NEGROS SE ALEJAN",
		"#9ff",
	);
	return true;
}

// ---- EL PARRY --------------------------------------------------------------
// El maullido siempre fue una herramienta de ANTES: se tira para que no te
// alcancen, y una vez que el gato te tiene encima no servía para nada —con el QTE
// abierto el botón directamente no hacía nada—.  El parry es el MISMO maullido
// tirado justo DESPUÉS: en los primeros PARRY_MS del encuentro, con la secuencia
// recién puesta en pantalla y el gato en la cara.  No es una habilidad nueva ni un
// botón nuevo; es la ventana en la que el ahuyentador deja de ser prevención y
// pasa a ser una respuesta.
//
// QUÉ CUESTA.  El maullido entero: el cooldown de 32 s y el ahuyentador que sale
// con él (los gatos cercanos igual salen corriendo, y en el sótano igual queda el
// radar).  O sea que se paga con la herramienta que ibas a usar para no llegar a
// esta situación, y por eso no se puede tirar en todos los encuentros.
//
// QUÉ NO PAGA.  No cuenta como vencer al gato: no suma victoria de QTE, no da
// carga de DETERMINACIÓN y no encadena la racha que multiplica el estilo. Salir de
// un encuentro sin pelearlo no puede pagar lo mismo que pelearlo. Paga ESTILO
// —más que un esquive al cruce, que sale gratis— y el respiro para acomodarte.
//
// Y AL ACECHADOR NO SE LO PARREA.  Es la misma regla que ya tenía el maullido, por
// el mismo motivo: un maullido es un susto y a él los sustos no le hacen nada. Su
// tanda se pelea entera o se pierde entera.  El intento ni siquiera le gasta el
// cooldown al maullido —el jugador no eligió mal, eligió algo que no existe— y la
// pantalla se lo dice ahí mismo, encima del cartel del QTE.
//
// El anillo de la cacería tampoco: ahí el que muerde sos vos, no hay ataque que
// devolver.
const qteAt = () => (qte ? qte.until - qte.ms : 0); // cuándo se abrió este QTE
const parryOpen = (T) =>
	!!qte && !qte.ring && !qte.st && (T || now()) - qteAt() <= PARRY_MS * babyK();
// el intento que no salió: un gruñido y el motivo escrito en el overlay, que es
// donde el jugador está mirando.  No gasta nada.
const parryNo = (m) => {
	if (qte) qte.no = { t: now(), m };
	return growl();
};
function parry() {
	if (!qte || win || frozen || paused) return false;
	if (qte.ring) return growl(); // en la cacería mordés vos: no hay qué devolver
	if (qte.st) return parryNo("AL ACECHADOR NO SE LO PARREA");
	if (!meowReady()) return parryNo("EL MAULLIDO TODAVÍA NO VUELVE");
	if (!parryOpen()) return parryNo("TARDE: ESO YA ES TECLEAR");
	const cell = p.y * C + p.x;
	qte = null; // antes de push(): con un QTE abierto no se evalúa el skill issue
	meowSpend(); // el precio entero, ahuyentador y radar incluidos
	parries++;
	hits++; // fue una respuesta acertada: cuenta en la precisión
	comboUp();
	styleUp(STYLE_PARRY);
	graceT = now() + GRACE_MS; // el mismo respiro que ganar el QTE
	push("♪", "parry");
	// el gato sale volando igual que si lo hubieras vencido: quedarse en tu casilla
	// te abriría otro QTE en el próximo paso y el parry no habría servido de nada
	foes = foes.map((f) => (f === cell ? far() : f));
	shake = 16;
	flash = 0.55;
	sfx(1400, 45, "square", 0.05, 1900); // el chasquido...
	setTimeout(() => sfx(520, 260, "sawtooth", 0.06, 1100), 55); // ...y el maullido
	burst(p.x * S + S / 2, p.y * S + S / 2, "#9ff", 30);
	say("¡PARRY!", `+${STYLE_PARRY} DE ESTILO · MAULLIDO GASTADO`, "#9ff");
	deal(); // volviste al laberinto: las letras son las de esta celda
	return true;
}

// ---- QTE ----
// El PRIMER encuentro del tutorial va con la secuencia más corta y más del
// doble de margen por letra.  Un QTE que cae de sorpresa la primera vez no se
// aprende: se pierde, y lo que queda es el susto, no la mecánica.  Se mantiene
// blando hasta que se gane uno: si el primero se falla, el que sigue vuelve a
// ser el fácil.
const TUT_QTE_N = 3,
	TUT_QTE_MS = 1500;
// EL ACECHADOR no abre UN QTE: abre una TANDA de QTEs cortos, uno atrás del otro
// y cada uno con su propio reloj.  Arranca en STALK_R0 rondas y llega a
// STALK_RMAX con la última moneda, así que cuanto más avanzada va la partida más
// larga es la pelea.  No hay crédito parcial: errarle a cualquier ronda pierde la
// tanda ENTERA (ver qteEnd), y por eso ganarla completa paga mucho más que un
// gato suelto —es el único enemigo del juego que se pelea, no que se resuelve—.
const STALK_N = 2, // letras por ronda: cortas a propósito
	STALK_R0 = 2, // rondas con el tablero recién empezado
	STALK_RMAX = 5, // ...y con todas las monedas encima
	STALK_PAY = 0.75; // lo que suma cada ronda extra sobre el pago de un gato
const stalkRounds = () =>
	STALK_R0 +
	Math.round((STALK_RMAX - STALK_R0) * Math.min(1, got / LV.coins));
// CUÁNTOS PEDAZOS LE FALTAN AL ACECHADOR EN ESTA RONDA.  Cada escape le come un
// pedazo, igual que a una presa cualquiera, pero él se pelea por rondas: el pedazo
// no se lo puede comer a todas a la vez o dos escapes lo dejarían en nada.  Así que
// los escapes se REPARTEN entre las rondas que le quedan, de la primera a la última:
// con un escape y dos rondas por delante, la primera de esas dos viene con un pedazo
// menos y la otra entera.  El sobrante da otra vuelta.
const aceCut = (esc, round, rounds) =>
	((esc / rounds) | 0) + (esc % rounds >= round ? 1 : 0);

// `chain` = {round, rounds}: la ronda siguiente de una tanda del acechador, que
// la encadena qteEnd sin soltar la pantalla ni reubicar al enemigo
function qteStart(chain) {
	if (qte || win || frozen) return;
	// ...y antes de ese primero el juego se frena y lo explica (ver briefShow)
	if (tutOn && !briefSeen) return briefShow();
	// LA CACERÍA arma otro QTE: un ANILLO de letras alrededor de la presa, y SIN
	// ORDEN.  No es una secuencia que hay que ejecutar, es un bicho al que hay que
	// sacarle pedazos, y de un bicho se muerde por donde se puede.  Cada letra que
	// entra le borra su porción del cuerpo (ver el dibujo del overlay).
	if (huntOn() && hunt.prey > -1) {
		const ace = hunt.prey < (LV.stalk || 0),
			free = [...POOL].sort(() => Math.random() - 0.5),
			// EL ACECHADOR NO SE REGENERA.  Las rondas que ya le ganaste quedan
			// cobradas aunque después se te escape: la próxima vez arranca donde
			// quedó (ver huntBite).  Sin esto, errarle a la tercera ronda te
			// devolvía a la primera y la pelea no terminaba nunca.
			rounds = chain
				? chain.rounds
				: ace
					? Math.max(1, HUNT_ACE_ROUNDS - (hunt.aceDone || 0))
					: 1,
			round = chain ? chain.round : 1,
			n = ace
				? Math.max(
						HUNT_ACE_MIN,
						HUNT_ACE_N -
							aceCut(hunt.slow[hunt.prey] || 0, round, rounds),
					)
				: Math.max(HUNT_RING_MIN, HUNT_RING - hunt.slow[hunt.prey]),
			// EL RELOJ NO SE ACHICA CON EL ANILLO.  Es la pieza del balance: cada
			// escape le saca una letra a la presa y el tiempo sigue siendo el
			// mismo, así que lo que crece es el margen POR letra.  Atarlo a `n`
			// —como hace el QTE de la primera mitad, n * MS_LETRA— habría dejado
			// la cacería exactamente igual de apretada después de cada escape.
			ms = HUNT_RING_MS * babyK();
		qte = {
			seq: [...Array(n)].map((_) => free.pop()),
			i: 0,
			ms,
			until: now() + ms,
			st: ace, // el acechador trae su cara también acá
			ring: 1,
			round,
			rounds,
		};
		qte.eat = new Set(qte.seq); // lo que falta morder, sin orden
		shake = 12;
		return;
	}
	const primero = tutOn && !qteWins,
		free = [...POOL].sort(() => Math.random() - 0.5),
		// los acechadores son los primeros de `foes` (ver moveFoes): quién te
		// alcanzó decide qué cara y qué grito trae el jumpscare si se pierde
		fi = foes.indexOf(p.y * C + p.x),
		st = chain ? true : fi > -1 && fi < (LV.stalk || 0),
		rounds = chain ? chain.rounds : st ? stalkRounds() : 1,
		n = st ? STALK_N : primero ? TUT_QTE_N : qteLen(),
		ms = n * (primero ? TUT_QTE_MS : MS_LETRA) * babyK();
	qte = {
		seq: [...Array(n)].map((_) => free.pop()),
		i: 0,
		ms,
		until: now() + ms,
		st,
		round: chain ? chain.round : 1,
		rounds,
	};
	shake = 10;
}
function qteEnd(okAll) {
	// el anillo de la cacería se resuelve entero en huntBite: no comparte ni el
	// pago, ni el castigo, ni la reubicación del enemigo con el QTE de la primera
	// mitad, y mezclarlos habría dejado las dos mitades peor
	if (qte && qte.ring) return huntBite(okAll);
	const cell = p.y * C + p.x,
		st = !!(qte && qte.st), // te alcanzó el acechador del sótano
		round = qte ? qte.round || 1 : 1,
		rounds = qte ? qte.rounds || 1 : 1;
	// Ronda ganada de la tanda del acechador que todavía no es la última: no paga
	// NADA todavía y encadena la siguiente sin devolver la pantalla.  El enemigo
	// tampoco se reubica: te tiene agarrado hasta la última letra de la última
	// ronda, y hasta ahí no hay ni combo ni estilo que cobrar.
	if (okAll && round < rounds) {
		qte = null;
		shake = 12;
		sfx(880, 60, "square", 0.05, 640);
		burst(p.x * S + S / 2, p.y * S + S / 2, "#f4a", 12);
		// sin cartel: el overlay de la ronda que viene ya dice por dónde va la tanda
		// (título y una ficha por ronda), y un banner encima taparía las letras
		qteStart({ round: round + 1, rounds });
		return;
	}
	if (okAll) {
		// la tanda del acechador paga por TODAS sus rondas: la penalización, el
		// combo y la determinación se cobran una vez por ronda ganada, y el estilo
		// sale multiplicado.  Contra un gato común rounds es 1 y todo esto es lo
		// que era.
		pen -= 500 * rounds;
		for (let i = 0; i < rounds; i++) comboUp();
		// la CADENA: el 1º paga STYLE_QTE y cada gato seguido paga STYLE_CHAIN
		// más, hasta el 5º.  Es la única forma de pasar de S, así que el rango
		// alto no es "jugar prolijo": es haber estado cazando.
		kills++;
		maxKills = Math.max(maxKills, kills);
		const pay = Math.round(qteStyle() * (1 + STALK_PAY * (rounds - 1)));
		styleUp(pay);
		tflag++;
		// Salís del QTE con la pantalla llena de secuencia y sin saber para dónde
		// estabas yendo: el reloj de la letra arranca recién 2 s después, y en ese
		// rato los gatos tampoco dan un paso.  Es tiempo para MIRAR, no para correr.
		// en el tutorial el respiro va más largo: se gana el encuentro, recién
		// ahí aparecen las monedas y hay un cartel nuevo que leer.  Con dos
		// segundos el gato reubicado ya venía de vuelta antes de terminar.
		// y después de una tanda entera el respiro va doble: fueron varias rondas
		// seguidas sin ver el laberinto.
		graceT = now() + (tutOn ? TUT_GRACE_MS : GRACE_MS) * (rounds > 1 ? 2 : 1);
		let carga = false; // tres gatos = una carga (la tanda cuenta por ronda)
		for (let i = 0; i < rounds; i++)
			if (++qteWins % DET_EVERY === 0 && det < DET_MAX) {
				det++;
				carga = true;
			}
		if (carga) sfxUnlock();
		// un solo cartel, y el de la tanda manda: tres avisos encimados no se leen
		if (rounds > 1) {
			// ...y con el acechador abajo el maullido vuelve entero: armado y sin
			// espera, que es lo que te deja seguir moviéndote después de la pelea
			meowOn = true;
			meowAt = -1e9;
			say(
				`¡ACECHADOR VENCIDO! ${rounds} RONDAS`,
				`+${pay} DE ESTILO · MAULLIDO LISTO`,
				"#f4a",
			);
		} else {
			if (meowOn) meowAt -= MEOW_KILL; // un gato común sólo le come un tajo
			if (carga)
				say(
					"DETERMINACIÓN",
					"LA LETRA VIOLETA ATRAVIESA EL MURO",
					"#c8f",
				);
			else if (kills >= 2)
				say(
					`¡RACHA DE ${kills} GATOS!`,
					`+${pay} DE ESTILO`,
					"#4cf",
				);
		}
		burst(p.x * S + S / 2, p.y * S + S / 2, "#4cf", 26);
		play(BANG).catch(() => {});
		boom.src = "";
		boom.src = BOOM; // reinicia el gif
		boom.style.cssText = `position:absolute;display:block;pointer-events:none;z-index:2;top:${((p.y * S - 25) / BH) * 100}%;left:${((p.x * S - 25) / BW) * 100}%;width:${(84 / BW) * 100}%`; // en % para que escale en móvil
		setTimeout(() => (boom.style.display = "none"), 900);
	} else {
		// perder contra un gato es lo único que le pega FUERTE al estilo: la racha
		// se corta igual que con un error, pero acá el medidor de color se hunde
		pen += 2000;
		combo = 0;
		kills = 0; // se corta la cadena: el gato siguiente vuelve a pagar el mínimo
		styleDown(STYLE_LOSS);
		flash = 1;
		shake = 14;
		sfxBad();
		burst(p.x * S + S / 2, p.y * S + S / 2, "#f45", 20);
		for (let i = 0; i < 3; i++) stepBack(); // fallar = 3 pasos atrás
	}
	foes = foes.map((f) => (f === cell ? far() : f)); // el enemigo se reubica lejos igual
	// en el tutorial cada encuentro reinicia el empujón: el gato se fue lejos y
	// vuelve a haber camino que verle hacer antes de que se lo acerque nadie
	if (tutOn) {
		tpush = 0;
		tAt = now();
	}
	qte = null;
	if (okAll) deal();
	else scareShow(st);
}

// ---- LA CACERÍA -------------------------------------------------------------
// El sótano es el modo historia, y su historia no termina en la puerta.  Juntar las
// siete monedas y pisar la casilla verde deja de ser escapar: es el punto de no
// retorno.  A partir de ahí el juego se da vuelta entero —el gato blanco deja de ser
// la presa— y no queda salida hasta que no quede ninguna presa.
//
// Todo lo que sigue reusa las máquinas que ya estaban.  El campo de flujo es EL MISMO
// (flow()), sólo que las presas lo suben en vez de bajarlo; el QTE es EL MISMO, con
// un anillo en vez de una fila; el latido, el ruido blanco y el ducking de la música
// son los mismos.  Lo único de verdad nuevo son las tres fases y el zarpazo.
//
// POR QUÉ LA CACERÍA NO PUEDE FALLAR.  Una cacería que se pierde no es una cacería,
// es otra persecución con los papeles cambiados, y el sótano ya tiene una de ésas en
// su primera mitad.  Acá el jugador es inevitable por diseño, y son cuatro piezas:
//
//   1. EL ZARPAZO (HUNT_REACH).  No hace falta pisar a la presa: alcanza con quedar a
//      dos celdas.  Sin esto, dos cosas que se mueven por un laberinto se persiguen
//      para siempre y la única forma de terminar es aburrirse.  Con esto, para
//      salvarse la presa tiene que sacarte TRES celdas, no una.
//   2. VAN A MEDIO PASO mientras huyen, contra tu paso entero (huntPace).
//   3. EL HAMBRE PESA: cada dos presas devoradas, la que corre pierde un beat más.
//      Las primeras cuestan, las últimas se entregan.
//   4. CADA ESCAPE TE LA DEJA MÁS FÁCIL: la presa a la que le erraste queda más lenta
//      y con menos letras en el anillo (huntBite).
//
// El único que puede salvar a una presa es el propio jugador, errándole al QTE, y aun
// así se la vuelve a encontrar y más blanda.  La tensión no está en si vas a llegar:
// está en cuánto aguantás sin equivocarte mientras la pantalla se te viene encima.
const HUNT_PREY = 5, // presas de la horda (el acechador es una de ellas)
	HUNT_BUILD = 12000, // el buildup entero: termina justo con el drop del mp3
	HUNT_EAT = 10000, // ...y a los 10 s se come la torre y cambia de piel
	HUNT_DROP = 12, // el MISMO instante, pero en segundos de la pista
	HUNT_SKIP_AT = 2000, // desde acá se ofrece saltar (sólo si ya se vio entero)
	HUNT_FOE_MS = 640, // el reloj de las presas: el ritmo fino lo pone huntPace
	HUNT_RING = 4, // letras del anillo de una presa entera
	HUNT_RING_MIN = 1, // ...y el piso al que baja a fuerza de escapes
	// El reloj del anillo: FIJO, sin importar cuántas letras trae.  Estaba en 2600 y
	// eso daba 520 ms por letra contra el acechador entero —cinco letras, y tres
	// rondas seguidas así—: el reloj se comía la pelea antes que el jugador.  Con
	// 3200 el primer encuentro ya es jugable, y como el número NO se achica con las
	// letras, cada escape que le regalás lo vuelve más y más holgado.
	HUNT_RING_MS = 3200,
	HUNT_ACE_N = 5, // el acechador es más grande: más letras...
	HUNT_ACE_MIN = 2, // ...con su propio piso, que es más alto...
	HUNT_ACE_ROUNDS = 3, // ...y no se come de un solo bocado
	HUNT_REACH = 2, // EL ZARPAZO, en celdas de laberinto
	HUNT_SENSE = 8, // hasta dónde te SIENTEN: más lejos que esto, ni se enteran
	HUNT_FOG0 = 6.4, // la vista arranca más ancha que la del sótano (LV.fog = 4.2)...
	HUNT_FOG_STEP = 0.55, // ...y se cierra con cada presa: el final se juega a ciegas
	HUNT_STYLE = 12, // lo que paga devorar una presa
	// EL ATAQUE DE DETERMINACIÓN: a esta distancia EN LÍNEA RECTA se dispara solo
	HUNT_DET_R = 4,
	HUNT_DET_N = 1, // ...y a esta carga lo sostiene mientras la presa siga cerca
	// EL LATIDO: desde acá se empieza a oír, y a cero celdas está al tope
	HEART_NEAR = 9,
	HEART_BASE = 0.12, // el piso: durante la cacería no se apaga nunca
	HEART_SOLO = 0.45; // ...y con el acechador solo en el sótano, el piso sube

// ---- EL EPÍLOGO: el reloj del final ----------------------------------------
// La cacería terminaba en un chispazo y el resumen encima: cuatro minutos de
// sótano y el final duraba lo que tarda un cartel en apagarse.  Ahora la última
// dentellada ABRE una escena, y la escena se cuenta con el MISMO mecanismo que el
// buildup —los milisegundos desde que cayó la última presa— sin un timer nuevo en
// ninguna parte: los números de abajo son los cortes, y entre corte y corte todo lo
// que se dibuja y todo lo que suena sale de `e`.
//
// El final es la respuesta al buildup, al revés en cada tramo: allá la oscuridad se
// cerraba sobre una presa y caía una torre; acá se cierra sobre el que quedó vivo y
// lo que se abre es el sótano entero.  Allá el título entraba con el drop; acá entra
// en silencio, con lo único que sigue sonando.
//
// Los tramos están medidos contra NOTE_MS (lo que dura un cartel a media pantalla):
// ningún cartel de la escena puede seguir en pantalla cuando entra la pieza que
// viene después, o el final se pisa a sí mismo.
const FIN_T1 = 600, //    0 ->  600  el golpe: el sótano se cierra encima tuyo
	FIN_T2 = 2800, //   600 -> 2800  a oscuras: no queda nada, y algo late igual
	FIN_T3 = 4600, //  2800 -> 4600  la luz sale de vos y descubre el sótano entero
	FIN_T4 = 6400, //  4600 -> 6400  las marcas de las que te comiste, encendidas
	FIN_T5 = 8500, //  6400 -> 8500  el cartel, letra por letra
	FIN_MS = 9200, //  8500 -> 9200  negro, y recién ahí el resumen
	FIN_SKIP_AT = 1500, // desde acá se ofrece saltarlo (sólo si ya se vio entero)
	FIN_R = 1.15, // lo que se ve en el tramo a oscuras, en celdas
	FIN_TTL = "SE ACABÓ EL HAMBRE"; // el cartel: se escribe letra por letra

// ¿ya se vio el buildup entero alguna vez?  Se guarda igual que el interruptor del
// skill issue: la cinemática de 12 s es un golpe que se da UNA vez, y a partir de la
// segunda el que la quiera saltar tiene derecho.
let huntSeen = (() => {
	try {
		return localStorage.getItem("lg.hunt") === "1";
	} catch (e) {
		return false;
	}
})();
const huntSaw = () => {
	huntSeen = true;
	try {
		localStorage.setItem("lg.hunt", "1");
	} catch (e) {}
};

// ...y lo mismo para el epílogo, con su propio interruptor.  Son dos cinemáticas
// distintas y se ven en momentos distintos —al buildup se llega siempre, al final
// sólo si la cacería se termina—, así que haber visto una no da derecho a saltar la
// otra: el que llegó por primera vez al final se lo mira entero aunque haya jugado
// el sótano diez veces.
let finSeen = (() => {
	try {
		return localStorage.getItem("lg.fin") === "1";
	} catch (e) {
		return false;
	}
})();
const finSaw = () => {
	finSeen = true;
	try {
		localStorage.setItem("lg.fin", "1");
	} catch (e) {}
};

const huntOn = () => !!hunt && hunt.ph === "hunt"; // la cacería propiamente dicha
const huntHold = () => !!hunt && hunt.ph === "build"; // el buildup congela el laberinto
const huntFin = () => !!hunt && hunt.ph === "end"; // el epílogo: ya no se juega, se mira
// el ACECHADOR se guarda para el final: mientras quede otra presa corre a paso entero
// y el zarpazo no lo agarra; recién cuando es el último se da vuelta y te carga.
const huntLast = () => !!hunt && foes.length === 1;
const huntCharge = (i, st) => !!st && huntLast();
// ¿ESTA presa te siente?  Sólo dentro de HUNT_SENSE celdas.  Es la regla de la que
// cuelga todo el ritmo de la cacería.
//
// Con las cinco huyendo desde el primer cuadro, las cinco terminaban apretadas en la
// esquina más lejana del sótano y la cacería era una caminata de treinta pasos por
// presa: lo contrario de la ráfaga que tiene que ser.  Pero que la que no te siente
// se quede paseando al azar tampoco alcanzaba —el laberinto es de 17x13 y llegar
// hasta ella seguía costando lo mismo—.
//
// Así que la que NO te siente se te ACERCA.  Está a oscuras, no sabe qué sos, y el
// sótano es chico: se mueve, y moverse en un sótano donde está esto es acercarse.
// Recién a HUNT_SENSE celdas se da cuenta de lo que tiene enfrente y sale disparada
// —y para entonces ya la tenés—.  Las dos mitades del comportamiento cuentan la
// misma historia y, de paso, parten al medio lo que hay que caminar.
const huntSees = (i, st, d, f) => st || (d[f] >= 0 && d[f] <= HUNT_SENSE);
// El ritmo de cada presa, en beats de HUNT_FOE_MS.  Medio paso mientras huye, uno de
// cada tres mientras todavía no te siente, y un beat más por cada escape que le
// regalaste.  El acechador que aún no es el último es el único a paso entero: es el
// que no se deja agarrar hasta que le toca.
//
// Y el HAMBRE PESA, pero SÓLO sobre la que está huyendo: cada dos presas devoradas,
// la que corre pierde un beat más.  Las últimas se entregan, que es la forma que
// tiene que tener un clímax.  El lastre no toca a la que todavía no te siente, y eso
// no es un detalle: si también la frenara, dejaría de venírsete encima y volvería a
// haber que caminar el sótano entero para llegar a ella —medido, empeoraba la
// cacería entera en cuarenta segundos—.
const huntPace = (i, st, ve) =>
	st && !huntLast()
		? 1
		: (ve ? 2 + (((hunt && hunt.eaten) || 0) >> 1) : 3) +
			((hunt && hunt.slow[i]) || 0);
// la niebla del sótano se abre al empezar la cacería (sos vos el que ve en lo oscuro)
// y se va cerrando con cada presa devorada
// `T` es el reloj DEL JUEGO: sin él la niebla del epílogo seguiría abriéndose con el
// menú de pausa encima, que es lo único de la escena que quedaría corriendo.
const fogR = (T) =>
	huntFin()
		? finLight((T === undefined ? now() : T) - hunt.t0)
		: huntOn() || huntHold()
			? Math.max(2.6, HUNT_FOG0 - HUNT_FOG_STEP * (hunt.eaten || 0))
			: LV.fog;

// LA LUZ DEL EPÍLOGO.  No es una capa nueva: es el MISMO radio de niebla, movido por
// el reloj del final.  Se cierra de golpe sobre el gato —el sótano entero se apaga
// menos él—, se queda ahí el tramo en que lo único que hay es su latido, y después
// se abre hasta cubrir el tablero: el nivel que se jugó a ciegas se ve entero una
// sola vez, y es al final.  Con esto, la niebla que fue la amenaza toda la partida
// termina siendo el foco que ilumina lo que hiciste.
const FIN_FULL = () => (C + R) * 1.15; // "el tablero entero", en celdas
const finLight = (e) => {
	const r0 = Math.max(2.6, HUNT_FOG0 - HUNT_FOG_STEP * HUNT_PREY);
	if (e < FIN_T1) {
		const k = e / FIN_T1;
		return r0 + (FIN_R - r0) * k * k; // se cierra rápido
	}
	if (e < FIN_T2) return FIN_R;
	if (e >= FIN_T3) return FIN_FULL();
	const k = 1 - (e - FIN_T2) / (FIN_T3 - FIN_T2);
	return FIN_R + (FIN_FULL() - FIN_R) * (1 - k * k * k); // ...y se abre despacio
};

// ---- LA PROXIMIDAD: la presa más cercana, EN LÍNEA RECTA --------------------
// Ojo: en línea recta, no por el laberinto (flow()).  Es a propósito, y de acá
// cuelgan las dos piezas que siguen.  Lo que se siente cuando una presa está del
// otro lado de una pared es que la tenés AHÍ; que el camino hasta ella dé la
// vuelta al sótano es el problema, no la medida.  Y de yapa sale gratis: flow()
// es un BFS del tablero entero y esto son cinco restas.
const huntNear = () => {
	let b = 1e9;
	for (const f of foes)
		b = Math.min(b, Math.hypot((f % C) - p.x, ((f / C) | 0) - p.y));
	return b;
};

// ---- EL ATAQUE DE DETERMINACIÓN --------------------------------------------
// El problema medido: en la cacería el que persigue sos vos, y un laberinto de
// 17x13 castiga al que persigue.  La presa está a dos celdas, hay una pared en el
// medio, y llegar cuesta dieciocho pasos por los que ella ya se movió otras seis
// veces.  Eso no es una cacería, es un trámite.
//
// La determinación ya resolvía exactamente eso —la letra violeta atraviesa el
// muro— pero se cobra cada tres gatos vencidos, y en la cacería no hay gatos que
// vencer antes: entrás con las cargas que traías y se acaban enseguida.
//
// Así que acá se GANA POR ESTAR CERCA.  Mientras haya una presa a HUNT_DET_R
// celdas en línea recta, la carga se repone sola: deja de ser un recurso que se
// administra y pasa a ser un estado —el hambre— que se te prende cuando la tenés a
// tiro.  El efecto es el que pidió el balance: desde que la ves hasta que la
// mordés, las paredes dejan de existir.
//
// Lo que se apaga al perder a la presa es la REPOSICIÓN, no la carga que ya está
// puesta: sacártela a mitad de camino, con la pared enfrente y la letra violeta en
// pantalla, sería peor que no habértela dado.
function huntDet() {
	if (!huntOn()) return;
	if (huntNear() > HUNT_DET_R) {
		hunt.det = 0; // se fue de rango: el próximo acercamiento vuelve a anunciarse
		return;
	}
	if (det < HUNT_DET_N) {
		const seco = !det;
		det = HUNT_DET_N;
		// si no había NINGUNA carga, las letras violetas de los muros no están
		// repartidas: se agregan ahora, sin volver a repartir el resto (repartir
		// acá reiniciaría el reloj de la letra, o sea regalaría tiempo por
		// acercarse a una presa)
		if (seco && !qte) dealPhase();
	}
	if (hunt.det) return; // el ataque ya está puesto: no se anuncia dos veces
	hunt.det = 1;
	sfx(150, 260, "sine", 0.05, 620);
	burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#c8f", 20);
	say("ATAQUE DE DETERMINACIÓN", "LA LETRA VIOLETA ATRAVIESA EL MURO", "#c8f");
}

// ---- CUÁNTO SUENA EL CORAZÓN -----------------------------------------------
// Un solo número, 0..1, y manda el más fuerte de los tres motivos que lo suben:
//
//   · LA PROXIMIDAD.  Es el motivo principal y el que se siente todo el tiempo:
//     entra en fade a HEART_NEAR celdas y llega al tope encima de la presa.
//   · EL QTE.  Durante el anillo el latido ocupa EL LUGAR del ruido blanco, así
//     que sube con el mismo `muf` con el que se hunde la música (ver frame): no
//     es un fade y después el otro, es un reemplazo.
//   · EL ACECHADOR SOLO.  Cuando no queda nadie más la música se apaga (huntBite)
//     y esto se queda solo en la pista, con su piso propio.
const huntHeart = () => {
	if (!huntOn()) return 0;
	let k = Math.max(HEART_BASE, 1 - huntNear() / HEART_NEAR);
	if (qte) k = Math.max(k, muf);
	if (huntLast()) k = Math.max(k, HEART_SOLO);
	return Math.min(1, k);
};

// ---- fase A: el buildup ----------------------------------------------------
function huntStart() {
	if (hunt) return;
	dreadOff();
	[BGM, VIBE].forEach((a) => {
		try {
			a.pause();
		} catch (e) {}
	});
	srcOn(HUNT); // los 2,3 MB recién acá, y sólo acá
	HUNT.muted = BGM.muted;
	HUNT.volume = HUNT.v0;
	try {
		HUNT.currentTime = 0;
	} catch (e) {}
	play(HUNT).catch(() => {});
	hunt = {
		ph: "build",
		t0: now(),
		eaten: 0,
		esc: 0,
		bit: 0, // ¿ya se comió la torre?
		prey: -1, // a cuál le está clavando el diente
		slow: [],
		// EL EPÍLOGO se dibuja con lo que pasó en la cacería, no con un resumen de
		// números: acá cae una marca por cada presa devorada —dónde cayó y si era el
		// acechador— y al final la luz las va encendiendo una por una.  `beat` es el
		// último corte del epílogo que ya sonó, para que cada golpe salga UNA vez.
		marks: [],
		beat: 0,
	};
	// LA HORDA.  Los que quedaron vivos al llegar a la puerta más los que falten para
	// HUNT_PREY: nadie desaparece y nadie aparece de la nada más allá de eso.
	while (foes.length > HUNT_PREY) foes.pop();
	while (foes.length < HUNT_PREY) foes.push(far());
	hunt.slow = foes.map(() => 0);
	prevFoe = [];
	// la primera mitad se terminó: las monedas están todas y los faroles ya no
	coins = [];
	lamps = [];
	revealT = 0;
	radar = null;
	qte = null;
	graceT = 0;
	scareUntil = 0;
	note = null;
	unlockT = 0;
	shake = 16;
	deal(); // el tablero queda consistente aunque durante el buildup no se teclee
	sfx(70, 900, "sine", 0.09, 30);
}

// A los HUNT_EAT: el gato se come la torre.  Es EL momento del nivel, así que el
// cambio de piel entra de golpe y completo —sprite, paleta del canvas, tema del CSS
// y las paredes rehorneadas en rojo—.  Un degradado suave acá sería un chiste: lo
// que tiene que pasar es que el jugador levante las cejas.
function huntBiteTower() {
	hunt.bit = 1;
	PAL = PALS.hunt;
	root.classList.add("hunt");
	rankShow(rankI(), false); // el rango repinta ahora, no en el próximo tramo
	bakeMaze(); // las paredes están horneadas: hay que volver a hornearlas rojas
	flash = 1;
	shake = 22;
	burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#fd0", 40);
	burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#f22", 40);
	play(BANG).catch(() => {});
	boom.src = "";
	boom.src = BOOM;
	boom.style.cssText = `position:absolute;display:block;pointer-events:none;z-index:2;top:${((p.y * S - 34) / BH) * 100}%;left:${((p.x * S - 34) / BW) * 100}%;width:${(110 / BW) * 100}%`;
	setTimeout(() => (boom.style.display = "none"), 1100);
	sfx(140, 700, "sawtooth", 0.08, 42);
}

// El salto del buildup.  Sólo si ya se vio entero (huntSeen), y salta al PUNTO EXACTO
// de la pista: se adelanta el mp3 al drop Y se corre el reloj de la cinemática la
// misma cantidad, así que imagen y música caen juntas en el mismo instante en el que
// habrían caído solas.  No es un fundido a negro: es el mismo golpe, antes.
function huntSkip() {
	if (!huntHold() || !huntSeen || now() - hunt.t0 < HUNT_SKIP_AT) return false;
	if (!hunt.bit) huntBiteTower(); // la transformación no se saltea, se adelanta
	hunt.t0 = now() - HUNT_BUILD;
	try {
		HUNT.currentTime = HUNT_DROP;
	} catch (e) {}
	return true;
}

// ---- fase B: la cacería ----------------------------------------------------
// EL ZARPAZO.  `d` es el campo de flujo desde el gato, así que d[celda] es la
// distancia REAL por el laberinto: con HUNT_REACH = 1 basta con estar en la celda de
// al lado —o encima— para clavarle el diente.  Es lo que impide que esto se vuelva
// el gato y el ratón: sin esto, dos cosas que se mueven en un laberinto se persiguen
// para siempre y la única forma de terminar sería aburrirse.
function huntGrab(d) {
	if (qte || !huntOn()) return;
	let best = -1,
		bd = 1e9;
	foes.forEach((f, i) => {
		if (i < (LV.stalk || 0) && !huntLast()) return; // el acechador, al final
		const q = d[f];
		if (q >= 0 && q <= HUNT_REACH && q < bd) {
			bd = q;
			best = i;
		}
	});
	if (best < 0) return;
	hunt.prey = best;
	qteStart();
}

// ---- LA GEOMETRÍA DEL ANILLO -----------------------------------------------
// Tres cuentas que necesitan IGUALES el dibujo del anillo y la dentellada: dónde
// caen las letras, de qué tamaño está el cuerpo y en qué ángulo quedó cada pedazo.
// Estaban sueltas adentro del overlay, y con eso la sangre de un mordisco salía de
// un lado y el pedazo faltaba del otro.
const ringRad = () => Math.min(BW, BH) * 0.3;
const ringSz = (gr) => Math.min(BW, BH) * (0.42 - 0.1 * gr);
const ringAng = (i, n) => -1.571 + (6.283 * i) / n;
// lo que dura el golpe de una dentellada en pantalla: el tirón del cuerpo y el
// fogonazo del pedazo se apagan juntos, en el mismo reloj
const BITE_MS = 240;

// ---- LA DENTELLADA ----------------------------------------------------------
// Cada letra del anillo es un MORDISCO, y sonaba a menú: un blip sintetizado y
// ocho chispas rojas que salían para todos lados.  Un mordisco de verdad son
// cuatro cosas que pasan juntas, y son las cuatro que hace esto:
//
//   · LA BOCA.  El mp3 (`nom`), que es lo único de la cacería que no está
//     sintetizado.  Cada dentellada sale más grave y más fuerte que la anterior:
//     el bicho se va quedando sin cuerpo y la boca se va acercando al hueso.  Y
//     debajo, el crujido sintetizado de siempre, que ahora hace de hueso.
//   · EL PEDAZO.  El sector deja de dibujarse (eso ya estaba) y abajo aparece la
//     carne: el hueco no puede ser el fondo de la pantalla.
//   · LO QUE SALTA.  Sangre en cono y HACIA AFUERA del mordisco, no un chispazo
//     redondo (ver spray).
//   · EL TIRÓN.  El cuerpo se sacude para el lado contrario y vuelve solo. Es lo
//     que separa "una porción dejó de dibujarse" de "algo le arrancó un pedazo".
function huntChomp(i) {
	const n = qte.seq.length,
		k = qte.i / n, // 0..1: cuánto del bicho va, con éste adentro
		a = ringAng(i, n),
		gr = Math.min(1, Math.max(0, 1 - (qte.until - now()) / qte.ms)),
		// el punto exacto del mordisco: sobre el cuerpo, en el ángulo del pedazo
		bx = BW / 2 + Math.cos(a) * ringSz(gr) * 0.72,
		by = BH / 2 + Math.sin(a) * ringSz(gr) * 0.72;
	qte.bit = { t: now(), a, i }; // el tirón y el fogonazo los dibuja el overlay
	nom(1.16 - 0.3 * k + (Math.random() - 0.5) * 0.09, 0.5 + 0.45 * k);
	sfx(150 - 60 * k, 90 + 60 * k, "sawtooth", 0.05, 34 - 10 * k); // el hueso
	shake = Math.max(shake, 9 + 7 * k);
	flash = Math.max(flash, 0.22 + 0.2 * k);
	spray(bx, by, a, "#f22", 16, 3.6); // la que sale disparada...
	spray(bx, by, a + 3.1416, "#7d0d1c", 7, 1.5); // ...y la que chorrea para adentro
}

// Devorada resuelta.  Sale por acá TODO el QTE de anillo (ver qteEnd), así que no
// toca ni una línea del QTE normal: son dos juegos distintos con la misma pantalla.
function huntBite(okAll) {
	const i = hunt.prey,
		round = (qte && qte.round) || 1,
		rounds = (qte && qte.rounds) || 1,
		ace = i > -1 && i < (LV.stalk || 0);
	qte = null;
	if (i < 0 || i >= foes.length) return; // la presa ya no está: nada que cobrar
	// una ronda ganada que no es la última: se encadena sin soltar la pantalla, igual
	// que la tanda del acechador de la primera mitad
	if (okAll && round < rounds) {
		// ...y la ronda ganada queda COBRADA aunque la siguiente se pierda: si el
		// acechador se te escapa, la próxima pelea arranca con las que le faltan
		// (ver qteStart).  Es lo único del sótano que se guarda entre encuentros.
		if (ace) hunt.aceDone = (hunt.aceDone || 0) + 1;
		shake = 13;
		// la ronda se cierra de un tarascón: más grave que las dentelladas sueltas
		// que la fueron abriendo, porque acá se lleva un pedazo entero
		nom(0.82, 0.95);
		sfx(160, 90, "sawtooth", 0.06, 60);
		burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#f22", 16);
		qteStart({ round: round + 1, rounds });
		return;
	}
	if (okAll) {
		// PRESA DEVORADA.  Se va de `foes` y con ella su lastre y su memoria de paso.
		// Pero DEJA LA MARCA: la celda donde cayó, que el epílogo va a encender con
		// la luz cuando el sótano se abra.  Es la única memoria que guarda la cacería
		// de sí misma, y es lo que hace que el final hable de la partida que se jugó
		// y no de una partida cualquiera.
		hunt.marks.push({ x: foes[i] % C, y: (foes[i] / C) | 0, ace, at: 0 });
		foes.splice(i, 1);
		hunt.slow.splice(i, 1);
		prevFoe.splice(i, 1);
		hunt.eaten++;
		hunt.prey = -1;
		kills++;
		maxKills = Math.max(maxKills, kills);
		comboUp();
		styleUp(HUNT_STYLE);
		graceT = now() + GRACE_MS;
		shake = 18;
		flash = 0.7;
		hits++;
		burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#f22", 34);
		play(BANG).catch(() => {});
		// EL ÚLTIMO BOCADO: el mismo mp3 de los mordiscos, al tono más grave y a
		// todo volumen.  Es la misma boca, y por eso la presa se termina con el
		// sonido con el que se la estuvo abriendo, no con un efecto de otro lado.
		nom(0.68, 1);
		sfx(90, 320, "sawtooth", 0.08, 38); // el crujido
		setTimeout(() => sfx(58, 220, "sine", 0.06, 30), 120);
		if (!foes.length) return huntFinish();
		// LA ÚLTIMA PRESA CAYÓ Y QUEDA EL ACECHADOR.  Acá se apaga la música —el
		// tema de la cacería no vuelve— y lo único que queda sonando en el sótano
		// es el corazón: el suyo.  Un final con banda sonora no es un final; el
		// silencio con algo latiendo adentro sí.  Desde este momento el latido
		// manda solo (ver huntHeart) y se DIBUJA en el tablero como el radar del
		// maullido: cuanto más cerca, más fuerte y más rápido.
		if (huntLast()) {
			try {
				HUNT.pause();
			} catch (e) {}
			hunt.solo = 1;
		}
		say(
			ace
				? "¡EL ACECHADOR ES TUYO!"
				: huntLast()
					? "SÓLO QUEDA EL ACECHADOR"
					: "DEVORADA",
			huntLast() ? "ESCUCHÁ SU CORAZÓN" : `QUEDAN ${foes.length}`,
			PAL.foe,
		);
		// letras nuevas, por el mismo motivo que las reparte qteEnd: el zarpazo salta
		// EN MEDIO del paso —el QTE se abre justo después de que te moviste— así que
		// las que están en pantalla son las de la celda anterior.  Sin esto, salir de
		// una devorada te deja tecleando el laberinto de hace un movimiento.
		deal();
		return;
	}
	// SE TE ESCAPÓ.  No hay susto ni castigo de tiempo: acá el jugador es el que
	// muerde, y un jumpscare le devolvería el papel de víctima justo cuando el nivel
	// entero está diciendo lo contrario.  El precio es que la presa se va... y el
	// premio de consuelo es que se va coja: un beat más lenta y con UN PEDAZO MENOS
	// en el anillo la próxima vez —y el reloj del anillo no se achica con él, así que
	// cada escape le regala margen al que la persigue—.  Vale para el acechador
	// igual que para las otras cuatro, y él encima no recupera las rondas que ya le
	// ganaste.  Tres escapes seguidos y prácticamente se entrega.
	hunt.esc++;
	hunt.slow[i]++;
	hunt.prey = -1;
	combo = 0;
	kills = 0;
	fails++;
	styleDown(STYLE_ERR);
	flash = 1;
	shake = 12;
	sfxBad();
	huntFlee(i);
	const quedan = Math.max(1, HUNT_ACE_ROUNDS - (hunt.aceDone || 0));
	say(
		ace ? "EL ACECHADOR SE ZAFÓ" : "SE TE ESCAPÓ",
		ace
			? `VUELVE CON ${quedan} RONDA${quedan > 1 ? "S" : ""} · UN PEDAZO MENOS`
			: "VA MÁS LENTA · UN PEDAZO MENOS",
		"#f80",
	);
	deal(); // ídem: la pantalla vuelve al laberinto y tiene que volver a la celda buena
}

// La presa que se zafó sale disparada por el campo de flujo: seis pasos subiendo,
// que es lo que hace falta para que el zarpazo no la agarre de nuevo en el acto.
// Se va corriendo, no se teletransporta: si el farol la agarra en el camino, se ve.
function huntFlee(i) {
	const d = flow();
	let c = foes[i];
	for (let n = 0; n < 6; n++) {
		const nb = open(c);
		if (!nb.length) break;
		c = nb.reduce((a, b) => (d[b] > d[a] ? b : a));
	}
	foes[i] = c;
	prevFoe[i] = -1;
	sfx(760, 260, "sawtooth", 0.05, 180); // el chillido, subiendo y yéndose
}

// ---- fase C: EL EPÍLOGO ----------------------------------------------------
// Acá se cerraba el nivel con un chispazo y, tres segundos después, el resumen.
// Era el final de la historia contado como el final de una partida cualquiera: el
// juego se pasaba doce segundos preparando la cacería y ni uno solo despidiéndola.
//
// Ahora la última dentellada abre una escena de nueve segundos con su propio reloj
// (ver FIN_T1..FIN_MS), y la escena no inventa nada: es el buildup dado vuelta.
// Cada pieza que usa ya estaba —la niebla, el latido, el radar del acechador, las
// partículas, los carteles—, sólo que ahora todas apuntan al mismo lado.
function huntFinish() {
	hunt.ph = "end";
	hunt.t0 = now();
	win = true;
	tEnd = now() - t0;
	dreadOff(); // el ruido blanco es de la primera mitad: acá no pinta nada
	huntSaw(); // se llegó al final: el buildup ya se puede saltar
	const bb = bests[LV.id];
	newPB = bb === undefined || tEnd + pen < bb;
	if (newPB) bests[LV.id] = tEnd + pen;
	resAt = now() + FIN_MS; // el resumen espera a que la escena termine
	flash = 1;
	shake = 24;
	burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#f22", 60);
	burst((p.x + 0.5) * S, (p.y + 0.5) * S, "#fd0", 24);
	// el mismo acorde descendente de antes, pero es lo ÚLTIMO que suena que no sea
	// un corazón: de acá al cartel el sótano se queda sin música a propósito
	[196, 165, 131, 98].forEach((f, i) =>
		setTimeout(() => sfx(f, 700, "sawtooth", 0.09, 40), i * 220),
	);
	say("NO QUEDA NINGUNA", "SE ACABÓ EL HAMBRE", PAL.foe);
}

// EL LATIDO DEL EPÍLOGO.  Durante la cacería el corazón que se oye es el de la presa
// (ver huntHeart); cuando no queda ninguna, el que sigue latiendo es el tuyo —y es
// la primera vez en todo el juego que el gato blanco tiene uno—.  Arranca desbocado
// por la carrera y se va calmando hasta quedar en nada, con el volumen y la prisa
// bajando juntos: es el único "fundido" del final y no hace falta ninguno más.
function heartFin(e) {
	if (e >= FIN_T5) return heartOff(); // el último golpe lo da el epílogo, sintetizado
	const k =
		e < FIN_T1
			? 0.95
			: e < FIN_T3
				? 0.95 - 0.5 * ((e - FIN_T1) / (FIN_T3 - FIN_T1))
				: 0.45 - 0.33 * ((e - FIN_T3) / (FIN_T5 - FIN_T3));
	heartSl = 1 - 0.4 * Math.min(1, e / FIN_T5); // ...y se va quedando lento
	heartSet(k);
}

// El salto del epílogo: mismas reglas que el del buildup (ver huntSkip).  La primera
// vez va entero —es EL final de la historia, y un final que se puede saltar sin
// haberlo visto nunca no es un final—; de la segunda en adelante, el que ya lo vio
// tiene derecho a ir directo al resumen.
function huntFinSkip() {
	if (!huntFin() || !finSeen || now() - hunt.t0 < FIN_SKIP_AT) return false;
	hunt.t0 = now() - FIN_MS; // la escena queda en su último cuadro: negro
	hunt.beat = 5;
	(hunt.marks || []).forEach((m) => {
		if (!m.at) m.at = now() - 600; // encendidas y ya asentadas
	});
	heartOff();
	resShow();
	return true;
}

// LOS CORTES DEL EPÍLOGO: lo único que hace es disparar UNA vez lo que suena en cada
// tramo y encender las marcas cuando la luz las alcanza.  Todo lo demás —lo que se
// ve— sale del mismo `e` en huntFinDraw, así que la escena no puede desincronizarse
// consigo misma ni aunque el navegador se coma cuadros.
function huntEnd(T) {
	const e = T - hunt.t0;
	// las marcas se encienden CUANDO LA LUZ LAS TOCA, no por reloj: el orden y el
	// ritmo con el que aparecen los pone la geometría de la partida que se jugó
	if (e >= FIN_T2 && e < FIN_T4) {
		const r = finLight(e) * 0.8; // el borde visible de la niebla, no su radio
		hunt.marks.forEach((m, i) => {
			if (m.at || Math.hypot(m.x - p.x, m.y - p.y) > r) return;
			m.at = T;
			sfx(300 + i * 55, 150, "triangle", 0.05, 190);
			burst((m.x + 0.5) * S, (m.y + 0.5) * S, PAL.foe, 10);
		});
	}
	const b =
		e < FIN_T1
			? 0
			: e < FIN_T2
				? 1
				: e < FIN_T3
					? 2
					: e < FIN_T4
						? 3
						: e < FIN_T5
							? 4
							: 5;
	if (b <= hunt.beat) return;
	hunt.beat = b;
	if (b === 1) sfx(48, 1800, "sine", 0.05, 40); // el sótano vacío, en sub
	else if (b === 2) {
		// LA LUZ. Un barrido que sube mientras la niebla se abre: es el sonido de
		// mirar, y es lo contrario del acorde con el que se cerró la oscuridad
		sfx(120, 1600, "sine", 0.055, 640);
		shake = 6;
	} else if (b === 3) {
		const n = hunt.marks.length;
		say(
			`${n} MARCA${n === 1 ? "" : "S"}`,
			"NO QUEDÓ NADA VIVO ACÁ ABAJO",
			PAL.foe,
		);
		sfx(70, 900, "sine", 0.07, 44);
	} else if (b === 4) {
		sfx(70, 1500, "sine", 0.09, 34); // el cartel entra con un golpe grave
		shake = 10;
	} else if (b === 5) {
		// EL ÚLTIMO LATIDO, y ya sin mp3: cae en el silencio, con la pantalla en
		// negro, y es lo último que se oye del sótano
		heartOff();
		sfx(58, 150, "sine", 0.13, 34);
		setTimeout(() => sfx(46, 220, "sine", 0.09, 26), 165);
		shake = 8;
		finSaw(); // se vio entero: la próxima vez se puede saltar
	}
}

// devuelve el sótano a como estaba: lo llama gen() antes de hornear nada
function huntReset() {
	if (hunt) {
		try {
			HUNT.pause();
		} catch (e) {}
		heartOff();
	}
	hunt = null;
	PAL = PALS.base;
	root.classList.remove("hunt");
}

// El reloj de las tres fases.  Va con el reloj DEL JUEGO, así que el menú de pausa
// congela la cinemática igual que congela todo lo demás (y frame() le para el mp3).
function huntStep(T) {
	if (!hunt) return;
	if (hunt.ph === "end") return huntEnd(T);
	if (hunt.ph !== "build") return;
	const e = T - hunt.t0;
	if (!hunt.bit && e >= HUNT_EAT) huntBiteTower();
	if (e < HUNT_BUILD) return;
	hunt.ph = "hunt";
	hunt.t0 = T;
	foeTick = T;
	shownAt = T;
	graceT = T + GRACE_MS;
	huntSaw();
	deal(); // letras nuevas: el buildup se comió las que había
	say("LA CACERÍA", `${foes.length} PRESAS · NO DEJES NINGUNA`, PAL.foe);
}

// ---- lo que la cacería DIBUJA ----------------------------------------------
// Va después de la niebla y antes de las letras, en coordenadas de tablero, igual
// que la onda del maullido: en el sótano lo que importa se ve aunque no se vea nada.

// La torre de nuggets del buildup.  La foto viene con FONDO BLANCO —es una foto de
// producto—, y un rectángulo blanco encima de un laberinto negro se lee como un
// error de carga, no como una súper píldora.  Se recorta en círculo y se le pone un
// halo dorado detrás: el blanco que sobrevive al recorte deja de ser fondo y pasa a
// ser el resplandor de la cosa, que es justo lo que tiene que parecer.
function huntTower(cx, cy, r, k) {
	const q = 0.5 + 0.5 * Math.sin(k * 14); // late más rápido cuanto más cerca está
	x.save();
	x.shadowColor = "#fd0";
	x.shadowBlur = (26 + 30 * q) * GLOW;
	const gr = x.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.5);
	gr.addColorStop(0, `rgba(255,225,120,${(0.5 + 0.3 * q).toFixed(3)})`);
	gr.addColorStop(1, "rgba(255,180,0,0)");
	x.fillStyle = gr;
	x.beginPath();
	x.arc(cx, cy, r * 1.5, 0, 6.283);
	x.fill();
	x.shadowBlur = 0;
	x.beginPath();
	x.arc(cx, cy, r, 0, 6.283);
	x.clip();
	if (ready(NUGG)) {
		// la foto se dibuja CUBRIENDO el disco (recortando a los lados), no encajada
		// adentro: encajada dejaba dos bordes rectos de fondo blanco y el círculo se
		// leía como una foto pegada.  Cubriendo, el blanco llena el disco entero y con
		// el tinte dorado de abajo deja de ser papel y pasa a ser luz.
		const ar = NUGG.naturalWidth / NUGG.naturalHeight || 1.5;
		x.drawImage(NUGG, cx - r * ar, cy - r, r * 2 * ar, r * 2);
		x.fillStyle = `rgba(255,186,40,${(0.2 + 0.16 * q).toFixed(3)})`;
		x.beginPath();
		x.arc(cx, cy, r, 0, 6.283);
		x.fill();
	} else {
		// sin la foto, la torre igual existe: un montón de bultos dorados
		x.fillStyle = "#e9a63a";
		for (let i = 0; i < 22; i++) {
			const a = (i * 2.4) % 6.283,
				rr = r * (0.15 + 0.6 * ((i * 7) % 11) / 11);
			x.beginPath();
			x.arc(
				cx + Math.cos(a) * rr,
				cy + Math.sin(a) * rr * 0.7,
				r * 0.22,
				0,
				6.283,
			);
			x.fill();
		}
	}
	x.restore();
}

function huntScene(T) {
	if (!hunt) return;
	const e = T - hunt.t0;
	// ---- las presas SE VEN a través de la niebla -----------------------------
	// "Visión de hambre": el que caza no busca a ciegas.  Sin esto la cacería se
	// vuelve recorrer un sótano oscuro esperando chocarse con algo, que es
	// exactamente la sensación de la PRIMERA mitad y lo contrario de lo que esta
	// parte tiene que dar.  Las presas se ven; llegar a ellas es lo que cuesta.
	if (hunt.ph !== "end") {
		const q = 0.5 + 0.5 * Math.sin(T / 170);
		foes.forEach((f, i) => {
			const X = (f % C) * S + S / 2,
				Y = ((f / C) | 0) * S + S / 2,
				ace = i < (LV.stalk || 0);
			x.shadowColor = ace ? "#f22" : "#f66";
			x.shadowBlur = (10 + 12 * q) * GLOW;
			x.globalAlpha = 0.35 + 0.3 * q;
			x.fillStyle = ace ? "#f22" : "#f77";
			x.beginPath(); // un rombo, el mismo lenguaje que los faroles
			x.moveTo(X, Y - 9);
			x.lineTo(X + 6, Y);
			x.lineTo(X, Y + 9);
			x.lineTo(X - 6, Y);
			x.closePath();
			x.fill();
			// los ojos: dos puntos que no parpadean nunca
			x.globalAlpha = 0.8 + 0.2 * q;
			x.fillStyle = "#fff";
			for (const o of [-3.2, 3.2]) x.fillRect(X + o - 1, Y - 2, 2, 2);
			x.globalAlpha = 1;
		});
		x.shadowBlur = 0;
	}
	if (huntFin()) return huntFinDraw(T, e);
	if (hunt.ph !== "build") return;

	// ---- el buildup ----------------------------------------------------------
	// todo el dibujo sale de `e`: no hay un solo timer más que el reloj del juego
	// El gato está SIEMPRE en la esquina de la puerta cuando arranca esto, así que
	// una torre centrada en él se salía media pantalla por el borde y se veía como un
	// recorte, no como un objeto.  Se la mantiene entera dentro del tablero y el cono
	// de luz se encarga de decir sobre quién está cayendo.
	const r0 = S * 2,
		cx = Math.max(r0, Math.min(BW - r0, (vis.x + 0.5) * S)),
		cy = (vis.y + 0.5) * S;
	// la oscuridad se cierra sobre el gato durante el primer segundo
	if (e < 1400) {
		x.fillStyle = `rgba(2,0,4,${(0.7 * (1 - e / 1400)).toFixed(3)})`;
		x.fillRect(0, 0, BW, BH);
	}
	if (!hunt.bit) {
		// LA TORRE BAJA.  Arranca fuera del tablero y termina encima del gato justo
		// cuando el reloj llega a HUNT_EAT: la caída ES la cuenta regresiva.
		const k = Math.max(0, Math.min(1, (e - 800) / (HUNT_EAT - 800))),
			ease = k * k,
			ty = -S * 2 + (cy - S * 0.9 + S * 2) * ease,
			r = S * (0.5 + 1.5 * ease);
		huntTower(cx, ty, r, k);
		// y el gato la mira: un cono de luz dorada desde la torre hasta él
		const px = (vis.x + 0.5) * S;
		x.globalAlpha = 0.12 + 0.2 * ease;
		x.fillStyle = "#fd0";
		x.beginPath();
		x.moveTo(cx - r * 0.5, ty);
		x.lineTo(cx + r * 0.5, ty);
		x.lineTo(px + S * 0.5, cy + S * 0.4);
		x.lineTo(px - S * 0.5, cy + S * 0.4);
		x.closePath();
		x.fill();
		x.globalAlpha = 1;
	} else {
		// LA TRANSFORMACIÓN.  La cara nueva ocupa el tablero entero un segundo largo
		// y se va: es la única vez que se ve grande, y por eso es la que queda.
		const k = Math.max(0, Math.min(1, (e - HUNT_EAT) / 1300));
		if (ready(REDPJ)) {
			x.globalAlpha = (1 - k) * 0.92;
			const w = BW * (1 + 0.25 * k),
				h = BH * (1 + 0.25 * k);
			x.drawImage(REDPJ, (BW - w) / 2, (BH - h) / 2, w, h);
			x.globalAlpha = 1;
		}
		x.fillStyle = `rgba(140,0,20,${(0.3 * (1 - k)).toFixed(3)})`;
		x.fillRect(0, 0, BW, BH);
	}
	// el título entra con el último tramo del buildup, letra por letra
	if (e > HUNT_EAT) {
		const k = Math.min(1, (e - HUNT_EAT) / (HUNT_BUILD - HUNT_EAT)),
			t = "LA CACERÍA".slice(0, Math.max(1, Math.round(k * 10)));
		x.font = "italic 900 " + Math.round(BW / 11) + "px " + DF;
		x.shadowColor = "#f00";
		x.shadowBlur = 26 * GLOW;
		x.fillStyle = "#fff";
		x.fillText(t, BW / 2, BH / 2);
		x.shadowBlur = 0;
	}
	// SALTAR: sólo si ya se vio entero alguna vez (ver huntSkip).  Chiquito y abajo:
	// el que lo necesita lo busca, y al que lo ve por primera vez no le roba el golpe.
	if (huntSeen && e >= HUNT_SKIP_AT) {
		x.font = "bold 11px " + CF;
		x.shadowBlur = 0;
		x.globalAlpha = 0.5 + 0.2 * Math.sin(T / 300);
		x.fillStyle = "#fbb";
		x.fillText(MOBILE ? "TOCÁ PARA SALTAR" : "[ESPACIO] SALTAR", BW / 2, BH - 12);
		x.globalAlpha = 1;
	}
}

// ---- EL EPÍLOGO, DIBUJADO ---------------------------------------------------
// Todo sale de `e`, igual que el buildup, y todo es una pieza que ya existía:
//
//   la oscuridad  = el mismo relleno negro con el que se abre el buildup
//   la luz        = el radio de la niebla (finLight), movido por el reloj del final
//   el latido     = el anillo del acechador, pero saliendo del gato
//   las marcas    = el rombo de la visión de hambre, apagado y en el piso
//   el cartel     = el título de LA CACERÍA, letra por letra, sin música debajo
//
// Ni un asset nuevo, ni un timer nuevo, ni una capa nueva: el final está hecho con
// el vocabulario que el jugador viene aprendiendo desde que entró al sótano, que es
// lo que lo hace sonar a final de ESTE juego y no a pantalla de créditos.
function huntFinDraw(T, e) {
	const PX = (vis.x + 0.5) * S,
		PY = (vis.y + 0.5) * S;

	// ---- 1) la oscuridad se cierra encima tuyo -------------------------------
	// Es el primer segundo del buildup al revés: allá el negro se abría para dejar
	// ver una presa; acá se cierra sobre el único que quedó vivo.
	const dark =
		e < FIN_T1
			? e / FIN_T1
			: e < FIN_T2
				? 1
				: Math.max(0, 1 - (e - FIN_T2) / (FIN_T3 - FIN_T2));
	if (dark > 0.01) {
		x.fillStyle = `rgba(2,0,4,${(0.58 * dark).toFixed(3)})`;
		x.fillRect(0, 0, BW, BH);
	}

	// ---- 2) EL LATIDO, VISTO -------------------------------------------------
	// El mismo anillo con el que se veía el corazón del acechador (mismo compás,
	// misma forma, mismo lub-dub), sólo que ahora sale del gato blanco y va en SU
	// color.  El sótano se quedó sin nada que latir excepto vos, y eso se ve antes
	// de que ningún cartel lo diga.
	const hw =
		e < FIN_T1
			? e / FIN_T1
			: e < FIN_T2
				? 1
				: e < FIN_T5
					? 0.45
					: Math.max(0, 0.45 * (1 - (e - FIN_T5) / (FIN_MS - FIN_T5)));
	if (hw > 0.02) {
		x.lineWidth = 1.8;
		x.strokeStyle = x.shadowColor = PAL.pj;
		for (const [off, esc] of [
			[0, 1],
			[0.26, 0.62],
		]) {
			const b = (heartPh - off + 1) % 1,
				k = Math.min(1, b / 0.42);
			if (b > 0.42) continue;
			x.globalAlpha = (1 - k) * (1 - k) * 0.9 * hw * esc;
			x.shadowBlur = 14 * GLOW;
			x.beginPath();
			x.arc(PX, PY, S * (0.22 + 1.7 * k) * esc, 0, 6.283);
			x.stroke();
		}
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// ---- 3) LAS MARCAS -------------------------------------------------------
	// Una por presa devorada, en la celda donde cayó.  Se encienden solas cuando la
	// luz las alcanza (ver huntEnd), así que el orden lo pone la partida: la que
	// mordiste al lado tuyo prende primero y la del otro extremo del sótano cierra.
	// Es el rombo de la visión de hambre —el mismo dibujo— pero sin los ojos: eso
	// es exactamente lo que les pasó.
	hunt.marks.forEach((m) => {
		if (!m.at) return;
		const age = T - m.at,
			fl = Math.max(0, 1 - age / 420), // el fogonazo del encendido
			q = 0.5 + 0.5 * Math.sin(T / 300 + m.x + m.y), // ...y después, la brasa
			X = (m.x + 0.5) * S,
			Y = (m.y + 0.5) * S,
			col = m.ace ? "#f22" : PAL.foe,
			rr = S * (0.2 + 0.06 * q);
		x.shadowColor = col;
		x.shadowBlur = (8 + 10 * q + 26 * fl) * GLOW;
		x.globalAlpha = 0.35 + 0.3 * q + 0.5 * fl;
		x.fillStyle = col;
		x.beginPath();
		x.moveTo(X, Y - rr);
		x.lineTo(X + rr * 0.66, Y);
		x.lineTo(X, Y + rr);
		x.lineTo(X - rr * 0.66, Y);
		x.closePath();
		x.fill();
		// el anillo que se abre al encenderse, y el doble para el acechador: en el
		// sótano no todas las presas pesaban lo mismo, y el final tampoco miente
		if (fl > 0) {
			x.strokeStyle = col;
			x.lineWidth = 1.5;
			for (const o of m.ace ? [0, 0.28] : [0]) {
				const kk = fl - o;
				if (kk <= 0) continue;
				x.globalAlpha = kk * 0.8;
				x.beginPath();
				x.arc(X, Y, S * (0.22 + 0.8 * (1 - kk)), 0, 6.283);
				x.stroke();
			}
		}
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	});

	// ---- 4) LA PUERTA --------------------------------------------------------
	// La casilla por la que se entró a la cacería, que desde entonces no existe más
	// (exitOpen() da false con `hunt` encima).  Cuando la luz llega hasta allá vuelve
	// a verse, y es lo ÚNICO que no es rojo en todo el sótano: el camino de salida
	// sigue estando, y ahora sí se puede usar.
	if (finLight(e) * 0.8 >= Math.hypot(C - 1 - vis.x, R - 1 - vis.y)) {
		const q = 0.5 + 0.5 * Math.sin(T / 420);
		x.shadowColor = "#0f9";
		x.shadowBlur = (10 + 12 * q) * GLOW;
		x.strokeStyle = `rgba(0,255,150,${(0.3 + 0.35 * q).toFixed(3)})`;
		x.lineWidth = 2;
		x.strokeRect((C - 1) * S + 9.5, (R - 1) * S + 9.5, S - 19, S - 19);
		x.shadowBlur = 0;
	}

	// ---- 5) EL SUSURRO -------------------------------------------------------
	// El cartel de la última presa decía ESCUCHÁ SU CORAZÓN.  Ese corazón dejó de
	// existir hace dos segundos y el sonido sigue: ésta es la única línea del juego
	// que hacía falta escribir para que eso se entienda.  Va pegada al gato, no en
	// el medio de la pantalla, y respira con el mismo pulso que el anillo.  Arranca
	// cuando el cartel de la última presa YA SE FUE (NOTE_MS): dos frases encimadas
	// en la misma pantalla no se leen ni se oyen.
	const wk =
		Math.min(1, Math.max(0, (e - NOTE_MS - 100) / 450)) *
		Math.min(1, Math.max(0, (FIN_T2 + 250 - e) / 450));
	if (wk > 0.01) {
		x.font = "bold 12px " + CF;
		x.globalAlpha = wk * (0.55 + 0.35 * (0.5 + 0.5 * Math.sin(T / 300)));
		x.shadowColor = PAL.pj;
		x.shadowBlur = 12 * GLOW;
		x.fillStyle = "#ffd7dd";
		x.fillText(
			"AHORA EL QUE LATE SOS VOS",
			Math.min(BW - 92, Math.max(92, PX)),
			Math.min(BH - 16, Math.max(20, PY + S * 1.7)),
		);
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// ---- 6) EL CARTEL --------------------------------------------------------
	// Letra por letra, igual que LA CACERÍA en el buildup, y a propósito con la
	// misma tipografía y el mismo halo rojo: son los dos extremos de la misma
	// escena.  La diferencia es que aquél caía con el drop de la pista y éste entra
	// sin música: abajo no hay más que un corazón yéndose.
	if (e >= FIN_T4) {
		const k = Math.min(1, (e - FIN_T4) / 1300),
			t = FIN_TTL.slice(0, Math.max(1, Math.round(k * FIN_TTL.length))),
			pl = Math.min(1, (e - FIN_T4) / 260); // la placa entra antes que el texto
		x.globalAlpha = pl;
		x.fillStyle = "rgba(2,0,4,.78)";
		x.fillRect(0, BH / 2 - 44, BW, 88);
		x.strokeStyle = "rgba(255,60,90,.55)";
		x.lineWidth = 1;
		x.strokeRect(0.5, BH / 2 - 43.5, BW - 1, 87);
		x.font = "italic 900 " + Math.round(BW / 15) + "px " + DF;
		x.shadowColor = "#f00";
		x.shadowBlur = 26 * GLOW;
		x.fillStyle = "#fff";
		x.fillText(t, BW / 2, BH / 2 - 6);
		// ...y el remate, en voz baja, recién cuando el cartel ya está entero
		const pk = Math.min(1, Math.max(0, (e - FIN_T4 - 1300) / 800));
		if (pk > 0) {
			x.font = "bold 13px " + CF;
			x.globalAlpha = pl * pk * 0.85;
			x.shadowBlur = 10 * GLOW;
			x.fillStyle = "#ffb3bd";
			x.fillText("POR AHORA", BW / 2, BH / 2 + 26);
		}
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// SALTAR: mismas reglas y mismo lugar que el del buildup (ver huntFinSkip)
	if (finSeen && e >= FIN_SKIP_AT && e < FIN_T5) {
		x.font = "bold 11px " + CF;
		x.globalAlpha = 0.5 + 0.2 * Math.sin(T / 300);
		x.fillStyle = "#fbb";
		x.fillText(MOBILE ? "TOCÁ PARA SALTAR" : "[ESPACIO] SALTAR", BW / 2, BH - 12);
		x.globalAlpha = 1;
	}
}

// El velo rojo de la cacería: un vignette que respira y se cierra con cada presa.
// Es lo último que se pinta sobre el mundo, así que tiñe todo lo de abajo sin tapar
// las letras ni el QTE, que se dibujan después.
function huntVeil(T) {
	if (!hunt || hunt.ph === "build") return;
	const q = 0.5 + 0.5 * Math.sin(T / 420),
		k = hunt.eaten / HUNT_PREY;
	x.fillStyle = `rgba(120,0,18,${(0.06 + 0.05 * q + 0.06 * k).toFixed(3)})`;
	x.fillRect(0, 0, BW, BH);
}

// ---- el cartel de las dos habilidades (tutorial) ---------------------------
// La determinación y el maullido se contaban en un renglón del menú y nada más:
// se leían, no se reconocían.  Ahora tienen el mismo trato que el QTE —primero
// se MUESTRAN y después se cuentan—: el juego se congela, corre la escena en
// chico (el gato blanco cruzando el muro por la letra violeta, o la onda del
// maullido sacando a los gatos negros de encima) y recién al decir ENTENDIDO
// arranca el paso donde hay que usarla.  Todo el movimiento lo hace el CSS: con
// el cartel en display:none las animaciones no corren.
//
// Y no se cierra con el teclado, por lo mismo que el otro: el maullido SE SUELTA
// con ESPACIO, así que un espacio ya en camino se llevaría puesta la explicación
// de lo que estaba por leer.
const HAB_LOCK = 1200;
let habAt = 0;
function habShow(k) {
	habAt = now();
	if (!paused) {
		paused = true;
		pauseAt = now();
	}
	if (MOBILE) kb.blur(); // el teclado del teléfono taparía medio cartel
	hab.className = "on " + k;
}
const habOn = () => /(^| )on( |$)/.test(hab.className);
const habReady = () => habOn() && now() - habAt >= HAB_LOCK;
function habGo() {
	if (!habReady()) return;
	hab.className = "";
	unpause();
	if (MOBILE) kbFocus();
}
hok.onclick = habGo;

// ---- la pausa del primer encuentro (tutorial) ------------------------------
// El gato te alcanzó por primera vez.  En vez de tirarte el QTE encima, el juego
// se congela entero —el mismo `paused` que usan el menú y el diálogo de skill
// issue, así que el reloj, los gatos, el respiro y el maullido quedan quietos— y
// el cartel explica qué hay que teclear.  Recién al decir ESTOY LISTO arranca el
// QTE, y arranca con la versión blanda de arriba.
//
// Este cartel no se puede perder por accidente: es la ÚNICA vez que el juego
// explica el sistema y aparece justo cuando el jugador está tecleando para
// moverse.  Por eso sale sólo por su botón (ver onkeydown) y ni siquiera de
// entrada: durante BRIEF_LOCK ms el botón está apagado —lo muestra cargándose—
// y el clic que ya venía en camino no se lleva la explicación puesta.
const BRIEF_LOCK = 1400;
let briefAt = 0;
function briefShow() {
	briefSeen = 1;
	briefAt = now();
	if (!paused) {
		paused = true;
		pauseAt = now();
	}
	if (MOBILE) kb.blur(); // el teclado del teléfono taparía medio cartel
	brief.className = "on";
}
const briefReady = () =>
	brief.className === "on" && now() - briefAt >= BRIEF_LOCK;
function briefGo() {
	if (!briefReady()) return; // todavía se está leyendo
	brief.className = "";
	unpause();
	if (MOBILE) kbFocus(); // devolver el teclado que cerró el cartel
	qteStart(); // ahora sí: con briefSeen puesto, la pausa no se repite
}
bok.onclick = briefGo;

// El enemigo te come la pantalla mientras suena el grito.  El ACECHADOR del
// sótano trae los suyos —su cara y su grito— y encima sale distinto: el resto
// corta de golpe cuando el mp3 termina, y él se DESVANECE.  La imagen la apaga el
// CSS (#scare.fade) y el audio baja con el mismo perfil desde frame(), así que el
// susto no termina, se disuelve: es lo que lo deja pegado un rato más.
const SCARE_FADE = 2200; // lo que tarda en irse el del acechador
let scareA = null, // el audio que está sonando ahora
	scareFade = 0; // cuándo arrancó su desvanecido (0 = no se desvanece)
function scareShow(st) {
	frozen = true;
	mufSlow = 1; // hubo jumpscare: la música vuelve por el camino largo
	const ace = !!st;
	scareA = ace ? LOBO : SCREAM;
	scare.style.backgroundImage = `url(${(ace && ready(STALK) ? STALK : BIG).src})`;
	scare.className = ace ? "fade" : "";
	scare.style.display = "block";
	scareFade = ace ? now() : 0;
	if (scareA.volume !== undefined) scareA.volume = 1;
	SCREAM.onended = ace ? null : scareHide;
	play(scareA).catch(scareHide);
	clearTimeout(scareT);
	// el acechador se va con su fade; el resto, cuando el grito termina (y a los
	// 8 s igual, ponytail: red por si el audio no suena)
	scareT = setTimeout(scareHide, ace ? SCARE_FADE : 8000);
}
function scareHide() {
	clearTimeout(scareT);
	dreadOff();
	SCREAM.onended = null;
	scare.style.display = "none";
	scare.className = "";
	if (scareA) {
		if (scareA.volume !== undefined) scareA.volume = 1;
		if (!scareA.paused) scareA.pause();
	}
	scareA = null;
	scareFade = 0;
	frozen = false;
	deal();
}

const LOG_KEEP = 180; // el div muestra 3 renglones; el resto sobra
function push(k, kind) {
	log.push({ k, kind });
	if (!MOBILE) {
		// en el teléfono el log ni se dibuja
		logEl.insertAdjacentHTML(
			"beforeend",
			`<span class="${CLS[kind]}">${k.toUpperCase()}</span>`,
		);
		// sin tope, una partida larga dejaba cientos de <span> invisibles y cada tecla
		// costaba un reflow más caro que la anterior
		while (logEl.childElementCount > LOG_KEEP)
			logEl.removeChild(logEl.firstChild);
		logEl.scrollTop = logEl.scrollHeight;
	}
	checkSkill(); // se evalúa con cada tecla registrada
}

// Las letras VIOLETAS y nada más: los MUROS de la celda actual que dan a otra celda
// del tablero.  Quedan marcados en `phase` y son los únicos que se pueden atravesar.
// Los muros del borde no entran: la letra caería fuera del canvas y no lleva a ningún
// lado.  Va aparte de deal() porque el ataque de determinación de la cacería las
// prende A MITAD de una letra —la carga llega por acercarse a una presa, no por
// teclear— y ahí NO se puede repartir de nuevo: eso reiniciaría `shownAt`.
function dealPhase() {
	const usadas = new Set(Object.values(letters)),
		free = [...POOL]
			.filter((c) => !usadas.has(c))
			.sort(() => Math.random() - 0.5),
		i = p.y * C + p.x;
	["n", "e", "s", "w"].forEach((d) => {
		const nx = p.x + DV[d][0],
			ny = p.y + DV[d][1];
		if (g[i][d] && !phase[d] && nx >= 0 && ny >= 0 && nx < C && ny < R) {
			letters[d] = free.pop();
			phase[d] = 1;
		}
	});
}

// Letras nuevas para cada salida abierta de la celda actual, más las violetas de
// dealPhase() si hay DETERMINACIÓN encima.
function deal() {
	const free = [...POOL].sort(() => Math.random() - 0.5),
		i = p.y * C + p.x;
	letters = {};
	phase = {};
	["n", "e", "s", "w"].forEach((d) => {
		if (!g[i][d]) letters[d] = free.pop();
	});
	if (det > 0) dealPhase();
	shownAt = now();
	durBase = Math.max(LV.durMin, LV.dur0 - combo * 70); // más combo => menos tiempo para reaccionar
}

function burst(cx, cy, col, n = 14) {
	const m = Math.max(4, (n * PERF.dust) | 0); // en móvil el chispazo va más corto
	for (let i = 0; i < m; i++) {
		const a = Math.random() * 6.283,
			s = 1 + Math.random() * 2.5;
		parts.push({
			x: cx,
			y: cy,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s,
			l: 1,
			c: col,
		});
	}
}
// Lo mismo, pero en CONO y hacia un lado: lo que salta de una dentellada no sale
// en todas las direcciones, sale para afuera del mordisco.  Y sale en `gore`, que
// es una lista aparte por una razón de dibujo y no de diseño: el anillo de la
// cacería pinta un velo encima del tablero entero, así que las partículas de
// siempre —que se dibujan ANTES— quedarían debajo del velo y no se verían.  `gore`
// se dibuja adentro del anillo, sobre el cuerpo de la presa (ver el overlay).
function spray(cx, cy, ang, col, n, sp) {
	const m = Math.max(3, (n * PERF.dust) | 0);
	for (let i = 0; i < m; i++) {
		const a = ang + (Math.random() - 0.5) * 1.2,
			s = sp * (0.3 + Math.random());
		gore.push({
			x: cx,
			y: cy,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s,
			l: 1,
			c: col,
		});
	}
}
// cada error te devuelve un paso atrás por el camino que recorriste
function stepBack() {
	const c = trail.pop();
	if (c !== undefined) {
		pfrom = { c: p.y * C + p.x, t: now() }; // ver dodge()
		p = { x: c % C, y: (c / C) | 0 };
	}
}
function penalize(ms, col, kind, k) {
	pen += ms;
	combo = 0;
	styleDown(STYLE_ERR);
	fails++;
	shake = 9;
	flash = 1;
	kind === "late" ? sfxLate() : sfxBad();
	push(k, kind);
	burst(p.x * S + S / 2, p.y * S + S / 2, col, 10);
	stepBack();
	deal();
}

// ---- carteles a media pantalla ---------------------------------------------
// Los usa la salida desbloqueada y también los avisos de las dos habilidades.
// say() deja uno pendiente; banner() lo pinta y se apaga solo a los 1.8 s.
const NOTE_MS = 1800;
function say(a, b, col) {
	note = { t: now(), a, b, col };
}
function banner(T, at, a, b, col, dy) {
	const k = Math.max(0, 1 - (T - at) / NOTE_MS),
		Y = BH / 2 + (dy || 0);
	x.globalAlpha = k;
	x.fillStyle = "rgba(2,6,12,.88)";
	x.fillRect(0, Y - 32, BW, 58);
	x.strokeStyle = col;
	x.lineWidth = 1;
	x.shadowColor = col;
	x.shadowBlur = 12 * GLOW;
	x.strokeRect(0.5, Y - 31.5, BW - 1, 57);
	x.font = "italic 900 23px " + DF;
	x.shadowBlur = 20 * GLOW;
	x.fillStyle = col;
	x.fillText(a, BW / 2, Y - 13);
	x.font = "bold 13px " + CF;
	x.fillText(b, BW / 2, Y + 9);
	x.globalAlpha = 1;
	x.shadowBlur = 0;
}

const root = document.documentElement;
let lastW,
	lastLab,
	lastCw,
	lastMst,
	lastMw,
	lastSc,
	lastBop, // el frame no reescribe estilos que no cambiaron
	lastQs, // ...y el temblor del QTE tampoco
	lastT,
	lastEx,
	lastSub,
	lastMeta,
	lastRank = 0,
	hudAt = 0,
	lastDraw = 0;
const REVEAL_MS = 5000; // lo que dura encendido un farol
// ---- niebla horneada -------------------------------------------------------
// Evaluar un degradado radial sobre el tablero entero costaba más que TODO el
// resto del cuadro junto (17 de 28 ms con el móvil a 6x de throttle).  El
// degradado no cambia nunca: se hornea a un parche cuadrado una sola vez y el
// cuadro lo pega escalado al radio de visión (un blit) más los rectángulos
// sólidos de afuera.  Mismo dibujo, sin gradiente por píxel.
const FOG = "rgba(3,4,10,",
	FOG_N = 256;
let fogTex; // undefined = sin hornear · null = no se pudo
function bakeFog() {
	const c = document.createElement("canvas");
	c.width = c.height = FOG_N;
	const k = c.getContext("2d");
	if (!k) return null;
	const h = FOG_N / 2,
		gr = k.createRadialGradient(h, h, h * 0.5, h, h, h);
	gr.addColorStop(0, FOG + "0)");
	gr.addColorStop(0.72, FOG + ".8)");
	gr.addColorStop(1, FOG + ".985)");
	k.fillStyle = gr;
	k.fillRect(0, 0, FOG_N, FOG_N);
	return c;
}

// El cartel del rango es lo más grande que se dibuja sobre el tablero, así que en
// un laberinto chico —o con el gato pegado a un borde— le caía justo encima.  En
// vez de fijarlo a una esquina se prueban las cuatro contra la celda del gato y se
// usa la primera libre; el orden deja arriba-derecha como la de siempre.  Devuelve
// 'l' o 'r' para que la entrada del cartel venga desde afuera del tablero.
function rpopPlace() {
	if (!p) return "r"; // antes del primer gen() no hay gato
	const M = 7,
		bw = cv.clientWidth || BW,
		bh = cv.clientHeight || BH,
		k = bw / (BW || 1), // el tablero se dibuja escalado por CSS
		pw = rpop.offsetWidth || 130,
		ph = rpop.offsetHeight || 20,
		px = p.x * S * k,
		py = p.y * S * k,
		ps = S * k,
		pisa = (l, t) =>
			l < px + ps && l + pw > px && t < py + ps && t + ph > py,
		esq = [
			["r", "t"],
			["l", "t"],
			["r", "b"],
			["l", "b"],
		],
		[h, v] =
			esq.find(
				([a, b]) =>
					!pisa(
						a === "r" ? bw - M - pw : M,
						b === "t" ? M : bh - M - ph,
					),
			) || esq[0];
	rpop.style.left = h === "l" ? M + "px" : "auto";
	rpop.style.right = h === "r" ? M + "px" : "auto";
	rpop.style.top = v === "t" ? M + "px" : "auto";
	rpop.style.bottom = v === "b" ? M + "px" : "auto";
	return h;
}

// Un ascenso de rango tiene que VERSE: la letra crece de golpe, la barra
// destella y el nombre del rango entra volando sobre el laberinto.
//
// Reiniciar una animación de CSS pide apagar la clase, forzar el layout y volver
// a prenderla.  Eran TRES layouts sincrónicos seguidos —uno por elemento—, y un
// layout sincrónico frena el hilo hasta que el navegador termina de recalcular la
// página entera.  Un solo `void offsetWidth` los cubre a los tres: la lectura
// vacía el estilo pendiente de todo el documento, no del elemento que se lee.
function rankShow(i, up) {
	const r = RANKS[i];
	// --rc va como estilo inline, así que le gana a cualquier regla del CSS: si acá
	// no se contempla la cacería, el rango se queda celeste y es lo ÚNICO azul que
	// queda en pantalla, justo en el bloque más grande de la barra.  El rango sigue
	// leyéndose por su letra; en la cacería lo que se pierde es el color, que pasa a
	// ser el único que hay.
	root.style.setProperty("--rc", hunt && hunt.bit ? PAL.pj : r.col); // de acá lo toman la letra, la barra y el cartel
	brank.textContent = r.k;
	bfill.style.color = r.col;
	if (up) rpop.textContent = r.n + "!";
	const base = up ? "rank" + (rpopPlace() === "l" ? " l" : "") : "";
	brank.className = "rank"; // las tres clases apagadas...
	bar.className = "";
	if (up) rpop.className = base;
	void bar.offsetWidth; // ...un layout para las tres...
	brank.className = up ? "rank up" : "rank"; // ...y las tres prendidas
	bar.className = up ? "up" : "";
	if (up) rpop.className = base + " show";
}

// ---- capa de paredes horneada ---------------------------------------------
// Las ~660 líneas del laberinto con shadowBlur eran, lejos, el dibujo más caro
// del cuadro, y no cambian hasta el próximo gen().  Se pintan una vez a un canvas
// aparte y después el cuadro es un solo drawImage.  Va en los dos perfiles: es el
// mismo dibujo cacheado, no una versión recortada.
//
// El latido de extra vibes abría el shadowBlur de 10 a 26, así que se hornean las
// dos puntas y el cuadro mezcla entre ellas: los extremos salen exactos y el medio
// es una interpolación de dos gaussianas en vez de una gaussiana intermedia.  La
// segunda capa se hornea recién cuando alguien prende extra vibes.
//
// PAD: al temblar, la copia se corre y el borde se quedaba sin el resplandor que
// entra desde afuera del tablero.  Se hornea con margen y se pega en -PAD.
const BLUR = [10, 26],
	PAD = 32; // = 10+bop*16, los extremos del latido
let mz = [null, null],
	baked = false;
function walls(c) {
	g.forEach((k, i) => {
		const X = (i % C) * S,
			Y = ((i / C) | 0) * S;
		if (k.n) {
			c.moveTo(X, Y);
			c.lineTo(X + S, Y);
		}
		if (k.w) {
			c.moveTo(X, Y);
			c.lineTo(X, Y + S);
		}
		if (k.e) {
			c.moveTo(X + S, Y);
			c.lineTo(X + S, Y + S);
		}
		if (k.s) {
			c.moveTo(X, Y + S);
			c.lineTo(X + S, Y + S);
		}
	});
}
function bakeLayer(i) {
	const c = mz[i] || document.createElement("canvas");
	c.width = (BW + PAD * 2) * K;
	c.height = (BH + PAD * 2) * K; // asignar width ya lo deja limpio
	const k = c.getContext("2d");
	if (!k) return null; // sin 2d context se dibuja como siempre
	k.setTransform(K, 0, 0, K, 0, 0); // la capa guarda los mismos píxeles que el canvas
	k.translate(PAD, PAD); // walls() sigue hablando en coords del tablero
	k.lineCap = "round";
	k.strokeStyle = PAL.wall;
	k.lineWidth = 2;
	k.shadowColor = PAL.glow;
	k.shadowBlur = BLUR[i];
	k.beginPath();
	walls(k);
	k.stroke();
	return c;
}
function bakeMaze() {
	try {
		mz[0] = bakeLayer(0);
		if (mz[1]) mz[1] = bakeLayer(1); // la del latido, sólo si ya se usó alguna vez
		baked = !!mz[0];
	} catch (e) {
		baked = false;
	}
}
const bakeBop = () => {
	if (baked && !mz[1])
		try {
			mz[1] = bakeLayer(1);
		} catch (e) {}
};

// las letras van en la celda VECINA (12px pasando la abertura), nunca debajo del PJ
const LP = {
	n: (cx, cy) => [cx * S + S / 2, cy * S - 12],
	s: (cx, cy) => [cx * S + S / 2, (cy + 1) * S + 12],
	e: (cx, cy) => [(cx + 1) * S + 12, cy * S + S / 2],
	w: (cx, cy) => [cx * S - 12, cy * S + S / 2],
};

function frame() {
	requestAnimationFrame(frame);
	// pestaña oculta: si igual llega un cuadro no se dibuja nada (el dt del estilo
	// está topado a 250 ms, así que al volver no hay salto).  document.hidden es
	// undefined en los tests y ahí nunca se salta.
	if (document.hidden === true) {
		lastDraw = 0; // al volver, el tope de fps no se come el primer cuadro
		return;
	}
	const RT = now();
	// pantallas de 120Hz pedían el doble de cuadros por el mismo juego
	if (PERF.fps && RT - lastDraw < 1000 / PERF.fps) return;
	lastDraw = RT;
	// ---- la música, cuadro a cuadro ------------------------------------------
	// Va con el reloj REAL: el susto y el QTE tienen que sonar igual con la pestaña
	// al frente que con el menú encima.  Durante el QTE (o el jumpscare) `muf` sube
	// hasta 1 —el QTE entero para hundirse del todo, así que cuanto menos tiempo
	// queda, menos se escucha— y después baja: rápido si el QTE se ganó, lento si
	// terminó en susto.
	const mdt = mufAt ? Math.min(250, RT - mufAt) : 0;
	mufAt = RT;
	if (qte || frozen) muf = Math.min(1, muf + mdt / (qte ? qte.ms : 700));
	else if (muf > 0) {
		muf = Math.max(0, muf - mdt / (mufSlow ? MUF_IN : MUF_OUT));
		if (!muf) mufSlow = 0;
	}
	const trk = track(),
		tv = +((trk.v0 || 0.32) * (1 - MUF_MAX * muf)).toFixed(3);
	if (tv !== mufV) {
		trk.volume = mufV = tv; // sólo se escribe cuando de verdad cambió
	}
	// ...y lo que entra en el lugar que deja la música: el latido y el ruido suben
	// con el mismo `muf` (ver dreadOn).  Se van con él cuando la música vuelve, o
	// de golpe si arrancó el jumpscare, que ya trae su propio grito.
	//
	// LA CACERÍA TRAE SU PROPIO TERROR y no es el de la primera mitad.  Mientras
	// dura, el ruido blanco NO suena: su lugar lo ocupa el mp3 del latido, también
	// —y sobre todo— durante el QTE de anillo, que es justo donde el ruido blanco
	// mandaba cuando el perseguido eras vos.  Es el mismo reemplazo que hace el
	// ducking con la música, un escalón más arriba.
	if (hunt && !frozen && (huntOn() || huntFin())) {
		dreadOff();
		// ...y en el epílogo el corazón no se apaga con la última presa: cambia de
		// dueño (ver heartFin).  Va con el reloj DEL JUEGO, igual que la escena, así
		// que el menú de pausa lo congela en el mismo cuadro que la imagen.
		if (huntFin()) heartFin((paused ? pauseAt : RT) - hunt.t0);
		else heartSet(huntHeart());
	} else {
		heartOff();
		if (qte && !frozen) dreadOn();
		if (dreadAt) {
			if (frozen || (!qte && muf <= 0.02)) dreadOff();
			else dreadSet(muf);
		}
	}
	// ...y la fase del latido, que es lo que hace latir al ping del acechador en el
	// tablero: mismo compás y misma prisa que el mp3, con el reloj REAL igual que el
	// resto del audio.
	if (heartV >= 0) heartPh = (heartPh + (mdt / 1000) * HEART_BPS * heartRate()) % 1;
	// y el grito del acechador baja con su imagen: el mismo perfil que el CSS de
	// #scare.fade (pleno hasta el 32%, y de ahí a cero), sin un timer más
	if (scareFade && scareA) {
		const q = (RT - scareFade) / SCARE_FADE;
		scareA.volume = Math.max(0, Math.min(1, (1 - q) / 0.68));
	}
	// la cinemática del buildup es lo único del juego que corre CON la música pegada
	// a la imagen, así que el menú de pausa tiene que parar las dos o quedan corridas
	if (hunt && hunt.ph === "build" && HUNT.src) {
		if (paused && !HUNT.paused) HUNT.pause();
		else if (!paused && HUNT.paused) play(HUNT).catch(() => {});
	}
	const T = paused ? pauseAt : RT,
		// durante el buildup el laberinto queda tan quieto como con un cartel encima
		live = t0 && !win && !frozen && !paused && !huntHold(); // en pausa el reloj se congela
	// Respiro post-QTE: durante GRACE_MS la ventana de la letra no corre y los gatos
	// no dan un paso.  Es el único momento del juego en que se puede pensar.
	const respiro = live && !qte && T < graceT;
	if (live && (tutHold() || respiro)) shownAt = T; // el 1er paso del tutorial va sin reloj
	if (respiro) foeTick = T; // ...y al salir del respiro no se cobran los pasos
	// ---- el estilo, cuadro a cuadro ------------------------------------------
	// Dos cosas, las dos con el reloj DEL JUEGO (T), así que el menú, el selector
	// y los carteles no cuentan: (1) lo que pasa del techo del combo se escurre,
	// y (2) el medidor va sumando a la integral de la que sale el promedio.  El
	// QTE y el respiro no escurren: ahí el jugador no puede teclear el laberinto.
	const sdt = stlAt ? Math.min(250, T - stlAt) : 0; // el tope tapa el salto de una pestaña dormida
	stlAt = T;
	if (live && sdt > 0) {
		if (!qte && !respiro)
			styleDown(
				Math.min(
					Math.max(0, stl - styleCap()),
					(STYLE_DECAY * sdt) / 1000,
				),
			);
		stlSum += stl * sdt;
		stlT += sdt;
	}
	const left = qte
		? (qte.until - T) / qte.ms
		: live
			? 1 - (T - shownAt) / dur()
			: 1;

	if (tutOn) tutCheck();
	huntStep(T); // el reloj de las tres fases de la cacería
	if (live) huntDet(); // ...y el ataque de determinación, que va por proximidad
	if (resAt && T >= resAt) resShow(); // ganaste hace RES_MS: entra el resumen
	if (qte && T > qte.until) qteEnd(false);
	else if (live && !qte && left <= 0) penalize(400, "#f70", "late", "-");
	// con el maullido encima los gatos se mueven más seguido, pero para el otro lado
	if (
		live &&
		!qte &&
		!respiro &&
		T - foeTick >
			(huntOn() ? HUNT_FOE_MS : foeMs() * (T < scareUntil ? 0.55 : 1))
	) {
		foeTick = T;
		moveFoes();
	}

	bop = vibes && !VIBE.paused ? bopAt(VIBE.currentTime) : 0;
	// El CSS late en 20 pasos en vez de seguir el bop continuo: la misma vista con
	// un tercio de las recalculaciones de estilo (el canvas sigue usando el fino).
	const bopCss = Math.round(bop * 20) / 20;
	if (bopCss !== lastBop) {
		root.style.setProperty("--bop", bopCss.toFixed(2));
		lastBop = bopCss;
	}

	vis.x += (p.x - vis.x) * 0.35;
	vis.y += (p.y - vis.y) * 0.35;
	// las dos listas se mueven igual y sólo se dibujan en lugares distintos (ver
	// spray): las chispas de siempre debajo del velo del anillo, la sangre encima
	[parts, gore].forEach((l) =>
		l.forEach((q) => {
			q.x += q.vx;
			q.y += q.vy;
			q.vx *= 0.9;
			q.vy *= 0.9;
			q.l -= 0.04;
		}),
	);
	parts = parts.filter((q) => q.l > 0);
	gore = gore.filter((q) => q.l > 0);
	shake *= 0.85;
	flash *= 0.9;
	cpop *= 0.88;

	// el temblor del QTE es el PISO: los golpes sueltos (shake = 7..14) siguen
	// mandando en su pico y se apagan encima de él, no en vez de él
	const qs = qShake(T),
		sk = Math.max(shake, qs) > 0.4 ? Math.max(shake, qs) : 0; // debajo de medio píxel no se ve y rompe el fast path
	// ...y la misma cuenta sale al CSS para que se sacuda la GUI de afuera del canvas.
	// Cuantizado a medio píxel y escrito sólo cuando cambió, igual que --bop: es una
	// recalculación de estilo, no se paga una por cuadro de arrepentimiento.
	const qsCss = Math.round(qs * 2) / 2;
	if (qsCss !== lastQs) {
		if (!qsCss !== !lastQs)
			root.classList[qsCss ? "add" : "remove"]("shk"); // prende y apaga la animación
		root.style.setProperty("--qs", qsCss.toFixed(1));
		lastQs = qsCss;
	}
	// K: el canvas guarda K píxeles por cada uno del tablero (ver sizeCanvas).  El
	// temblor sigue midiéndose en píxeles del tablero, así que también se escala.
	x.setTransform(
		K,
		0,
		0,
		K,
		(Math.random() - 0.5) * sk * K,
		(Math.random() - 0.5) * sk * K,
	);
	x.fillStyle = "#0b0b12";
	x.fillRect(-20, -20, BW + 40, BH + 40);
	x.lineCap = "round";
	x.textAlign = "center";
	x.textBaseline = "middle";

	if (baked) {
		// una copia, o la mezcla si está latiendo.  La capa guarda K píxeles por
		// cada uno del tablero: se dibuja pidiendo su tamaño en coords de tablero.
		const LW = BW + PAD * 2,
			LH = BH + PAD * 2;
		x.shadowBlur = 0;
		if (bop > 0.002 && mz[1]) {
			x.globalAlpha = 1 - bop;
			x.drawImage(mz[0], -PAD, -PAD, LW, LH);
			x.globalAlpha = bop;
			x.drawImage(mz[1], -PAD, -PAD, LW, LH);
			x.globalAlpha = 1;
		} else x.drawImage(mz[0], -PAD, -PAD, LW, LH);
	} else {
		x.shadowBlur = 10 + bop * 16;
		x.shadowColor = "#2af";
		x.strokeStyle = "#39f";
		x.lineWidth = 2;
		x.beginPath();
		walls(x);
		x.stroke();
	}

	// salida: roja con el candado cerrado hasta juntar las 5 monedas, verde y latiendo después
	const ab = exitOpen(),
		ex = (C - 1) * S + S / 2,
		ey = (R - 1) * S + S / 2,
		pulse = ab ? 0.5 + 0.5 * Math.sin(T / 200) : 0.25;
	x.shadowColor = ab ? "#0f9" : "#f66";
	x.shadowBlur = (6 + 18 * pulse + bop * 14) * GLOW;
	x.fillStyle = ab
		? `rgba(0,255,150,${0.25 + 0.6 * pulse})`
		: `rgba(255,70,90,${0.1 + 0.12 * pulse})`;
	x.fillRect((C - 1) * S + 8, (R - 1) * S + 8, S - 16, S - 16);
	x.strokeStyle = x.fillStyle = ab ? "#0f9" : "#f88";
	x.lineWidth = 2;
	x.fillRect(ex - 5, ey, 10, 7); // cuerpo del candado
	x.beginPath(); // arco: abierto = ladeado
	x.arc(ab ? ex - 4 : ex, ey - 3, 4, Math.PI, ab ? Math.PI * 1.85 : 0);
	x.stroke();

	x.shadowColor = "#fd0";
	x.shadowBlur = (14 + bop * 16) * GLOW;
	x.fillStyle = "#fe4";
	coins.forEach((i) => {
		const b = 1 + 0.25 * Math.sin(T / 150 + i) + bop * 0.3;
		x.beginPath();
		x.arc((i % C) * S + S / 2, ((i / C) | 0) * S + S / 2, 4 * b, 0, 7);
		x.fill();
	});

	// faroles: en el sótano son la única forma de ver el mapa completo
	if (lamps.length) {
		x.shadowColor = "#fd8";
		x.shadowBlur = (17 + bop * 14) * GLOW;
		x.fillStyle = "#fe9";
		lamps.forEach((i) => {
			const X = (i % C) * S + S / 2,
				Y = ((i / C) | 0) * S + S / 2,
				b = 1 + 0.22 * Math.sin(T / 220 + i);
			x.beginPath();
			x.moveTo(X, Y - 7 * b);
			x.lineTo(X + 5 * b, Y);
			x.lineTo(X, Y + 7 * b);
			x.lineTo(X - 5 * b, Y);
			x.closePath();
			x.fill();
		});
	}

	// enemigos (gato oscuro).  Con el maullido encima van pálidos y con el halo del
	// maullido en vez del rojo: de un vistazo se ve que están huyendo, no cazando.
	// El ACECHADOR queda afuera de eso: es inmune al maullido, así que sigue rojo y
	// opaco mientras el resto se despinta.  Si se pusiera pálido como los demás la
	// pantalla estaría diciendo "éste también huye" justo cuando no es cierto, y el
	// jugador leería el golpe que se viene como un bug.
	const asustados = T < scareUntil,
		nst = LV.stalk || 0; // los acechadores son los primeros de la lista
	x.shadowBlur = (16 + bop * 14) * GLOW;
	foes.forEach((f, i) => {
		const X = (f % C) * S + S / 2,
			Y = ((f / C) | 0) * S + S / 2,
			s = S - 8 + 2 * Math.sin(T / 150 + f),
			ace = i < nst,
			// en la cacería los papeles están dados vuelta: las presas van pálidas y
			// con el halo de miedo TODO el tiempo, y el que caza sos vos
			huye = huntOn() ? !huntCharge(i, ace) : asustados && !ace,
			im = ace && ready(STALK) ? STALK : FOE;
		x.shadowColor = huye ? (huntOn() ? PAL.prey : "#9ff") : PAL.foe;
		x.globalAlpha = huye ? 0.72 : 1;
		if (ready(im)) x.drawImage(im, X - s / 2, Y - s / 2, s, s);
		else {
			x.fillStyle = "#f57";
			x.fillRect(X - 6, Y - 6, 12, 12);
		}
	});
	x.globalAlpha = 1;

	// jugador (gato blanco... hasta que se come la torre)
	const mut = !!(hunt && hunt.bit), // ya mutó: sprite y halo nuevos
		pjIm = mut && ready(REDPJ) ? REDPJ : PJ;
	x.shadowColor = PAL.pj;
	x.shadowBlur = (18 + bop * 16 + (mut ? 14 : 0)) * GLOW;
	x.fillStyle = `rgba(${PAL.pjFill},${(0.18 + bop * 0.16 + (mut ? 0.44 : 0)).toFixed(3)})`;
	x.fillRect(vis.x * S + 4, vis.y * S + 4, S - 8, S - 8);
	// la foto del gato transformado es oscura y a ~28px se hunde contra el sótano:
	// el anillo la despega del fondo sin taparla
	if (mut) {
		x.strokeStyle = PAL.pj;
		x.lineWidth = 1.5;
		x.strokeRect(vis.x * S + 3.5, vis.y * S + 3.5, S - 7, S - 7);
	}
	if (ready(pjIm))
		x.drawImage(pjIm, vis.x * S + 3, vis.y * S + 3, S - 6, S - 6);
	else {
		x.fillStyle = mut ? "#f66" : "#7ff";
		x.fillRect(vis.x * S + 9, vis.y * S + 9, S - 18, S - 18);
	}
	// ...y si la imagen del gato transformado todavía no está en assets/, la mutación
	// igual se VE: dos ojos rojos encendidos sobre el sprite de siempre, que es el
	// motivo de la imagen que va a ir ahí.  Nunca una pantalla rota por un 404.
	if (mut && !ready(REDPJ)) {
		x.shadowColor = "#f00";
		x.shadowBlur = 12 * GLOW;
		x.fillStyle = "#f22";
		for (const o of [-0.17, 0.17]) {
			x.beginPath();
			x.arc((vis.x + 0.5 + o) * S, (vis.y + 0.44) * S, 2.6, 0, 6.283);
			x.fill();
		}
		x.shadowBlur = 0;
	}

	const PX = vis.x * S + S / 2,
		PY = vis.y * S + S / 2;
	if (!win && !tutHold() && !huntHold()) {
		// durante el respiro el anillo queda lleno y en blanco: se ve que NO está corriendo
		x.strokeStyle = respiro
			? "#dff"
			: left > 0.5
				? "#0ff"
				: left > 0.25
					? "#fd0"
					: "#f45";
		x.shadowColor = x.strokeStyle;
		// en el teléfono el anillo va sin sombra: el color ya dice el tiempo que queda
		x.shadowBlur = MOBILE ? 0 : (respiro ? 16 : 0) * GLOW;
		x.lineWidth = respiro ? 4 : 3;
		x.beginPath();
		x.arc(PX, PY, S * 0.62, -1.571, -1.571 + 6.283 * Math.max(0, left));
		x.stroke();
		x.shadowBlur = 0;
		if (respiro) {
			// halo que respira dentro del anillo:
			const q = 0.5 + 0.5 * Math.sin(T / 300); // "el reloj está quieto, mirá tranquilo"
			x.globalAlpha = 0.1 + 0.11 * q;
			x.fillStyle = "#dff";
			x.beginPath();
			x.arc(PX, PY, S * 0.62, 0, 6.283);
			x.fill();
			x.globalAlpha = 1;
		}
	}
	// DETERMINACIÓN: una órbita violeta por fuera del anillo de reacción, con una
	// pastilla por carga.  Va por fuera a propósito: el sprite del gato no se toca.
	if (det > 0 && !win) {
		const q = 0.5 + 0.5 * Math.sin(T / 260),
			rr = S * 0.78;
		x.strokeStyle = "#c8f";
		x.shadowColor = "#c8f";
		x.shadowBlur = (6 + 8 * q) * GLOW;
		x.lineWidth = 1.2;
		x.setLineDash([3, 6]);
		x.lineDashOffset = T / 40;
		x.beginPath();
		x.arc(PX, PY, rr, 0, 6.283);
		x.stroke();
		x.setLineDash([]);
		x.lineDashOffset = 0;
		x.fillStyle = "#e2b4ff";
		x.shadowBlur = (9 + 7 * q) * GLOW;
		for (let i = 0; i < det; i++) {
			const a = T / 900 + (i * 6.283) / det,
				X = PX + Math.cos(a) * rr,
				Y = PY + Math.sin(a) * rr;
			x.beginPath();
			x.moveTo(X, Y - 3.4);
			x.lineTo(X + 3.4, Y);
			x.lineTo(X, Y + 3.4);
			x.lineTo(X - 3.4, Y);
			x.closePath();
			x.fill();
		}
		x.shadowBlur = 0;
	}

	// NIEBLA: un solo relleno con degradado radial encima de todo lo que es el
	// mundo (paredes, monedas, gatos).  Las letras, el QTE y los carteles se
	// dibujan después, así que nunca quedan tapados.  Un farol la abre de golpe
	// y desde ahí se vuelve a cerrar sola.
	if (LV.fog) {
		// el farol alumbra a pleno la mitad del tiempo y después se va apagando
		const dt = T - revealT,
			lit =
				revealT && dt < REVEAL_MS
					? Math.min(1, 2 - (2 * dt) / REVEAL_MS)
					: 0,
			rad = (fogR(T) + lit * lit * (C + R) * 1.6) * S, // a pleno, el núcleo tapa el tablero entero
			fx = (vis.x + 0.5) * S,
			fy = (vis.y + 0.5) * S;
		if (fogTex === undefined) fogTex = bakeFog();
		x.shadowBlur = 0;
		if (fogTex) {
			const L = fx - rad,
				U = fy - rad,
				W = rad * 2,
				Rr = L + W,
				D = U + W;
			x.drawImage(fogTex, L, U, W, W);
			x.fillStyle = FOG + ".985)"; // lo que queda fuera del parche, opaco
			if (L > 0) x.fillRect(0, 0, L, BH);
			if (Rr < BW) x.fillRect(Rr, 0, BW - Rr, BH);
			const l0 = Math.max(0, L),
				r0 = Math.min(BW, Rr);
			if (U > 0) x.fillRect(l0, 0, r0 - l0, U);
			if (D < BH) x.fillRect(l0, D, r0 - l0, BH - D);
		} else {
			// sin canvas de respaldo, el degradado de siempre
			const gr = x.createRadialGradient(
				fx,
				fy,
				rad * 0.5,
				fx,
				fy,
				rad,
			);
			gr.addColorStop(0, FOG + "0)");
			gr.addColorStop(0.72, FOG + ".8)");
			gr.addColorStop(1, FOG + ".985)");
			x.fillStyle = gr;
			x.fillRect(0, 0, BW, BH);
		}
		// a oscuras, lo que da luz propia se sigue viendo: los faroles son faros y
		// la salida abierta es la meta.  Sin esto el sótano es a ciegas, no a oscuras.
		x.globalAlpha = 0.6;
		x.shadowColor = "#fd8";
		x.shadowBlur = 14 * GLOW;
		x.fillStyle = "#fe9";
		lamps.forEach((i) => {
			const X = (i % C) * S + S / 2,
				Y = ((i / C) | 0) * S + S / 2;
			x.beginPath();
			x.moveTo(X, Y - 6);
			x.lineTo(X + 4, Y);
			x.lineTo(X, Y + 6);
			x.lineTo(X - 4, Y);
			x.closePath();
			x.fill();
		});
		x.globalAlpha = 1;
		if (ab) {
			x.shadowColor = "#0f9";
			x.shadowBlur = 24 * GLOW;
			x.fillStyle = `rgba(0,255,150,${0.3 + 0.5 * pulse})`;
			x.fillRect((C - 1) * S + 10, (R - 1) * S + 10, S - 20, S - 20);
		}
		x.shadowBlur = 0;
	}

	// LA CACERÍA, por el mismo motivo que la onda de acá abajo: la torre del buildup
	// y las presas vistas a través de la oscuridad tienen que estar POR ENCIMA de la
	// niebla, o el nivel a oscuras se come su propia segunda mitad.
	huntScene(T);

	// AHUYENTADOR: la onda del maullido saliendo del gato blanco.  Va después de la
	// niebla a propósito: en el sótano el maullido se oye aunque no se vea nada.
	if (T < scareUntil) {
		const k = 1 - (scareUntil - T) / MEOW_MS; // 0 al maullar, 1 al apagarse
		x.shadowColor = "#9ff";
		for (const o of [0, 0.22]) {
			const kk = k - o;
			if (kk < 0 || kk > 1) continue;
			x.globalAlpha = (1 - kk) * 0.6;
			x.shadowBlur = 16 * GLOW;
			x.strokeStyle = "#9ff";
			x.lineWidth = 1 + 3 * (1 - kk);
			x.beginPath();
			x.arc(PX, PY, S * 0.6 + kk * MEOW_R * S, 0, 6.283);
			x.stroke();
		}
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// RADAR del maullido (sótano).  El eco vuelve con una idea de dónde hay monedas
	// y de dónde estaban los gatos.  NO enciende el sótano: la niebla se dibujó
	// arriba y sigue igual, no se ve una pared más.  Son anillos flojos, corridos
	// hasta media celda a propósito, que laten un rato y se apagan solos.
	if (radar && T - radar.t < RADAR_MS) {
		const k = (T - radar.t) / RADAR_MS,
			a = Math.min(1, k * 8) * (1 - k) * (1 - k), // entra de golpe y se va apagando
			q = 0.5 + 0.5 * Math.sin(T / 180);
		x.lineWidth = 1.6;
		radar.pts.forEach((m) => {
			const col = m.k ? "#f7a" : "#fe4"; // k=1 gato, k=0 moneda
			x.globalAlpha = a * (m.k ? 0.8 : 0.95);
			x.strokeStyle = col;
			x.shadowColor = col;
			x.shadowBlur = (7 + 6 * q) * GLOW;
			x.beginPath();
			x.arc(m.x * S, m.y * S, S * (0.19 + 0.13 * q), 0, 6.283);
			x.stroke();
		});
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// EL CORAZÓN DEL ACECHADOR.  Cuando ya no queda nadie más, la música está apagada
	// y el sótano se juega a oscuras con un solo sonido: su latido.  Acá se lo VE, y
	// se lo ve con la MISMA pieza que el radar del maullido —un anillo flojo que
	// aparece, se abre y se apaga—, porque es la misma idea: no es un mapa, es una
	// pista que llega por el oído.  La diferencia es que ésta no se pide ni se apaga:
	// late, y late con el mp3 (heartPh, heartRate) y con la distancia, así que
	// acercarse se oye y se ve subir al mismo tiempo.  Va acá, DESPUÉS de la niebla,
	// por lo mismo que el radar: si no, en el final del sótano no se vería nada.
	if (hunt && hunt.solo && foes.length && !win) {
		const F = foes[0],
			HX = ((F % C) + 0.5) * S,
			HY = (((F / C) | 0) + 0.5) * S;
		x.lineWidth = 1.8;
		x.strokeStyle = x.shadowColor = PAL.foe;
		// dos golpes por latido —el lub y el dub—, el segundo más chico
		for (const [off, esc] of [
			[0, 1],
			[0.26, 0.62],
		]) {
			const b = (heartPh - off + 1) % 1,
				k = Math.min(1, b / 0.42); // el anillo se abre en el primer 42% del beat
			if (b > 0.42) continue;
			x.globalAlpha = (1 - k) * (1 - k) * 0.85 * (0.35 + 0.65 * heartK) * esc;
			x.shadowBlur = (8 + 10 * heartK) * GLOW;
			x.beginPath();
			x.arc(HX, HY, S * (0.22 + 1.5 * k) * esc, 0, 6.283);
			x.stroke();
		}
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// una sombra difuminada por partícula (hasta 34) era el segundo gasto del cuadro:
	// en móvil el halo se finge con un cuadrado más grande y transparente
	if (MOBILE) {
		x.shadowBlur = 0;
		parts.forEach((q) => {
			x.fillStyle = q.c;
			x.globalAlpha = q.l * 0.22;
			x.fillRect(q.x - 4, q.y - 4, 8, 8);
			x.globalAlpha = q.l;
			x.fillRect(q.x - 2, q.y - 2, 4, 4);
		});
	} else {
		parts.forEach((q) => {
			x.shadowColor = q.c;
			x.fillStyle = q.c;
			x.globalAlpha = q.l;
			x.fillRect(q.x - 2, q.y - 2, 4, 4);
		});
	}
	x.globalAlpha = 1;
	x.shadowBlur = 0;

	// ---- las monedas, en el tablero ------------------------------------------
	// Llevar la cuenta obligaba a soltar el laberinto y leer la barra de arriba, y
	// eso es justo lo que no se puede hacer con un gato encima.  Las mismas fichas
	// que la barra, pero acá: llenas las que ya juntaste, huecas las que faltan, y
	// todas verdes cuando la salida ya abrió.  Va DESPUÉS de la niebla, así que en
	// el sótano —donde no se ve nada y la cuenta importa más— se lee igual.  Se
	// muda abajo si el gato está en la primera fila, que es donde arranca.
	// ...y en la cacería la MISMA fila cuenta otra cosa: las presas que ya devoraste.
	// Es la misma pieza porque es la misma pregunta —"¿cuánto me falta?"— y aprender
	// a leerla dos veces sería una regla de más.  Las llenas son las que se comieron.
	if (!win || huntOn() || huntFin()) {
		const caza = !!hunt,
			tot = caza ? HUNT_PREY : LV.coins,
			hechas = caza ? hunt.eaten : got,
			gap = 13,
			wc = tot * gap,
			X0 = (BW - wc) / 2 + gap / 2,
			Y0 = p.y === 0 ? BH - 15 : 15;
		x.fillStyle = "rgba(4,6,12,.82)";
		x.fillRect(X0 - gap / 2 - 6, Y0 - 10, wc + 12, 20);
		x.strokeStyle = caza ? "#f446" : ab ? "#0f96" : "#1ff5";
		x.lineWidth = 1;
		x.strokeRect(X0 - gap / 2 - 5.5, Y0 - 9.5, wc + 11, 19);
		for (let i = 0; i < tot; i++) {
			const lleno = i < hechas,
				c = lleno
					? caza
						? "#f34"
						: ab
							? "#0f9"
							: "#fe4"
					: caza
						? "#6b3040"
						: "#4a5a72";
			x.strokeStyle = x.fillStyle = c;
			x.shadowColor = c;
			x.shadowBlur = MOBILE || !lleno ? 0 : 9 * GLOW;
			x.beginPath();
			x.arc(X0 + i * gap, Y0, 4.2, 0, 6.283);
			lleno ? x.fill() : x.stroke();
		}
		x.shadowBlur = 0;
	}

	huntVeil(T); // el velo rojo tiñe el mundo, no la GUI que se dibuja después

	// letras de las salidas: SIEMPRE al final, encima de todo.  Durante el buildup de
	// la cacería no: el laberinto está congelado y una letra ofrecida es una promesa
	// de que se puede caminar.
	if (!win && !qte && !huntHold()) {
		const col = respiro
			? "#dff"
			: left > 0.5
				? PAL.key
				: left > 0.25
					? "#fe6"
					: "#f88";
		x.font = "bold 21px " + CF;
		for (const d in letters) {
			const [X, Y] = LP[d](p.x, p.y),
				ph = phase && phase[d], // ph: la letra que cruza el muro
				c = ph ? "#d8a6ff" : col;
			x.shadowBlur = 0;
			x.fillStyle = "rgba(4,6,12,.95)";
			x.beginPath();
			x.arc(X, Y, 12, 0, 7);
			x.fill();
			x.strokeStyle = c;
			x.lineWidth = 1.5;
			if (ph) x.setLineDash([3, 3]); // punteada = todavía hay un muro ahí
			x.stroke();
			x.setLineDash([]);
			x.shadowColor = c;
			// en el teléfono las letras van sin sombra: ya traen disco y borde propios
			x.shadowBlur = MOBILE ? 0 : (14 + bop * 12) * GLOW;
			x.fillStyle = c;
			x.fillText(letters[d].toUpperCase(), X, Y);
		}
		x.shadowBlur = 0;
	}

	const abrio = unlockT && T - unlockT < NOTE_MS;
	if (abrio)
		banner(
			T,
			unlockT,
			"SALIDA DESBLOQUEADA",
			"CORRÉ A LA CASILLA VERDE",
			"#0f9",
			0,
		);
	// si justo coinciden, el aviso de la habilidad se corre para abajo y no se pisan
	if (note && T - note.t < NOTE_MS)
		banner(T, note.t, note.a, note.b, note.col, abrio ? 66 : 0);

	// overlay del QTE
	if (qte && qte.ring) {
		// ---- EL ANILLO: devorar, no ejecutar una secuencia ---------------------
		// La presa va al centro y las letras alrededor, repartidas en círculo.  No
		// hay "la que toca": cada letra es un PEDAZO, y morderla borra su porción
		// del cuerpo.  Por eso el orden da igual —de un bicho se muerde por donde
		// se puede— y por eso el dibujo no marca ninguna como siguiente: marcar una
		// sería volver a pedir una secuencia por la ventana.
		x.fillStyle = "rgba(14,0,4,.72)";
		x.fillRect(0, 0, BW, BH);
		const n = qte.seq.length,
			cx = BW / 2,
			cy = BH / 2,
			gr = Math.min(1, Math.max(0, 1 - left)),
			// al revés que el QTE normal: acá el bicho no se te viene encima, se te
			// ENCOGE.  Lo que crece es tu lugar en la pantalla.
			rad = ringRad(),
			sz = ringSz(gr),
			cara = qte.st && ready(STALK) ? STALK : BIG,
			ang = (i) => ringAng(i, n),
			// EL TIRÓN de la última dentellada: el cuerpo salta para el lado
			// contrario al mordisco y vuelve solo en BITE_MS.  Al cuadrado, así que
			// el golpe es seco y la vuelta lenta, que es como se mueve algo a lo que
			// le arrancaron un pedazo (y no como un resorte).
			bk = qte.bit ? Math.max(0, 1 - (T - qte.bit.t) / BITE_MS) : 0,
			ox = qte.bit ? -Math.cos(qte.bit.a) * 8 * bk * bk : 0,
			oy = qte.bit ? -Math.sin(qte.bit.a) * 8 * bk * bk : 0;
		// LA CARNE.  Debajo del cuerpo, antes que nada: el hueco que deja un pedazo
		// arrancado no puede ser el fondo de la pantalla, tiene que ser el ADENTRO
		// del bicho.  Sin esto, morder se veía como recortar una porción de torta.
		const gd = x.createRadialGradient(
			cx + ox,
			cy + oy,
			sz * 0.1,
			cx + ox,
			cy + oy,
			sz,
		);
		gd.addColorStop(0, "#8d0f20");
		gd.addColorStop(0.65, "#4a0611");
		gd.addColorStop(1, "#1a0207");
		x.fillStyle = gd;
		x.beginPath();
		x.arc(cx + ox, cy + oy, sz * 0.95, 0, 6.283);
		x.fill();
		// el cuerpo, por sectores: uno por letra, y el sector de una letra ya comida
		// simplemente no se pinta.  El bicho se va quedando en pedazos sueltos.
		if (ready(cara))
			qte.seq.forEach((k, i) => {
				if (!qte.eat.has(k)) return; // ese pedazo ya no está
				const a0 = ang(i) - 3.1416 / n,
					a1 = ang(i) + 3.1416 / n;
				x.save();
				x.beginPath();
				x.moveTo(cx + ox, cy + oy);
				x.arc(cx + ox, cy + oy, sz, a0, a1);
				x.closePath();
				x.clip();
				x.globalAlpha = 0.55 + 0.4 * gr;
				x.drawImage(
					cara,
					cx + ox - sz,
					cy + oy - sz,
					sz * 2,
					sz * 2,
				);
				x.restore();
			});
		x.globalAlpha = 1;
		// EL HUECO, DENTADO.  El pedazo que falta se tapa con una cuña oscura y el
		// filo va en ZIGZAG —radios alternados, que es la forma que deja una boca—.
		// Sin esto el sector vacío se leía como una porción de torta que alguien se
		// llevó prolija; con esto se lee como carne arrancada, y la carne de abajo
		// sigue asomando en el medio, que es de donde salió el pedazo.
		const D = 14; // dientes por pedazo: finos, o el filo se lee como una estrella
		qte.seq.forEach((k, i) => {
			if (qte.eat.has(k)) return;
			const a0 = ang(i) - 3.1416 / n,
				a1 = ang(i) + 3.1416 / n,
				pt = (m) => {
					const aa = a0 + ((a1 - a0) * m) / D,
						rr = sz * (m % 2 ? 0.85 : 0.99);
					return [
						cx + ox + Math.cos(aa) * rr,
						cy + oy + Math.sin(aa) * rr,
					];
				};
			x.beginPath();
			x.moveTo(cx + ox, cy + oy);
			for (let m = 0; m <= D; m++) x.lineTo(...pt(m));
			x.closePath();
			x.fillStyle = "rgba(9,1,4,.62)";
			x.fill();
			// el filo se traza SOLO en el borde de afuera: los dos lados rectos de
			// la cuña son el radio, y marcarlos dibujaba una tajada de pizza encima
			// del bicho
			x.beginPath();
			x.moveTo(...pt(0));
			for (let m = 1; m <= D; m++) x.lineTo(...pt(m));
			x.strokeStyle = "#c0182c";
			x.lineWidth = 1.4;
			x.stroke();
		});
		// EL FOGONAZO del pedazo que se acaba de arrancar: un anillo que se abre y
		// se apaga en el mismo tiempo que dura el tirón, justo donde entró la boca.
		if (bk > 0) {
			const a = qte.bit.a,
				bx = cx + ox + Math.cos(a) * sz * 0.72,
				by = cy + oy + Math.sin(a) * sz * 0.72;
			x.globalAlpha = bk;
			x.strokeStyle = "#fff";
			x.lineWidth = 2 + 4 * bk;
			x.shadowColor = "#f22";
			x.shadowBlur = 22 * GLOW;
			x.beginPath();
			x.arc(bx, by, sz * (0.16 + 0.6 * (1 - bk)), 0, 6.283);
			x.stroke();
			x.shadowBlur = 0;
			x.globalAlpha = 1;
		}
		// ...y la sangre, que se dibuja ACÁ y no con el resto de las partículas: el
		// velo del anillo tapa el tablero entero, así que allá abajo no se vería
		gore.forEach((q) => {
			x.fillStyle = q.c;
			x.globalAlpha = q.l * 0.28;
			x.fillRect(q.x - 5, q.y - 5, 10, 10);
			x.globalAlpha = q.l;
			x.fillRect(q.x - 2, q.y - 2, 4, 4);
		});
		x.globalAlpha = 1;
		x.font = "italic 900 16px " + DF;
		x.shadowColor = "#f22";
		x.shadowBlur = 12 * GLOW;
		x.fillStyle = "#fbb";
		x.fillText(
			qte.rounds > 1
				? `! DEVORALO — RONDA ${qte.round} DE ${qte.rounds} !`
				: "! DEVORALO — EN CUALQUIER ORDEN !",
			cx,
			cy - rad - 26,
		);
		x.font = "bold 30px " + CF;
		qte.seq.forEach((k, i) => {
			const a = ang(i),
				X = cx + Math.cos(a) * rad,
				Y = cy + Math.sin(a) * rad,
				queda = qte.eat.has(k),
				col = queda ? "#fff" : "#7a2030";
			x.shadowBlur = 0;
			x.fillStyle = "rgba(10,0,4,.92)";
			x.beginPath();
			x.arc(X, Y, 17, 0, 7);
			x.fill();
			x.strokeStyle = queda ? "#f45" : "#5a1522";
			x.lineWidth = 2;
			x.stroke();
			x.shadowColor = "#f22";
			x.shadowBlur = (queda ? 18 : 0) * GLOW;
			x.fillStyle = col;
			x.fillText(k.toUpperCase(), X, Y);
		});
		x.shadowBlur = 0;
		x.fillStyle = "#f22";
		x.fillRect(cx - 120, cy + rad + 22, 240 * Math.max(0, left), 5);
		if (qte.rounds > 1) {
			const pw = 14,
				px0 = cx - ((qte.rounds - 1) * (pw + 5)) / 2;
			for (let i = 0; i < qte.rounds; i++) {
				x.fillStyle =
					i < qte.round - 1 ? "#f34" : i === qte.round - 1 ? "#fff" : "#4a1020";
				x.fillRect(px0 + i * (pw + 5) - pw / 2, cy + rad + 36, pw, 4);
			}
		}
	} else if (qte) {
		x.fillStyle = "rgba(8,0,10,.78)";
		x.fillRect(0, 0, BW, BH);
		// el enemigo se te viene encima según se acaba el tiempo
		const gr = Math.min(1, Math.max(0, 1 - left)),
			sz = 70 + gr * gr * (BW * 1.5 - 70),
			// el que se te viene encima es el que te agarró: el acechador trae su
			// cara también acá, no sólo en el jumpscare
			cara = qte.st && ready(STALK) ? STALK : BIG;
		if (ready(cara)) {
			x.globalAlpha = 0.35 + 0.5 * gr;
			x.drawImage(
				cara,
				BW / 2 - sz / 2,
				BH / 2 - sz / 2,
				sz,
				sz,
			);
			x.globalAlpha = 1;
		}
		x.font = "italic 900 18px " + DF;
		x.shadowColor = "#f57";
		x.shadowBlur = 12 * GLOW;
		x.fillStyle = "#f9a";
		x.fillText(
			qte.rounds > 1
				? `! ACECHADOR — RONDA ${qte.round} DE ${qte.rounds} !`
				: "! ENEMIGO — TECLEA LA SECUENCIA !",
			BW / 2,
			BH / 2 - 52,
		);
		// ---- LA VENTANA DEL PARRY ---------------------------------------------
		// Arriba del cartel, y sólo cuando hay algo que decir.  Son tres estados y
		// ninguno es un tutorial: la barra que se vacía ES la ventana (cuando se
		// apagó, se apagó), el intento negado escribe su motivo donde el jugador ya
		// está mirando, y con el acechador el renglón lo dice desde el principio
		// —la regla se lee sin tener que perder un maullido probándola—.
		const pno = qte.no && T - qte.no.t < 1400 ? qte.no : null,
			pw = pno
				? 0
				: qte.st || !meowReady(T)
					? 0
					: Math.max(0, 1 - (T - qteAt()) / (PARRY_MS * babyK())),
			pcol = pno ? "#f66" : "#9ff",
			ptxt = pno
				? pno.m
				: qte.st
					? meowOn
						? "♪ AL ACECHADOR NO SE LO PARREA"
						: ""
					: pw > 0
						? "♪ PARRY"
						: "";
		if (ptxt) {
			const PY = BH / 2 - 78;
			x.font = "bold 13px " + CF;
			x.globalAlpha = pno || pw > 0 ? 1 : 0.5;
			x.shadowColor = pcol;
			x.shadowBlur = (pw > 0 ? 14 : 6) * GLOW;
			x.fillStyle = pcol;
			x.fillText(ptxt, BW / 2, PY);
			x.shadowBlur = 0;
			if (pw > 0) {
				x.fillStyle = "rgba(150,255,255,.25)";
				x.fillRect(BW / 2 - 40, PY + 11, 80, 3);
				x.fillStyle = pcol;
				x.fillRect(BW / 2 - 40, PY + 11, 80 * pw, 3);
			}
			x.globalAlpha = 1;
		}
		const n = qte.seq.length,
			step = Math.min(54, (BW - 30) / n);
		x.font = `bold ${Math.min(42, step * 0.8) | 0}px ` + CF;
		qte.seq.forEach((k, i) => {
			const X = BW / 2 + (i - (n - 1) / 2) * step,
				done = i < qte.i;
			const col = done ? "#6f9" : i == qte.i ? "#fff" : "#89a";
			x.fillStyle = "#000";
			x.shadowColor = "#000";
			x.shadowBlur = 6 * GLOW;
			x.fillText(k.toUpperCase(), X, BH / 2);
			x.shadowColor = col;
			x.shadowBlur = (i == qte.i ? 22 : 10) * GLOW;
			x.fillStyle = col;
			x.fillText(k.toUpperCase(), X, BH / 2);
		});
		x.shadowBlur = 0;
		x.fillStyle = "#f57";
		x.fillRect(
			BW / 2 - 120,
			BH / 2 + 40,
			240 * Math.max(0, left),
			5,
		);
		// la tanda del acechador se cuenta debajo de la barra: cuántas rondas van
		// y cuántas faltan, que es lo único que no se puede deducir de la pantalla
		if (qte.rounds > 1) {
			const pw = 14,
				px0 = BW / 2 - ((qte.rounds - 1) * (pw + 5)) / 2;
			for (let i = 0; i < qte.rounds; i++) {
				x.fillStyle =
					i < qte.round - 1 ? "#6f9" : i === qte.round - 1 ? "#fff" : "#503";
				x.fillRect(px0 + i * (pw + 5) - pw / 2, BH / 2 + 54, pw, 4);
			}
		}
	}

	if (flash > 0.01) {
		x.fillStyle = `rgba(255,40,60,${flash * 0.28})`;
		x.fillRect(0, 0, BW, BH);
	}
	// las scanlines las pinta el CSS (#board::after): eran ~150 fillRect por cuadro
	if (bop > 0.02) {
		// y el borde del tablero también late
		x.strokeStyle = `rgba(${PAL.edge},${(bop * 0.45).toFixed(3)})`;
		x.lineWidth = 1 + bop * 3;
		x.shadowColor = "#0ff";
		x.shadowBlur = bop * 24 * GLOW;
		x.strokeRect(1, 1, BW - 2, BH - 2);
		x.shadowBlur = 0;
	}
	// EL NEGRO DEL EPÍLOGO (ver huntFinDraw) va acá abajo y no con el resto de la
	// escena: es lo ÚLTIMO que se pinta, así que apaga también la fila de fichas, las
	// partículas y el cartel.  Dibujado allá arriba dejaba media GUI encendida sobre
	// una pantalla que ya se había terminado, que es exactamente lo que no puede
	// pasar en el cuadro anterior al resumen.
	if (huntFin()) {
		const k = (T - hunt.t0 - FIN_T5) / (FIN_MS - FIN_T5);
		if (k > 0) {
			x.fillStyle = `rgba(0,0,0,${Math.min(1, k).toFixed(3)})`;
			x.fillRect(0, 0, BW, BH);
		}
	}
	x.setTransform(1, 0, 0, 1, 0, 0); // el HUD de abajo es DOM, no canvas

	// ---- HUD -----------------------------------------------------------------
	// Antes eran dos innerHTML por cuadro: el navegador reparseaba HTML, tiraba los
	// nodos y recalculaba estilo y layout del encabezado 60 veces por segundo.
	// Ahora cada dato tiene su <span> fijo y sólo se escribe el que cambió; en móvil
	// el reloj además se refresca cada PERF.hudMs (los milisegundos igual no se leen).
	//
	// La barra es LA MISMA en los dos perfiles —reloj y monedas a la izquierda, rango
	// de combo a la derecha, llenado hacia el rango siguiente abajo—: lo único que
	// cambia es cuánto texto entra.  En el teléfono el ancho da para el dato y nada
	// más (las habilidades van en iconos y lo secundario se lee en el menú); en
	// escritorio hay lugar para la frase entera, el nivel, la mejor marca, la
	// precisión y el récord de combo.
	const falta = LV.coins - got,
		tms = (win ? tEnd : t0 ? T - t0 : 0) + pen,
		pb = bests[LV.id];
	const ri = rankI(); // el rango manda el color de toda la GUI
	if (ri !== lastRank) {
		rankShow(ri, ri > lastRank);
		lastRank = ri;
	}
	if (!PERF.hudMs || T - hudAt >= PERF.hudMs || win) {
		hudAt = T;
		const line = fmt(tms);
		if (line !== lastT) {
			bt.textContent = line;
			lastT = line;
		}
	}
	const mon = "\u25CF".repeat(got) + "\u25CB".repeat(falta),
		// en la cacería el renglón deja de hablar de la salida —no hay— y cuenta lo
		// único que importa a partir de ahí: cuántas presas quedan vivas
		caza = !!hunt,
		lock = win
			? caza
				? "\u{1F52A} NO QUEDA NINGUNA"
				: "\u{1F3C1} GANASTE!  " + mon
			: caza
				? (MOBILE ? "\u{1F52A} " : "\u{1F52A} QUEDAN ") + foes.length
				: MOBILE
					? (falta ? "\u{1F512}" : "\u{1F513}") + mon + habIco()
					: (falta
							? `\u{1F512} SALIDA BLOQUEADA · faltan ${falta} ${falta == 1 ? "moneda" : "monedas"}`
							: "\u{1F513} SALIDA ABIERTA") +
						"  " +
						mon;
	if (lock !== lastEx) {
		bc.textContent = lock;
		bc.style.color = caza ? "#f77" : falta && !win ? "#f88" : "#0f9";
		lastEx = lock;
	}
	const lab = "x" + combo;
	if (lab !== lastLab) {
		bx.textContent = lab;
		lastLab = lab;
	}
	// el llenado ancho de abajo es el ESTILO (hacia el rango siguiente); la barrita
	// de al lado de la x es el COMBO, que al llenarse arma el maullido para siempre
	const w = (rankFill() * 100).toFixed(1) + "%";
	if (w !== lastW) {
		bfill.style.width = w;
		lastW = w;
	}
	const cw = (comboFill() * 100).toFixed(1) + "%";
	if (cw !== lastCw) {
		bcfill.style.width = cw;
		bcbar.className = comboFill() >= 1 ? "full" : "";
		lastCw = cw;
	}
	// el ♪: apagado = nunca cargaste el combo · llenándose = cooldown · prendido = listo
	const cd = meowCd(T),
		mst = meowOn ? (cd ? "cd" : "ready") : "",
		mw = meowOn ? (100 - (cd / MEOW_CD) * 100).toFixed(0) + "%" : "0%";
	if (mst !== lastMst) {
		bmeow.className = mst;
		lastMst = mst;
	}
	if (mw !== lastMw) {
		bmfill.style.width = mw;
		lastMw = mw;
	}
	const sc = (1 + cpop * 0.45 + bopCss * 0.09).toFixed(2); // cada acierto —y cada beat— golpea la letra
	if (sc !== lastSc) {
		brank.style.transform = `skewX(-11deg) scale(${sc})`;
		lastSc = sc;
	}
	if (MOBILE) {
		// lo secundario (precisión, penalización, récord) se lee en el menú
		if (menuOn) {
			const sb = stats();
			if (sb !== lastSub) {
				mstats.textContent = sb;
				lastSub = sb;
			}
		}
	} else {
		const sb =
			`precisión ${Math.round(acc() * 100)}%  ·  pen +${fmt(pen)}  ·  teclas ${log.length}` +
			`  ·  estilo promedio ${RANKS[rankI(avgStl())].k}` +
			habTxt(T) +
			(baby ? `  ·  BABY MODE ${baby}` : "");
		if (sb !== lastSub) {
			bstat.textContent = sb;
			lastSub = sb;
		}
		// la placa del nivel y el récord de combo cambian de a poco: una sola clave
		// los cubre a los tres y así el cuadro no toca tres nodos al pedo
		const meta = `${LV.id}|${pb || 0}|${maxCombo}`;
		if (meta !== lastMeta) {
			bname.textContent = LV.name;
			bname.style.color = LV.col;
			bpb.textContent = pb
				? `MEJOR ${fmt(pb)}s`
				: "sin marca todavía";
			bmax.textContent = `RÉCORD x${maxCombo}`;
			lastMeta = meta;
		}
	}
}

rst.onclick = () => {
	menuClose();
	gen();
	rst.blur();
}; // reinicio sólo por botón

function key(k) {
	// la música arranca con la 1ª tecla... salvo en el final del sótano, donde se
	// apagó A PROPÓSITO y lo único que queda sonando es el corazón del acechador
	// (ver huntBite): sin este `hunt.solo` la primera tecla la devolvía.
	if (track().paused && !(hunt && hunt.solo)) {
		srcOn(track()); // en el teléfono el mp3 se baja recién acá
		track()
			.play()
			.catch(() => {});
	}
	if (
		win ||
		frozen ||
		paused ||
		huntHold() || // el buildup se mira, no se juega
		k.length != 1 ||
		k < "a" ||
		k > "z"
	)
		return;
	if (!t0) {
		t0 = now();
		shownAt = t0;
		foeTick = t0;
	}

	if (qte) {
		// EL ANILLO de la cacería no tiene orden: vale cualquier letra que siga en
		// el cuerpo.  `i` se sigue llevando porque el dibujo lo usa para saber
		// cuántos pedazos faltan, pero ya no dice CUÁL toca.
		if (qte.ring) {
			if (qte.eat.has(k)) {
				// QUÉ pedazo se arrancó: el dibujo y la sangre salen de ahí, así
				// que hay que saberlo antes de sacarlo del cuerpo
				const i = qte.seq.indexOf(k);
				qte.eat.delete(k);
				qte.i++;
				push(k, "qte");
				hits++;
				huntChomp(i);
				if (!qte.eat.size) qteEnd(true);
			} else {
				push(k, "qtebad");
				fails++;
				qteEnd(false);
			}
			return;
		}
		// durante el QTE sólo cuenta la secuencia
		if (k === qte.seq[qte.i]) {
			push(k, "qte");
			hits++;
			sfx(660 + qte.i * 70, 45, "square", 0.04);
			if (++qte.i === qte.seq.length) qteEnd(true);
		} else {
			push(k, "qtebad");
			fails++;
			qteEnd(false);
		}
		return;
	}

	const dir = Object.keys(letters).find((d) => letters[d] == k);
	if (!dir) return penalize(600, "#f45", "bad", k); // tecla equivocada: castigo fuerte
	const thru = !!(phase && phase[dir]); // letra violeta: se cruza el muro

	const react = now() - shownAt;
	hits++;
	comboUp();
	styleHit(); // ...y el estilo sólo hasta donde lo deja el combo
	push(k, "ok");
	cpop = 1;
	sfxOk();
	if (react < 350) {
		// reflejo rápido: descuento de tiempo
		pen -= Math.min(300, 100 + combo * 10);
		pen = Math.max(pen, -(now() - t0) * 0.25); // el bono nunca baja del 75% del crudo
	}
	const d = DV[dir];
	trail.push(p.y * C + p.x); // migaja para el castigo
	pfrom = { c: p.y * C + p.x, t: now() }; // ...y la marca del esquive (ver dodge)
	p.x += d[0];
	p.y += d[1];
	if (thru) {
		// se gastó una carga de determinación
		det--;
		// Y del otro lado del muro se empieza de cero: la determinación no es un
		// atajo de ida y vuelta.  Un error no puede devolverte por una pared que
		// no se cruza sin otra carga —te dejaría del lado equivocado y sin nada
		// con qué volver—, así que ESTA celda pasa a ser tu punto de partida y el
		// camino de migas de antes se borra.
		trail = [];
		tthru++; // ...y el paso del tutorial que la enseña espera esto
		shake = 7;
		sfx(150, 260, "sine", 0.055, 620);
		burst(p.x * S + S / 2, p.y * S + S / 2, "#c8f", 26);
	}
	land();
}

// ---- PISAR LA CELDA NUEVA ---------------------------------------------------
// Todo lo que pasa DESPUÉS de moverse: la moneda, el farol, la puerta, el zarpazo
// de la cacería y el gato que estaba esperando ahí.  Lo comparten la letra (key) y
// el retroceso a propósito (back), y por eso está acá afuera: volver un paso con ⌫
// no puede tener reglas propias —si retrocediendo pisás la salida abierta, salís;
// si pisás un gato, te agarra— o serían dos juegos distintos según con qué tecla
// te moviste.
function land() {
	const j = coins.indexOf(p.y * C + p.x);
	if (j > -1) {
		coins.splice(j, 1);
		got++;
		burst(p.x * S + S / 2, p.y * S + S / 2, "#fe4");
		sfxCoin();
		if (got == LV.mid) foes.push(far()); // un gato más a mitad de camino
		if (exitOpen()) {
			// se abrió la salida: hay que cantarlo fuerte
			unlockT = now();
			sfxUnlock();
			burst((C - 0.5) * S, (R - 0.5) * S, "#0f9", 34);
		}
	}
	const li = lamps.indexOf(p.y * C + p.x); // farol: la niebla se abre unos segundos
	if (li > -1) {
		lamps.splice(li, 1);
		revealT = now();
		sfxUnlock();
		burst(p.x * S + S / 2, p.y * S + S / 2, "#fd8", 24);
	}
	if (exitOpen() && p.x == C - 1 && p.y == R - 1) {
		// EL PUNTO DE NO RETORNO.  En el sótano la puerta con todas las monedas no
		// es la salida: es donde empieza la segunda mitad (ver huntStart).  En los
		// otros niveles esto no existe y la puerta sigue siendo la puerta.
		if (LV.hunt && !hunt) return huntStart();
		win = true;
		tEnd = now() - t0;
		const bb = bests[LV.id]; // el récord es de cada nivel
		newPB = !LV.tut && (bb === undefined || tEnd + pen < bb);
		if (newPB) bests[LV.id] = tEnd + pen;
		resAt = now() + RES_MS; // primero se ve el escape, después el resumen
		burst(p.x * S + S / 2, p.y * S + S / 2, "#0f9", 30);
		[784, 988, 1175, 1568].forEach((f, i) =>
			setTimeout(() => sfx(f, 220, "triangle", 0.08), i * 110),
		);
		return;
	}
	// en la cacería el contacto se evalúa en cuanto te movés y no recién en el
	// próximo paso de las presas: esperar hasta 640 ms para que se note que las
	// alcanzaste rompía lo único que esta parte tiene que ser, que es frenética
	if (huntOn()) {
		huntGrab(flow());
		if (qte) return;
		deal();
		return;
	}
	if (foes.includes(p.y * C + p.x)) return qteStart(); // le caíste encima a un enemigo
	deal();
}

// ---- REGRESAR: la tecla de borrar ------------------------------------------
// ⌫ (BORRAR) te devuelve UN paso por el camino que ya hiciste, sin tener que
// buscar entre las cuatro letras de la pantalla cuál era la de vuelta.  Es el
// mismo movimiento que ya hacía el castigo por errar (stepBack), pero a propósito,
// y por eso se cobra distinto que una letra:
//
//   · NO ES UN ACIERTO.  No suma combo, ni estilo, ni el bono por reaccionar
//     rápido, ni cuenta como tecla acertada: retroceder no es jugar bien, es
//     acomodarse.
//   · TAMPOCO ES UN ERROR: no rompe el combo ni suma penalización.  Si lo rompiera
//     nadie lo usaría nunca y sería una tecla de adorno.
//   · Y NO REGALA TIEMPO.  El reloj de la letra NO se reinicia: las letras nuevas
//     de la celda vienen con lo que te quedaba del anterior.  Sin esto, ⌫ sería el
//     botón de "reiniciar el reloj cuando no encuentro la letra" y el castigo por
//     tardar dejaría de existir.
//
// El precio de verdad no hace falta inventarlo, lo cobra el laberinto: cada celda
// que retrocedés es una celda que hay que volver a caminar tecleando, y como el
// gato te viene siguiendo POR DETRÁS, retroceder es muchas veces meterse en su
// boca —y si te lo cruzás justo, es un esquive al cruce (ver dodge)—.
const BACK_MS = 120; // un paso por vez: ⌫ apretado no es un rebobinado
let backAt = 0;
function back() {
	if (win || frozen || paused || qte || tutHold() || huntHold() || huntFin())
		return false;
	const T = now();
	// El freno cubre dos cosas de una: que dejar la tecla apretada te lleve al
	// principio del laberinto de un saque, y que el ⌫ del teléfono —que avisa por
	// keydown y por beforeinput, según el navegador— cuente dos pasos por toque.
	if (T - backAt < BACK_MS) return false;
	if (!trail.length) return growl(); // no hay camino atrás: un gruñido y nada más
	backAt = T;
	const sa = shownAt; // el reloj de la letra sigue siendo el mismo (ver arriba)
	push("⌫", "back");
	stepBack();
	sfx(280, 110, "sine", 0.035, 150);
	burst(p.x * S + S / 2, p.y * S + S / 2, "#8ac", 8);
	land();
	if (!qte && !win) shownAt = sa;
	return true;
}

// teclado físico.  ESPACIO y ENTER no son letras del laberinto: son el maullido.
// Si el foco está en un botón del menú el Enter es de ese botón y no se le roba.
const enUI = (e) => {
	const t = e && e.target;
	return !!(
		t &&
		t !== kb &&
		/^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(t.tagName || "")
	);
};
onkeydown = (e) => {
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	// El cartel del primer encuentro NO se cierra con el teclado.  Lo que explica
	// es un QTE, y un QTE se gana TECLEANDO: con "cualquier tecla es ESTOY LISTO"
	// la letra que el jugador ya tenía en el aire para moverse se llevaba puesta la
	// única explicación que hay del sistema —y de paso parecía que el QTE ya había
	// arrancado y él lo estaba perdiendo—.  Se sale por su botón y nada más: con el
	// mouse, o con TAB (que lleva el foco ahí) y después ENTER.
	if (brief.className === "on") {
		if (e.key === "Tab") {
			e.preventDefault();
			bok.focus();
			return;
		}
		if (e.target === bok && (e.key === "Enter" || e.key === " ")) return;
		e.preventDefault();
		return;
	}
	// el cartel de las habilidades, igual: el maullido se suelta con ESPACIO y el
	// que ya venía en camino no se puede llevar puesta la explicación
	if (habOn()) {
		if (e.key === "Tab") {
			e.preventDefault();
			hok.focus();
			return;
		}
		if (e.target === hok && (e.key === "Enter" || e.key === " ")) return;
		e.preventDefault();
		return;
	}
	// ESCAPE abre y cierra el menú, que es donde viven los botones secundarios.
	// Con otro panel arriba no hace nada: cada uno tiene su propia salida.
	if (e.key === "Escape" || e.key === "Esc") {
		if (lvlOn || resOn || skill.style.display === "grid") return;
		e.preventDefault();
		menuOn ? menuClose() : menuOpen();
		return;
	}
	if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
		if (enUI(e)) return;
		e.preventDefault();
		meow();
		return;
	}
	// BORRAR = REGRESAR.  Va antes del filtro de una sola letra porque "Backspace"
	// mide nueve.  Delete entra también: en el Mac la tecla se llama "delete" y hay
	// teclados donde la de borrar manda eso.
	if (e.key === "Backspace" || e.key === "Delete" || e.key === "Del") {
		if (enUI(e)) return;
		e.preventDefault();
		back();
		return;
	}
	if (e.key.length !== 1) return;
	e.preventDefault();
	key(e.key.toLowerCase());
};
// teclado de teléfono: los soft keyboards no mandan e.key fiable, se lee lo que escriben
kb.oninput = () => {
	const v = kb.value;
	kb.value = "";
	for (const c of v.toLowerCase())
		if (c === " " || c === "\n") meow();
		else key(c);
};
// ...y el ⌫ de ese teclado no llega por oninput: el campo está siempre vacío, así
// que no hay nada que borrar y el navegador no dispara input.  Algunos igual mandan
// keydown (y ahí lo agarra el de arriba) y otros sólo avisan con beforeinput; back()
// se banca que lleguen los dos, que es justo para lo que tiene el freno de BACK_MS.
kb.onbeforeinput = (e) => {
	if (e && /^delete/.test(String(e.inputType || ""))) back();
};

// ---- pantalla completa -----------------------------------------------------
// Es el único botón que le devuelve al juego el alto que se comen las barras del
// navegador.  Dentro de un iframe la API puede venir bloqueada: en ese
// caso el botón ni se muestra y todo lo demás sigue igual.
const FSOK = !!(
	document.fullscreenEnabled || document.webkitFullscreenEnabled
);
const fsOn = () =>
	!!(document.fullscreenElement || document.webkitFullscreenElement);
function goFS() {
	if (!FSOK || fsOn()) return;
	const r = root.requestFullscreen || root.webkitRequestFullscreen;
	try {
		const q = r && r.call(root);
		q && q.catch && q.catch(() => {});
	} catch (e) {}
}
function outFS() {
	if (!fsOn()) return;
	const q = document.exitFullscreen || document.webkitExitFullscreen;
	try {
		const r = q && q.call(document);
		r && r.catch && r.catch(() => {});
	} catch (e) {}
}
function fsSync() {
	const on = fsOn();
	fsb.textContent = on
		? "\u25A0 PANTALLA NORMAL"
		: "\u25A1 PANTALLA COMPLETA";
	fsb.className = on ? "on" : "";
	fit(); // cambió el alto útil: reencuadrar
	if (on && MOBILE) setTimeout(kbFocus, 80); // entrar a fullscreen cierra el teclado
}
// El automático es UNA sola vez: el primer toque al entrar a la partida.  Después
// la pantalla completa se maneja sólo con el botón del menú (si el jugador sale a
// mano, tocar el laberinto no lo devuelve ahí de prepo... ni la partida siguiente).
let fsAuto = true;
const autoFS = () => {
	if (MOBILE && fsAuto) {
		fsAuto = false;
		goFS();
	}
};
fsb.onclick = () => {
	fsAuto = false;
	fsOn() ? outFS() : goFS();
	fsb.blur();
};
if (!FSOK) fsb.style.display = "none";
if (document.addEventListener) {
	document.addEventListener("fullscreenchange", fsSync);
	document.addEventListener("webkitfullscreenchange", fsSync);
}

// tocar el laberinto abre el teclado; en el teléfono además entra a pantalla
// completa (hay gesto del usuario, que es lo único que pide la API)
function tap() {
	kbFocus();
	autoFS();
}
tec.onclick = () => {
	menuClose();
	tap();
	tec.blur();
};
// en el teléfono no hay ESPACIO: el que salta el buildup es el propio tablero
cv.onclick = () => {
	if (huntHold() && huntSkip()) return;
	if (huntFin() && huntFinSkip()) return;
	tap();
};
bar.onclick = tap;
// en el teléfono no hay barra espaciadora a mano: el bloque del rango es el botón
// del maullido, y si todavía no está listo hace lo mismo que el resto de la barra
bcombo.onclick = (e) => {
	if (e && e.stopPropagation) e.stopPropagation();
	if (!meow()) tap();
};
bmeow.onclick = (e) => {
	if (e && e.stopPropagation) e.stopPropagation();
	if (!meow()) tap();
};

// ---- menú hamburguesa ------------------------------------------------------
// Mismo markup que la fila de botones de escritorio; en el teléfono se abre como
// panel y, mientras está abierto, el reloj se congela igual que con el diálogo
// de skill issue (si no, mirar el menú costaría segundos de partida).
let menuOn = false,
	menuPaused = false;
const stats = () =>
	`precisión ${Math.round(acc() * 100)}%  ·  pen +${fmt(pen)}  ·  teclas ${log.length}` +
	`  ·  combo x${combo} (récord x${maxCombo})` +
	`  ·  estilo ${RANKS[rankI()].k} (promedio ${RANKS[rankI(avgStl())].k}, pico ${RANKS[rankI(maxStl)].k})` +
	habTxt(now()) +
	(baby ? `  ·  BABY MODE ${baby}` : "") +
	(bests[LV.id] ? `  ·  MEJOR ${fmt(bests[LV.id])}s` : "");
function menuOpen() {
	if (menuOn) return;
	menuOn = true;
	kb.blur(); // si no, el teclado tapa medio panel
	if (!paused) {
		paused = true;
		pauseAt = now();
		menuPaused = true;
	}
	mstats.textContent = stats();
	lastSub = null;
	menu.className = "open";
}
function menuClose() {
	if (!menuOn) return;
	menuOn = false;
	menu.className = "";
	if (menuPaused) {
		menuPaused = false;
		unpause();
	}
}
burger.onclick = (e) => {
	if (e && e.stopPropagation) e.stopPropagation();
	menuOn ? menuClose() : menuOpen();
};
menu.onclick = (e) => {
	if (e && e.target === menu) menuClose();
}; // tocar afuera cierra

// ---- selector de nivel -----------------------------------------------------
// Izquierda la lista (niveles ahora, modos de juego cuando existan), derecha la
// ficha del seleccionado con su botón de jugar.  La lista se dibuja de una sola
// pasada con innerHTML y los clics se resuelven por delegación: así agregar un
// nivel no obliga a tocar nada de esta parte.
let pick = LEVELS[1].id,
	lvlOn = false,
	lvlPaused = false;
const meta = (l) =>
	l.soon
		? []
		: [
				`${l.C}x${l.R}`,
				`${l.coins} monedas`,
				`${l.foes} gato${l.foes == 1 ? "" : "s"}` +
					(l.stalk ? ` + ${l.stalk} acechador` : ""),
				l.fog ? "niebla" : "a la vista",
				bests[l.id] ? `mejor ${fmt(bests[l.id])}` : "sin récord",
			];
function lvlList() {
	const row = (l) =>
		`<button data-id="${l.id}" class="${l.id === pick ? "sel" : ""}${l.soon ? " soon" : ""}"` +
		` style="color:${l.col}">${l.name}<small>${l.soon ? "PRÓXIMAMENTE" : l.tag.split(" · ")[0]}</small></button>`;
	llist.innerHTML =
		"<div class=cat>NIVELES</div>" +
		LEVELS.map(row).join("") +
		"<div class=cat>MODOS DE JUEGO</div>" +
		MODES.map(row).join("");
}
function lvlPick(id) {
	const l = ALL.find((v) => v.id === id);
	if (!l) return;
	pick = id;
	lvlList();
	ltag.textContent = l.tag;
	lname.textContent = l.name;
	lname.style.color = l.col;
	// la foto sólo la tienen los niveles: los modos PRÓXIMAMENTE no, y sin esto
	// se quedaba a la vista la del nivel anterior
	lpic.style.display = l.pic ? "" : "none";
	if (l.pic) lpic.src = l.pic;
	ldesc.textContent = l.desc;
	lpts.innerHTML = l.pts.map((t) => `<li>${t}</li>`).join("");
	lmeta.innerHTML = meta(l)
		.map((t) => `<span>${t}</span>`)
		.join("");
	lgo.textContent = l.soon ? "PRÓXIMAMENTE" : "\u25B6 JUGAR";
	lgo.disabled = !!l.soon;
	lgo.style.opacity = l.soon ? ".4" : "1";
	lgo.style.color = l.soon ? "#9ef" : l.col;
}
// ---- BABY POINTS de arranque -----------------------------------------------
// El cartel de skill issue los regala de a uno EN MEDIO de la partida, que es el
// peor momento posible para decidir una dificultad: te lo pregunta justo cuando la
// estás pasando mal.  Acá se eligen ANTES de entrar, con la ficha del nivel a la
// vista.  Es el mismo babyK que usa el cartel —35% más de ventana por letra y de
// margen por letra en el QTE, por punto— y se aplican al apretar JUGAR.
const BABY_MAX = 5;
let startBaby = 0;
function babySync() {
	lbv.textContent = startBaby;
	lbh.textContent = startBaby
		? `+${Math.round(babyK(startBaby) * 100 - 100)}% de tiempo para reaccionar`
		: "reacción normal";
	lbm.disabled = !startBaby;
	lbp.disabled = startBaby >= BABY_MAX;
}
const babyStep = (d) => {
	startBaby = Math.max(0, Math.min(BABY_MAX, startBaby + d));
	babySync();
};
lbm.onclick = () => babyStep(-1);
lbp.onclick = () => babyStep(1);
babySync();

function lvlShow() {
	if (lvlOn) return;
	lvlOn = true;
	menuClose();
	kb.blur();
	huntReset();
	if (!paused) {
		paused = true;
		pauseAt = now();
		lvlPaused = true;
	} // mirar el menú no cuesta segundos
	lvlPick(pick);
	lvl.className = "open";
}
function lvlHide() {
	if (!lvlOn) return;
	lvlOn = false;
	lvl.className = "";
	if (lvlPaused) {
		lvlPaused = false;
		unpause();
	}
}
function lvlPlay() {
	const l = ALL.find((v) => v.id === pick);
	if (!l || l.soon) return;
	lvlHide();
	setLevel(l.id);
	baby = startBaby; // la dificultad que se eligió antes de entrar
	gen();
	autoFS();
	kbFocus();
}
llist.onclick = (e) => {
	const b = e.target.closest && e.target.closest("button[data-id]");
	if (b) lvlPick(b.dataset.id);
};
lgo.onclick = lvlPlay;
nvl.onclick = () => {
	lvlShow();
	nvl.blur();
};

// ---- pantalla de resultados ------------------------------------------------
// Terminar un nivel dejaba el tablero quieto con un "GANASTE!" chiquito en la
// barra, y el tutorial mandaba derecho al selector: el jugador nunca llegaba a
// ver su tiempo.  Ahora todo nivel termina en su resumen —tiempo neto, crudo y
// penalización, rango máximo, combo, precisión, monedas— con las tres salidas:
// el nivel siguiente, otra vuelta al mismo, o el selector.  Entra RES_MS después
// de pisar la salida para que primero se vea el escape y su chispazo.
const RES_MS = 1200;
let resOn = false,
	resAt = 0,
	newPB = false;
const nextLv = () => {
	const i = LEVELS.findIndex((l) => l.id === LV.id);
	return i < 0 ? null : LEVELS[i + 1] || null;
};
function resShow() {
	resAt = 0;
	if (resOn) return;
	resOn = true;
	menuClose();
	kb.blur(); // en el teléfono el teclado tapa medio panel
	const avg = RANKS[rankI(avgStl())],
		top = RANKS[rankI(maxStl)],
		nx = nextLv();
	const fin = !!hunt && hunt.ph === "end"; // se terminó la cacería: es EL final
	rtag.textContent = fin ? "EL SÓTANO · FINAL" : LV.tag;
	rttl.textContent = fin
		? "FINAL COMPLETADO... POR AHORA."
		: LV.tut
			? "TUTORIAL COMPLETADO"
			: "NIVEL COMPLETADO";
	// el resumen del final llega DESPUÉS de la escena y sobre la pantalla en negro
	// (ver huntFinDraw), así que puede permitirse una línea que no es un número: es
	// lo único que queda por decir, y decirlo en el tablero habría sido encimarle
	// otro cartel al cartel.
	repi.textContent = fin
		? "Bajaste al sótano a escapar. Subís siendo otra cosa."
		: "";
	repi.style.display = fin ? "" : "none";
	rtime.textContent = fmt(tEnd + pen);
	rsub.textContent = `CRUDO ${fmt(tEnd)}  ·  ${pen < 0 ? "BONUS -" : "PENALIZACIÓN +"}${fmt(Math.abs(pen))}`;
	// El rango grande es el PROMEDIO de toda la partida, no el pico ni el que quedó
	// al final.  Antes mostraba el máximo: un solo momento bueno en cuatro minutos
	// malos se llevaba el SSS, y el resumen mentía sobre cómo se había jugado.  El
	// pico sigue estando, al lado, como el récord que es.
	rgrid.innerHTML =
		`<div><i class=rank style="--rc:${avg.col}">${avg.k}</i><small>ESTILO PROMEDIO</small></div>` +
		`<div><b style="color:${top.col}">${top.k}</b><small>PICO DE ESTILO</small></div>` +
		`<div><b>x${maxCombo}</b><small>COMBO MÁX.</small></div>` +
		`<div><b>${Math.round(acc() * 100)}%</b><small>PRECISIÓN</small></div>` +
		`<div><b>${got}/${LV.coins}</b><small>MONEDAS</small></div>` +
		`<div><b>${hits + fails}</b><small>TECLAS</small></div>` +
		(qteWins
			? `<div><b>${qteWins}</b><small>GATOS</small></div>`
			: "") +
		(maxKills > 1
			? `<div><b>x${maxKills}</b><small>RACHA DE GATOS</small></div>`
			: "") +
		(dodges
			? `<div><b>${dodges}</b><small>ESQUIVES AL CRUCE</small></div>`
			: "") +
		(parries
			? `<div><b>${parries}</b><small>PARRIES</small></div>`
			: "") +
		(fin
			? `<div><b>${hunt.eaten}/${HUNT_PREY}</b><small>PRESAS</small></div>` +
				`<div><b>${hunt.esc}</b><small>SE TE ESCAPARON</small></div>`
			: "") +
		(baby ? `<div><b>${baby}</b><small>BABY POINTS</small></div>` : "");
	rpb.textContent = newPB
		? "\u2605 ¡NUEVA MEJOR MARCA!"
		: bests[LV.id] !== undefined
			? "MEJOR MARCA " + fmt(bests[LV.id])
			: "";
	rnext.textContent = nx ? "\u25B6 " + nx.name : "\u25B6 SIGUIENTE";
	rnext.style.display = nx ? "" : "none"; // del último nivel no se sigue a ningún lado
	res.className = "open";
}
function resHide() {
	resOn = false;
	resAt = 0;
	res.className = "";
}
function resGo(id) {
	resHide();
	if (id) setLevel(id);
	gen();
	autoFS();
	kbFocus();
}
rnext.onclick = () => {
	const nx = nextLv();
	resGo(nx ? nx.id : null);
};
ragain.onclick = () => resGo(null);
rlvls.onclick = () => {
	const nx = nextLv();
	resHide();
	if (nx) pick = nx.id;
	lvlShow();
};

// ---- tutorial guiado -------------------------------------------------------
// Reemplaza al cartel de onboarding: en vez de leer cinco reglas de golpe, el
// nivel 1 enciende UN sistema por paso y no avanza hasta que el jugador lo usó.
// Cada paso: qué dice, qué prende al entrar (enter) y cómo se da por aprendido.
const TUT = [
	{
		t: "Cada salida abierta de tu casilla muestra una <b>LETRA</b>. Tecleála y el gato blanco avanza para ese lado.",
		hold: 1,
		ok: () => hits >= 4,
	},
	{
		t: "Ese <b>ANILLO</b> alrededor del gato es tu tiempo. Si se vacía —o tecleás una letra que no está— retrocedés un paso. Y si querés volver <b>a propósito</b>, la tecla de <b>BORRAR</b> (&#9003;).",
		ok: () => hits >= 9,
	},
	{
		t: "Aciertos seguidos suben el <b>COMBO</b> —un error lo borra entero— y suman <b>ESTILO</b>, que es tu <b>RANGO</b> y aguanta mucho más. Encadená 4.",
		enter: () => {
			combo = 0;
		},
		ok: () => combo >= 4,
	},
	{
		t: "Cuidado: un <b>GATO NEGRO</b> entró al laberinto y viene caminando por vos. Todavía está lejos: miralo venir. Cuando te alcance, el juego se <b>frena</b> y te explica qué hacer.",
		// entra a la MISMA distancia que usa el resto del juego (FAR).  A tres
		// pasos aparecía casi encima: el primer encuentro era un manotazo y no
		// quedaba tiempo ni de mirar de dónde venía.
		enter: () => {
			foes = [tutFoe(FAR())];
			prevFoe = [];
		},
		// un jugador rápido se le escapa para siempre a un gato que da un paso por segundo,
		// y el tutorial no puede quedarse trabado esperando: al rato el gato te encuentra
		// igual.  Va a tu MISMA casilla y no a la de al lado: así el encuentro termina
		// como cualquier otro y el gato se reubica lejos al ganarlo (ver qteEnd).
		push: () => {
			prevFoe = [];
			// primer empujón: el gato NO aparece encima.  Se lo reubica a dos pasos
			// y camina los que faltan como cualquier otro (moveFoes dispara el
			// encuentro al pisarte): el jugador ve de dónde le vino.  Aparecérsele
			// en la casilla se leía como un teletransporte, y justo en el paso que
			// dice "miralo venir".
			if (tpush === 1) {
				foes = [tutFoe(2)];
				return;
			}
			// y si aun así se le sigue escapando, ahí sí se da por alcanzado: el
			// tutorial no puede quedarse trabado esperando a un jugador rápido
			foes = [p.y * C + p.x];
			qteStart();
		},
		ok: () => tflag > 0,
	},
	{
		t: "Vencer gatos te da <b>DETERMINACIÓN</b>. Con una carga, los <b>MUROS</b> de tu celda también sacan letra —en <b>violeta</b>— y teclearla te <b>atraviesa la pared</b>. Gastá una.",
		// el gato ya cumplió: se va del tablero para que este paso se practique
		// tranquilo, y la carga se regala (en la partida son 3 gatos por carga)
		enter: () => {
			foes = [];
			prevFoe = [];
			det = Math.max(det, 1);
			deal(); // las letras violetas salen recién en el reparto siguiente
			habShow("det");
		},
		ok: () => tthru > 0,
	},
	{
		t: "Y con el combo a la mitad se arma el <b>MAULLIDO</b> para toda la partida. <b>ESPACIO</b> —o el <b>&#9834;</b> de la barra— y los gatos cercanos salen corriendo. Probalo.",
		// Se arma a mano (en la partida lo arma llegar a MEOW_ARM) y vuelve EL
		// gato del tutorial, el único con el que se jugó en todo el nivel, a media
		// distancia: un maullido sin nadie a quien ahuyentar no enseña nada, y dos
		// gatos desconocidos tampoco —lo que hay que ver es a ÉSE dando media
		// vuelta, el mismo que te alcanzó hace dos pasos.
		enter: () => {
			meowOn = true;
			meowAt = -1e9;
			foes = [tutFoe(5)];
			prevFoe = [];
			habShow("meow");
		},
		ok: () => tmeow > 0,
	},
	{
		t: "Juntá las <b>MONEDAS</b> amarillas: la salida está <b>cerrada con candado</b> hasta tenerlas todas.",
		// El gato NO se borra acá.  Lo AHUYENTASTE, no lo hiciste desaparecer: el
		// maullido lo puso a correr para el otro lado y sigue en el laberinto,
		// donde tiene que estar.  Borrarlo era desmentir en el paso siguiente lo
		// que el paso anterior acababa de enseñar.
		enter: () => {
			spawn(coins, LV.coins);
		},
		ok: () => exitOpen(),
	},
	{
		t: "La salida ya está <b>verde</b>, abajo a la derecha. Corré hasta ella y escapá: eso es todo el juego.",
		ok: () => win,
	},
];
// el gato a n pasos por el laberinto: lejos para verlo venir, cerca para que no se eternice
function tutFoe(n) {
	const d = flow();
	let best = 0,
		bd = 99;
	for (let i = 0; i < C * R; i++) {
		const dd = Math.abs(d[i] - n);
		if (d[i] > 0 && dd < bd) {
			bd = dd;
			best = i;
		}
	}
	return best;
}
const tutHold = () => tutOn && !!TUT[tstep].hold;
// Lo que espera un paso antes de darse una mano.  Con el gato entrando a FAR()
// celdas —unos 8 s de caminata en el nivel 1— 4,5 s lo teletransportaban encima
// justo cuando el jugador lo estaba viendo venir.  12 s le dejan al gato llegar
// solo aunque despiste un poco: el empujón es el último recurso, no la regla.
// Y el empujón va en dos tiempos: el primero lo acerca (TUT_PUSH), el segundo lo
// da por encima tuyo (TUT_GRAB después, que desde dos pasos es tiempo de sobra
// para que llegue caminando si el jugador no sale corriendo).
const TUT_PUSH = 12000,
	TUT_GRAB = 4000;
function tutStart() {
	tutOn = !!LV.tut;
	tstep = 0;
	tflag = 0;
	tthru = 0;
	tmeow = 0;
	tAt = now();
	tpush = 0;
	tut.className = tutOn ? "on" : "";
	root.style.setProperty("--tuth", tutOn ? "112px" : "0px"); // el tablero le deja el alto
	fit(); // ...y en escritorio ese alto sale del que crecía el tablero
	if (tutOn) tutSay();
}
function tutSay() {
	tmsg.innerHTML = TUT[tstep].t;
	tnum.textContent = tstep + 1 + "/" + TUT.length;
	tfill.style.width = ((tstep / TUT.length) * 100).toFixed(0) + "%";
}
function tutCheck() {
	if (paused || frozen) return;
	const s = TUT[tstep];
	if (!s.ok()) {
		// el paso todavía no se aprendió
		if (s.push && now() - tAt > (tpush ? TUT_GRAB : TUT_PUSH)) {
			tAt = now();
			tpush++;
			s.push();
		}
		return;
	}
	if (++tstep >= TUT.length) return tutEnd();
	tflag = 0;
	tthru = 0;
	tmeow = 0;
	tAt = now();
	tpush = 0;
	const e = TUT[tstep].enter;
	if (e) e();
	shownAt = now(); // el paso nuevo no hereda el reloj gastado
	tutSay();
	sfxUnlock();
}
// SALTAR el tutorial lleva al selector, como siempre.  Terminarlo GANANDO no:
// ahí el resumen del nivel ya está en camino (entra RES_MS después de pisar la
// salida) y desde el resumen se elige a dónde ir.  Antes el selector se abría
// encima del final y el jugador no veía ni su tiempo.
function tutEnd() {
	tutOn = false;
	tut.className = "";
	root.style.setProperty("--tuth", "0px");
	fit(); // el alto que dejó el cartel vuelve al tablero
	try {
		localStorage.setItem("lg.tut", "1");
	} catch (e) {}
	pick = "clasico";
	if (!win) lvlShow();
}
tskip.onclick = () => {
	tskip.blur();
	tutEnd();
};
how.onclick = () => {
	menuClose();
	lvlHide();
	setLevel("tutorial");
	gen();
	how.blur();
};

// Si algo desplazó la página, la devolvemos arriba.  "Algo" es casi siempre el
// navegador trayendo a la vista el input al abrir el teclado, pero también sirve
// para el rebote de iOS o un scrollIntoView ajeno.  El laberinto vive pegado al
// borde superior y ahí se tiene que quedar: con el <body> ya limitado al alto
// visible esto casi nunca tiene trabajo, pero es lo que cubre a los navegadores
// que ignoran interactive-widget (iOS) y a los iframes, donde la
// etiqueta viewport es inerte.
function unscroll() {
	if (!MOBILE) return;
	try {
		if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
		const se = document.scrollingElement;
		if (se && (se.scrollTop || se.scrollLeft)) {
			se.scrollTop = 0;
			se.scrollLeft = 0;
		}
	} catch (e) {}
}
// Enfocar el teclado SIN que el navegador desplace nada.  preventScroll frena el
// "traer a la vista" inmediato; iOS además desplaza cuando termina de animar el
// teclado, así que se vuelve a barrer un par de veces.
function kbFocus() {
	try {
		kb.focus({ preventScroll: true });
	} catch (e) {} // sin soporte lo ignoran, pero enfocan
	unscroll();
	[60, 180, 400].forEach((ms) => setTimeout(unscroll, ms));
}
// El ancho y el alto útiles salen del viewport VISIBLE (el de layout miente dentro
// de iframes y, en el teléfono, no descuenta el teclado).  --vh es el alto del que
// cuelgan las dos cosas: el <body> mide eso (así no hay página de sobra donde
// esconder el tablero) y el CSS achica el laberinto sólo lo necesario para que la
// barra, el tablero y el cartel del tutorial entren enteros arriba del teclado.
// Con pinch-zoom visualViewport también se achica y ahí NO cuenta: se vuelve al
// alto de layout, si no la página se plegaría al zoom.  Si el navegador no da
// visualViewport —o miente dentro del iframe— el min() con 100dvh deja todo igual.
// Lo que en la consola de escritorio NO es tablero, con los mismos números que la
// grilla de @media (min-width:860px): a lo ancho, la columna de servicio + el gap
// + el padding del <body>; a lo alto, el padding + la barra de info (80 de alto y
// 24 de margen) + el gap, y el cartel del tutorial cuando está encendido.
const DSK_MIN = 860,
	DSK_SIDE = 248 + 16 + 20,
	DSK_TOP = 28 + 104 + 9,
	DSK_TUT = 104;
function fit() {
	const vv = window.visualViewport,
		ok = !!(vv && !(vv.scale > 1.02) && vv.width > 0 && vv.height > 0),
		vw = ok ? vv.width : innerWidth,
		vh = ok ? vv.height : innerHeight;
	// El tablero se dibuja a C*S y hasta acá se quedaba clavado en ese ancho: en
	// una pantalla de escritorio era una postal chica en el medio, rodeada de aire.
	// Ahora que los botones viven adentro del menú se lleva TODO lo que sobra —el
	// ancho que deja la columna de servicio y el alto que deja la barra, siempre en
	// la proporción del nivel— y el canvas sube de resolución (K) para que crecer
	// no lo deje borroso.
	let w = Math.max(510, C * S); // ventana angosta: el tamaño de siempre
	// En la consola de dos columnas el tablero se lleva lo que sobra, y también se
	// achica si hace falta: con el ancho clavado en 510 una pantalla baja no tenía
	// dónde poner la barra y el cartel del tutorial, y la página terminaba con
	// scroll —justo lo que el laberinto no puede tener—.
	if (!MOBILE && vw >= DSK_MIN)
		w = Math.max(
			380,
			Math.min(
				vw - DSK_SIDE,
				(vh - DSK_TOP - (tutOn ? DSK_TUT : 0)) * (C / R),
			),
		);
	w = Math.max(240, Math.min(w, vw - 16));
	root.style.setProperty("--w", Math.round(w) + "px");
	root.style.setProperty("--vh", Math.round(vh) + "px");
	// K entero: escalar por 1,5 se ve peor que dibujar al doble y achicar.  El
	// -0.1 es tolerancia: a 2,03 aumentos no hace falta el triple de píxeles, la
	// diferencia no se ve y son 2,25 veces más canvas que pintar por cuadro.
	K = MOBILE ? 1 : Math.min(3, Math.max(1, Math.ceil(w / (C * S) - 0.1)));
	// el canvas nuevo arranca en blanco: si cambió, las paredes se rehornean
	if (sizeCanvas() && g && g.length === C * R) bakeMaze();
	unscroll();
}
// El resize arrastra decenas de eventos por segundo y cada fit() con el tamaño
// cambiado rehornea las paredes con shadowBlur: se coalesca a uno solo 150 ms
// después del último evento.  fit() queda síncrono para las llamadas directas
// (gen, setLevel, fsSync), que lo necesitan al instante.
let fitT = 0;
function fitSoon() {
	clearTimeout(fitT);
	fitT = setTimeout(fit, 150);
}
addEventListener("resize", fitSoon);
if (window.visualViewport) {
	visualViewport.addEventListener("resize", fitSoon);
	visualViewport.addEventListener("scroll", unscroll);
}
if (MOBILE) {
	// último cinturón: nada de scroll
	addEventListener("scroll", unscroll, { passive: true });
	addEventListener("focusin", unscroll);
}
fsSync(); // deja el botón con el texto correcto
fit();

// Primera visita: al tutorial guiado.  Si ya se terminó alguna vez, directo al
// selector de nivel (dentro de un iframe localStorage puede no estar:
// si falla, se juega el tutorial y listo).
const visto = (() => {
	try {
		return localStorage.getItem("lg.tut") === "1";
	} catch (e) {
		return false;
	}
})();
lvlList();
rankShow(0, false);
setLevel(visto ? "clasico" : "tutorial");
gen();
if (visto) lvlShow();
// render sólo cuando los sprites ya están decodificados (nada de cuadros de respaldo).
// En móvil se espera sólo a los dos que se dibujan siempre: el enemigo a pantalla
// completa y el gif de la explosión (~130KB) se decodifican en paralelo y no
// retrasan el primer cuadro, que es lo que hacía sentir lento el arranque.
const dec = (i) =>
	i.decode ? i.decode().catch(() => {}) : Promise.resolve();
Promise.all((MOBILE ? [PJ, FOE] : [PJ, FOE, BIG, GIF]).map(dec)).then(
	frame,
	frame,
);
if (MOBILE) [BIG, GIF].forEach(dec);
// check: el laberinto siempre queda conectado
(() => {
	const seen = [0],
		q = [0];
	while (q.length) {
		const c = q.pop(),
			cx = c % C,
			cy = (c / C) | 0;
		[
			[0, -1, "n"],
			[1, 0, "e"],
			[0, 1, "s"],
			[-1, 0, "w"],
		].forEach(([dx, dy, w]) => {
			const nx = cx + dx,
				ny = cy + dy,
				n = ny * C + nx;
			if (
				nx >= 0 &&
				ny >= 0 &&
				nx < C &&
				ny < R &&
				!g[c][w] &&
				!seen.includes(n)
			) {
				seen.push(n);
				q.push(n);
			}
		});
	}
	console.assert(seen.length == C * R, "laberinto no conectado");
})();
