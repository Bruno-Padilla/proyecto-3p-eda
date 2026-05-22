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


// --- 1.5 VARIABLES DE ALGORITMOS Y ANIMACIÓN (Movido aquí arriba) ---
// Esta matriz guardará qué celdas han sido visitadas o son parte del camino final
let matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
let algoritmoCorriendo = false;

// Función para pausar la ejecución y crear el efecto de animación
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// --- 2. LÓGICA DE HERRAMIENTAS (BOTONES) ---
const toolBtns = document.querySelectorAll('.tool-btn');
toolBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Quitar la clase "active" de todos los botones
        toolBtns.forEach(b => b.classList.remove('active'));
        // Poner "active" al botón seleccionado
        e.target.classList.add('active');
        
        // Asignar la herramienta según el ID del botón
        const id = e.target.id;
        if (id === "btn-alien") herramientaActual = "alien";
        if (id === "btn-nave") herramientaActual = "nave";
        if (id === "btn-arbol") herramientaActual = "arbol";
        if (id === "btn-roja") herramientaActual = "roja";
        if (id === "btn-morada") herramientaActual = "morada";
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
            if (mapa[f][c] === 1) ctx.fillStyle = "#2e4635";      // Árbol
            else if (mapa[f][c] === 2) ctx.fillStyle = "#bf616a"; // Baya Roja
            else if (mapa[f][c] === 3) ctx.fillStyle = "#b48ead"; // Baya Morada
            else ctx.fillStyle = "#a48665";                       // Tierra libre

            ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
            ctx.strokeStyle = "#80664d";
            ctx.strokeRect(x, y, TAMANO_CELDA, TAMANO_CELDA);

            // 2. Pintar la exploración del algoritmo
            if (matrizExploracion[f][c] === 'visitado') {
                ctx.fillStyle = "rgba(0, 150, 255, 0.5)"; // Azul transparente [cite: 59, 87]
                ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
            } else if (matrizExploracion[f][c] === 'camino') {
                ctx.fillStyle = "rgba(255, 223, 0, 0.7)"; // Amarillo transparente [cite: 60, 73]
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
}


// --- 4. INTERACTIVIDAD DEL MOUSE ---
function aplicarHerramienta(f, c) {
    // Prevenir que el usuario se salga del canvas
    if (f < 0 || f >= FILAS || c < 0 || c >= COLUMNAS) return;

    if (herramientaActual === "alien") {
        inicio = { f, c }; // Mover inicio
        mapa[f][c] = 0;    // Limpiar si había obstáculo
    } else if (herramientaActual === "nave") {
        fin = { f, c };    // Mover fin
        mapa[f][c] = 0;
    } else {
        // No permitimos pintar obstáculos encima del Alien o la Nave
        if ((f === inicio.f && c === inicio.c) || (f === fin.f && c === fin.c)) return;

        if (herramientaActual === "arbol") mapa[f][c] = 1;
        else if (herramientaActual === "roja") mapa[f][c] = 2;
        else if (herramientaActual === "morada") mapa[f][c] = 3;
        else if (herramientaActual === "borrador") mapa[f][c] = 0;
    }
    
    // Redibujar el mapa cada vez que se hace un cambio
    dibujarMapa();
}

// Capturar cuando se presiona el mouse
canvas.addEventListener("mousedown", (e) => {
    estaDibujando = true;
    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / TAMANO_CELDA);
    const f = Math.floor((e.clientY - rect.top) / TAMANO_CELDA);
    aplicarHerramienta(f, c);
});

// Capturar cuando se arrastra el mouse para pintar paredes
canvas.addEventListener("mousemove", (e) => {
    if (!estaDibujando) return;
    
    // No permitimos "arrastrar" para el alien y la nave, esos se ponen de un solo clic
    if (herramientaActual === "alien" || herramientaActual === "nave") return;

    const rect = canvas.getBoundingClientRect();
    const c = Math.floor((e.clientX - rect.left) / TAMANO_CELDA);
    const f = Math.floor((e.clientY - rect.top) / TAMANO_CELDA);
    aplicarHerramienta(f, c);
});

// Detener el dibujo al soltar el clic o salir del canvas
canvas.addEventListener("mouseup", () => estaDibujando = false);
canvas.addEventListener("mouseleave", () => estaDibujando = false);

