// URL API Gateway sebagai satu-satunya titik masuk (Single Entry Point)
const API_URL = '[http://127.0.0.1:3000/api](http://127.0.0.1:3000/api)';

// Fungsi untuk mengambil dan menampilkan daftar produk
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        
        const tbody = document.querySelector('#productsTable tbody');
        tbody.innerHTML = ''; // Kosongkan tabel sebelum diisi
        
        products.forEach(product => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${product.name}</td>
                <td>Rp ${product.price.toLocaleString()}</td>
                <td>${product.stock}</td>
                <td>
                    <button onclick="buyProduct('${product._id}')" ${product.stock === 0 ? 'disabled style="background:gray;"' : ''}>
                        Beli (1)
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Gagal mengambil produk:', error);
    }
}

// Fungsi untuk mengambil dan menampilkan riwayat pesanan
async function fetchOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`);
        const orders = await response.json();
        
        const tbody = document.querySelector('#ordersTable tbody');
        tbody.innerHTML = '';
        
        orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><small>${order._id}</small></td>
                <td>${order.productName}</td>
                <td>${order.quantity}</td>
                <td>Rp ${order.totalPrice.toLocaleString()}</td>
                <td>${order.status}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Gagal mengambil pesanan:', error);
    }
}

// Fungsi untuk membuat produk baru (Form Submit)
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('pName').value;
    const price = parseInt(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value);

    try {
        await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, stock })
        });
        
        // Reset form dan segarkan data
        e.target.reset();
        fetchProducts();
        alert('Produk berhasil ditambahkan!');
    } catch (error) {
        alert('Gagal menambahkan produk');
    }
});

// Fungsi untuk mensimulasikan pembelian produk (Membuat Order)
async function buyProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: productId, quantity: 1 }) // Hardcode beli 1 untuk demo
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Pembelian Berhasil!');
            // Refresh kedua tabel (stok berkurang, riwayat bertambah)
            fetchProducts();
            fetchOrders();
        } else {
            alert(`Gagal: ${result.error}`);
        }
    } catch (error) {
        console.error('Error saat membeli:', error);
    }
}

// Inisialisasi awal saat halaman dimuat
window.onload = () => {
    fetchProducts();
    fetchOrders();
};