const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios'); // Digunakan untuk komunikasi HTTP antar microservice
const cors = require('cors');
const Order = require('./models/Order');

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(cors());

// Koneksi ke Database MongoDB untuk Order
mongoose.connect('mongodb://127.0.0.1:27017/order_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('[Order Service] Terhubung ke MongoDB (order_db)'))
  .catch(err => console.error('[Order Service] Gagal terhubung ke MongoDB:', err));

// --- Endpoint Pesanan ---

// GET: Mendapatkan semua riwayat pesanan
app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil pesanan', details: error.message });
    }
});

// POST: Membuat Pesanan Baru (Melibatkan Inter-Service Communication)
app.post('/orders', async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        // 1. Panggil Product Service secara internal untuk memverifikasi produk dan stok
        const productResponse = await axios.get(`http://127.0.0.1:3001/products/${productId}`);
        const product = productResponse.data;

        // 2. Validasi Ketersediaan Stok
        if (product.stock < quantity) {
            return res.status(400).json({ error: 'Stok produk tidak mencukupi untuk pesanan ini.' });
        }

        // 3. Kalkulasi Total Harga
        const totalPrice = product.price * quantity;

        // 4. Kurangi Stok di Product Service melalui PUT request
        const updatedStock = product.stock - quantity;
        await axios.put(`http://127.0.0.1:3001/products/${productId}`, {
            name: product.name,
            price: product.price,
            stock: updatedStock
        });

        // 5. Simpan Data Pesanan ke Database Order
        const newOrder = new Order({
            productId: product._id,
            productName: product.name,
            quantity: quantity,
            totalPrice: totalPrice
        });
        await newOrder.save();

        res.status(201).json({ message: 'Pesanan berhasil dibuat!', data: newOrder });

    } catch (error) {
        // Penanganan error khusus jika produk tidak ditemukan di Product Service (Axios 404 error)
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Produk tidak ditemukan di database.' });
        }
        res.status(500).json({ error: 'Terjadi kesalahan saat memproses pesanan', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Order Service] Berjalan di port ${PORT}`);
});
