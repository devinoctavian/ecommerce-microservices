const mongoose = require('mongoose');

// Definisi skema (schema) untuk Koleksi Pesanan di MongoDB
const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    status: { type: String, default: 'Success' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);