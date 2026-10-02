// ========== Expired Control D&D - shared config & helpers ==========
// Dipakai oleh index.html dan admin.html.

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwoRnzRYCyoIj9MAyeO0jfYEOahsc7a4IWwcLK5LAMUQeCDt7t-A4r73ee7qh89gf7e/exec";
const API_TOKEN = "MAGENTA_AEON_2024";
const TIMEZONE = "Asia/Jakarta";
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

// Error yang dikembalikan server (bukan masalah jaringan)
class ApiError extends Error {}

async function callApi(action, body = null) {
  const formData = new URLSearchParams();
  formData.append('action', action);
  formData.append('token', API_TOKEN);
  if (body) Object.keys(body).forEach(key => formData.append(key, body[key] ?? ''));

  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString()
  });
  if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new ApiError(json.error);
  return json;
}

// ========== STRING ==========
function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function normalizeBarcode(barcode) {
  return String(barcode ?? '').replace(/\D/g, '');
}

// Kunci pencocokan barcode: angka saja, tanpa nol di depan
// (UPC-A "012345678905" == EAN-13 "0012345678905").
function barcodeKey(barcode) {
  return normalizeBarcode(barcode).replace(/^0+/, '');
}

// ========== TANGGAL (semua dalam format ISO "YYYY-MM-DD", zona WIB) ==========
const _wibDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// Tanggal WIB dalam format YYYY-MM-DD (en-CA menghasilkan format tersebut)
function getTodayStr(date = new Date()) {
  return _wibDateFmt.format(date);
}

function pad2(n) { return String(n).padStart(2, '0'); }

function parseToISO(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date) return isNaN(raw) ? null : `${raw.getFullYear()}-${pad2(raw.getMonth() + 1)}-${pad2(raw.getDate())}`;
  const s = String(raw).trim();

  // Serial date Excel/Sheets
  if (/^\d{5}$/.test(s) && parseInt(s) > 30000) {
    const d = new Date((parseInt(s) - 25569) * 86400000);
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${pad2(iso[2])}-${pad2(iso[3])}`;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const a = parseInt(slash[1]), b = parseInt(slash[2]);
    if (a > 12) return `${slash[3]}-${pad2(b)}-${pad2(a)}`;
    return `${slash[3]}-${pad2(a)}-${pad2(b)}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return null;
}

function isoToUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function addDays(iso, n) {
  const d = new Date(isoToUTC(iso) + n * 86400000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// Selisih hari a - b (keduanya ISO)
function daysBetween(isoA, isoB) {
  return Math.round((isoToUTC(isoA) - isoToUTC(isoB)) / 86400000);
}

function formatDateIndo(raw) {
  const iso = parseToISO(raw);
  if (!iso) return '-';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

function getKetentuanTarik(hMinus) {
  return hMinus > 0 ? `H-${hMinus}` : '';
}

// Normalisasi 1 baris dari sheet Database
function normalizeDbItem(item) {
  return {
    ...item,
    sku: String(item.sku ?? '').trim(),
    barcode: String(item.barcode ?? '').trim(),
    description: String(item.description ?? '').trim(),
    hMinus: parseInt(item.hMinus) || 0
  };
}

// Normalisasi 1 baris dari sheet Input
function normalizeInputItem(item) {
  return {
    ...item,
    barcode: String(item.barcode ?? '').trim(),
    sku: String(item.sku ?? '').trim(),
    description: String(item.description ?? '').trim(),
    lokasi: String(item.lokasi ?? '').trim(),
    timestamp: String(item.timestamp ?? '').trim(),
    expISO: parseToISO(item.expiredDate)
  };
}
