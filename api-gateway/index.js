// Mengimpor library yang dibutuhkan
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const fs = require('fs');

// Inisialisasi aplikasi Express
const app = express();
const PORT = 3000;

// Mengaktifkan CORS agar Frontend dapat mengakses API Gateway
app.use(cors());

// Membaca spesifikasi OpenAPI/Swagger dari file JSON
const swaggerDocument = JSON.parse(fs.readFileSync('./swagger.json', 'utf8'));

// Rute untuk Dokumentasi Swagger Terpusat
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Konfigurasi Proxy untuk Product Service (berjalan di port 3001)
// Catatan: Kita tidak menggunakan express.json() di Gateway agar proxy bisa meneruskan body raw dengan benar
app.use(createProxyMiddleware({ 
    pathFilter: '/api/products', // <--- Penanda rute di versi terbaru
    target: 'http://127.0.0.1:3001', 
    changeOrigin: true,
    pathRewrite: {
        '^/api/products': '/products' // Tulis ulang URL ke backend
    }
}));

// Konfigurasi Proxy untuk Order Service (berjalan di port 3002)
app.use(createProxyMiddleware({ 
    pathFilter: '/api/orders', // <--- Penanda rute di versi terbaru
    target: 'http://127.0.0.1:3002', 
    changeOrigin: true,
    pathRewrite: {
        '^/api/orders': '/orders' // Tulis ulang URL ke backend
    }
}));

app.get('/', (req, res) => {
    res.json({ message: "API Gateway Aktif. Kunjungi /api-docs untuk dokumentasi." });
});

// Menjalankan server API Gateway
app.listen(PORT, () => {
    console.log(`[API Gateway] Berjalan di http://127.0.0.1:${PORT}`);
    console.log(`[Swagger UI] Dokumentasi tersedia di http://127.0.0.1:${PORT}/api-docs`);
});