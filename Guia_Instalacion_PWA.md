# Cómo instalar Tilisarao Libre en el celular (como una app)

Tilisarao Libre es una **PWA**: se instala desde el navegador y queda con su ícono
en la pantalla de inicio, abriendo en pantalla completa (sin barra del navegador).

---

## Android (Chrome / Edge)

1. Abrí **https://estebanfedericomansilla.github.io/Tilisarao-Libre/** en Chrome.
2. Tocá el botón **"Instalar ahora"** que aparece debajo de los productos
   (o el menú ⋮ → **Instalar aplicación** / **Agregar a pantalla de inicio**).
3. Confirmá en **Instalar**.
4. Ya queda el ícono **Tilisarao Libre** junto a tus otras apps.

Al tocar el ícono se abre directo en pantalla completa.
Si tocás y mantienes el ícono, aparece el atajo **"Vender un producto"**
que abre el formulario de publicación.

---

## iPhone / iPad (Safari)

1. Abrí la página en **Safari**.
2. Tocá el botón **Compartir** (el cuadrado con la flecha, abajo al centro).
3. Elegí **Agregar a pantalla de inicio**.
4. Tocá **Agregar** arriba a la derecha.

---

## Computadora (Chrome / Edge)

1. Abrí la página.
2. A la derecha de la barra de direcciones aparece el ícono de **instalar**
   (un monitor con una flecha). Tocálo y confirmá.

---

## Cómo quedó armado (para quien amplíe el proyecto)

| Archivo | Función |
|---|---|
| `manifest.json` | Nombre, colores, íconos, atajos ("Vender", "Ingresar") |
| `sw.js` | Service Worker: guarda la app y habilita la instalación |
| `icon-192x192.png` / `icon-512x512.png` | Íconos de la app |
| `apple-touch-icon.png` | Ícono para iPhone (180x180) |
| `index.html` | Etiquetas PWA en el `<head>`, tarjeta "Instalar ahora" y registro del SW |

**Detalle importante del `sw.js`:** solo se cachean archivos del propio sitio
(imágenes, HTML, JS). Todo lo de **Supabase** y el **CDN** nunca se guarda en caché,
así los productos y precios siempre se ven actualizados.

Cuando cambies código de la app, subí el número de versión en `sw.js`
(`tilisarao-libre-v1` → `v2`) para que los celulares tomen la versión nueva.
