// --- 1. CONFIGURACIÓN DEL CANVAS Y LA CUADRÍCULA ---
const canvas = document.getElementById("lienzo");
const ctx = canvas.getContext("2d");

const FILAS = 30;
const COLUMNAS = 30;
const TAMANO_CELDA = canvas.width / COLUMNAS; // 600px / 30 = 20px por celda

// Matriz del mapa: 
// 0 = libre (café), 1 = árbol (muro), 2 = baya roja, 3 = baya morada
let mapa = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(0));

// Posiciones predeterminadas
let inicio = { f: 2, c: 2 };
let fin = { f: 27, c: 27 };

// Variables de estado de la UI
let herramientaActual = "alien"; 
let estaDibujando = false;

// --- VARIABLES PARA MST (Etapa 3) ---
let nodosMST = []; // Guardará las coordenadas de las antenas: {f, c}
let aristasMST = []; // Guardará las líneas a dibujar: {origen, destino}


// --- 1.5 VARIABLES DE ALGORITMOS Y ANIMACIÓN ---
// Esta matriz guardará qué celdas han sido visitadas o son parte del camino final
let matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
let algoritmoCorriendo = false;

// Función para pausar la ejecución y crear el efecto de animación
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --- 2. LÓGICA DE HERRAMIENTAS (BOTONES) ---
const toolBtns = document.querySelectorAll('.tool-btn');
toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        toolBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        const id = e.target.id;
        if (id === "btn-alien") herramientaActual = "alien";
        if (id === "btn-nave") herramientaActual = "nave";
        if (id === "btn-arbol") herramientaActual = "arbol";
        if (id === "btn-roja") herramientaActual = "roja";
        if (id === "btn-morada") herramientaActual = "morada";
        if (id === "btn-antena") herramientaActual = "antena";
        if (id === "btn-borrador") herramientaActual = "borrador";
    });
});


// --- 3. DIBUJO DEL MAPA ---
function dibujarMapa() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let f = 0; f < FILAS; f++) {
        for (let c = 0; c < COLUMNAS; c++) {
            const x = c * TAMANO_CELDA;
            const y = f * TAMANO_CELDA;

            // 1. Pintar el terreno base (Árboles y Bayas) [cite: 218-232]
            if (mapa[f][c] === 1) ctx.fillStyle = "#2e4635";      
            else if (mapa[f][c] === 2) ctx.fillStyle = "#bf616a"; 
            else if (mapa[f][c] === 3) ctx.fillStyle = "#b48ead"; 
            else ctx.fillStyle = "#a48665";                       

            ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
            ctx.strokeStyle = "#80664d";
            ctx.strokeRect(x, y, TAMANO_CELDA, TAMANO_CELDA);

            // 2. Pintar la exploración del algoritmo
            if (matrizExploracion[f][c] === 'visitado') {
                ctx.fillStyle = "rgba(0, 150, 255, 0.5)"; 
                ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
            } else if (matrizExploracion[f][c] === 'camino') {
                ctx.fillStyle = "rgba(255, 223, 0, 0.7)"; 
                ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
            }

            // 3. Pintar Alien y Nave (Inicio y Fin)
            if (f === inicio.f && c === inicio.c) {
                ctx.fillStyle = "#a3be8c";
                ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
                ctx.font = "14px Arial";
                ctx.fillText("👽", x + 2, y + 15);
            }
            if (f === fin.f && c === fin.c) {
                ctx.fillStyle = "#5ab1bb";
                ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
                ctx.font = "14px Arial";
                ctx.fillText("🚀", x + 2, y + 15);
            }
        }
    }

    // --- NUEVO: Dibujar Aristas MST (Líneas) ---
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ebcb8b"; // Color amarillo/dorado para los cables
    for (let arista of aristasMST) {
        ctx.beginPath();
        ctx.moveTo(arista.origen.c * TAMANO_CELDA + TAMANO_CELDA / 2, arista.origen.f * TAMANO_CELDA + TAMANO_CELDA / 2);
        ctx.lineTo(arista.destino.c * TAMANO_CELDA + TAMANO_CELDA / 2, arista.destino.f * TAMANO_CELDA + TAMANO_CELDA / 2);
        ctx.stroke();
    }
    ctx.lineWidth = 1;

    // --- NUEVO: Dibujar Antenas MST ---
    for (let nodo of nodosMST) {
        const x = nodo.c * TAMANO_CELDA;
        const y = nodo.f * TAMANO_CELDA;
        ctx.fillStyle = "#81a1c1"; // Azul acero para las bases
        ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
        ctx.font = "14px Arial";
        ctx.fillText("📡", x + 2, y + 15);
    }
}


