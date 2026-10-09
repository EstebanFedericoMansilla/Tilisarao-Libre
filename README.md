# Tilisarao Libre

Marketplace de Tilisarao. **Solo Supabase + GitHub**: sin servidor propio, sin Node, sin PostgreSQL local.

- **Frontend:** HTML/CSS/JS estático publicado en **GitHub Pages**
- **Backend:** **Supabase** (Postgres + RLS + Auth + Storage)
- **Dependencias:** ninguna. `supabase-js` se carga desde CDN.

## 1. Configurar Supabase

1. Creá el proyecto en [supabase.com](https://supabase.com) (región **São Paulo / sa-east-1**).
2. Andá a **SQL Editor → New query**, pegá todo el contenido de **`sql/schema.sql`** y presioná **Run**.
   Crea `profiles`, `products`, las políticas RLS, los permisos de la Data API, el bucket `productos` y productos de ejemplo.
3. Andá a **Settings → API** y copiá:
   - `Project URL`
   - `anon public` key
4. Pegalos en **`js/supabase-client.js`**:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

> La anon key es **pública** y está bien que esté en el código: el acceso real lo controlan las políticas RLS del paso 2.

### Auth
Andá a **Authentication → Sign In / Providers** y revisá el ajuste **Confirm email**:

- **Activado** (por defecto): al registrarse llega un email con el link de confirmación.
- **Desactivado**: entrás directo, más rápido para probar.

## 2. Publicar en GitHub Pages

1. Subí el proyecto al repo `Tilisarao-Libre`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   rama `main`, carpeta `/ (root)` → **Save**.
3. La web queda en `https://estebanfedericomansilla.github.io/Tilisarao-Libre/`
   (los cambios tardan unos minutos en refrescar).

## 3. Estructura

```
index.html              Marketplace (productos, carrito, publicar)
auth.html               Registro e ingreso (Supabase Auth)
js/supabase-client.js   URL + anon key + cliente
js/app.js               Productos, carrito, publicación con imagen
js/auth.js              Sign up / sign in
sql/schema.sql          Esquema, RLS, grants y bucket de Storage
assets/productos/       Imágenes de ejemplo
```

## 4. Cómo funciona

| Acción | Qué pasa |
|---|---|
| Ver productos | `select` público sobre `products` (RLS `for select using (true)`) |
| Registrarse | `auth.signUp` → trigger crea el `profiles` con el nick |
| Publicar | Sube la imagen al bucket `productos` y hace `insert` con `user_id = auth.uid()` |
| Editar/borrar | Solo el dueño del producto (RLS `user_id = auth.uid()`) |
| Carrito | Guardado en `localStorage`, sin backend |

## 5. Cobranzas: WhatsApp

No hay pasarela de pago: la venta se cierra por WhatsApp.

- Cada publicación guarda el **WhatsApp del vendedor** (columna `products.phone`, campo del formulario).
- En la ficha del producto, **"Comprar por WhatsApp"** abre `wa.me/<numero>` con el mensaje
  *"¡Hola! Vi tu publicación en Tilisarao Libre y quiero comprar…"*.
- **"Comprar por WhatsApp"** del carrito manda el pedido con los ítems y el total.
- El número se arma solo: si cargás `2664123456` queda `5492664123456`; si ya empezás con `54` o `549` se respeta.

Si ya tenés publicaciones creadas, corré `sql/2-whatsapp.sql` en el SQL Editor y después
actualizalas desde Table Editor → `products` → columna `phone`.

## 6. Datos sensibles

- La **contraseña de la base** de Supabase no se usa en la web ni se guarda en el repo.
- El archivo `Mail y cuenta de Github.txt` está en `.gitignore` a propósito: **nunca** se sube.
