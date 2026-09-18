# Estilos Pequeños — Frontend (Angular)

Ecommerce de ropa para niños. Catálogo con filtros, carrito de compras y
checkout **sin pasarela de pago**: el botón "Comprar" arma un mensaje de
WhatsApp con el pedido y lo envía al dueño/a del local, quien responde por
WhatsApp con el alias o link de Mercado Pago para coordinar el pago.

Incluye además un panel de administración simple (`/admin`) para cargar,
editar, ocultar y eliminar productos.

## ⚙️ Configuración obligatoria antes de publicar

Editar `src/app/core/config/site-config.ts`:

- `whatsappNumber`: número de WhatsApp del dueño/a, en formato internacional
  sin `+`, espacios ni guiones (ej: `5491122334455`).
- `admin.username` / `admin.password`: credenciales para entrar a `/admin`.
  Valores actuales (placeholders, **cambiar antes de publicar**):

  | Campo | Valor |
  |---|---|
  | usuario | `admin` |
  | contraseña | `cambiar-esta-clave` |

  **Ojo:** es un login simple pensado solo para esta primera versión sin
  backend (las credenciales viven en el código del frontend), no un
  mecanismo de seguridad real. Cuando el backend en Java esté listo, hay
  que reemplazar `AuthService` por un login contra la API.

## 🚀 Cómo correr el proyecto

```bash
npm install
npm start          # http://localhost:4200
```

```bash
npm run build       # build de producción en dist/
```

## 🗂️ Estructura

```
src/app/
  core/
    config/site-config.ts       # nombre de tienda, WhatsApp, credenciales admin
    models/                     # Product, CartItem
    services/
      product.service.ts        # catálogo (mock + localStorage), CRUD para el admin
      cart.service.ts           # estado del carrito (signals + localStorage)
      whatsapp.service.ts       # arma el mensaje y el link wa.me del pedido
      auth.service.ts           # login simple del panel admin
    guards/admin.guard.ts       # protege las rutas /admin/*
  shared/components/            # header, footer, card de producto, stepper de cantidad
  features/
    catalog/                    # catálogo público con filtros
    product-detail/             # ficha de producto (talle, cantidad, agregar al carrito)
    cart/                       # carrito + botón "Comprar por WhatsApp"
    admin/                      # login, layout, listado y alta/edición de productos
```

## 🛍️ Cómo funciona el checkout por WhatsApp

1. El cliente arma su pedido en el carrito y carga su nombre.
2. Al tocar **"Comprar por WhatsApp"** se abre `wa.me/<número>` en una
   pestaña nueva con el mensaje ya redactado (detalle de prendas, talles,
   cantidades y total). El cliente solo tiene que enviarlo.
3. El dueño/a recibe el pedido por WhatsApp y responde con el alias o el
   link de Mercado Pago para que el cliente pague directamente.

Todo esto es 100% client-side (no requiere backend ni API de WhatsApp).

## 🔌 Conectar con el backend en Java (a futuro)

Hoy los productos son datos de ejemplo guardados en `localStorage` a través
de `ProductService`. Para conectarlo a una API real:

1. Agregar `provideHttpClient()` en `app.config.ts`.
2. Reemplazar la lógica interna de `ProductService` (los métodos públicos:
   `products`, `availableProducts`, `getById`, `create`, `update`, `delete`,
   `toggleActive`) por llamadas `HttpClient` a los endpoints Java. Como los
   componentes solo dependen de esos métodos/signals, no hace falta tocar
   el resto de la app.
3. Reemplazar `AuthService` por un login real contra el backend.

## 📦 Stack

- Angular 19 (standalone components, signals)
- Tailwind CSS v4
- Sin dependencias de pasarela de pago
# frontend-punto-de-venta
