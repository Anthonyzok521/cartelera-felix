# Cartelera escolar

Cartelera para mostrar imágenes en pantalla completa. Las fotos cambian solas cada cierto tiempo y se administran desde un panel sencillo.

- **Cartelera:** `/` (pantalla completa, avanza automáticamente)
- **Panel de administración:** `/#/admin`
- **Tiempo ajustable:** de 1 a 300 segundos (se aplica al instante en la pantalla)

## Cómo usarla

```bash
bun install   # o npm install
bun run dev   # o npm run dev
```

- Pantalla: http://localhost:5173
- Panel: http://localhost:5173/#/admin

Para la escuela, abre la pantalla en la TV y el panel desde tu computadora o celular en la misma red. Vite se expone en la red (`host: true`), así que también puedes entrar usando la IP de tu equipo, por ejemplo `http://192.168.1.20:5173/#/admin`.

El servidor de la API corre en el puerto `3001` y Vite lo conecta automáticamente en desarrollo.

## Producción

```bash
bun run build
PORT=3001 bun run start
```

El servidor Express sirve la app compilada y las imágenes en `http://localhost:3001`.

## Características

- Subida de imágenes con **multer** (arrastrar y soltar, varias a la vez).
- Formatos: JPG, PNG, WEBP, GIF y AVIF (máximo 20 MB por imagen).
- Eliminar imágenes y cambiar su orden (el orden de la lista es el orden en pantalla).
- Transición suave entre imágenes y barra de progreso.
- La pantalla se actualiza en vivo cuando cambias algo en el panel (SSE).
- Atajos de teclado en la cartelera: `Espacio` pausa, `←`/`→` cambian de imagen, `F` pantalla completa.

## Estructura

```
server/index.js     API Express + multer + SSE
uploads/            imágenes subidas
data/db.json        ajustes y orden de las imágenes
src/pages/Display.tsx  cartelera
src/pages/Admin.tsx    panel de administración
```
