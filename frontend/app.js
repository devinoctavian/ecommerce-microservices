// URL API Gateway (Single Entry Point)
const API_URL = 'http://127.0.0.1:3000/api';
const AUTH_URL = 'http://127.0.0.1:3000/auth';

// Mengambil token untuk Headers
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

        
        const textData = await response.text(); 
        console.log("3. Isi balasan mentah dari server:", textData);

        
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

        // Tampilkan tulisan Role (Admin / Customer) 
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

// Fungsi HANYA untuk mengambil (GET) dan menampilkan daftar produk
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
            
            let actionHtml = '';
            
            if (userRole === 'admin') {
                // Jika Admin: Munculkan tombol Edit dan Hapus, Beli dihilangkan
                actionHtml = `
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editProduct('${product._id}', '${product.name}', ${product.price}, ${product.stock})">Edit</button>
                        <button class="btn-delete" onclick="deleteProduct('${product._id}')">Hapus</button>
                    </div>
                `;
            } else {
                // Jika Customer: Munculkan tombol Beli saja, dengan logika disable jika stok 0
                actionHtml = `
                    <div class="action-buttons">
                        <button class="btn-buy" onclick="buyProduct('${product._id}')" ${product.stock === 0 ? 'disabled style="background:gray; cursor:not-allowed;"' : ''}>
                            Beli (1)
                        </button>
                    </div>
                `;
            }

            tr.innerHTML = `
                <td>${product.name}</td>
                <td>Rp ${product.price.toLocaleString()}</td>
                <td>${product.stock}</td>
                <td>${actionHtml}</td> 
            `;
            
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Gagal mengambil produk:', error);
    }
}

// Fungsi untuk mengambil (GET) dan menampilkan riwayat pesanan
async function fetchOrders() {
    try {
        const token = localStorage.getItem('jwt_token');
        const response = await fetch(`${API_URL}/orders`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const responseData = await handleResponse(response);
        if (!responseData) return;    

        console.log("ISI PAKET DARI BACKEND:", responseData);

        const ordersArray = Array.isArray(responseData) ? responseData : responseData.data;
        
        const tbody = document.querySelector('#ordersTable tbody') || document.querySelectorAll('table')[1].querySelector('tbody');        
        tbody.innerHTML = '';

        // Jika riwayat pesanan kosong
        if (!ordersArray || ordersArray.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada pesanan.</td></tr>';
            return;
        }
        
        ordersArray.forEach(order => {
            const tr = document.createElement('tr');
            const shortId = order._id.substring(order._id.length - 8);

            const displayProduct = order.productName || order.productId || 'Produk Tidak Diketahui';
            const displayStatus = order.status || 'Berhasil';

            tr.innerHTML = `
                <td><small>${shortId}</small></td>
                <td>${displayProduct}</td>
                <td>${order.quantity}</td>
                <td>Rp ${(order.totalPrice || 0).toLocaleString()}</td>
                <td><span style="color: green; font-weight: bold;">${displayStatus}</span></td>
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

// Fungsi terpisah untuk membuat produk baru (POST) saat Form di-submit
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Ambil nilai dari input HTML
    const name = document.getElementById('pName').value;
    const price = parseInt(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value);

    try {
        const token = localStorage.getItem('jwt_token');

        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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

// Fungsi untuk mensimulasikan pembelian produk (POST Order)
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

// Fitur EDIT PRODUK (Hanya Admin)
async function editProduct(id, currentName, currentPrice, currentStock) {
    // Meminta input baru dari admin, dengan nilai lama sebagai default
    const newName = prompt("Edit Nama Produk:", currentName);
    if (newName === null) return; // Batal ditekan
    
    const newPrice = prompt("Edit Harga Produk:", currentPrice);
    if (newPrice === null) return;

    const newStock = prompt("Edit Stok Produk:", currentStock);
    if (newStock === null) return;

    const token = localStorage.getItem('jwt_token');

    try {
        const response = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT', // Menggunakan metode PUT untuk update
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Wajib bawa token admin!
            },
            body: JSON.stringify({ 
                name: newName, 
                price: parseInt(newPrice), 
                stock: parseInt(newStock) 
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Gagal mengupdate produk');
        }

        alert('Produk berhasil diupdate!');
        fetchProducts(); // Refresh tabel agar data baru langsung muncul
    } catch (error) {
        alert('Error: ' + error.message);
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

// Inisialisasi awal saat halaman pertama kali dimuat
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