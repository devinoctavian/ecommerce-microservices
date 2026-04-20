// URL API Gateway sebagai satu-satunya titik masuk (Single Entry Point)
const API_URL = 'http://127.0.0.1:3000/api';
const AUTH_URL = 'http://127.0.0.1:3000/auth';

// Fungsi Pembantu: Mengambil token untuk Headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('jwt_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

async function handleResponse(response) {
    // Tangani token kadaluarsa atau akses ditolak
    if (response.status === 401 || response.status === 403) {
        alert('Sesi habis atau akses ditolak. Silakan login ulang.');
        localStorage.clear();
        location.reload();
        return null;
    }
    
    // Tangani error sistem atau validasi
    if (!response.ok) {
        let errorMsg = 'Terjadi kesalahan pada server';
        try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
        } catch(e) {}
        throw new Error(errorMsg);
    }
    
    return await response.json();
}

// Handle Login
// Handle form login (Super Debugger Version)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    console.log("--- PROSES LOGIN DIMULAI ---");
    console.log("1. Mencoba menghubungi API Gateway:", `${AUTH_URL}/login`);

    try {
        const response = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        console.log("2. Gateway merespons dengan HTTP Status:", response.status);

        // Ambil data sebagai teks mentah dulu agar ketahuan jika errornya berupa HTML (bukan JSON)
        const textData = await response.text(); 
        console.log("3. Isi balasan mentah dari server:", textData);

        // Coba ubah teks menjadi JSON
        let resultData;
        try {
            resultData = JSON.parse(textData);
        } catch (err) {
            throw new Error(`Server tidak membalas dengan JSON. Balasan server: ${textData.substring(0, 50)}...`);
        }

        // Jika statusnya bukan 200 (OK)
        if (!response.ok) {
            throw new Error(resultData.error || 'Server menolak login');
        }

        console.log("4. LOGIN SUKSES! Menyimpan Token...");
        localStorage.setItem('jwt_token', resultData.token);
        localStorage.setItem('user_role', resultData.role);
        
        checkAuthAndRender();
    } catch (error) {
        console.error("!!! DETEKSI ERROR LENGKAP !!!", error);
        alert(`INFO ERROR: ${error.message}\n(Cek Console F12 untuk detailnya)`);
    }
});

// Cek UI berdasarkan Role
function checkAuthAndRender() {
    const token = localStorage.getItem('jwt_token');
    const role = localStorage.getItem('user_role');

    if (token) {
        // Sembunyikan form login, tampilkan dashboard
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'flex';

        // --- BARU: Tampilkan tulisan Role (Admin / Customer) ---
        const displayRoleElement = document.getElementById('displayRole');
        if (displayRoleElement) {
            displayRoleElement.innerText = role;
        }
        
        // Sembunyikan form 'Tambah Produk' jika bukan Admin
        const addProductForm = document.getElementById('addProductForm');
        if (role !== 'admin') {
            addProductForm.style.display = 'none';
        } else {
            addProductForm.style.display = 'block';
        }

        fetchProducts();
        fetchOrders();
    } else {
        // KONDISI: PENGGUNA SUDAH LOGOUT / TIDAK ADA TOKEN
        // Pastikan Login muncul dan Dashboard hilang
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        
        // Bersihkan input login agar kosong kembali
        document.getElementById('loginForm').reset();
    }
}

function logout() {
    console.log("Proses logout dimulai...");
    // Hapus semua data sesi
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    
    // Paksa halaman kembali ke kondisi awal (Login Page)
    window.location.href = 'index.html'; 
    // Atau jika masih di file yang sama:
    location.reload(); 
}

// 1. Fungsi HANYA untuk mengambil (GET) dan menampilkan daftar produk
async function fetchProducts() {
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const products = await handleResponse(response);
        if (!products) return; // Berhenti jika handleResponse mengembalikan null (sesi habis)        
        
        const tbody = document.querySelector('#productsTable tbody');
        const userRole = localStorage.getItem('user_role');
        tbody.innerHTML = ''; // Kosongkan tabel sebelum diisi
        
        products.forEach(product => {
            const tr = document.createElement('tr');
            const deleteBtnHtml = userRole === 'admin'
            ? `<button onclick="deleteProduct('${product._id}')" style="background-color: #dc3545; margin-left: 5px;">Hapus</button>` 
                : '';

            tr.innerHTML = `
                <td>${product.name}</td>
                <td>Rp ${product.price.toLocaleString()}</td>
                <td>${product.stock}</td>
                <td>
                    <button onclick="buyProduct('${product._id}')" ${product.stock === 0 ? 'disabled style="background:gray;"' : ''}>
                        Beli (1)
                    </button>
                    ${deleteBtnHtml}
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
        const response = await fetch(`${API_URL}/orders`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        
        const orders = await handleResponse(response);
        if (!orders) return;    
        
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
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, price, stock })
        });
        
        const result = await handleResponse(response);
        if (result) {
            alert('Produk berhasil ditambahkan!');
            e.target.reset(); 
            fetchProducts();  
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
            headers: getAuthHeaders(),
            body: JSON.stringify({ productId: productId, quantity: 1 }) // Hardcode beli 1
        });
        
        const result = await handleResponse(response);
        if (result) {
            alert('Pembelian Berhasil!');
            fetchProducts();
            fetchOrders();
        }
    } catch (error) {
        console.error('Error saat membeli:', error);
    }
}

// Fungsi untuk menghapus produk (DELETE)
async function deleteProduct(productId) {
    // Tambahkan konfirmasi agar tidak tidak sengaja terhapus
    const confirmDelete = confirm('Apakah Anda yakin ingin menghapus produk ini?');
    
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await handleResponse(response);
        if (result) {
            alert('Produk berhasil dihapus!');
            fetchProducts(); 
        }
    } catch (error) {
        console.error('Error saat menghapus:', error);
        alert('Terjadi kesalahan jaringan saat menghapus produk.');
    }
}

// 5. Inisialisasi awal saat halaman pertama kali dimuat
window.onload = () => {
    checkAuthAndRender();
};

// Fungsi untuk membatalkan pesanan
async function cancelOrder(orderId) {
    const confirmCancel = confirm('Apakah Anda yakin ingin membatalkan pesanan ini? Stok barang akan otomatis dikembalikan.');
    
    if (!confirmCancel) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        const result = await handleResponse(response);
        if (result) {
            alert('Pesanan berhasil dibatalkan!');
            fetchProducts(); 
            fetchOrders();   
        }
    } catch (error) {
        console.error('Error saat membatalkan:', error);
        alert('Terjadi kesalahan jaringan.');
    }
}