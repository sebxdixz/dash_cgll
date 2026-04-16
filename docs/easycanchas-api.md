# Documentación de la API EasyCanchas — Club de Golf Los Leones

**Ambiente:** `training.easycancha.com` (ambiente de entrenamiento/staging del club)  
**Club ID:** `350`  
**Última actualización:** Abril 2026

---

## Índice

1. [Autenticación](#autenticación)
2. [Variables de entorno](#variables-de-entorno)
3. [Endpoints](#endpoints)
   - [usersReport](#1-usersreport)
   - [bookingsReport](#2-bookingsreport)
   - [transactionsReport](#3-transactionsreport)
4. [Modelos de datos](#modelos-de-datos)
   - [ECUser](#ecuser)
   - [ECBooking](#ecbooking)
   - [ECTransaction](#ectransaction)
   - [ECProduct](#ecproduct)
   - [ECPayment](#ecpayment)
5. [IDs de deportes (sportId)](#ids-de-deportes-sportid)
6. [Estados de reserva (status)](#estados-de-reserva-status)
7. [Reglas de negocio](#reglas-de-negocio)
   - [Join reservas ↔ transacciones](#join-reservas--transacciones)
   - [Clasificación Socio vs Invitado](#clasificación-socio-vs-invitado)
   - [customerCodes](#customercodes)
   - [totalAmount vs transacciones](#totalamount-vs-transacciones)
   - [Cobertura de transacciones](#cobertura-de-transacciones)
8. [Limitaciones y comportamiento conocido](#limitaciones-y-comportamiento-conocido)
9. [Arquitectura de caché del dashboard](#arquitectura-de-caché-del-dashboard)

---

## Autenticación

Todas las solicitudes requieren el header:

```
apikey: <API_KEY>
```

La clave se obtiene del equipo de EasyCanchas o del panel de administración del club. **No hardcodear en el código fuente** — usar variables de entorno.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `EASYCANCHA_BASE_URL` | URL base del ambiente | `https://training.easycancha.com` |
| `EASYCANCHA_API_KEY` | Clave de autenticación | `6a8b369b-...` |
| `EASYCANCHA_CLUB_ID` | ID del club | `350` |

---

## Endpoints

### 1. usersReport

Devuelve el padrón completo de usuarios registrados en el club.

```
GET /api/clubs/350/usersReport
```

**Respuesta:**
```json
{
  "users": [ ECUser, ... ]
}
```

**Notas:**
- No acepta filtros de fecha ni paginación — devuelve todos los usuarios en una sola llamada.
- Incluye tanto socios activos como bloqueados y usuarios sin membresía (invitados que alguna vez reservaron online).
- Tarda ~3-5 segundos en el ambiente training.
- En el dashboard se cachea durante 1 hora en Redis (el padrón no cambia frecuentemente).

---

### 2. bookingsReport

Devuelve las reservas del club en un rango de fechas.

```
GET /api/clubs/350/bookingsReport?fromIsoDate=YYYY-MM-DD&toIsoDate=YYYY-MM-DD[&sportId=N]
```

**⚠️ Importante:** Las fechas van como **query parameters**, NO en el path.

| Query param | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fromIsoDate` | `YYYY-MM-DD` | Sí | Fecha inicial (inclusive) |
| `toIsoDate` | `YYYY-MM-DD` | Sí | Fecha final (inclusive) |
| `sportId` | número | No | Filtrar por deporte. Sin este param devuelve todos. |

**Respuesta:**
```json
{
  "bookings": [ ECBooking, ... ]
}
```

**Notas:**
- Si se omite `sportId`, devuelve todos los deportes — útil para consultas generales pero más lento.
- Recomendado filtrar por `sportId` para reducir payload y tiempo de respuesta.
- El rango máximo recomendado es 1 mes por llamada (el ambiente training es lento ~5-15s por mes/deporte).
- Devuelve reservas canceladas (`CANCELLED`) junto con las activas.

---

### 3. transactionsReport

Devuelve las transacciones de pago del club en un rango de fechas.

```
GET /api/clubs/350/transactionsReport/YYYY-MM-DD/YYYY-MM-DD
```

**⚠️ Importante:** A diferencia de `bookingsReport`, las fechas van **en el PATH**, no como query params.

**Respuesta:**
```json
{
  "transactionsReport": [ ECTransaction, ... ]
}
```

**Notas:**
- Máximo 1 mes por consulta (la API es lenta y puede timeout con rangos más amplios).
- No filtra por deporte — devuelve todas las transacciones del club (canchas, bar, accesorios, etc.).
- Tarda entre 40-60 segundos por llamada en el ambiente training (es el endpoint más lento).
- Para el año completo, hacer 12 llamadas paralelas (una por mes) y concatenar los resultados.

---

## Modelos de datos

### ECUser

Representa un usuario registrado en el club.

| Campo | Tipo | Descripción |
|---|---|---|
| `userId` | `number` | Identificador único del usuario |
| `firstName` | `string` | Nombre |
| `lastName` | `string` | Apellido |
| `email` | `string` | Correo electrónico |
| `phone` | `string` | Teléfono |
| `birthDate` | `YYYY-MM-DD` | Fecha de nacimiento |
| `age` | `number` | Edad calculada |
| `gender` | `"M" \| "F" \| string` | Género (`M` = masculino, `F` = femenino) |
| `foidCountry` | `string` | País del documento de identidad |
| `foidType` | `string` | Tipo de documento (RUT, pasaporte, etc.) |
| `foidNumber` | `string` | Número del documento |
| `emailConfirmed` | `boolean` | Si el correo fue verificado |
| `webEnrolledDate` | `YYYY-MM-DD` | Fecha de registro en la plataforma |
| `memberId` | `string \| null` | **Número de socio.** `null` = no es socio del club |
| `blocked` | `boolean` | Si el usuario está bloqueado |
| `comments` | `string \| null` | Notas del administrador |

**Cómo detectar socios:** `memberId !== null && blocked === false`

---

### ECBooking

Representa una reserva individual.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | `string` | Identificador único de la reserva (**clave de join con transacciones**) |
| `courtId` | `number` | ID de la cancha/recurso |
| `sportId` | `number` | ID del deporte (ver tabla de IDs más abajo) |
| `sportName` | `string` | Nombre del deporte en español (ej. `"Golf"`, `"Tenis"`) |
| `courtName` | `string` | Nombre de la cancha (ej. `"Cancha 1"`, `"Hoyo 10"`) |
| `localDate` | `YYYY-MM-DD` | Fecha de la reserva (hora local) |
| `localStartTime` | `HH:mm` | Hora de inicio |
| `localEndTime` | `HH:mm` | Hora de término |
| `timespan` | `number` | Duración en **minutos** |
| `userId` | `number` | ID del usuario que hizo la reserva |
| `userFirstName` | `string` | Nombre del jugador |
| `userLastName` | `string` | Apellido del jugador |
| `userEmail` | `string` | Correo del jugador |
| `status` | `string` | Estado de la reserva (ver tabla de estados) |
| `bookedBy` | `"club" \| "user"` | Quién agendó: `"club"` = recepción/teléfono, `"user"` = app/web |
| `amount` | `number` | Monto de la cancha (sin accesorios) en CLP |
| `totalAmount` | `number` | Monto total incluyendo accesorios en CLP |
| `totalAmountPaid` | `number` | Monto efectivamente pagado |
| `discountAmount` | `number` | Descuento aplicado |
| `customerCodes` | `string` | Código de tipo de cliente (ej. `"Socio"`, `"Invitado"`) |
| `waived` | `"Y" \| "N"` | Si el cobro fue condonado |
| `ancillaries` | `ECAncillary[]` | Accesorios adicionales (opcional) |

**Notas sobre `totalAmount`:**
- Para socios del club, `totalAmount` es frecuentemente `0` ya que el costo de cancha está cubierto por la membresía mensual y no se registra por reserva.
- Para invitados y green fees, `totalAmount` refleja el cobro real.
- **No usar `totalAmount` como única fuente de verdad para ingresos** — cruzar con `transactionsReport` cuando sea posible (ver sección de cobertura).

---

### ECTransaction

Representa un pago procesado en el sistema.

```
ECTransaction {
  payment: ECPayment
  products: ECProduct[]
}
```

Una transacción puede cubrir múltiples productos (cancha + accesorios + pack, etc.).

---

### ECProduct

Un ítem dentro de una transacción.

| Campo | Tipo | Descripción |
|---|---|---|
| `productId` | `number` | **Tipo de producto** (ver tabla abajo) |
| `productTransactionId` | `number` | **Clave de join con `ECBooking.id`** (cuando `productId=1`) |
| `transactionDate` | `YYYY-MM-DD` | Fecha del pago |
| `transactionTime` | `HH:mm` | Hora del pago |
| `userType` | `string` | Tipo de usuario al momento del pago (`"Socio"`, `"Invitado"`, etc.) |
| `userFirstName` | `string` | Nombre del pagador |
| `userLastName` | `string` | Apellido del pagador |
| `userGender` | `"M" \| "F"` | Género del pagador |
| `productAmount` | `number` | Monto del ítem en CLP |
| `productQuantity` | `number` | Cantidad |
| `transactionCategory` | `string` | Categoría descriptiva del producto |
| `transactionDetail` | `string` | Descripción del ítem |
| `fedegolfFee` | `number \| null` | Arancel Federación de Golf (si aplica) |
| `currencyName` | `string` | Moneda (`"CLP"`) |

**Tabla de `productId`:**

| productId | Tipo |
|---|---|
| `1` | **Cancha / reserva** — el más relevante para el dashboard |
| `2` | Actividad |
| `3` | Otro |
| `5` | Accesorio (palos, pelota, etc.) |
| `7` | Pack / cupón |

**⚠️ Importante:** Para cruzar transacciones con reservas, filtrar siempre `productId === 1`.

---

### ECPayment

Información del pago dentro de `ECTransaction`.

| Campo | Tipo | Descripción |
|---|---|---|
| `localTransactionDateTime` | `YYYY-MM-DD HH:mm:ss` | Fecha y hora local del pago |
| `name` | `string` | Nombre del método de pago |
| `code` | `string` | Código del método |
| `amount` | `number` | Monto total de la transacción |
| `paymentCurrencyName` | `string` | Moneda |
| `collector` | `string` | Cobrador |
| `last4digits` | `string \| null` | Últimos 4 dígitos (tarjeta) |
| `boletas` | `string` | Número(s) de boleta |

---

## IDs de deportes (sportId)

Lista completa para el Club de Golf Los Leones (clubId=350, ambiente training):

### Golf
| sportId | Nombre |
|---|---|
| `20` | Golf |
| `246` | Campeonatos de Golf |
| `87` | Arriendo de carros |

### Tenis y Deportes
| sportId | Nombre |
|---|---|
| `1` | Tenis |
| `332` | Clases de Tenis |
| `7` | Pádel |
| `97` | Clases de Pádel |
| `265` | Campeonatos de Padel |
| `11` | Squash |
| `3` | Futbolito |

### Gimnasio y Bienestar
| sportId | Nombre |
|---|---|
| `63` | Gimnasio |
| `420` | Masajes |

### Actividades y Eventos
| sportId | Nombre |
|---|---|
| `18` | Piscina |
| `39` | Cumpleaños |
| `315` | Guardería |
| `981` | Taller de Verano |
| `998` | Almuerzo Fin de Año |
| `104` | Restaurante |

**Nota:** Los IDs `104` y `998` corresponden a servicios del club que tienen menor volumen de reservas. El Taller de Verano (`981`) es estacional y solo aparece en los primeros meses del año.

---

## Estados de reserva (status)

| Valor | Descripción |
|---|---|
| `BOOKED` | Reservado (pendiente de pago) |
| `PARTIALLY_PAID` | Pago parcial |
| `PAID` | Pagado completamente |
| `USED` | Completada (la hora fue utilizada) |
| `CANCELLED` | Cancelada |
| `EXCHANGED` | Canjeada (usó un cupón o pack) |

**Nota:** Las reservas `CANCELLED` siempre están presentes en los resultados. Filtrarlas cuando se calculen métricas de ocupación real.

---

## Reglas de negocio

### Join reservas ↔ transacciones

Para enlazar una reserva con su transacción de pago:

```
booking.id  ===  transaction.products[i].productTransactionId
             WHERE  transaction.products[i].productId === 1
```

**Importante:** La clave de join es un `string` en `ECBooking.id` y un `number` en `ECProduct.productTransactionId`. Siempre comparar como strings: `String(booking.id) === String(product.productTransactionId)`.

---

### Clasificación Socio vs Invitado

**Fuente primaria (transacciones disponibles):** campo `userType` en `ECProduct`.

```typescript
function isSocio(userType: string): boolean {
  return userType.toUpperCase().includes("SOCIO");
}
```

Valores conocidos de `userType`: `"Socio"`, `"Socio Titular"`, `"Socio Junior"`, `"Invitado"`, `"Profesor Tenis"`, `"Federación de Golf"`, entre otros.

**Fuente de respaldo (sin transacciones):** campo `customerCodes` en `ECBooking`.

```typescript
const isSocio = booking.customerCodes?.toLowerCase().includes("socio");
```

---

### customerCodes

Campo de texto libre en `ECBooking` que identifica el tipo de cliente. Algunos valores observados:

| Valor | Significado |
|---|---|
| `Socio` | Socio del club |
| `Invitado` | Invitado |
| `Profesor Tenis` | Instructor |
| `Federación de Golf` | Jugador federado externo |
| `GPS` | Uso interno |
| `Permiso especial` | Acceso especial autorizado |
| Nombre de club externo | Ej. `"Country Club de Bogotá"` — reciprocidad entre clubes |

Este campo es el único indicador de tipo de cliente disponible cuando no hay datos de transacciones. Para Golf, una fracción significativa de los registros corresponde a jugadores de clubes afiliados por reciprocidad.

---

### totalAmount vs transacciones

El campo `totalAmount` en `ECBooking` y el campo `productAmount` en `ECProduct` (transacciones) **no siempre coinciden**:

| Fuente | Ventaja | Limitación |
|---|---|---|
| `ECBooking.totalAmount` | Siempre disponible, sin join | Socios muestran `$0` (su costo está en la cuota mensual, no por reserva) |
| `ECProduct.productAmount` | Refleja el cobro real y distingue `userType` | Solo disponible en meses con datos de transacciones completos |

**Cuándo usar cada fuente:**
- Si las transacciones cubren ≥5% de las reservas del período → usar transacciones (más preciso)
- Si la cobertura es <5% → usar `totalAmount` (mejor que mostrar $0 para todo)

---

### Cobertura de transacciones

En el ambiente training del CGLL, la cobertura de transacciones es **baja**:

- **2025 (año completo):** ~924 transacciones totales para ~110,440 reservas → cobertura ~0.8%
- **Golf 2025:** ~975 bookingIds con match en transacciones de ~32,591 reservas → ~3% de cobertura

Esto significa que **para la mayoría de los períodos, el fallback a `totalAmount` se activa**. Las transacciones disponibles en training son una muestra, no el set completo de producción.

**Consecuencia para los KPIs financieros:**
- Con cobertura <5%: `ingresosAsociados` + `ingresosGreenFee` se calculan desde `totalAmount`
- Los socios aparecen como $0 en `totalAmount` → sus ingresos no se capturan por esta vía
- Los ingresos reales de socios están en la cuota mensual, fuera del scope de EasyCanchas

---

## Limitaciones y comportamiento conocido

### Performance del ambiente training
- `usersReport`: ~3-5 segundos
- `bookingsReport` (por mes/deporte): ~5-15 segundos
- `transactionsReport` (por mes): **40-60 segundos** — el endpoint más lento
- Las llamadas deben hacerse en paralelo cuando sea posible

### Restricciones de la API
- `transactionsReport`: máximo 1 mes por llamada (rangos más amplios pueden causar timeout o respuesta incompleta)
- `bookingsReport`: sin paginación — devuelve todos los resultados para el rango/deporte solicitado
- No hay endpoint de websocket ni notificaciones push — solo polling

### Datos de socios
- `ECUser.memberId` puede ser `null` para usuarios registrados online que nunca fueron dados de alta como socios
- Un usuario bloqueado (`blocked: true`) puede tener `memberId` — no contabilizar como socio activo
- La edad (`age`) está pre-calculada por la API; puede ser `null` en casos excepcionales

### Reservas canceladas
- Las reservas con `status: "CANCELLED"` siempre aparecen en `bookingsReport`
- Para métricas de ocupación real, excluirlas explícitamente
- Para análisis de demanda total (incluyendo cancelaciones), incluirlas

### Golf — courtName como hoyo
- En Golf (`sportId=20`), el campo `courtName` contiene el hoyo jugado: `"Hoyo 1"`, `"Hoyo 2"`, ..., `"Hoyo 18"`
- Una reserva de Golf = un tee time en un hoyo específico
- Los campos `localStartTime` y `localEndTime` corresponden a la hora de salida del hoyo

---

## Arquitectura de caché del dashboard

El dashboard implementa dos niveles de caché para mitigar la lentitud de la API:

### Nivel 1 — Redis (Upstash, server-side)

Claves de Redis:
```
users                           → padrón completo (TTL: 25h default)
bookings:{year}:{mm}:{sportId}  → reservas por mes y deporte (TTL: 26h mes actual, 30 días histórico)
transactions:{year}             → todas las transacciones del año (TTL: 25h default)
```

- El cron job diario (12:00 Chile) refresca el mes actual para todos los deportes
- El endpoint `/api/refresh?secret=...&year=YYYY&month=MM` permite refrescar manualmente
- El endpoint `/api/refresh?secret=...&year=YYYY` refresca el año completo (lento, para warm-up inicial)

### Nivel 2 — localStorage (browser, client-side)

- Cada respuesta del Route Handler se guarda en localStorage por 24 horas
- Al detectar un nuevo deploy (`NEXT_PUBLIC_BUILD_ID` distinto), la caché del browser se limpia automáticamente
- El botón "Actualizar" en cada página limpia ambos niveles y re-fetches los datos

### Flujo de datos

```
Browser → Route Handler (/api/easycanchas/...) → Redis (hit) → JSON al browser
                                               ↘ Redis (miss) → EasyCanchas API → Redis → JSON al browser
```