// --- 4. INTERACTIVIDAD DEL MOUSE ---
function aplicarHerramienta(f, c) {
    if (f < 0 || f >= FILAS || c < 0 || c >= COLUMNAS) return;

    if (herramientaActual === "alien") {
        inicio = { f, c }; 
        mapa[f][c] = 0;    
    } else if (herramientaActual === "nave") {
        fin = { f, c };    
        mapa[f][c] = 0;
    } else if (herramientaActual === "antena") { 
        if (!nodosMST.some(nodo => nodo.f === f && nodo.c === c)) {
            nodosMST.push({ f, c });
        }
    } else {
        if ((f === inicio.f && c === inicio.c) || (f === fin.f && c === fin.c)) return;

        if (herramientaActual === "arbol") mapa[f][c] = 1;
        else if (herramientaActual === "roja") mapa[f][c] = 2;
        else if (herramientaActual === "morada") mapa[f][c] = 3;
        else if (herramientaActual === "borrador") {
            mapa[f][c] = 0;
            nodosMST = nodosMST.filter(nodo => nodo.f !== f || nodo.c !== c);
        }
    }
    
    dibujarMapa();
}

canvas.addEventListener("mousedown", (e) => {
    estaDibujando = true;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / TAMANO_CELDA);
    const f = Math.floor((e.clientY - rect.top) / TAMANO_CELDA);
    aplicarHerramienta(f, c);
});

canvas.addEventListener("mousemove", (e) => {
    if (!estaDibujando) return;
    if (herramientaActual === "alien" || herramientaActual === "nave") return;

    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / TAMANO_CELDA);
    const f = Math.floor((e.clientY - rect.top) / TAMANO_CELDA);
    aplicarHerramienta(f, c);
});

canvas.addEventListener("mouseup", () => estaDibujando = false);
canvas.addEventListener("mouseleave", () => estaDibujando = false);

dibujarMapa();


// --- 6. ALGORITMO BFS ---
async function ejecutarBFS() {
    const direcciones = [[-1, 0], [1, 0], [0, 1], [0, -1]]; 
    
    let cola = [{ f: inicio.f, c: inicio.c }];
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    
    matrizExploracion[inicio.f][inicio.c] = 'visitado';
    let nodosVisitados = 0;

    document.getElementById("stat-nodos").innerText = nodosVisitados;
    document.getElementById("stat-pasos").innerText = "0";

    while (cola.length > 0) {
        if (!algoritmoCorriendo) return; 

        let actual = cola.shift();

        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCamino(padres);
            return;
        }

        for (let [df, dc] of direcciones) {
            let nf = actual.f + df;
            let nc = actual.c + dc;

            if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
                if (mapa[nf][nc] !== 1 && matrizExploracion[nf][nc] === null) {
                    matrizExploracion[nf][nc] = 'visitado';
                    padres[nf][nc] = actual; 
                    cola.push({ f: nf, c: nc }); 
                    
                    nodosVisitados++;
                    document.getElementById("stat-nodos").innerText = nodosVisitados;
                    
                    dibujarMapa();
                    await sleep(10); 
                }
            }
        }
    }
    alert("¡La nave es inalcanzable! No hay camino.");
    algoritmoCorriendo = false;
}

// --- 6.1 ALGORITMO DFS ---
async function ejecutarDFS() {
    const direcciones = [[-1, 0], [1, 0], [0, 1], [0, -1]]; 
    
    let pila = [{ f: inicio.f, c: inicio.c }];
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    
    let enPila = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(false));
    enPila[inicio.f][inicio.c] = true;
    
    let nodosVisitados = 0;
    document.getElementById("stat-nodos").innerText = nodosVisitados;
    document.getElementById("stat-pasos").innerText = "0";

    while (pila.length > 0) {
        if (!algoritmoCorriendo) return;

        let actual = pila.pop();

        matrizExploracion[actual.f][actual.c] = 'visitado';
        nodosVisitados++;
        document.getElementById("stat-nodos").innerText = nodosVisitados;
        
        dibujarMapa();
        await sleep(15); 

        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCamino(padres);
            return;
        }

        for (let [df, dc] of direcciones) {
            let nf = actual.f + df;
            let nc = actual.c + dc;

            if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
                if (mapa[nf][nc] !== 1 && matrizExploracion[nf][nc] === null && !enPila[nf][nc]) {
                    enPila[nf][nc] = true;
                    padres[nf][nc] = actual; 
                    pila.push({ f: nf, c: nc }); 
                }
            }
        }
    }
    alert("¡La nave es inalcanzable! No hay camino.");
    algoritmoCorriendo = false;
}

