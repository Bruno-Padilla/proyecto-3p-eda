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

// --- 1.5 VARIABLES DE ALGORITMOS Y ANIMACIÓN ---
let matrizExploracion = Array.from({ length: FILAS }, () =>
  Array(COLUMNAS).fill(null),
);
let algoritmoCorriendo = false;

// Función para pausar la ejecución y crear el efecto de animación
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- 2. LÓGICA DE HERRAMIENTAS (BOTONES) ---
const toolBtns = document.querySelectorAll(".tool-btn");
toolBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    toolBtns.forEach((b) => b.classList.remove("active"));
    e.target.classList.add("active");

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

      // 1. Pintar el terreno base
      if (mapa[f][c] === 1)
        ctx.fillStyle = "#2e4635"; // Árbol
      else if (mapa[f][c] === 2)
        ctx.fillStyle = "#bf616a"; // Baya Roja
      else if (mapa[f][c] === 3)
        ctx.fillStyle = "#b48ead"; // Baya Morada
      else ctx.fillStyle = "#a48665"; // Tierra libre

      ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
      ctx.strokeStyle = "#80664d";
      ctx.strokeRect(x, y, TAMANO_CELDA, TAMANO_CELDA);

      // 2. Pintar la exploración del algoritmo (con los colores de comparación)
      if (matrizExploracion[f][c] === "visitado") {
        ctx.fillStyle = "rgba(0, 150, 255, 0.5)"; // Azul transparente
        ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
      } else if (matrizExploracion[f][c] === "camino") {
        ctx.fillStyle = "rgba(255, 223, 0, 0.7)"; // Amarillo transparente
        ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
      } else if (matrizExploracion[f][c] === "ruta-bfs") {
        ctx.fillStyle = "rgba(255, 165, 0, 0.8)"; // Naranja (BFS)
        ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
      } else if (matrizExploracion[f][c] === "ruta-astar") {
        ctx.fillStyle = "rgba(255, 0, 255, 0.8)"; // Magenta (A*)
        ctx.fillRect(x, y, TAMANO_CELDA, TAMANO_CELDA);
      } else if (matrizExploracion[f][c] === "ruta-ambos") {
        // Si ambos algoritmos pasan por la misma celda, dividimos el color en dos
        ctx.fillStyle = "rgba(255, 165, 0, 0.8)";
        ctx.fillRect(x, y, TAMANO_CELDA / 2, TAMANO_CELDA);
        ctx.fillStyle = "rgba(255, 0, 255, 0.8)";
        ctx.fillRect(x + TAMANO_CELDA / 2, y, TAMANO_CELDA / 2, TAMANO_CELDA);
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
  if (f < 0 || f >= FILAS || c < 0 || c >= COLUMNAS) return;

  if (herramientaActual === "alien") {
    inicio = { f, c };
    mapa[f][c] = 0;
  } else if (herramientaActual === "nave") {
    fin = { f, c };
    mapa[f][c] = 0;
  } else {
    if ((f === inicio.f && c === inicio.c) || (f === fin.f && c === fin.c))
      return;

    if (herramientaActual === "arbol") mapa[f][c] = 1;
    else if (herramientaActual === "roja") mapa[f][c] = 2;
    else if (herramientaActual === "morada") mapa[f][c] = 3;
    else if (herramientaActual === "borrador") mapa[f][c] = 0;
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

canvas.addEventListener("mouseup", () => (estaDibujando = false));
canvas.addEventListener("mouseleave", () => (estaDibujando = false));

dibujarMapa();

// --- 5. ESTRUCTURAS AUXILIARES PARA ETAPA 2 (A*) ---
class MinHeap {
  constructor() {
    this.heap = [];
  }
  push(nodo) {
    this.heap.push(nodo);
    this.burbujearHaciaArriba();
  }
  pop() {
    if (this.heap.length === 1) return this.heap.pop();
    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.hundirHaciaAbajo();
    return top;
  }
  isEmpty() {
    return this.heap.length === 0;
  }

  burbujearHaciaArriba() {
    let index = this.heap.length - 1;
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].fScore <= this.heap[index].fScore) break;
      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  hundirHaciaAbajo() {
    let index = 0;
    const length = this.heap.length;
    while (true) {
      let izq = 2 * index + 1;
      let der = 2 * index + 2;
      let swap = null;
      if (izq < length && this.heap[izq].fScore < this.heap[index].fScore)
        swap = izq;
      if (
        der < length &&
        this.heap[der].fScore <
          (swap === null ? this.heap[index].fScore : this.heap[izq].fScore)
      )
        swap = der;
      if (swap === null) break;
      [this.heap[index], this.heap[swap]] = [this.heap[swap], this.heap[index]];
      index = swap;
    }
  }
}

function obtenerCostoTerreno(f, c) {
  const tipo = mapa[f][c];
  if (tipo === 0) return 1; // Tierra
  if (tipo === 2) return 0; // Baya roja
  if (tipo === 3) return 3; // Baya morada
  return Infinity; // Árbol
}

function heuristicaManhattan(f1, c1, f2, c2) {
  return Math.abs(f1 - f2) + Math.abs(c1 - c2);
}

// --- 6. ALGORITMOS DE BÚSQUEDA ---
async function ejecutarBFS() {
  const direcciones = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
  let cola = [{ f: inicio.f, c: inicio.c }];
  let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));

  matrizExploracion[inicio.f][inicio.c] = "visitado";
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
          matrizExploracion[nf][nc] = "visitado";
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

