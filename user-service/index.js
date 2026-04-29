require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const User = require('./models/User');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('[User Service] Terhubung ke MongoDB (user_db)'))
    .catch(err => console.error(err));

// REGISTER
app.post('/auth/register', async (req, res) => {
    console.log("1. Request masuk ke rute Register");
    console.log("Data yang diterima:", req.body); // Mengecek apakah data JSON sampai
    
    try {
        const { name, email, password, role } = req.body;
        const user = new User({ name, email, password, role });
        
        console.log("2. Sedang mencoba menyimpan ke MongoDB...");
        await user.save();
        
        console.log("3. Berhasil disimpan ke database!");
        res.status(201).json({ message: 'Registrasi berhasil' });
    } catch (error) {
        console.error("4. Terjadi Error:", error.message);
        res.status(400).json({ error: 'Email sudah digunakan atau data tidak valid' });
    }
});

// LOGIN
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

        // Verifikasi Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Password salah' });

        // Buat Token JWT yang berisi ID dan Role
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({ message: 'Login berhasil', token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Gagal login' });
    }
});

// VALIDATE (Pengecekan Internal)
app.get('/auth/validate', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ valid: false });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ valid: false });
        res.status(200).json({ valid: true, user: decoded });
    });
});

app.listen(PORT, () => console.log(`[User Service] Berjalan di port ${PORT}`));