// --- 6.2 PROFUNDIDAD LIMITADA ---
async function ejecutarProfundidadLimitada(limite, esIterativa = false) {
    const direcciones = [[-1, 0], [1, 0], [0, 1], [0, -1]]; 
    
    let pila = [{ f: inicio.f, c: inicio.c, prof: 0 }];
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    let visitados = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(false));
    
    let nodosVisitados = 0;

    while (pila.length > 0) {
        if (!algoritmoCorriendo) return false;

        let actual = pila.pop();

        if (visitados[actual.f][actual.c]) continue;
        visitados[actual.f][actual.c] = true;

        matrizExploracion[actual.f][actual.c] = 'visitado';
        nodosVisitados++;
        document.getElementById("stat-nodos").innerText = nodosVisitados;
        
        dibujarMapa();
        await sleep(esIterativa ? 2 : 15); 

        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCamino(padres);
            return true;
        }

        if (actual.prof < limite) {
            for (let [df, dc] of direcciones) {
                let nf = actual.f + df;
                let nc = actual.c + dc;

                if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
                    if (mapa[nf][nc] !== 1 && !visitados[nf][nc]) {
                        padres[nf][nc] = actual;
                        pila.push({ f: nf, c: nc, prof: actual.prof + 1 });
                    }
                }
            }
        }
    }
    
    if (!esIterativa) {
        alert(`Búsqueda terminada. No se alcanzó la nave en ${limite} saltos o menos.`);
        algoritmoCorriendo = false;
    }
    return false; 
}

// --- 6.3 PROFUNDIDAD ITERATIVA ---
async function ejecutarProfundidadIterativa() {
    let maxL = FILAS * COLUMNAS; 
    
    for (let L = 1; L <= maxL; L++) {
        if (!algoritmoCorriendo) return;
        
        document.getElementById("limite-input").value = L;
        matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
        
        let encontrado = await ejecutarProfundidadLimitada(L, true);
        
        if (encontrado) {
            return; 
        }
        await sleep(30); 
    }
    
    alert("¡La nave es inalcanzable! No hay camino.");
    algoritmoCorriendo = false;
}

async function reconstruirCamino(padres) {
    let actual = padres[fin.f][fin.c];
    let pasos = 0;

    while (actual !== null && (actual.f !== inicio.f || actual.c !== inicio.c)) {
        if (!algoritmoCorriendo) return;
        
        matrizExploracion[actual.f][actual.c] = 'camino';
        pasos++;
        document.getElementById("stat-pasos").innerText = pasos;
        
        dibujarMapa();
        await sleep(30); 
        
        actual = padres[actual.f][actual.c];
    }
    algoritmoCorriendo = false;
}

// --- 7. BOTONES DE ACCIÓN (CORREGIDOS) ---
document.getElementById("btn-iniciar").addEventListener("click", () => {
    if (algoritmoCorriendo) return; 
    
    matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    dibujarMapa();

    const selector = document.getElementById("algoritmo-select").value;
    algoritmoCorriendo = true;

    if (selector === "bfs") ejecutarBFS();
    else if (selector === "dfs") ejecutarDFS();
    else if (selector === "limitada") {
        let L = parseInt(document.getElementById("limite-input").value);
        if (isNaN(L) || L < 1) L = 10; 
        ejecutarProfundidadLimitada(L, false);
    } 
    else if (selector === "iterativa") ejecutarProfundidadIterativa();
    else if (selector === "astar") ejecutarAStar();
    else if (selector === "kruskal") ejecutarKruskal();
    else if (selector === "prim") ejecutarPrim();
});

document.getElementById("btn-limpiar-ruta").addEventListener("click", () => {
    algoritmoCorriendo = false;
    matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    
    // Aquí se borran solo las líneas doradas
    aristasMST = [];
    
    document.getElementById("stat-nodos").innerText = "0";
    document.getElementById("stat-pasos").innerText = "0";
    document.getElementById("stat-costo").innerText = "0";
    dibujarMapa();
});

