require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db.js');

const app = express();
const PORT = process.env.PORT || 3300;

app.use(cors());
app.use(express.json());

// helper parse int aman
function toInt(value) {
  const s = String(value).replace(/[^\d\-]/g, '');
  if (!s) return 0;
  return parseInt(s, 10);
}

// Normalisasi Vendor A
function normalizeVendorA(rows) {
  return rows.map(r => ({
    vendor: "VendorA",
    product_code: r.kd_produk,
    product_name: r.nm_brg,
    price: Math.round(toInt(r.hrg) * 0.9), // diskon 10%
    stock_status: (String(r.ket_stok || "").toLowerCase() === "ada") ? "Tersedia" : "Habis"
  }));
}

// Normalisasi Vendor B
function normalizeVendorB(rows) {
  return rows.map(r => ({
    vendor: "VendorB",
    product_code: r.sku,
    product_name: r.product_name,
    price: toInt(r.price),
    stock_status: r.is_available ? "Tersedia" : "Habis"
  }));
}

// Normalisasi Vendor C
function normalizeVendorC(rows) {
  return rows.map(r => {
    const details = typeof r.details === "string" ? JSON.parse(r.details) : r.details || {};
    const pricing = typeof r.pricing === "string" ? JSON.parse(r.pricing) : r.pricing || {};

    let name = details.name || "";
    if ((details.category || "").toLowerCase() === "food") name += " (Recommended)";

    return {
      vendor: "VendorC",
      product_code: String(r.id),
      product_name: name,
      price: toInt(pricing.base_price) + toInt(pricing.tax),
      stock_status: r.stock > 0 ? "Tersedia" : "Habis"
    };
  });
}

/*
  GET /products-normalized
  👉 Mengambil semua tabel vendor (A, B, C)
  👉 Menormalisasi format data
  👉 Mengembalikan data final (tanpa insert ke DB)
*/
app.get('/products', async (req, res) => {
  try {
    const [ra, rb, rc] = await Promise.all([
      db.query("SELECT * FROM vendor_a"),
      db.query("SELECT * FROM vendor_b"),
      db.query("SELECT * FROM vendor_c")
    ]);

    const final = [
      ...normalizeVendorA(ra.rows),
      ...normalizeVendorB(rb.rows),
      ...normalizeVendorC(rc.rows)
    ];

    res.json({ total: final.length, data: final });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Terjadi kesalahan", detail: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));