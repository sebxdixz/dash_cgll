// ── EasyCanchas API client ─────────────────────────────────────────────────────
// Todas las funciones son server-side only (usan variables de entorno privadas).
// Los componentes cliente deben llamar a los route handlers en /api/easycanchas/.

const BASE_URL = process.env.EASYCANCHA_BASE_URL!;
const API_KEY  = process.env.EASYCANCHA_API_KEY!;
const CLUB_ID  = process.env.EASYCANCHA_CLUB_ID!;

function headers() {
  return { apikey: API_KEY };
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ECUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;        // YYYY-MM-DD
  age: number;
  gender: "M" | "F" | string;
  foidCountry: string;
  foidType: string;
  foidNumber: string;
  emailConfirmed: boolean;
  webEnrolledDate: string;  // YYYY-MM-DD
  memberId: string | null;
  blocked: boolean;
  comments: string | null;
}

export interface ECAncillary {
  clubAncillaryId: string;
  quantity: number;
  name: string;
  detail: string | null;
}

export interface ECBooking {
  id: string;
  courtId: number;
  sportId: number;
  sportName: string;
  courtName: string;
  localDate: string;        // YYYY-MM-DD
  localStartTime: string;   // HH:mm
  localEndTime: string;     // HH:mm
  timespan: number;         // minutos
  userId: number;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string;
  userBirthDate: string;
  userFoidCountry: string;
  userFoidType: string;
  userFoidNumber?: string;
  status: "BOOKED" | "PARTIALLY_PAID" | "PAID" | "USED" | "CANCELLED" | "EXCHANGED";
  comments: string | null;
  waived: "Y" | "N";
  bookedBy: "club" | "user";
  amount: number;
  amountPaid: number;
  ancillariesAmount: number | null;
  ancillariesAmountPaid: number | null;
  totalAmount: number;
  totalAmountPaid: number;
  discountAmount: number;
  customerCodes: string;
  ancillaries?: ECAncillary[];
}

export interface ECPayment {
  localTransactionDateTime: string; // YYYY-MM-DD HH:mm:ss
  name: string;
  code: string;
  paymentIdentifier: string;
  paymentUserFoidCountry: string;
  paymentUserFoidType: string;
  paymentUserFoidNumber: string;
  paymentUserFirstName: string;
  paymentUserLastName: string;
  paymentUserPhone: string;
  paymentUserEmail: string;
  amount: number;
  paymentCurrencyName: string;
  collector: string;
  last4digits: string | null;
  authCode: string | null;
  boletas: string;
  dtesType: string | null;
  dtes: string | null;
  extra_info: string | null;
}

export interface ECProduct {
  productId: number;         // 1=cancha, 2=actividad, 3=otro, 5=accesorio, 7=pack cupones
  productTransactionId: number;
  transactionCategory: string;
  transactionDetail: string;
  transactionSubDetail: string | null;
  transactionDate: string;   // YYYY-MM-DD
  transactionTime: string;   // HH:mm
  userFoidCountry: string;
  userFoidType: string;
  userFoidNumber: string;
  userFirstName: string;
  userLastName: string;
  userGender: "M" | "F" | string;
  userType: string;          // "Socio", "Invitado", u otros
  productQuantity: number;
  productAmount: number;
  fedegolfFee: number | null;
  asociacionFee: number | null;
  otherFee: number | null;
  fedegolfRealFee: number | null;
  fedegolfBoleta: string | null;
  currencyName: string;
  comments: string | null;
}

export interface ECTransaction {
  payment: ECPayment;
  products: ECProduct[];
}

// ── API calls ──────────────────────────────────────────────────────────────────

export async function fetchUsers(): Promise<ECUser[]> {
  const res = await fetch(`${BASE_URL}/api/clubs/${CLUB_ID}/usersReport`, {
    headers: headers(),
    next: { revalidate: 3600 }, // cache 1h — el padrón no cambia tan seguido
  });
  if (!res.ok) throw new Error(`usersReport ${res.status}`);
  const json = await res.json();
  return json.users as ECUser[];
}

export async function fetchBookings(
  fromIsoDate: string,
  toIsoDate: string,
  sportId?: number
): Promise<ECBooking[]> {
  const params = new URLSearchParams({ fromIsoDate, toIsoDate });
  if (sportId !== undefined) params.set("sportId", String(sportId));

  const url = `${BASE_URL}/api/clubs/${CLUB_ID}/bookingsReport?${params}`;
  const res = await fetch(url, {
    headers: headers(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`bookingsReport ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.bookings as ECBooking[];
}

export async function fetchTransactions(
  fromIsoDate: string,
  toIsoDate: string
): Promise<ECTransaction[]> {
  // Fechas van en el PATH para este endpoint (máx 1 mes por consulta).
  // El ambiente training es lento (~40-60s por llamada). No usar AbortSignal
  // con next:{revalidate} ya que son incompatibles en algunas versiones.
  const url = `${BASE_URL}/api/clubs/${CLUB_ID}/transactionsReport/${fromIsoDate}/${toIsoDate}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`transactionsReport ${res.status}`);
  const json = await res.json();
  return json.transactionsReport as ECTransaction[];
}

// ── Helpers de negocio ─────────────────────────────────────────────────────────

/**
 * Dado un booking id, devuelve el product (productId=1) correspondiente
 * en la lista de transacciones, o undefined si no hay match.
 */
export function findTransactionForBooking(
  bookingId: string,
  transactions: ECTransaction[]
): ECProduct | undefined {
  for (const tx of transactions) {
    const product = tx.products.find(
      (p) => p.productId === 1 && String(p.productTransactionId) === String(bookingId)
    );
    if (product) return product;
  }
  return undefined;
}

/** Normaliza userType para comparaciones ("SOCIO" → "Socio", etc.) */
export function isSocio(userType: string): boolean {
  return userType.toUpperCase() === "SOCIO";
}