async function ejecutarDFS() {
  const direcciones = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
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

    matrizExploracion[actual.f][actual.c] = "visitado";
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
        if (
          mapa[nf][nc] !== 1 &&
          matrizExploracion[nf][nc] === null &&
          !enPila[nf][nc]
        ) {
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

async function ejecutarProfundidadLimitada(limite, esIterativa = false) {
  const direcciones = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
  let pila = [{ f: inicio.f, c: inicio.c, prof: 0 }];
  let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
  let visitados = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(false),
  );
  let nodosVisitados = 0;

  while (pila.length > 0) {
    if (!algoritmoCorriendo) return false;
    let actual = pila.pop();

    if (visitados[actual.f][actual.c]) continue;
    visitados[actual.f][actual.c] = true;

    matrizExploracion[actual.f][actual.c] = "visitado";
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
    alert(
      `Búsqueda terminada. No se alcanzó la nave en ${limite} saltos o menos.`,
    );
    algoritmoCorriendo = false;
  }
  return false;
}

async function ejecutarProfundidadIterativa() {
  let maxL = FILAS * COLUMNAS;
  for (let L = 1; L <= maxL; L++) {
    if (!algoritmoCorriendo) return;
    document.getElementById("limite-input").value = L;
    matrizExploracion = Array.from({ length: FILAS }, () =>
      Array(COLUMNAS).fill(null),
    );

    let encontrado = await ejecutarProfundidadLimitada(L, true);
    if (encontrado) return;
    await sleep(30);
  }
  alert("¡La nave es inalcanzable! No hay camino.");
  algoritmoCorriendo = false;
}

async function ejecutarAStar() {
  const direcciones = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];

  let openSet = new MinHeap();
  let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));

  let gScore = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(Infinity),
  );
  gScore[inicio.f][inicio.c] = 0;

  let fScore = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(Infinity),
  );
  fScore[inicio.f][inicio.c] = heuristicaManhattan(
    inicio.f,
    inicio.c,
    fin.f,
    fin.c,
  );

  openSet.push({
    f: inicio.f,
    c: inicio.c,
    fScore: fScore[inicio.f][inicio.c],
  });

  let enOpenSet = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(false),
  );
  enOpenSet[inicio.f][inicio.c] = true;

  let nodosVisitados = 0;
  document.getElementById("stat-nodos").innerText = nodosVisitados;
  document.getElementById("stat-pasos").innerText = "0";

  while (!openSet.isEmpty()) {
    if (!algoritmoCorriendo) return;

    let actual = openSet.pop();
    enOpenSet[actual.f][actual.c] = false;

    if (actual.f === fin.f && actual.c === fin.c) {
      await reconstruirCaminoAStar(padres, gScore);
      return;
    }

    matrizExploracion[actual.f][actual.c] = "visitado";
    nodosVisitados++;
    document.getElementById("stat-nodos").innerText = nodosVisitados;

    dibujarMapa();
    await sleep(10);

    for (let [df, dc] of direcciones) {
      let nf = actual.f + df;
      let nc = actual.c + dc;

      if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
        if (mapa[nf][nc] !== 1) {
          let costoCelda = obtenerCostoTerreno(nf, nc);
          let tentative_gScore = gScore[actual.f][actual.c] + costoCelda;

          if (tentative_gScore < gScore[nf][nc]) {
            padres[nf][nc] = { f: actual.f, c: actual.c };
            gScore[nf][nc] = tentative_gScore;
            fScore[nf][nc] =
              tentative_gScore + heuristicaManhattan(nf, nc, fin.f, fin.c);

            if (!enOpenSet[nf][nc]) {
              openSet.push({ f: nf, c: nc, fScore: fScore[nf][nc] });
              enOpenSet[nf][nc] = true;
            }
          }
        }
      }
    }
  }
  alert("¡La nave es inalcanzable! No hay camino.");
  algoritmoCorriendo = false;
}

