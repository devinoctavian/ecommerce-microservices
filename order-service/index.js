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
    const userId = req.headers['x-user-id'];
    const role = req.headers['x-user-role'];

    try {
        let orders;
        if (role === 'admin') {
            // Admin bisa lihat semua pesanan
            orders = await Order.find().sort({ createdAt: -1 }); 
        } else {
            // Customer HANYA bisa lihat pesanannya sendiri
            orders = await Order.find({ userId: userId }).sort({ createdAt: -1 }); 
        }
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mengambil pesanan' });
    }
});

// POST: Membuat Pesanan Baru (Melibatkan Inter-Service Communication)
app.post('/orders', async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.headers['x-user-id'];

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
            userId: userId,
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

// DELETE: Membatalkan pesanan dan MENGEMBALIKAN stok (Inter-service Communication)
app.delete('/orders/:id', async (req, res) => {
    try {
        // 1. Cari data pesanan yang ingin dihapus
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });

        // 2. Hubungi Product Service untuk mengembalikan stok
        try {
            // Ambil data produk terbaru
            const productResponse = await axios.get(`http://127.0.0.1:3001/products/${order.productId}`);
            const product = productResponse.data;

            // Tambahkan stok saat ini dengan kuantitas yang dibatalkan
            const restoredStock = product.stock + order.quantity;

            // Kirim instruksi update stok ke Product Service
            await axios.put(`http://127.0.0.1:3001/products/${order.productId}`, {
                name: product.name,
                price: product.price,
                stock: restoredStock
            });
        } catch (productError) {
            console.error('[Warning] Gagal mengembalikan stok, mungkin produk sudah dihapus dari katalog.');
        }

        // 3. Hapus pesanan dari database order_db
        await Order.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Pesanan berhasil dibatalkan dan stok telah dikembalikan!' });

    } catch (error) {
        res.status(500).json({ error: 'Gagal membatalkan pesanan', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Order Service] Berjalan di port ${PORT}`);
});
