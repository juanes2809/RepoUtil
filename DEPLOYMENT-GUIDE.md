# Guía Completa de Deployment - Ecommerce Platform

Esta guía cubre TODO lo necesario para poner tu tienda en producción.

---

## Tabla de contenido

1. [Resumen de servicios necesarios](#1-resumen-de-servicios-necesarios)
2. [Paso 1: Configurar Supabase (Base de datos)](#paso-1-configurar-supabase)
3. [Paso 2: Configurar Clerk (Autenticación de clientes)](#paso-2-configurar-clerk)
4. [Paso 3: Configurar MercadoPago (Pagos)](#paso-3-configurar-mercadopago)
5. [Paso 4: Configurar Resend (Emails)](#paso-4-configurar-resend)
6. [Paso 5: Configurar Google Gemini (IA)](#paso-5-configurar-google-gemini)
7. [Paso 6: Configurar WhatsApp Business API](#paso-6-configurar-whatsapp-business-api)
8. [Paso 7: Subir código a GitHub](#paso-7-subir-código-a-github)
9. [Paso 8: Deploy en Vercel](#paso-8-deploy-en-vercel)
10. [Paso 9: Configurar URLs post-deploy](#paso-9-configurar-urls-post-deploy)
11. [Paso 10: Configurar datos iniciales](#paso-10-configurar-datos-iniciales)
12. [Paso 11: Verificar todo funciona](#paso-11-verificar-todo-funciona)
13. [Paso 12: Configurar dominio propio (opcional pero recomendado)](#paso-12-configurar-dominio-propio)
14. [Referencia: Todas las variables de entorno](#referencia-variables-de-entorno)
15. [Arquitectura del proyecto](#arquitectura-del-proyecto)
16. [Solución de problemas](#solución-de-problemas)

---

## 1. Resumen de servicios necesarios

| Servicio | Para qué | Costo |
|----------|----------|-------|
| **Supabase** | Base de datos PostgreSQL | Gratis (hasta 500MB) |
| **Clerk** | Login/registro de clientes | Gratis (hasta 10,000 usuarios) |
| **MercadoPago** | Procesamiento de pagos | Comisión por venta (~3.5%) |
| **Resend** | Envío de emails (confirmaciones, recibos) | Gratis (100 emails/día) |
| **Google Gemini** | IA del chatbot de WhatsApp + generación de descripciones de productos | Gratis (tier gratuito generoso) |
| **Meta WhatsApp API** | Chatbot + notificaciones WhatsApp al admin | Gratis (1,000 conversaciones/mes) |
| **Vercel** | Hosting del sitio web + cron jobs | Gratis (Hobby plan) |
| **GitHub** | Repositorio del código | Gratis |

**Costo total mensual estimado: $0** (dentro de los tiers gratuitos para un negocio pequeño)

---

## Paso 1: Configurar Supabase

> Supabase es tu base de datos. Aquí se guardan productos, categorías, pedidos, cupones, ciudades, etc.

### 1.1 Crear proyecto

1. Ve a https://supabase.com y crea una cuenta
2. Click **"New Project"**
3. Elige un nombre, contraseña de base de datos, y región (usa **South America (São Paulo)** para mejor latencia en Colombia)
4. Espera a que el proyecto se cree (~2 minutos)

### 1.2 Crear las tablas

1. Ve a **SQL Editor** en el panel de Supabase
2. Copia TODO el contenido del archivo `database-schema.sql` de tu proyecto (sin la sección de MIGRATION al final, esa es solo si estás migrando desde una versión anterior)
3. Pégalo y click **"Run"**
4. Verifica que no haya errores

Esto crea las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `categories` | Categorías de productos (Hombre, Mujer, Niño, Electrónica, etc.) |
| `products` | Productos de la tienda |
| `product_categories` | Relación muchos-a-muchos entre productos y categorías |
| `departments` | Departamentos de Colombia (para envíos) |
| `cities` | Ciudades con costos y tiempos de envío |
| `orders` | Pedidos de clientes |
| `order_items` | Items de cada pedido |
| `coupons` | Cupones de descuento |
| `users` | Usuarios admin (login del panel administrativo) |

> **Nota sobre categorías:** Un producto puede pertenecer a múltiples categorías (ej: una camiseta puede estar en "Hombre" y "Camisetas" y "Marca X"). Esto se maneja con la tabla `product_categories`.

### 1.3 Obtener las credenciales

1. Ve a **Settings > API**
2. Copia estos valores:
   - **Project URL** → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (click "Reveal") → será tu `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ NUNCA compartas el `service_role key` públicamente. Solo va en variables de entorno del servidor.

### 1.4 Políticas RLS (Row Level Security)

El script `database-schema.sql` ya incluye todas las políticas RLS necesarias. Estas controlan quién puede leer/escribir en cada tabla:

- **Público (anon):** puede ver productos activos, categorías, product_categories, departamentos, ciudades, cupones activos, y crear pedidos
- **Autenticado (service_role):** acceso completo a todas las tablas (usado por el servidor)

Si algo no funciona, verifica en **Authentication > Policies** que las políticas estén creadas correctamente.

---

## Paso 2: Configurar Clerk

> Clerk maneja el login/registro de tus clientes (no del admin). Los clientes necesitan cuenta para hacer checkout y ver sus pedidos.

1. Ve a https://clerk.com y crea una cuenta
2. Click **"Create application"**
3. Nombre: el nombre de tu tienda
4. Habilita los métodos de login que quieras:
   - **Email** (recomendado)
   - **Google** (recomendado)
   - **Phone** (opcional)
5. Click "Create"

### Obtener las credenciales

1. Ve a **API Keys** en el panel de Clerk
2. Copia:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

### Rutas protegidas

El middleware (`src/middleware.ts`) protege automáticamente estas rutas con Clerk:
- `/checkout` - Los clientes deben estar logueados para comprar
- `/mis-pedidos` - Los clientes deben estar logueados para ver sus pedidos

### Configurar dominio (después del deploy)

1. Ve a **Domains** en Clerk
2. Agrega tu dominio de Vercel: `tu-proyecto.vercel.app`
3. Si tienes dominio propio, agrégalo también

---

## Paso 3: Configurar MercadoPago

> MercadoPago procesa los pagos online de tus clientes en Colombia.

### 3.1 Crear la aplicación

1. Ve a https://www.mercadopago.com.co/developers
2. Si no tienes cuenta, créala con tu cuenta de MercadoPago Colombia
3. Click **"Tus integraciones"** > **"Crear aplicación"**
4. Nombre: el de tu tienda
5. Selecciona **"CheckoutPro"** como producto

### 3.2 Para pruebas (modo sandbox)

1. En tu aplicación, ve a **"Credenciales de prueba"**
2. Copia el **Access Token de prueba** (empieza con `TEST-`)
3. Usa este token durante el desarrollo

### 3.3 Para producción

1. En tu aplicación, ve a **"Credenciales de producción"**
2. Copia el **Access Token de producción** (empieza con `APP_USR-`)
3. Reemplaza el token de prueba por este en las variables de entorno de Vercel

### 3.4 Configurar Webhooks (IPN)

> Los webhooks permiten que MercadoPago le avise a tu tienda cuando un pago se confirma.

1. En tu aplicación de MercadoPago, ve a **"Webhooks" o "Notificaciones IPN"**
2. URL de notificación: `https://TU-DOMINIO.vercel.app/api/webhook/mercadopago`
3. Eventos: selecciona **"Payments"**
4. Guarda

> ⚠️ La URL del webhook solo funciona después del deploy. Configura esto en el Paso 9.

### Qué pasa cuando un pago se confirma:

1. MercadoPago envía notificación al webhook
2. El servidor actualiza el pedido a "pagado"
3. Se descuenta el stock de los productos
4. Se envía email de confirmación al cliente
5. Se envía notificación de WhatsApp al admin con el detalle de la venta
6. Si algún producto queda con stock <= 5, se agrega alerta de stock bajo en la notificación

---

## Paso 4: Configurar Resend

> Resend envía los emails de confirmación de pedido, pagos fallidos, y recibos de ventas en persona.

### 4.1 Crear cuenta

1. Ve a https://resend.com y crea una cuenta
2. Obtendrás una **API Key** → `RESEND_API_KEY`

### 4.2 Configurar dominio de envío

Por defecto puedes enviar desde `onboarding@resend.dev` (para pruebas).

**Para producción (recomendado):**

1. Ve a **Domains** en Resend
2. Click **"Add Domain"**
3. Ingresa tu dominio (ej: `tutienda.com`)
4. Resend te dará registros DNS que debes agregar:
   - Un registro **MX**
   - Un registro **TXT** (SPF)
   - Un registro **CNAME** (DKIM)
5. Agrégalos en tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.)
6. Espera la verificación (~5 minutos a 24 horas)
7. Una vez verificado, cambia `RESEND_FROM_EMAIL` a algo como `pedidos@tutienda.com`

**Si NO tienes dominio propio:**

- Usa `onboarding@resend.dev` como `RESEND_FROM_EMAIL`
- Limitación: los emails pueden llegar a spam
- Límite: 100 emails/día

### Emails que envía la plataforma:

| Email | Cuándo se envía |
|-------|-----------------|
| Confirmación de pedido | Cuando un pago online es confirmado por MercadoPago |
| Pago fallido | Cuando un pago online falla |
| Recibo de venta en persona | Cuando registras una venta en `/admin/sales` y el cliente tiene email |

### Variables

```
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev   (o pedidos@tudominio.com si verificaste)
```

---

## Paso 5: Configurar Google Gemini

> Gemini es la IA que responde preguntas sobre productos en el chatbot de WhatsApp y genera descripciones de productos en el panel admin.

1. Ve a https://aistudio.google.com/apikeys
2. Inicia sesión con tu cuenta de Google
3. Click **"Create API Key"**
4. Selecciona un proyecto de Google Cloud (o crea uno nuevo)
5. Copia la API Key → `GEMINI_API_KEY`

**Tier gratuito:** 15 peticiones por minuto, 1 millón de tokens/minuto. Más que suficiente.

### Dónde se usa Gemini

| Función | Dónde |
|---------|-------|
| Chatbot de WhatsApp | Cuando un cliente pregunta sobre productos (modo "Información de productos") |
| Generar descripciones | En `/admin/products`, botón "Generar con IA" o "Mejorar con IA" en el formulario de producto |

> **Ahorro de costos:** El chatbot solo usa Gemini cuando un cliente está en modo "productos". Las opciones de comprar, consultar pedido y hablar con humano son determinísticas (no usan IA). Además, la sesión de chat tiene timeout de 5 minutos de inactividad.

---

## Paso 6: Configurar WhatsApp Business API

> Este es el paso más complejo. Necesitas una cuenta de Meta Business. WhatsApp se usa para 3 cosas: notificaciones de venta al admin, chatbot con clientes, y resumen diario de ventas.

### 6.1 Crear cuenta de Meta Business

1. Ve a https://business.facebook.com
2. Si no tienes cuenta, click "Crear cuenta"
3. Completa la información de tu negocio

### 6.2 Crear app de desarrollador

1. Ve a https://developers.facebook.com
2. Click **"Mis apps"** > **"Crear app"**
3. Tipo: **"Business"** (o "Otro" si no aparece)
4. Nombre: el de tu tienda
5. Cuenta de Business: selecciona la que creaste
6. Click "Crear"

### 6.3 Agregar WhatsApp a la app

1. En tu app, ve a **"Agregar productos"**
2. Busca **"WhatsApp"** y click **"Configurar"**
3. Te llevará a la pantalla de inicio rápido

### 6.4 Obtener credenciales

En **WhatsApp > Getting Started:**

1. Verás un **número de teléfono de prueba** que Meta te asigna
2. Copia el **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
3. Genera un **token de acceso temporal** (dura 24h, para pruebas)

**Para token permanente (IMPORTANTE para producción):**

1. Ve a **Business Settings** > **System Users**
2. Crea un System User con rol "Admin"
3. Asígnale la app de WhatsApp
4. Genera un **token** con los permisos:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
5. Este token no expira → `WHATSAPP_ACCESS_TOKEN`

### 6.5 Configurar Webhook

> El webhook permite que WhatsApp envíe los mensajes de clientes a tu servidor.

1. En **WhatsApp > Configuration > Webhook**
2. **Callback URL:** `https://TU-DOMINIO.vercel.app/api/webhook/whatsapp`
3. **Verify token:** inventa un string secreto (ej: `mitienda_whatsapp_verify_2026`) → `WHATSAPP_VERIFY_TOKEN`
4. Click **"Verify and Save"**
5. Suscríbete al campo: **`messages`**

> ⚠️ El webhook solo se puede configurar después del deploy (Paso 9).

### 6.6 Número de tu admin

El número donde TÚ (como dueño) recibirás las notificaciones de venta, stock bajo y resumen diario:

```
WHATSAPP_ADMIN_PHONE=573001234567  (tu número con código de país, sin +)
```

### 6.7 Agregar número de teléfono propio (opcional)

Para usar tu propio número de WhatsApp Business en lugar del de prueba:

1. Ve a **WhatsApp > Phone Numbers**
2. Click **"Add Phone Number"**
3. Ingresa tu número (debe ser de WhatsApp Business, NO personal)
4. Verifica con el código SMS
5. Actualiza `WHATSAPP_PHONE_NUMBER_ID` con el nuevo ID

### 6.8 Número de prueba (testing)

Mientras configuras, Meta te permite enviar mensajes desde el número de prueba a hasta 5 números verificados:

1. En **WhatsApp > Getting Started**
2. Agrega tu número personal en "To"
3. Click "Send Message" para verificar que funciona

### Flujo del chatbot

Cuando un cliente escribe al número de WhatsApp Business:

1. Recibe un **mensaje de bienvenida** con horarios y aviso de solo-texto
2. Ve un **menú interactivo (lista)** con 4 opciones:
   - **Productos** → IA responde preguntas sobre el catálogo (usa Gemini)
   - **Quiero comprar** → Recibe el link de la tienda
   - **Mi pedido** → Ingresa número de pedido y ve estado
   - **Hablar con nosotros** → Se desactiva el bot, mensajes van directo a WhatsApp
3. Después de 5 minutos de inactividad, la sesión se resetea y al siguiente mensaje ve el menú de nuevo

### Notificaciones que recibe el admin por WhatsApp

| Notificación | Cuándo |
|-------------|--------|
| Nueva venta | Cada vez que un pago se confirma (online o en persona) |
| Stock bajo | Cuando un producto queda con <= 5 unidades después de una venta |
| Resumen diario | Todos los días a las 11 PM hora Colombia (automático via cron) |

---

## Paso 7: Subir código a GitHub

### 7.1 Configurar Git

```bash
cd ~/ecommerce-platform-main

# Configura tu identidad (una sola vez)
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 7.2 Crear repositorio en GitHub

1. Ve a https://github.com/new
2. **Repository name:** `ecommerce-platform` (o el que quieras)
3. **Visibilidad:** Private (recomendado)
4. **NO** marques "Initialize with README" (ya tienes uno)
5. Click **"Create repository"**

### 7.3 Subir código

```bash
cd ~/ecommerce-platform-main

# Verifica que .env NO se sube (ya está en .gitignore)
cat .gitignore | grep .env

# Crea el commit inicial
git add .
git commit -m "Initial commit: ecommerce platform"

# Conecta con GitHub (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/ecommerce-platform.git
git push -u origin main
```

> Si te pide autenticación, usa un **Personal Access Token** de GitHub:
> 1. Ve a https://github.com/settings/tokens
> 2. Genera uno con permiso `repo`
> 3. Úsalo como contraseña cuando Git te lo pida

---

## Paso 8: Deploy en Vercel

### 8.1 Conectar repositorio

1. Ve a https://vercel.com
2. Inicia sesión con tu cuenta de GitHub
3. Click **"Add New..."** > **"Project"**
4. Busca e importa tu repositorio `ecommerce-platform`
5. **Framework Preset:** Next.js (se detecta automáticamente)
6. **Root Directory:** dejarlo vacío (es la raíz)

### 8.2 Configurar variables de entorno

**ANTES de hacer click en Deploy**, agrega TODAS estas variables.

**Leyenda - Cada variable tiene un indicador para que sepas qué hacer:**

| Indicador | Significado |
|-----------|-------------|
| **REEMPLAZAR** | Debes poner TU valor real. Son credenciales únicas de tu cuenta en cada servicio. |
| **SANDBOX** | El valor de ejemplo es de prueba/sandbox. Funciona para probar, pero DEBES cambiarlo a producción antes de lanzar la tienda con clientes reales. |
| **GENERAR** | Debes generar un valor único con el comando indicado. |
| **TU INFO** | Pon la información real de tu negocio. |
| **NO CAMBIAR** | Déjalo exactamente así, son rutas fijas de la app. |
| **DESPUES DEL DEPLOY** | No lo sabes aún. Ponlo temporal y actualízalo en el Paso 9 cuando tengas la URL de Vercel. |

---

#### Base de datos (Supabase)
```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co           # REEMPLAZAR - Tu Project URL de Supabase (Paso 1.3)
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG...                      # REEMPLAZAR - Tu anon public key de Supabase (Paso 1.3)
SUPABASE_SERVICE_ROLE_KEY = eyJhbG...                          # REEMPLAZAR - Tu service_role key de Supabase (Paso 1.3)
```

#### Autenticación (Clerk)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_xxxxx              # REEMPLAZAR - Tu Publishable key de Clerk (Paso 2)
CLERK_SECRET_KEY = sk_test_xxxxx                               # REEMPLAZAR - Tu Secret key de Clerk (Paso 2)
NEXT_PUBLIC_CLERK_SIGN_IN_URL = /sign-in                       # NO CAMBIAR
NEXT_PUBLIC_CLERK_SIGN_UP_URL = /sign-up                       # NO CAMBIAR
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = /                        # NO CAMBIAR
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = /                        # NO CAMBIAR
```

> **Nota sobre Clerk y sandbox:** Las keys `pk_test_` y `sk_test_` son de modo desarrollo (sandbox). Funcionan perfectamente para probar todo. Cuando estés listo para producción, en Clerk Dashboard activa el modo "Production" y las keys cambiarán a `pk_live_` y `sk_live_`. Actualízalas en Vercel cuando hagas el cambio.

#### Pagos (MercadoPago)
```
MERCADOPAGO_ACCESS_TOKEN = TEST-xxxxx                          # SANDBOX - Empieza con TEST- para pruebas
```

> **IMPORTANTE MercadoPago:** Para probar usa el token que empieza con `TEST-` (Paso 3.2). Cuando la tienda esté lista para recibir pagos reales, cámbialo por el token de producción que empieza con `APP_USR-` (Paso 3.3). **NO recibas pagos reales con el token TEST.**

#### Emails (Resend)
```
RESEND_API_KEY = re_xxxxx                                      # REEMPLAZAR - Tu API Key de Resend (Paso 4.1)
RESEND_FROM_EMAIL = onboarding@resend.dev                      # SANDBOX - Funciona para probar pero los emails pueden llegar a spam
```

> **Nota sobre Resend:** `onboarding@resend.dev` es un remitente de prueba de Resend. Funciona, pero los emails pueden caer en spam. Para producción, verifica tu dominio en Resend (Paso 4.2) y cambia este valor a algo como `pedidos@tutienda.com`.

#### Admin (login del panel `/admin`)
```
ADMIN_EMAIL = tu_email_de_admin@gmail.com                      # TU INFO - El email con el que quieres entrar al panel admin
ADMIN_PASSWORD = tu_contraseña_segura                          # TU INFO - La contraseña del panel admin (usa una segura)
```

#### Información del negocio
```
NEXT_PUBLIC_BUSINESS_NAME = Tu Tienda Colombia                 # TU INFO - El nombre de tu tienda
NEXT_PUBLIC_BUSINESS_EMAIL = contacto@tutienda.com             # TU INFO - Tu email de contacto
NEXT_PUBLIC_BUSINESS_PHONE = +57 300 123 4567                  # TU INFO - Tu teléfono de contacto
NEXT_PUBLIC_STORE_ADDRESS = Calle 123 #45-67                   # TU INFO - La dirección física de tu tienda
NEXT_PUBLIC_STORE_CITY = Medellín, Antioquia                   # TU INFO - Ciudad y departamento
NEXT_PUBLIC_STORE_HOURS = Lunes a Viernes 8am - 6pm, Sábados 9am - 2pm   # TU INFO - Horario de atención
NEXT_PUBLIC_WHATSAPP_NUMBER = +573001234567                    # TU INFO - Tu número de WhatsApp (con código de país)
```

#### NextAuth
```
NEXTAUTH_SECRET = xxxxxxxxxxxxxxxxxxxxxxx                      # GENERAR - Ejecuta: openssl rand -base64 32
NEXTAUTH_URL = https://tu-proyecto.vercel.app                  # DESPUES DEL DEPLOY - Pon cualquier valor por ahora, actualízalo en el Paso 9
```

#### WhatsApp Business API
```
WHATSAPP_ACCESS_TOKEN = tu_token_de_meta                       # REEMPLAZAR - Tu token de Meta (Paso 6.4)
WHATSAPP_PHONE_NUMBER_ID = tu_phone_number_id                  # REEMPLAZAR - Tu Phone Number ID de Meta (Paso 6.4)
WHATSAPP_VERIFY_TOKEN = mitienda_whatsapp_verify_2026          # GENERAR - Inventa un string secreto cualquiera
WHATSAPP_ADMIN_PHONE = 573001234567                            # TU INFO - Tu número personal sin + (donde recibes notificaciones)
```

> **Nota sobre WhatsApp y sandbox:** Mientras no hagas la verificación de negocio en Meta, solo puedes enviar mensajes a los números que hayas verificado manualmente (máximo 5). Esto es suficiente para probar. Cuando Meta verifique tu negocio, podrás enviar a cualquier número.

#### Google Gemini (IA)
```
GEMINI_API_KEY = tu_gemini_api_key                             # REEMPLAZAR - Tu API key de Google AI Studio (Paso 5)
```

#### URL del sitio
```
NEXT_PUBLIC_SITE_URL = https://tu-proyecto.vercel.app          # DESPUES DEL DEPLOY - Pon cualquier valor por ahora, actualízalo en el Paso 9
```

#### MiPaquete (Envíos - opcional)
```
MIPAQUETE_API_KEY = tu_token_jwt_de_mipaquete                  # REEMPLAZAR - Tu API key (token JWT) de MiPaquete
MIPAQUETE_SANDBOX = false                                      # SANDBOX - Cambiar a true si usas cuenta de prueba
MIPAQUETE_ORIGIN_CITY = 05001000                               # REEMPLAZAR - Código DANE+000 de tu ciudad origen (ej: 05001000 = Medellín)
MIPAQUETE_DEFAULT_WEIGHT = 1                                   # TU INFO - Peso promedio de paquete en kg
MIPAQUETE_DEFAULT_WIDTH = 20                                   # TU INFO - Ancho promedio en cm
MIPAQUETE_DEFAULT_HEIGHT = 15                                  # TU INFO - Alto promedio en cm
MIPAQUETE_DEFAULT_LENGTH = 30                                  # TU INFO - Largo promedio en cm
```

> **Nota sobre MiPaquete:** Si no configuras MiPaquete, el envío usa las tarifas fijas de la base de datos. MiPaquete cotiza en tiempo real con Servientrega, TCC, Coordinadora y más. El API key es el token JWT que obtienes al autenticarte en mipaquete.com. El código de ciudad origen es tu código DANE + "000" (ej: Medellín = 05001000, Bogotá = 11001000).

#### Cron Job (resumen diario)
```
CRON_SECRET = xxxxxxxxxxxxxxxxxxxxxxx                          # GENERAR - Ejecuta: openssl rand -hex 16
```

---

### Resumen rápido: Qué cambiar y cuándo

| Cuándo | Qué hacer |
|--------|-----------|
| **Ahora (antes del deploy)** | Reemplazar todas las variables marcadas como REEMPLAZAR, TU INFO y GENERAR con tus valores reales |
| **Ahora (temporal)** | Las variables DESPUES DEL DEPLOY ponlas con un valor temporal (ej: `https://ejemplo.com`) |
| **Después del primer deploy (Paso 9)** | Actualizar `NEXTAUTH_URL` y `NEXT_PUBLIC_SITE_URL` con tu URL real de Vercel |
| **Cuando lances la tienda** | Cambiar las variables SANDBOX a sus valores de producción (MercadoPago `APP_USR-`, Resend con dominio propio, Clerk en modo live) |

### 8.3 Deploy

1. Click **"Deploy"**
2. Espera ~2-3 minutos
3. Vercel te dará una URL como: `https://ecommerce-platform-abc123.vercel.app`
4. **Anota esta URL** - la necesitas en el siguiente paso

### 8.4 Verificar Cron Job

El archivo `vercel.json` configura un cron job automático:
- **Ruta:** `/api/cron/daily-summary`
- **Horario:** `0 4 * * *` (4 AM UTC = 11 PM hora Colombia)
- **Función:** Envía resumen diario de ventas por WhatsApp

Para verificar:
1. Ve a tu proyecto en Vercel > **Settings** > **Cron Jobs**
2. Deberías ver el job configurado

> Nota: En el plan Hobby de Vercel, los cron jobs se ejecutan 1 vez al día máximo, lo cual es exactamente lo que necesitamos.

---

## Paso 9: Configurar URLs post-deploy

Ahora que tienes la URL de Vercel, actualiza lo siguiente:

### 9.1 Actualizar variables en Vercel

1. Ve a tu proyecto en Vercel > **Settings** > **Environment Variables**
2. Actualiza:
   - `NEXTAUTH_URL` → `https://tu-proyecto.vercel.app`
   - `NEXT_PUBLIC_SITE_URL` → `https://tu-proyecto.vercel.app`
3. Click **"Save"**

### 9.2 Configurar Clerk

1. Ve a https://dashboard.clerk.com
2. En tu aplicación > **Domains**
3. Agrega: `tu-proyecto.vercel.app`

### 9.3 Configurar Webhook de MercadoPago

1. Ve a https://www.mercadopago.com.co/developers
2. Tu aplicación > **Webhooks / Notificaciones IPN**
3. URL: `https://tu-proyecto.vercel.app/api/webhook/mercadopago`
4. Eventos: **Payments**
5. Guarda

### 9.4 Configurar Webhook de WhatsApp

1. Ve a https://developers.facebook.com > Tu app > WhatsApp > Configuration
2. Callback URL: `https://tu-proyecto.vercel.app/api/webhook/whatsapp`
3. Verify Token: el mismo que pusiste en `WHATSAPP_VERIFY_TOKEN`
4. Click **"Verify and Save"**
5. Suscríbete a: **messages**

### 9.5 Redeploy

Después de actualizar las variables:

1. Ve a tu proyecto en Vercel > **Deployments**
2. Click los **"..."** del último deployment > **"Redeploy"**
3. Espera a que termine

---

## Paso 10: Configurar datos iniciales

Ahora que la tienda está online, entra al panel admin para configurar tu tienda:

### 10.1 Login de admin

1. Ve a `https://tu-proyecto.vercel.app/admin`
2. Inicia sesión con el `ADMIN_EMAIL` y `ADMIN_PASSWORD` que configuraste

### 10.2 Crear categorías

1. Ve a **Categorías** en el panel admin
2. Crea las categorías que necesites, por ejemplo:
   - Por género: Hombre, Mujer, Niño
   - Por tipo: Camisetas, Pantalones, Accesorios
   - Por marca: Nike, Adidas, etc.
3. Un producto puede tener múltiples categorías (ej: "Camiseta Nike" puede estar en Hombre + Camisetas + Nike)

### 10.3 Crear productos

1. Ve a **Productos** en el panel admin
2. Click **"Nuevo Producto"**
3. Llena los campos:
   - **Nombre** (obligatorio)
   - **Descripción** - puedes escribirla o usar el botón **"Generar con IA"** para que Gemini la genere
   - **Precio** en COP (obligatorio)
   - **Stock** (obligatorio)
   - **SKU** (opcional)
   - **Categorías** - selecciona las que apliquen (checkboxes)
   - **Imagen principal** - URL de la imagen
   - **Imágenes adicionales** - URLs separadas por coma
4. Click **"Crear"**

> **Tip: Imágenes** - Puedes subir imágenes gratis a servicios como [imgbb.com](https://imgbb.com), [imgur.com](https://imgur.com), o usar el Storage de Supabase (Supabase > Storage > crear bucket público).

### 10.4 Configurar cupones (opcional)

1. Ve a **Cupones** en el panel admin
2. Crea cupones de descuento por porcentaje o valor fijo
3. Los clientes los aplican en el checkout

### 10.5 Ajustar ciudades y costos de envío

El script SQL incluye ciudades principales de Colombia con costos de envío predeterminados. Para modificar:

1. Ve a **Supabase > Table Editor > cities**
2. Modifica los campos `delivery_days` y `delivery_cost` según necesites
3. Agrega más ciudades si es necesario

---

## Paso 11: Verificar todo funciona

### Checklist de verificación

#### Sitio web
- [ ] Visita `https://tu-proyecto.vercel.app` - la tienda carga correctamente
- [ ] Los productos se muestran en la página principal y en `/products`
- [ ] Los filtros de categoría funcionan (click en una categoría filtra los productos)
- [ ] La búsqueda de productos funciona
- [ ] El modal de producto muestra las categorías como badges

#### Autenticación
- [ ] Click en "Iniciar sesión" funciona con Clerk
- [ ] Login de admin en `/admin` funciona con ADMIN_EMAIL/PASSWORD

#### Flujo de compra online
- [ ] Agrega un producto al carrito
- [ ] Ve al checkout (`/checkout`)
- [ ] Completa el formulario y selecciona envío o recogida
- [ ] Redirige a MercadoPago correctamente
- [ ] Después de pagar, redirige a la página de éxito
- [ ] Email de confirmación llega al cliente
- [ ] Notificación de WhatsApp llega al admin

#### Panel admin
- [ ] Dashboard muestra estadísticas en `/admin/dashboard`
- [ ] Productos: crear, editar, eliminar, generar descripción con IA
- [ ] Categorías: crear, editar, eliminar
- [ ] Pedidos: filtro por estado de pago (Pagados/Pendiente/Todos), filtro por estado de pedido
- [ ] Cupones: crear y administrar

#### Ventas en persona
- [ ] Registra una venta desde `/admin/sales`
- [ ] Se descuenta el stock correctamente
- [ ] Notificación de WhatsApp al admin
- [ ] Si escribiste email del cliente, llega el recibo por email
- [ ] Botón "Compartir por WhatsApp" genera el link correctamente
- [ ] Botón "Imprimir Recibo" genera la vista de impresión

#### WhatsApp Chatbot
- [ ] Envía un mensaje al número de WhatsApp Business
- [ ] Recibes el menú de bienvenida con 4 opciones (lista interactiva)
- [ ] **Productos:** pregunta "qué productos tienes?" → responde con info del catálogo
- [ ] **Quiero comprar:** envía el link de la tienda
- [ ] **Mi pedido:** pide número de pedido, responde con estado
- [ ] **Hablar con nosotros:** confirma que los mensajes van a WhatsApp directo
- [ ] Después de 5 min sin actividad, el bot resetea la sesión

#### Cron Job
- [ ] Ejecuta manualmente:
```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" \
  https://tu-proyecto.vercel.app/api/cron/daily-summary
```
- [ ] Recibes WhatsApp con resumen del día (ventas, pedidos, stock bajo)

---

## Paso 12: Configurar dominio propio

> Opcional pero recomendado. Un dominio propio (ej: `teherantech.com`) le da profesionalismo a tu tienda. Sin dominio propio tu tienda funciona perfectamente con la URL gratuita de Vercel (`tu-proyecto.vercel.app`).

### 12.1 Comprar el dominio

Proveedores recomendados (de más barato a más caro):

| Proveedor | Precio aprox. (.com) | Ventaja |
|-----------|---------------------|---------|
| **Google Domains** | ~$12 USD/año (~34,000 COP) | Interfaz simple, protección WHOIS gratis |
| **Cloudflare Registrar** | ~$10 USD/año | Precio al costo, sin markup |
| **Namecheap** | ~$9-13 USD/año | Económico, buena interfaz |

1. Ve al proveedor que prefieras y busca el dominio que quieres
2. Si `.com` no está disponible, prueba con `.co` (dominio colombiano, se ve profesional)
3. Compra el dominio (el pago es anual)

### 12.2 Conectar dominio a Vercel

1. Ve a tu proyecto en Vercel > **Settings** > **Domains**
2. Escribe tu dominio (ej: `teherantech.com`) y click **"Add"**
3. Vercel te mostrará los registros DNS que necesitas configurar. Generalmente son:

**Opción A - Si tu dominio está en Cloudflare, Google Domains o similar:**
```
Tipo: A
Nombre: @
Valor: 76.76.21.21
```
```
Tipo: CNAME
Nombre: www
Valor: cname.vercel-dns.com
```

**Opción B - Si prefieres solo CNAME:**
```
Tipo: CNAME
Nombre: @
Valor: cname.vercel-dns.com
```

4. Ve a tu proveedor de dominio > **DNS** o **Configuración de DNS**
5. Agrega los registros que Vercel te indicó
6. Espera la propagación DNS (~5 minutos a 48 horas, normalmente menos de 1 hora)
7. Vercel automáticamente genera un certificado SSL (HTTPS) gratis para tu dominio

> **Tip:** Vercel te mostrará un check verde cuando el dominio esté conectado correctamente.

### 12.3 Actualizar variables de entorno en Vercel

Una vez que el dominio esté conectado, actualiza estas variables:

1. Ve a Vercel > **Settings** > **Environment Variables**
2. Cambia estas 2 variables (reemplaza `teherantech.com` por tu dominio real):

```
NEXTAUTH_URL = https://teherantech.com                    # Antes: https://tu-proyecto.vercel.app
NEXT_PUBLIC_SITE_URL = https://teherantech.com             # Antes: https://tu-proyecto.vercel.app
```

### 12.4 Actualizar Clerk

1. Ve a https://dashboard.clerk.com > tu aplicación > **Domains**
2. Agrega tu nuevo dominio: `teherantech.com`
3. Puedes mantener también `tu-proyecto.vercel.app` o quitarlo

### 12.5 Actualizar Webhooks

**MercadoPago:**
1. Ve a https://www.mercadopago.com.co/developers > tu aplicación > **Webhooks**
2. Cambia la URL a: `https://teherantech.com/api/webhook/mercadopago`

**WhatsApp:**
1. Ve a https://developers.facebook.com > tu app > **WhatsApp** > **Configuration**
2. Cambia Callback URL a: `https://teherantech.com/api/webhook/whatsapp`
3. Click **"Verify and Save"**

### 12.6 Configurar Resend con tu dominio (emails profesionales)

Esto permite enviar emails desde `pedidos@teherantech.com` en vez de `onboarding@resend.dev`:

1. Ve a https://resend.com > **Domains** > **Add Domain**
2. Escribe tu dominio: `teherantech.com`
3. Resend te dará 3 registros DNS para agregar:

| Tipo | Nombre | Valor |
|------|--------|-------|
| **MX** | `feedback-smtp.teherantech.com` | (valor que te da Resend) |
| **TXT** | `teherantech.com` | (valor SPF que te da Resend) |
| **CNAME** | `resend._domainkey.teherantech.com` | (valor DKIM que te da Resend) |

4. Agrega estos registros en tu proveedor de dominio (donde compraste el dominio)
5. Vuelve a Resend y click **"Verify"** (puede tardar de 5 minutos a 24 horas)
6. Una vez verificado, actualiza la variable en Vercel:

```
RESEND_FROM_EMAIL = pedidos@teherantech.com               # Antes: onboarding@resend.dev
```

### 12.7 Redeploy

Después de todos los cambios:

1. Ve a Vercel > **Deployments**
2. Click **"..."** del último deployment > **"Redeploy"**
3. Espera a que termine

### Checklist del dominio

- [ ] Dominio comprado
- [ ] DNS configurados y dominio conectado en Vercel (check verde)
- [ ] `NEXTAUTH_URL` y `NEXT_PUBLIC_SITE_URL` actualizados con el nuevo dominio
- [ ] Dominio agregado en Clerk
- [ ] Webhook de MercadoPago actualizado con la nueva URL
- [ ] Webhook de WhatsApp actualizado con la nueva URL
- [ ] Dominio verificado en Resend y `RESEND_FROM_EMAIL` actualizado
- [ ] Redeploy hecho en Vercel
- [ ] Sitio carga correctamente en `https://teherantech.com`

---

## Referencia: Variables de entorno

Todas las variables con indicador de acción:

```env
# ======= SUPABASE (Base de datos) =======
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co        # REEMPLAZAR con tu URL de Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...                   # REEMPLAZAR con tu anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...                       # REEMPLAZAR con tu service_role key

# ======= CLERK (Autenticación de clientes) =======
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx           # REEMPLAZAR (SANDBOX: cambiar a pk_live_ en producción)
CLERK_SECRET_KEY=sk_test_xxxxx                            # REEMPLAZAR (SANDBOX: cambiar a sk_live_ en producción)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in                    # NO CAMBIAR
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up                    # NO CAMBIAR
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/                     # NO CAMBIAR
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/                     # NO CAMBIAR

# ======= MERCADOPAGO (Pagos online) =======
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxx                       # SANDBOX: usar TEST- para pruebas, cambiar a APP_USR- para producción

# ======= RESEND (Emails transaccionales) =======
RESEND_API_KEY=re_xxxxx                                   # REEMPLAZAR con tu API key
RESEND_FROM_EMAIL=onboarding@resend.dev                   # SANDBOX: cambiar a pedidos@tudominio.com cuando verifiques dominio

# ======= NEXTAUTH =======
NEXTAUTH_SECRET=xxxxxxxx                                  # GENERAR: openssl rand -base64 32
NEXTAUTH_URL=https://tu-proyecto.vercel.app               # DESPUES DEL DEPLOY: poner tu URL real de Vercel

# ======= ADMIN (Login panel administrativo) =======
ADMIN_EMAIL=tu_email@gmail.com                            # TU INFO: tu email para entrar al admin
ADMIN_PASSWORD=tu_contraseña                              # TU INFO: tu contraseña del admin

# ======= NEGOCIO (Información pública) =======
NEXT_PUBLIC_BUSINESS_NAME=Tu Tienda Colombia              # TU INFO
NEXT_PUBLIC_BUSINESS_EMAIL=contacto@tutienda.com          # TU INFO
NEXT_PUBLIC_BUSINESS_PHONE=+57 300 123 4567               # TU INFO
NEXT_PUBLIC_STORE_ADDRESS=Calle 123 #45-67                # TU INFO
NEXT_PUBLIC_STORE_CITY=Medellín, Antioquia                # TU INFO
NEXT_PUBLIC_STORE_HOURS=Lunes a Viernes 8am - 6pm         # TU INFO
NEXT_PUBLIC_WHATSAPP_NUMBER=+573001234567                 # TU INFO

# ======= WHATSAPP BUSINESS API =======
WHATSAPP_ACCESS_TOKEN=tu_token_meta                       # REEMPLAZAR con tu token de Meta
WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id               # REEMPLAZAR con tu Phone Number ID
WHATSAPP_VERIFY_TOKEN=tu_verify_token                     # GENERAR: inventa un string secreto
WHATSAPP_ADMIN_PHONE=573001234567                         # TU INFO: tu número sin +

# ======= GOOGLE GEMINI (IA) =======
GEMINI_API_KEY=tu_gemini_key                              # REEMPLAZAR con tu API key de Google AI Studio

# ======= MIPAQUETE (Envíos - opcional) =======
MIPAQUETE_API_KEY=tu_token_jwt                            # REEMPLAZAR con tu API key (token JWT) de MiPaquete
MIPAQUETE_SANDBOX=false                                   # SANDBOX: cambiar a true si usas cuenta de prueba
MIPAQUETE_ORIGIN_CITY=05001000                            # REEMPLAZAR con código DANE+000 de tu ciudad origen
MIPAQUETE_DEFAULT_WEIGHT=1                                # TU INFO: peso promedio en kg
MIPAQUETE_DEFAULT_WIDTH=20                                # TU INFO: ancho promedio en cm
MIPAQUETE_DEFAULT_HEIGHT=15                               # TU INFO: alto promedio en cm
MIPAQUETE_DEFAULT_LENGTH=30                               # TU INFO: largo promedio en cm

# ======= OTROS =======
NEXT_PUBLIC_SITE_URL=https://tu-proyecto.vercel.app       # DESPUES DEL DEPLOY: poner tu URL real de Vercel
CRON_SECRET=tu_cron_secret                                # GENERAR: openssl rand -hex 16
```

**Total: 27 variables de entorno**

| Tipo | Cantidad | Acción |
|------|----------|--------|
| REEMPLAZAR | 8 | Poner tus credenciales de cada servicio |
| TU INFO | 9 | Poner la información real de tu negocio |
| GENERAR | 3 | Generar valores únicos con los comandos indicados |
| NO CAMBIAR | 4 | Dejar exactamente como están |
| SANDBOX | 3 | Funcionan para probar, cambiar a producción cuando lances |
| DESPUES DEL DEPLOY | 2 | Actualizar en el Paso 9 con tu URL de Vercel |

---

## Arquitectura del proyecto

### Estructura de archivos clave

```
src/
├── app/
│   ├── page.tsx                          # Homepage (productos destacados + categorías)
│   ├── products/page.tsx                 # Catálogo completo con búsqueda y filtros
│   ├── checkout/page.tsx                 # Formulario de compra
│   ├── success/page.tsx                  # Página post-pago exitoso
│   ├── failure/page.tsx                  # Página post-pago fallido
│   ├── mis-pedidos/page.tsx              # Historial de pedidos del cliente
│   ├── sign-in/                          # Login de clientes (Clerk)
│   ├── sign-up/                          # Registro de clientes (Clerk)
│   ├── admin/
│   │   ├── page.tsx                      # Login admin
│   │   ├── dashboard/page.tsx            # Dashboard con estadísticas
│   │   ├── products/page.tsx             # CRUD de productos (con IA)
│   │   ├── categories/page.tsx           # CRUD de categorías
│   │   ├── orders/page.tsx               # Gestión de pedidos (filtros pago/estado)
│   │   ├── coupons/page.tsx              # CRUD de cupones
│   │   └── sales/page.tsx                # Registro de ventas en persona
│   └── api/
│       ├── auth/login/route.ts           # Login admin
│       ├── orders/route.ts               # CRUD pedidos (auto-limpieza pendientes >24h)
│       ├── orders/[id]/route.ts          # Actualizar estado de pedido
│       ├── orders/confirm/route.ts       # Confirmar pedido en persona
│       ├── payment/mercadopago/route.ts  # Crear preferencia de pago
│       ├── webhook/mercadopago/route.ts  # Webhook de MercadoPago
│       ├── webhook/whatsapp/route.ts     # Webhook de WhatsApp (chatbot)
│       ├── admin/sales/route.ts          # Registrar venta en persona
│       ├── admin/generate-description/   # Generar descripción con Gemini
│       ├── cron/daily-summary/route.ts   # Resumen diario (cron 11PM COT)
│       └── user/orders/route.ts          # Pedidos del cliente logueado
├── components/
│   ├── shop/
│   │   ├── ProductCard.tsx               # Tarjeta de producto
│   │   └── ProductModal.tsx              # Modal detalle (múltiples categorías)
│   └── ui/
│       ├── Header.tsx                    # Navegación + carrito
│       ├── Footer.tsx                    # Footer
│       └── FloatingWhatsApp.tsx          # Botón flotante de WhatsApp
├── lib/
│   ├── supabase.ts                       # Cliente Supabase (público + admin)
│   ├── cart-store.ts                     # Estado del carrito (Zustand)
│   ├── email.ts                          # Emails con Resend
│   ├── whatsapp.ts                       # Mensajes WhatsApp (texto, botones, listas)
│   ├── gemini.ts                         # Cliente Gemini
│   └── chatbot.ts                        # Lógica del chatbot (sesiones, menú, IA)
├── types/index.ts                        # Interfaces TypeScript
└── middleware.ts                          # Clerk middleware (rutas protegidas)
```

### Flujo de datos

```
Cliente web → Next.js → Supabase (datos)
                     → MercadoPago (pagos)
                     → Clerk (auth)
                     → Resend (emails)

WhatsApp → Webhook → Chatbot → Gemini (IA)
                             → Supabase (consultas)
                             → WhatsApp (respuestas)

Cron (11PM) → Daily Summary → WhatsApp Admin

Venta en persona → Admin API → Supabase (stock)
                             → WhatsApp Admin (notificación)
                             → Resend (recibo email)
```

---

## Solución de problemas

### "Build failed" en Vercel
- Revisa los logs del build en Vercel > Deployments > click en el deployment fallido
- Error más común: variable de entorno faltante. Verifica que TODAS las 27 variables estén configuradas
- Si el error menciona TypeScript, ejecuta `npx tsc --noEmit` localmente para ver los errores

### Productos no se muestran
- Verifica que `is_active` sea `true` en la tabla `products`
- Verifica las políticas RLS: la policy "Public can view products" debe existir
- Si usas filtro de categoría, verifica que existan registros en `product_categories` para ese producto

### Categorías no aparecen en los productos
- Verifica que la tabla `product_categories` tenga registros vinculando producto y categoría
- En el admin, al crear/editar un producto, selecciona las categorías con los checkboxes
- Verifica la policy RLS "Public can view product_categories"

### Emails no llegan
- Revisa que `RESEND_API_KEY` sea correcto
- Si usas `onboarding@resend.dev`, los emails pueden ir a spam
- Verifica en https://resend.com/emails si se están enviando
- Para ventas en persona, el email solo se envía si ingresas el email del cliente

### MercadoPago no confirma pagos
- Verifica que el webhook esté configurado correctamente en MercadoPago
- La URL debe ser exacta: `https://tu-dominio.vercel.app/api/webhook/mercadopago`
- Revisa los logs en Vercel > Deployments > Functions > `/api/webhook/mercadopago`
- En sandbox usa tarjetas de prueba de MercadoPago (no reales)

### WhatsApp no envía mensajes
- Verifica que `WHATSAPP_ACCESS_TOKEN` no haya expirado (usa token permanente via System User)
- El número destino debe estar verificado en Meta si estás en modo sandbox
- Revisa logs en Vercel: Functions > `/api/webhook/whatsapp`
- El formato del número debe ser sin `+`: `573001234567`

### Chatbot no responde
- Verifica `GEMINI_API_KEY` en Google AI Studio
- El webhook de WhatsApp debe estar verificado (el GET endpoint responde al challenge)
- Meta puede tardar unos minutos en activar el webhook después de la verificación
- El chatbot solo responde mensajes de texto. Audios, imágenes, etc. reciben un mensaje avisando que solo acepta texto

### Chatbot muestra menú pero no responde a la selección
- Verifica que estés suscrito al campo `messages` en el webhook de WhatsApp
- El webhook maneja 3 tipos: `text`, `button_reply`, y `list_reply`
- El menú principal usa `list_reply` (mensaje interactivo tipo lista)

### Pedidos pendientes desaparecen
- **Esto es intencional.** Los pedidos con pago pendiente de más de 24 horas se eliminan automáticamente
- Los pedidos con pago fallido se eliminan inmediatamente
- Esto evita que se acumulen pedidos abandonados

### Cron job no se ejecuta
- El cron solo funciona en Vercel (no en desarrollo local)
- Ve a Vercel > Settings > Cron Jobs para verificar que aparezca
- Plan Hobby de Vercel: 1 cron job máximo, ejecución diaria (suficiente)
- El cron está protegido con `CRON_SECRET` - Vercel lo envía automáticamente

### Clerk login no funciona
- Verifica que tu dominio esté agregado en Clerk Dashboard > Domains
- Las keys `NEXT_PUBLIC_CLERK_*` deben ser de tipo `pk_test_` o `pk_live_`
- Las rutas de sign-in y sign-up deben coincidir con las variables de entorno

### Generación de descripción con IA no funciona
- Verifica que `GEMINI_API_KEY` esté configurada
- El producto debe tener nombre escrito antes de hacer click en "Generar con IA"
- Revisa la consola del navegador y logs de Vercel para errores

### Dominio personalizado no funciona
- Verifica que los registros DNS estén correctos en tu proveedor de dominio
- La propagación DNS puede tardar hasta 48 horas (normalmente menos de 1 hora)
- En Vercel > Settings > Domains debe aparecer un check verde junto a tu dominio
- Si no tienes dominio configurado aún, sigue el **Paso 12** de esta guía
