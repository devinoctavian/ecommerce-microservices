require('dotenv').config();
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
    // Lewati pengecekan untuk endpoint login/register, halaman swagger, dan root
    if (
        req.path.startsWith('/auth/') || 
        req.path.startsWith('/api-docs') || 
        req.path === '/'
    ) {
        return next();
    }

    // Pengecekan Token untuk rute lainnya (Products & Orders)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) return res.status(401).json({ error: 'Akses ditolak: Token tidak ada' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Akses ditolak: Token tidak valid/kadaluarsa' });
        
        // Simpan data hasil decode ke object request
        req.user = decoded; 
        next();
    });
};

module.exports = verifyToken;