document.getElementById("btn-reiniciar").addEventListener("click", () => {
    algoritmoCorriendo = false;
    mapa = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(0));
    matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    inicio = { f: 2, c: 2 };
    fin = { f: 27, c: 27 };
    
    // Aquí se borra todo (Antenas y líneas doradas)
    nodosMST = [];
    aristasMST = [];
    
    document.getElementById("stat-nodos").innerText = "0";
    document.getElementById("stat-pasos").innerText = "0";
    document.getElementById("stat-costo").innerText = "0";
    dibujarMapa();
});

// --- 8. COLA DE PRIORIDAD (MIN-HEAP O(log n)) ---
class ColaPrioridad {
    constructor() {
        this.heap = [];
    }

    insertar(nodo) {
        this.heap.push(nodo);
        this.burbujearHaciaArriba(this.heap.length - 1);
    }

    extraerMinimo() {
        if (this.heap.length === 1) return this.heap.pop();
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.hundirHaciaAbajo(0);
        return min;
    }

    vacia() { return this.heap.length === 0; }

    burbujearHaciaArriba(indice) {
        while (indice > 0) {
            let padre = Math.floor((indice - 1) / 2);
            if (this.heap[padre].f_n <= this.heap[indice].f_n) break;
            [this.heap[padre], this.heap[indice]] = [this.heap[indice], this.heap[padre]];
            indice = padre;
        }
    }

    hundirHaciaAbajo(indice) {
        let ultimo = this.heap.length - 1;
        while (true) {
            let hijoIzq = 2 * indice + 1;
            let hijoDer = 2 * indice + 2;
            let menor = indice;

            if (hijoIzq <= ultimo && this.heap[hijoIzq].f_n < this.heap[menor].f_n) menor = hijoIzq;
            if (hijoDer <= ultimo && this.heap[hijoDer].f_n < this.heap[menor].f_n) menor = hijoDer;
            if (menor === indice) break;

            [this.heap[indice], this.heap[menor]] = [this.heap[menor], this.heap[indice]];
            indice = menor;
        }
    }
}

// --- 9. ALGORITMO A* ---
async function ejecutarAStar() {
    const direcciones = [[-1, 0], [1, 0], [0, 1], [0, -1]];
    
    let pq = new ColaPrioridad();
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    
    let costo_g = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(Infinity));
    costo_g[inicio.f][inicio.c] = 0;
    
    pq.insertar({ f: inicio.f, c: inicio.c, f_n: 0 });
    
    let nodosVisitados = 0;
    document.getElementById("stat-nodos").innerText = nodosVisitados;
    document.getElementById("stat-pasos").innerText = "0";
    document.getElementById("stat-costo").innerText = "0";

    while (!pq.vacia()) {
        if (!algoritmoCorriendo) return;
        
        let actual = pq.extraerMinimo();

        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCaminoAStar(padres, costo_g);
            return;
        }

        if (matrizExploracion[actual.f][actual.c] === null) {
            matrizExploracion[actual.f][actual.c] = 'visitado';
            nodosVisitados++;
            document.getElementById("stat-nodos").innerText = nodosVisitados;
            dibujarMapa();
            await sleep(15);
        }

        for (let [df, dc] of direcciones) {
            let nf = actual.f + df;
            let nc = actual.c + dc;

            if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
                let tipoTerreno = mapa[nf][nc];
                
                if (tipoTerreno !== 1) { 
                    let costoPaso = 1; 
                    if (tipoTerreno === 2) costoPaso = 0; 
                    if (tipoTerreno === 3) costoPaso = 3; 
                    
                    let nuevoCosto_g = costo_g[actual.f][actual.c] + costoPaso;
                    
                    if (nuevoCosto_g < costo_g[nf][nc]) {
                        costo_g[nf][nc] = nuevoCosto_g;
                        
                        let h_n = Math.abs(nf - fin.f) + Math.abs(nc - fin.c); 
                        let f_n = nuevoCosto_g + h_n;
                        
                        padres[nf][nc] = { f: actual.f, c: actual.c };
                        pq.insertar({ f: nf, c: nc, f_n: f_n });
                    }
                }
            }
        }
    }
    alert("¡La nave es inalcanzable! No hay camino.");
    algoritmoCorriendo = false;
}