// Ahora sí, llamar a dibujarMapa sin errores
dibujarMapa();


// --- 6. ALGORITMO BFS ---
async function ejecutarBFS() {
    // Direcciones: Arriba, Abajo, Derecha, Izquierda [cite: 77-79]
    const direcciones = [[-1, 0], [1, 0], [0, 1], [0, -1]]; 
    
    // Cola para el BFS y matriz de "padres" para reconstruir el camino [cite: 66, 67]
    let cola = [{ f: inicio.f, c: inicio.c }];
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    
    matrizExploracion[inicio.f][inicio.c] = 'visitado';
    let nodosVisitados = 0;

    // Actualizar UI
    document.getElementById("stat-nodos").innerText = nodosVisitados;
    document.getElementById("stat-pasos").innerText = "0";

    while (cola.length > 0) {
        if (!algoritmoCorriendo) return; // Permitir detenerlo

        // BFS saca el primero de la cola (Amplitud) [cite: 69]
        let actual = cola.shift();

        // Si llegamos a la meta [cite: 70, 71]
        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCamino(padres);
            return;
        }

        // Explorar vecinos
        for (let [df, dc] of direcciones) {
            let nf = actual.f + df;
            let nc = actual.c + dc;

            // Validar límites del mapa [cite: 81]
            if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
                // Si no es un muro (1) y no ha sido visitado [cite: 82]
                if (mapa[nf][nc] !== 1 && matrizExploracion[nf][nc] === null) {
                    matrizExploracion[nf][nc] = 'visitado';
                    padres[nf][nc] = actual; // Guardamos de dónde venimos [cite: 83]
                    cola.push({ f: nf, c: nc }); // Añadimos a la cola [cite: 84]
                    
                    nodosVisitados++;
                    document.getElementById("stat-nodos").innerText = nodosVisitados;
                    
                    dibujarMapa();
                    await sleep(10); // Velocidad de la animación [cite: 89]
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
    
    // Pila para el DFS 
    let pila = [{ f: inicio.f, c: inicio.c }];
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    
    // Usamos un control extra para saber qué nodos ya están en la pila esperando
    let enPila = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(false));
    enPila[inicio.f][inicio.c] = true;
    
    let nodosVisitados = 0;
    document.getElementById("stat-nodos").innerText = nodosVisitados;
    document.getElementById("stat-pasos").innerText = "0";

    while (pila.length > 0) {
        if (!algoritmoCorriendo) return;

        // DFS saca el ÚLTIMO de la pila (Profundidad)
        let actual = pila.pop();

        // Pintamos de azul la celda al sacarla de la pila para ver cómo avanza "al fondo"
        matrizExploracion[actual.f][actual.c] = 'visitado';
        nodosVisitados++;
        document.getElementById("stat-nodos").innerText = nodosVisitados;
        
        dibujarMapa();
        await sleep(15); // Un poquito más lento para apreciar el camino

        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCamino(padres);
            return;
        }

        // Explorar vecinos
        for (let [df, dc] of direcciones) {
            let nf = actual.f + df;
            let nc = actual.c + dc;

            if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
                // Si no es un muro (1), no ha sido visitado y no está ya en la pila esperando
                if (mapa[nf][nc] !== 1 && matrizExploracion[nf][nc] === null && !enPila[nf][nc]) {
                    enPila[nf][nc] = true;
                    padres[nf][nc] = actual; 
                    pila.push({ f: nf, c: nc }); // Añadimos a la pila
                }
            }
        }
    }
    alert("¡La nave es inalcanzable! No hay camino.");
    algoritmoCorriendo = false;
}

