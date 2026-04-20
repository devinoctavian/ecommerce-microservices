// Mengimpor library yang dibutuhkan
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const fs = require('fs');
const verifyToken = require('./middlewares/authMiddleware');

// Inisialisasi aplikasi Express
const app = express();
const PORT = 3000;

// Mengaktifkan CORS agar Frontend dapat mengakses API Gateway
app.use(cors());

// Gunakan Middleware Auth secara global (kecuali untuk rute yang di-bypass di dalam middleware)
app.use(verifyToken);

// Membaca spesifikasi OpenAPI/Swagger dari file JSON
const swaggerDocument = JSON.parse(fs.readFileSync('./swagger.json', 'utf8'));

// Rute untuk Dokumentasi Swagger Terpusat
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

const onProxyReqInjectHeaders = (proxyReq, req, res) => {
    if (req.user) {
        // Suntikkan header agar Microservice tahu siapa pelakunya
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-role', req.user.role);
    }
};

// Proxy User Service
app.use(createProxyMiddleware({ 
    pathFilter: '/auth', 
    target: 'http://127.0.0.1:3003', 
    changeOrigin: true 
}));

// Konfigurasi Proxy untuk Product Service (berjalan di port 3001)
// Catatan: Kita tidak menggunakan express.json() di Gateway agar proxy bisa meneruskan body raw dengan benar
app.use(createProxyMiddleware({ 
    pathFilter: '/api/products', // <--- Penanda rute di versi terbaru
    target: 'http://127.0.0.1:3001', 
    changeOrigin: true,
    pathRewrite: { '^/api/products': '/products' },
    onProxyReq: onProxyReqInjectHeaders
}));

// Konfigurasi Proxy untuk Order Service (berjalan di port 3002)
app.use(createProxyMiddleware({ 
    pathFilter: '/api/orders', // <--- Penanda rute di versi terbaru
    target: 'http://127.0.0.1:3002', 
    changeOrigin: true,
    pathRewrite: { '^/api/orders': '/orders' },
    onProxyReq: onProxyReqInjectHeaders
}));

app.get('/', (req, res) => {
    res.json({ message: "API Gateway Aktif. Kunjungi /api-docs untuk dokumentasi." });
});

// Menjalankan server API Gateway
app.listen(PORT, () => {
    console.log(`[API Gateway] Berjalan di http://127.0.0.1:${PORT}`);
    console.log(`[Swagger UI] Dokumentasi tersedia di http://127.0.0.1:${PORT}/api-docs`);
});