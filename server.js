const express = require('express');
const { Pool } = require('pg');
const app = express();
app.use(express.json());

// --- Koneksi Neon.tech ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- Helper normalisasi ---
// Vendor A - Mahasiswa 1
function normalizeVendorA(item) {
  const price_final = parseInt(item.price, 10);
  const status = (item.status === "ada" || item.status === "habis") ? item.status : "habis";
  return {
    id: item.id,
    name: item.nama,
    price_final,
    status,
    vendor: 'A',
    kategori: item.kategori
  };
}
// Vendor B - Mahasiswa 2
function normalizeVendorB(item) {
  const status = item.status ? "Tersedia" : "habis";
  const price_final = item.base_price + item.tax;
  return {
    id: item.id,
    name: item.name,
    price_final,
    status,
    vendor: 'B',
    kategori: item.kategori
  };
}
// Vendor C - Mahasiswa 3
function normalizeVendorC(item) {
  const price_final = item.harga_base + item.harga_tax;
  return {
    id: item.id,
    name: item.nama,
    price_final,
    vendor: 'C',
    kategori: item.kategori
  };
}

// --- Apply persyaratan ---
function applyFinalRules(items) {
  return items.map(product => {
    const p = { ...product };
    if (p.vendor === 'A') {
      p.price_final = Math.round(p.price_final * 0.9);
    }
    if (p.vendor === 'C' && p.kategori === 'Food') {
      p.name += ' (Recommended)';
    }
    return p;
  });
}

function uniformOutput(items) {
  return items.map(p => ({
    id: p.id,
    name: p.name,
    price_final: p.price_final,
    status: p.status ?? '-',
    vendor: p.vendor,
    kategori: p.kategori
  }));
}

// --- Route GET /products ---
app.get('/products', async (req, res) => {
  try {
    // Sesuaikan query dengan struktur tabel di Neon kamu!
    const [vA, vB, vC] = await Promise.all([
      pool.query('SELECT id, nama, price, status, kategori FROM vendor_a'),
      pool.query('SELECT id, name, base_price, tax, status, kategori FROM vendor_b'),
      pool.query('SELECT id, nama, harga_base, harga_tax, kategori FROM vendor_c'),
    ]);

    const productsA = vA.rows.map(normalizeVendorA);
    const productsB = vB.rows.map(normalizeVendorB);
    const productsC = vC.rows.map(normalizeVendorC);

    let finalProducts = [...productsA, ...productsB, ...productsC];
    finalProducts = applyFinalRules(finalProducts);
    finalProducts = uniformOutput(finalProducts);

    res.json(finalProducts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// --- Jalankan server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});