// --- 6.2 PROFUNDIDAD LIMITADA ---
// Recibe un límite L, y un parámetro "esIterativa" para que no salte la alerta en cada repetición
async function ejecutarProfundidadLimitada(limite, esIterativa = false) {
    const direcciones = [[-1, 0], [1, 0], [0, 1], [0, -1]]; 
    
    // Ahora guardamos la profundidad (prof) en cada paso
    let pila = [{ f: inicio.f, c: inicio.c, prof: 0 }];
    let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    let visitados = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(false));
    
    let nodosVisitados = 0;

    while (pila.length > 0) {
        if (!algoritmoCorriendo) return false;

        let actual = pila.pop();

        // Evitar procesar celdas por las que ya pasamos en esta misma iteración
        if (visitados[actual.f][actual.c]) continue;
        visitados[actual.f][actual.c] = true;

        matrizExploracion[actual.f][actual.c] = 'visitado';
        nodosVisitados++;
        document.getElementById("stat-nodos").innerText = nodosVisitados;
        
        dibujarMapa();
        
        // Si lo llama la iterativa, hacemos que vaya más rápido para que no sea tedioso
        await sleep(esIterativa ? 2 : 15); 

        // Si encontramos la nave
        if (actual.f === fin.f && actual.c === fin.c) {
            await reconstruirCamino(padres);
            return true;
        }

        // Solo agregamos vecinos a la pila SI NO HEMOS LLEGADO AL LÍMITE L [cite: 14, 300]
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
    
    // Solo mostramos alerta si no la llamó la iterativa
    if (!esIterativa) {
        alert(`Búsqueda terminada. No se alcanzó la nave en ${limite} saltos o menos.`);
        algoritmoCorriendo = false;
    }
    return false; // Retornamos falso si no llegó
}

// --- 6.3 PROFUNDIDAD ITERATIVA ---
async function ejecutarProfundidadIterativa() {
    // Aumentamos el límite desde 1 hasta el número máximo de celdas
    let maxL = FILAS * COLUMNAS; 
    
    for (let L = 1; L <= maxL; L++) {
        if (!algoritmoCorriendo) return;
        
        // Actualizamos el input visualmente para que veas cómo sube el límite
        document.getElementById("limite-input").value = L;
        
        // Borramos el color azul de la iteración anterior para arrancar de nuevo [cite: 318]
        matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
        
        // Ejecutamos la búsqueda con el límite actual "L"
        let encontrado = await ejecutarProfundidadLimitada(L, true);
        
        if (encontrado) {
            return; // Si lo encontró, terminamos el ciclo
        }
        await sleep(30); // Pequeña pausa dramática antes de la siguiente repetición
    }
    
    alert("¡La nave es inalcanzable! No hay camino.");
    algoritmoCorriendo = false;
}

// Función para pintar el camino final de reversa [cite: 72-74]
async function reconstruirCamino(padres) {
    let actual = padres[fin.f][fin.c];
    let pasos = 0;

    while (actual !== null && (actual.f !== inicio.f || actual.c !== inicio.c)) {
        if (!algoritmoCorriendo) return;
        
        matrizExploracion[actual.f][actual.c] = 'camino';
        pasos++;
        document.getElementById("stat-pasos").innerText = pasos;
        
        dibujarMapa();
        await sleep(30); // Animación del camino amarillo
        
        actual = padres[actual.f][actual.c];
    }
    algoritmoCorriendo = false;
}

// --- 7. BOTONES DE ACCIÓN ---
document.getElementById("btn-iniciar").addEventListener("click", () => {
    if (algoritmoCorriendo) return; // Evitar múltiples clics
    
    // Limpiar exploración previa antes de iniciar
    matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    dibujarMapa();

    const selector = document.getElementById("algoritmo-select").value;
    algoritmoCorriendo = true;

    if (selector === "bfs") {
        ejecutarBFS();
    } else if (selector === "dfs") {
        ejecutarDFS();
    } else if (selector === "limitada") {
        // Leemos el valor L que hayas escrito en la cajita [cite: 14]
        let L = parseInt(document.getElementById("limite-input").value);
        if (isNaN(L) || L < 1) L = 10; // Si borraste el número, le ponemos 10 por defecto
        ejecutarProfundidadLimitada(L, false);
    } else if (selector === "iterativa") {
        ejecutarProfundidadIterativa();
    }
});

document.getElementById("btn-limpiar-ruta").addEventListener("click", () => {
    algoritmoCorriendo = false;
    matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    document.getElementById("stat-nodos").innerText = "0";
    document.getElementById("stat-pasos").innerText = "0";
    dibujarMapa();
});

document.getElementById("btn-reiniciar").addEventListener("click", () => {
    algoritmoCorriendo = false;
    mapa = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(0));
    matrizExploracion = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
    inicio = { f: 2, c: 2 };
    fin = { f: 27, c: 27 };
    document.getElementById("stat-nodos").innerText = "0";
    document.getElementById("stat-pasos").innerText = "0";
    dibujarMapa();
});