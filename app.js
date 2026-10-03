const API = "https://dummyjson.com/products?limit=20";

const listado = document.getElementById("productos");
const mensaje = document.getElementById("mensaje");
const conexion = document.getElementById("conexion");
const busqueda = document.getElementById("busqueda");
const actualizar = document.getElementById("actualizar");

let productos = [];
let peticionActual = null;

function mostrarMensaje(texto) {
  mensaje.textContent = texto;
  mensaje.hidden = false;
}

function limpiarProductos() {
  productos = [];
  listado.replaceChildren();
  busqueda.value = "";
  busqueda.disabled = true;
}

function mostrarSinConexion() {
  peticionActual?.abort();
  peticionActual = null;

  limpiarProductos();
  conexion.textContent = "Sin conexión";
  actualizar.disabled = false;

  mostrarMensaje(
    "No hay conexión a internet. Conéctate para consultar los productos."
  );
}

function mostrarProductos(datos) {
  listado.replaceChildren();

  if (datos.length === 0) {
    mostrarMensaje("No se encontraron productos.");
    return;
  }

  mensaje.hidden = true;

  const fragmento = document.createDocumentFragment();

  datos.forEach((producto) => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta";

    const imagen = document.createElement("img");
    imagen.src = producto.thumbnail;
    imagen.alt = producto.title;
    imagen.loading = "lazy";
    imagen.addEventListener("error", () => {
      imagen.hidden = true;
    });

    const nombre = document.createElement("h3");
    nombre.textContent = producto.title;

    const categoria = document.createElement("p");
    categoria.className = "categoria";
    categoria.textContent = producto.category;

    const precio = document.createElement("p");
    precio.className = "precio";
    precio.textContent =
      `Precio de muestra: $${Number(producto.price).toFixed(2)}`;

    tarjeta.append(imagen, nombre, categoria, precio);
    fragmento.appendChild(tarjeta);
  });

  listado.appendChild(fragmento);
}

async function cargarProductos() {
  peticionActual?.abort();

  if (!navigator.onLine) {
    mostrarSinConexion();
    return;
  }

  const controlador = new AbortController();
  peticionActual = controlador;

  limpiarProductos();
  conexion.textContent = "Consultando API...";
  actualizar.disabled = true;
  mostrarMensaje("Cargando productos...");

  const tiempoLimite = setTimeout(() => controlador.abort(), 12000);

  try {
    const respuesta = await fetch(API, {
      cache: "no-store",
      signal: controlador.signal
    });

    if (!respuesta.ok) {
      throw new Error(`Error HTTP: ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    // Evita mostrar una respuesta de una petición anterior.
    if (peticionActual !== controlador) return;

    if (!navigator.onLine) {
      mostrarSinConexion();
      return;
    }

    if (!Array.isArray(datos.products)) {
      throw new Error("Respuesta de la API inválida");
    }

    productos = datos.products;
    busqueda.disabled = false;
    conexion.textContent = "Conexión con la API disponible";
    mostrarProductos(productos);
  } catch (error) {
    if (peticionActual !== controlador) return;

    limpiarProductos();

    if (!navigator.onLine) {
      mostrarSinConexion();
    } else {
      conexion.textContent = "Consulta no disponible";
      mostrarMensaje(
        "No se pudieron cargar los productos. Revisa tu conexión e intenta actualizar."
      );
      console.error(error);
    }
  } finally {
    clearTimeout(tiempoLimite);

    if (peticionActual === controlador) {
      peticionActual = null;
      actualizar.disabled = false;
    }
  }
}

busqueda.addEventListener("input", () => {
  const texto = busqueda.value.trim().toLocaleLowerCase();

  const filtrados = productos.filter((producto) =>
    producto.title.toLocaleLowerCase().includes(texto)
  );

  mostrarProductos(filtrados);
});

actualizar.addEventListener("click", cargarProductos);
window.addEventListener("online", cargarProductos);
window.addEventListener("offline", mostrarSinConexion);

// Revisa la conexión al regresar a la pestaña.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !navigator.onLine) {
    mostrarSinConexion();
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("./sw.js");
      console.log("Service Worker registrado");
    } catch (error) {
      console.error("No se pudo registrar el Service Worker:", error);
    }
  });
}

cargarProductos();