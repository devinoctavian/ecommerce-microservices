const mongoose = require('mongoose');

// Definisi schema untuk Koleksi Produk di MongoDB
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);