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
mongoose.connect('mongodb://127.0.0.1:27017/product_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('[Product Service] Terhubung ke MongoDB (product_db)'))
    .catch(err => console.error('[Product Service] Gagal terhubung ke MongoDB:', err));

app.post('/products', async (req, res) => {
    // PROTEKSI ROLE
    const role = req.headers['x-user-role'];
    if (role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Hanya Admin yang dapat menambah produk' });
    }

    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ message: 'Produk berhasil dibuat', data: product });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat produk' });
    }
});

// --- Endpoint CRUD Produk ---

// CREATE: Menambahkan produk baru
app.post('/products', async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.status(201).json({ message: 'Produk berhasil dibuat', data: product });
    } catch (error) {
        res.status(500).json({ error: 'Gagal membuat produk', details: error.message });
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
