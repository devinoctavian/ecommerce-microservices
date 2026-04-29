require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Product = require('./models/product');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json()); // Parsing strict JSON
app.use(cors());

// Koneksi ke Database MongoDB untuk Product
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('[Product Service] Terhubung ke MongoDB (product_db)'))
    .catch(err => console.error('[Product Service] Gagal terhubung ke MongoDB:', err));

// --- Endpoint CRUD Produk ---

// CREATE: Menambahkan produk baru
app.post('/products', async (req, res) => {
    try {
        // 1. Ambil token dari header Authorization yang dikirim oleh Frontend
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Akses ditolak: Token tidak ada' });
        }

        // 2. Decode isi token untuk melihat role
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        console.log("1. TOKEN DITERIMA DI PRODUCT SERVICE!");
        console.log("2. ISI DATA USER (PAYLOAD):", payload);

        // 3. Cek apakah rolenya admin 
        if (payload.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Hanya Admin yang dapat menambah produk' });
        }

        // 4. Jika dia terbukti admin, simpan produk ke database
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ message: 'Produk berhasil dibuat', data: product });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat produk atau token rusak', details: error.message });
    }
});

// READ: Mendapatkan semua produk
app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil data produk', details: error.message });
    }
});

// READ: Mendapatkan produk berdasarkan ID
app.get('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({ error: 'Terjadi kesalahan sistem', details: error.message });
    }
});

// UPDATE: Memperbarui produk (misal: pengurangan stok)
app.put('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.status(200).json({ message: 'Produk diperbarui', data: product });
    } catch (error) {
        res.status(500).json({ error: 'Gagal memperbarui produk', details: error.message });
    }
});

// DELETE: Menghapus produk
app.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
        res.status(200).json({ message: 'Produk berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghapus produk', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Product Service] Berjalan di port ${PORT}`);
});
