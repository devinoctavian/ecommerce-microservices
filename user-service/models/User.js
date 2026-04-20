const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'customer'], default: 'customer' }
}, { timestamps: true });

// Mongoose Middleware: Otomatis Hash Password sebelum di-save ke MongoDB
userSchema.pre('save', async function() {
    // Jika password tidak diubah, lanjutkan
    if (!this.isModified('password')) return;
    
    // Hash password dengan bcrypt
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

module.exports = mongoose.model('User', userSchema);