async function reconstruirCaminoAStar(padres, costo_g) {
    let actual = padres[fin.f][fin.c];
    let pasos = 0;

    document.getElementById("stat-costo").innerText = costo_g[fin.f][fin.c];

    while (actual !== null && (actual.f !== inicio.f || actual.c !== inicio.c)) {
        if (!algoritmoCorriendo) return;
        
        matrizExploracion[actual.f][actual.c] = 'camino';
        pasos++;
        document.getElementById("stat-pasos").innerText = pasos;
        
        dibujarMapa();
        await sleep(30); 
        
        actual = padres[actual.f][actual.c];
    }
    algoritmoCorriendo = false;
}

// --- 10. ESTRUCTURA DISJOINT SET (Para Kruskal)  ---
class DisjointSet {
    constructor(n) {
        this.padre = Array.from({ length: n }, (_, i) => i);
        this.rango = Array(n).fill(0);
    }

    encontrar(i) {
        if (this.padre[i] !== i) {
            this.padre[i] = this.encontrar(this.padre[i]); 
        }
        return this.padre[i];
    }

    unir(i, j) {
        let raizI = this.encontrar(i);
        let raizJ = this.encontrar(j);

        if (raizI !== raizJ) {
            if (this.rango[raizI] < this.rango[raizJ]) {
                this.padre[raizI] = raizJ;
            } else if (this.rango[raizI] > this.rango[raizJ]) {
                this.padre[raizJ] = raizI;
            } else {
                this.padre[raizJ] = raizI;
                this.rango[raizI]++;
            }
            return true; 
        }
        return false; 
    }
}

function calcularDistancia(n1, n2) {
    return Math.hypot(n2.f - n1.f, n2.c - n1.c); 
}

// --- 11. ALGORITMO DE KRUSKAL ---
async function ejecutarKruskal() {
    if (nodosMST.length < 2) {
        alert("¡Coloca al menos 2 antenas en el mapa para conectarlas!");
        algoritmoCorriendo = false;
        return;
    }

    let aristasPosibles = [];
    let costoTotal = 0;
    
    for (let i = 0; i < nodosMST.length; i++) {
        for (let j = i + 1; j < nodosMST.length; j++) {
            let peso = calcularDistancia(nodosMST[i], nodosMST[j]);
            aristasPosibles.push({ i, j, peso, origen: nodosMST[i], destino: nodosMST[j] });
        }
    }

    aristasPosibles.sort((a, b) => a.peso - b.peso);

    let ds = new DisjointSet(nodosMST.length);
    aristasMST = []; 

    document.getElementById("stat-pasos").innerText = "0";

    for (let arista of aristasPosibles) {
        if (!algoritmoCorriendo) return;

        if (ds.unir(arista.i, arista.j)) {
            aristasMST.push(arista); 
            costoTotal += arista.peso;
            
            document.getElementById("stat-pasos").innerText = aristasMST.length;
            document.getElementById("stat-costo").innerText = costoTotal.toFixed(2);
            
            dibujarMapa();
            await sleep(150); 
        }
    }
    algoritmoCorriendo = false;
}

// --- 12. ALGORITMO DE PRIM ---
async function ejecutarPrim() {
    if (nodosMST.length < 2) {
        alert("¡Coloca al menos 2 antenas en el mapa para conectarlas!");
        algoritmoCorriendo = false;
        return;
    }

    aristasMST = [];
    let costoTotal = 0;
    let visitados = new Set();
    
    visitados.add(0);
    document.getElementById("stat-pasos").innerText = "0";

    while (visitados.size < nodosMST.length) {
        if (!algoritmoCorriendo) return;

        let aristaMinima = null;
        let nodoAVisitar = -1;

        for (let visitadoIdx of visitados) {
            for (let i = 0; i < nodosMST.length; i++) {
                if (!visitados.has(i)) {
                    let peso = calcularDistancia(nodosMST[visitadoIdx], nodosMST[i]);
                    
                    if (!aristaMinima || peso < aristaMinima.peso) {
                        aristaMinima = { 
                            origen: nodosMST[visitadoIdx], 
                            destino: nodosMST[i], 
                            peso: peso 
                        };
                        nodoAVisitar = i;
                    }
                }
            }
        }

        if (aristaMinima) {
            visitados.add(nodoAVisitar);
            aristasMST.push(aristaMinima);
            costoTotal += aristaMinima.peso;

            document.getElementById("stat-pasos").innerText = aristasMST.length;
            document.getElementById("stat-costo").innerText = costoTotal.toFixed(2);
            
            dibujarMapa();
            await sleep(150); 
        }
    }
    algoritmoCorriendo = false;
}