// --- 6.5 FUNCIONES PARA RECONSTRUIR EL CAMINO FINAL ---
async function reconstruirCamino(padres) {
  let actual = padres[fin.f][fin.c];
  let pasos = 0;

  while (actual !== null && (actual.f !== inicio.f || actual.c !== inicio.c)) {
    if (!algoritmoCorriendo) return;

    matrizExploracion[actual.f][actual.c] = "camino";
    pasos++;
    document.getElementById("stat-pasos").innerText = pasos;

    dibujarMapa();
    await sleep(30);

    actual = padres[actual.f][actual.c];
  }
  algoritmoCorriendo = false;
}

async function reconstruirCaminoAStar(padres, gScore) {
  let actual = { f: fin.f, c: fin.c };
  let pasos = 0;
  let costoTotal = gScore[fin.f][fin.c];

  while (actual !== null && (actual.f !== inicio.f || actual.c !== inicio.c)) {
    if (!algoritmoCorriendo) return;

    matrizExploracion[actual.f][actual.c] = "camino";
    pasos++;
    document.getElementById("stat-pasos").innerText = pasos;

    dibujarMapa();
    await sleep(30);

    actual = padres[actual.f][actual.c];
  }

  alert(
    `¡Camino encontrado!\nPasos dados: ${pasos}\nCosto de Energía Total (g): ${costoTotal}`,
  );
  algoritmoCorriendo = false;
}

// --- 6.6 FUNCIÓN DE COMPARACIÓN BFS vs A* ---
function obtenerRutaLista(padres) {
  let ruta = [];
  let actual = padres[fin.f][fin.c];
  while (actual !== null && (actual.f !== inicio.f || actual.c !== inicio.c)) {
    ruta.push(actual);
    actual = padres[actual.f][actual.c];
  }
  return ruta.reverse();
}

function buscarRutaSilenciosaBFS() {
  const direcciones = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
  let cola = [{ f: inicio.f, c: inicio.c }];
  let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
  let visitados = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(false),
  );
  visitados[inicio.f][inicio.c] = true;

  let nodosExplorados = 0; // NUEVO: Contador de celdas evaluadas

  while (cola.length > 0) {
    let actual = cola.shift();
    nodosExplorados++; // Sumamos cada vez que procesamos una celda

    if (actual.f === fin.f && actual.c === fin.c) {
      return { ruta: obtenerRutaLista(padres), explorados: nodosExplorados };
    }

    for (let [df, dc] of direcciones) {
      let nf = actual.f + df;
      let nc = actual.c + dc;
      if (nf >= 0 && nf < FILAS && nc >= 0 && nc < COLUMNAS) {
        if (mapa[nf][nc] !== 1 && !visitados[nf][nc]) {
          visitados[nf][nc] = true;
          padres[nf][nc] = actual;
          cola.push({ f: nf, c: nc });
        }
      }
    }
  }
  return null;
}

function buscarRutaSilenciosaAStar() {
  const direcciones = [
    [-1, 0],
    [1, 0],
    [0, 1],
    [0, -1],
  ];
  let openSet = new MinHeap();
  let padres = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(null));
  let gScore = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(Infinity),
  );

  gScore[inicio.f][inicio.c] = 0;
  openSet.push({
    f: inicio.f,
    c: inicio.c,
    fScore: heuristicaManhattan(inicio.f, inicio.c, fin.f, fin.c),
  });
  let enOpenSet = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(false),
  );
  enOpenSet[inicio.f][inicio.c] = true;

  let nodosExplorados = 0; // NUEVO: Contador de celdas evaluadas

  while (!openSet.isEmpty()) {
    let actual = openSet.pop();
    enOpenSet[actual.f][actual.c] = false;
    nodosExplorados++; // Sumamos cada vez que procesamos una celda

    if (actual.f === fin.f && actual.c === fin.c) {
      return { ruta: obtenerRutaLista(padres), explorados: nodosExplorados };
    }

    for (let [df, dc] of direcciones) {
      let nf = actual.f + df;
      let nc = actual.c + dc;
      if (
        nf >= 0 &&
        nf < FILAS &&
        nc >= 0 &&
        nc < COLUMNAS &&
        mapa[nf][nc] !== 1
      ) {
        let costo = obtenerCostoTerreno(nf, nc);
        let tg = gScore[actual.f][actual.c] + costo;
        if (tg < gScore[nf][nc]) {
          padres[nf][nc] = { f: actual.f, c: actual.c };
          gScore[nf][nc] = tg;
          let fs = tg + heuristicaManhattan(nf, nc, fin.f, fin.c);
          if (!enOpenSet[nf][nc]) {
            openSet.push({ f: nf, c: nc, fScore: fs });
            enOpenSet[nf][nc] = true;
          }
        }
      }
    }
  }
  return null;
}

