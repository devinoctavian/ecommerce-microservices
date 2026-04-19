// URL API Gateway sebagai satu-satunya titik masuk (Single Entry Point)
const API_URL = 'http://127.0.0.1:3000/api';

// 1. Fungsi HANYA untuk mengambil (GET) dan menampilkan daftar produk
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
                    <button onclick="deleteProduct('${product._id}')" style="background-color: #dc3545; margin-left: 5px;">
                        Hapus
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Gagal mengambil produk:', error);
    }
}

// 2. Fungsi untuk mengambil (GET) dan menampilkan riwayat pesanan
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
                <td><span style="color: green; font-weight: bold;">${order.status}</span></td>
                <td>
                    <button onclick="cancelOrder('${order._id}')" style="background-color: #dc3545; padding: 4px 8px; font-size: 12px;">
                        Batalkan
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Gagal mengambil pesanan:', error);
    }
}

// 3. Fungsi terpisah untuk membuat produk baru (POST) saat Form di-submit
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Ambil nilai dari input HTML
    const name = document.getElementById('pName').value;
    const price = parseInt(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value);

    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, price, stock })
        });
        
        if (response.ok) {
            alert('Produk berhasil ditambahkan!');
            e.target.reset(); // Kosongkan form input
            fetchProducts();  // Panggil ulang data untuk memperbarui tabel
        } else {
            alert('Gagal menambahkan produk: Rute tidak ditemukan atau Server mati.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Gagal menambahkan produk (Koneksi Error)');
    }
});

// 4. Fungsi untuk mensimulasikan pembelian produk (POST Order)
async function buyProduct(productId) {
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: productId, quantity: 1 }) // Hardcode beli 1
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Pembelian Berhasil!');
            // Refresh kedua tabel agar stok terlihat berkurang dan riwayat bertambah
            fetchProducts();
            fetchOrders();
        } else {
            alert(`Gagal: ${result.error}`);
        }
    } catch (error) {
        console.error('Error saat membeli:', error);
    }
}

// Fungsi untuk menghapus produk (DELETE)
async function deleteProduct(productId) {
    // Tambahkan konfirmasi agar tidak tidak sengaja terhapus
    const confirmDelete = confirm('Apakah Anda yakin ingin menghapus produk ini?');
    
    if (confirmDelete) {
        try {
            // Melakukan request DELETE ke API Gateway yang diteruskan ke Product Service
            const response = await fetch(`${API_URL}/products/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Produk berhasil dihapus!');
                // Segarkan tabel untuk melihat perubahan
                fetchProducts(); 
            } else {
                alert('Gagal menghapus produk dari database.');
            }
        } catch (error) {
            console.error('Error saat menghapus:', error);
            alert('Terjadi kesalahan jaringan saat menghapus produk.');
        }
    }
}

// 5. Inisialisasi awal saat halaman pertama kali dimuat
window.onload = () => {
    fetchProducts();
    fetchOrders();
};

// Fungsi untuk membatalkan pesanan
async function cancelOrder(orderId) {
    const confirmCancel = confirm('Apakah Anda yakin ingin membatalkan pesanan ini? Stok barang akan otomatis dikembalikan.');
    
    if (confirmCancel) {
        try {
            const response = await fetch(`${API_URL}/orders/${orderId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Pesanan berhasil dibatalkan!');
                // Wajib merefresh KEDUA tabel karena stok produk kembali bertambah
                fetchProducts(); 
                fetchOrders();   
            } else {
                alert('Gagal membatalkan pesanan.');
            }
        } catch (error) {
            console.error('Error saat membatalkan:', error);
            alert('Terjadi kesalahan jaringan.');
        }
    }
}