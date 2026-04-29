// Mengimpor library yang dibutuhkan
require('dotenv').config();
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
    target: process.env.USER_SERVICE_URL, 
    changeOrigin: true 
}));

// Konfigurasi Proxy untuk Product Service (berjalan di port 3001)
app.use(createProxyMiddleware({ 
    pathFilter: '/api/products', 
    target: process.env.PRODUCT_SERVICE_URL, 
    changeOrigin: true,
    pathRewrite: { '^/api/products': '/products' },
    onProxyReq: onProxyReqInjectHeaders
}));

// Konfigurasi Proxy untuk Order Service (berjalan di port 3002)
app.use(createProxyMiddleware({ 
    pathFilter: '/api/orders', 
    target: process.env.ORDER_SERVICE_URL, 
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