async function iniciarComparacion() {
  matrizExploracion = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(null),
  );
  dibujarMapa();

  let resultadoBFS = buscarRutaSilenciosaBFS();
  let resultadoAStar = buscarRutaSilenciosaAStar();

  if (!resultadoBFS || !resultadoAStar) {
    alert("La nave es inalcanzable. Bloqueaste el camino.");
    algoritmoCorriendo = false;
    return;
  }

  let rutaBFS = resultadoBFS.ruta;
  let rutaAStar = resultadoAStar.ruta;

  let costoBFS = rutaBFS.reduce(
    (acc, p) => acc + obtenerCostoTerreno(p.f, p.c),
    0,
  );
  let costoAStar = rutaAStar.reduce(
    (acc, p) => acc + obtenerCostoTerreno(p.f, p.c),
    0,
  );

  let maxPasos = Math.max(rutaBFS.length, rutaAStar.length);
  for (let i = 0; i < maxPasos; i++) {
    if (!algoritmoCorriendo) return;

    if (i < rutaBFS.length) {
      let p = rutaBFS[i];
      matrizExploracion[p.f][p.c] =
        matrizExploracion[p.f][p.c] === "ruta-astar"
          ? "ruta-ambos"
          : "ruta-bfs";
    }
    if (i < rutaAStar.length) {
      let p = rutaAStar[i];
      matrizExploracion[p.f][p.c] =
        matrizExploracion[p.f][p.c] === "ruta-bfs"
          ? "ruta-ambos"
          : "ruta-astar";
    }

    dibujarMapa();
    await sleep(30);
  }

  // AHORA SÍ: Comparamos el rendimiento (nodos explorados) y el resultado (longitud y costo)
  alert(
    `🥊 COMPARACIÓN TERMINADA 🥊\n\n` +
      `🟧 BFS (Ciego, ignora costos):\n` +
      `• Nodos evaluados (tiempo): ${resultadoBFS.explorados}\n` +
      `• Longitud del camino: ${rutaBFS.length} pasos\n` +
      `• Costo de Energía: ${costoBFS}\n\n` +
      `🟪 A* (Inteligente, con heurística):\n` +
      `• Nodos evaluados (tiempo): ${resultadoAStar.explorados}\n` +
      `• Longitud del camino: ${rutaAStar.length} pasos\n` +
      `• Costo de Energía: ${costoAStar}\n\n` +
      `Conclusión: A* evalúa muchísimas menos celdas y esquiva el terreno costoso.`,
  );

  algoritmoCorriendo = false;
}

// --- 7. BOTONES DE ACCIÓN ---
document.getElementById("btn-iniciar").addEventListener("click", () => {
  if (algoritmoCorriendo) return;

  matrizExploracion = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(null),
  );
  dibujarMapa();

  const selector = document.getElementById("algoritmo-select").value;
  algoritmoCorriendo = true;

  if (selector === "bfs") {
    ejecutarBFS();
  } else if (selector === "dfs") {
    ejecutarDFS();
  } else if (selector === "limitada") {
    let L = parseInt(document.getElementById("limite-input").value);
    if (isNaN(L) || L < 1) L = 10;
    ejecutarProfundidadLimitada(L, false);
  } else if (selector === "iterativa") {
    ejecutarProfundidadIterativa();
  } else if (selector === "astar") {
    ejecutarAStar();
  }
});

// Este es el disparador para el botón de comparación que te pedí agregar en el HTML
const btnComparar = document.getElementById("btn-comparar");
if (btnComparar) {
  btnComparar.addEventListener("click", () => {
    if (algoritmoCorriendo) return;
    algoritmoCorriendo = true;
    iniciarComparacion();
  });
}

document.getElementById("btn-limpiar-ruta").addEventListener("click", () => {
  algoritmoCorriendo = false;
  matrizExploracion = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(null),
  );
  document.getElementById("stat-nodos").innerText = "0";
  document.getElementById("stat-pasos").innerText = "0";
  dibujarMapa();
});

document.getElementById("btn-reiniciar").addEventListener("click", () => {
  algoritmoCorriendo = false;
  mapa = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(0));
  matrizExploracion = Array.from({ length: FILAS }, () =>
    Array(COLUMNAS).fill(null),
  );
  inicio = { f: 2, c: 2 };
  fin = { f: 27, c: 27 };
  document.getElementById("stat-nodos").innerText = "0";
  document.getElementById("stat-pasos").innerText = "0";
  dibujarMapa();
});
