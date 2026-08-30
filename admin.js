// --- STATE ---
let dbData = null;
let orders = [];

// --- ELEMENTS ---
const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li');
const adminPanels = document.querySelectorAll('.admin-panel');
const panelTitle = document.getElementById('panel-title');
const pendingOrdersBadge = document.getElementById('pending-orders-badge');

// Stats Elements
const statProductsCount = document.getElementById('stat-products-count');
const statCombosCount = document.getElementById('stat-combos-count');
const statOrdersCount = document.getElementById('stat-orders-count');
const statRevenue = document.getElementById('stat-revenue');

// Tables
const recentOrdersTableBody = document.querySelector('#recent-orders-table tbody');
const productsTableBody = document.querySelector('#products-table tbody');
const combosTableBody = document.querySelector('#combos-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const galleryTableBody = document.querySelector('#gallery-table tbody');

// Config Form
const configForm = document.getElementById('config-form');

// Modals & Forms
const productModal = document.getElementById('product-modal');
const productModalClose = document.getElementById('product-modal-close');
const productModalTitle = document.getElementById('product-modal-title');
const productForm = document.getElementById('product-form');
const btnAddProduct = document.getElementById('btn-add-product');

const comboModal = document.getElementById('combo-modal');
const comboModalClose = document.getElementById('combo-modal-close');
const comboModalTitle = document.getElementById('combo-modal-title');
const comboForm = document.getElementById('combo-form');
const btnAddCombo = document.getElementById('btn-add-combo');

const orderModal = document.getElementById('order-modal');
const orderModalClose = document.getElementById('order-modal-close');
const orderDetailsContent = document.getElementById('order-details-content');
const btnCloseOrderModal = document.getElementById('btn-close-order-modal');

const galleryModal = document.getElementById('gallery-modal');
const galleryModalClose = document.getElementById('gallery-modal-close');
const galleryModalTitle = document.getElementById('gallery-modal-title');
const galleryForm = document.getElementById('gallery-form');
const btnAddGallery = document.getElementById('btn-add-gallery');

// --- INIT CMS ---
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupNavigation();
  setupEventListeners();
  setupAuthEventListeners();
});

// --- AUTHENTICATION CHECK ---
function checkAuth() {
  const isLogged = localStorage.getItem('mymoon_admin_logged') === 'true';
  const loginScreen = document.getElementById('login-screen');
  const adminWrapper = document.querySelector('.admin-wrapper');
  
  if (isLogged) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminWrapper) adminWrapper.style.display = 'flex';
    loadData();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (adminWrapper) adminWrapper.style.display = 'none';
  }
}

function setupAuthEventListeners() {
  const loginForm = document.getElementById('login-form');
  const btnLogout = document.getElementById('btn-logout');
  const loginErrorMsg = document.getElementById('login-error-msg');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username, password })
        });
        
        if (res.ok) {
          localStorage.setItem('mymoon_admin_logged', 'true');
          loginErrorMsg.style.display = 'none';
          loginForm.reset();
          checkAuth();
        } else {
          loginErrorMsg.style.display = 'block';
        }
      } catch (err) {
        console.error(err);
        alert('Lỗi kết nối máy chủ khi đăng nhập.');
      }
    });
  }
  
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Bạn có chắc muốn đăng xuất?')) {
        localStorage.removeItem('mymoon_admin_logged');
        window.location.reload();
      }
    });
  }
}

// --- NAVIGATION LOGIC ---
function setupNavigation() {
  sidebarMenuItems.forEach(item => {
    const targetId = item.getAttribute('data-target');
    if (!targetId) return; // Skip non-panel menu items (like Logout)
    
    item.addEventListener('click', () => {
      // Remove active from menus and panels
      sidebarMenuItems.forEach(i => {
        if (i.getAttribute('data-target')) i.classList.remove('active');
      });
      adminPanels.forEach(p => p.classList.remove('active'));
      
      // Active current menu
      item.classList.add('active');
      
      // Active current panel
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
      
      // Update header title
      panelTitle.textContent = item.textContent.trim();
    });
  });
}

// --- DATA FETCHING ---
async function loadData() {
  try {
    // Fetch db.json
    const dbRes = await fetch('/api/db');
    if (!dbRes.ok) throw new Error('Không thể fetch dữ liệu db.json');
    dbData = await dbRes.json();
    
    // Fetch orders.json
    const ordersRes = await fetch('/api/orders');
    if (!ordersRes.ok) throw new Error('Không thể fetch đơn hàng');
    orders = await ordersRes.json();
    
    // Render Dashboard
    renderStats();
    renderRecentOrders();
    
    // Render Configuration Form
    fillConfigForm();
    
    // Render Managers
    renderProductsTable();
    renderCombosTable();
    renderGalleryTable();
    renderOrdersTable('all');
    
    // Update Pending Orders Badge
    updatePendingBadge();
    
  } catch (error) {
    console.error('Lỗi loadData Admin CMS:', error);
  }
}

// --- RENDER STATISTICS ---
function renderStats() {
  if (dbData) {
    if (statProductsCount) statProductsCount.textContent = dbData.products.length;
    if (statCombosCount) statCombosCount.textContent = dbData.combos.length;
  }
  
  if (orders) {
    if (statOrdersCount) statOrdersCount.textContent = orders.length;
    
    // Estimated Revenue (Only count Processing/Confirmed/Shipped status orders, ignore Cancelled)
    const successOrders = orders.filter(o => o.status !== 'Đã hủy');
    const revenue = successOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    if (statRevenue) statRevenue.textContent = formatPrice(revenue);
  }
}

function updatePendingBadge() {
  const pendingCount = orders.filter(o => o.status === 'Đang xử lý').length;
  if (pendingCount > 0) {
    pendingOrdersBadge.textContent = pendingCount;
    pendingOrdersBadge.style.display = 'inline-block';
  } else {
    pendingOrdersBadge.style.display = 'none';
  }
}

// --- RENDER TABLES ---
function renderRecentOrders() {
  if (!recentOrdersTableBody) return;
  recentOrdersTableBody.innerHTML = '';
  
  // Show last 5 orders
  const recentList = orders.slice(0, 5);
  
  if (recentList.length === 0) {
    recentOrdersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Chưa có đơn hàng nào nhận được.</td></tr>';
    return;
  }
  
  recentList.forEach(order => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${order.id}</strong></td>
      <td>${order.fullname}</td>
      <td>${order.phone}</td>
      <td><span style="font-weight:700; color:var(--primary-color);">${formatPrice(order.total)}</span></td>
      <td><span class="status-badge ${getStatusBadgeClass(order.status)}">${order.status}</span></td>
      <td>
        <button class="btn-action btn-view" onclick="viewOrderDetails('${order.id}')" title="Xem chi tiết">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    `;
    recentOrdersTableBody.appendChild(tr);
  });
}

function renderProductsTable() {
  if (!productsTableBody || !dbData) return;
  productsTableBody.innerHTML = '';
  
  const products = dbData.products;
  if (products.length === 0) {
    productsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Danh sách sản phẩm trống.</td></tr>';
    return;
  }
  
  products.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${p.image}" class="table-img" alt="${p.name}"></td>
      <td><strong>${p.name}</strong></td>
      <td>${getCategoryName(p.category)}</td>
      <td><span class="status-badge status-confirmed" style="background-color:rgba(223, 183, 108, 0.15); color:var(--accent-gold-dark);">${p.tag || 'Không'}</span></td>
      <td><span style="font-weight:700; color:var(--primary-color);">${formatPrice(p.price)}</span></td>
      <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.description}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-edit" onclick="editProduct('${p.id}')" title="Chỉnh sửa"><i class="fa-solid fa-pencil"></i></button>
          <button class="btn-action btn-delete" onclick="deleteProduct('${p.id}')" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });
}

function renderCombosTable() {
  if (!combosTableBody || !dbData) return;
  combosTableBody.innerHTML = '';
  
  const combos = dbData.combos;
  if (combos.length === 0) {
    combosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Danh sách hộp quà trống.</td></tr>';
    return;
  }
  
  combos.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><img src="${c.image}" class="table-img" alt="${c.name}"></td>
      <td><strong>${c.name}</strong></td>
      <td><span class="status-badge status-pending" style="background-color:rgba(92, 6, 18, 0.05); color:var(--primary-color);">${c.tag || 'Không'}</span></td>
      <td><span style="font-weight:700; color:var(--primary-color);">${formatPrice(c.price)}</span></td>
      <td style="max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.description}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-edit" onclick="editCombo('${c.id}')" title="Chỉnh sửa"><i class="fa-solid fa-pencil"></i></button>
          <button class="btn-action btn-delete" onclick="deleteCombo('${c.id}')" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    `;
    combosTableBody.appendChild(tr);
  });
}

function renderOrdersTable(statusFilter = 'all') {
  if (!ordersTableBody) return;
  ordersTableBody.innerHTML = '';
  
  let filteredOrders = orders;
  if (statusFilter !== 'all') {
    filteredOrders = orders.filter(o => o.status === statusFilter);
  }
  
  if (filteredOrders.length === 0) {
    ordersTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Không tìm thấy đơn hàng nào ở trạng thái này.</td></tr>`;
    return;
  }
  
  filteredOrders.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${o.id}</strong></td>
      <td>${formatDate(o.createdAt)}</td>
      <td>${o.fullname}</td>
      <td>${o.phone}</td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${o.address}">${o.address}</td>
      <td><span class="status-badge" style="background-color:#edf2f7; color:#4a5568;">${o.paymentMethod || 'COD'}</span></td>
      <td><span style="font-weight:700; color:var(--primary-color);">${formatPrice(o.total)}</span></td>
      <td><span class="status-badge ${getStatusBadgeClass(o.status)}">${o.status}</span></td>
      <td>
        <button class="btn-action btn-view" onclick="viewOrderDetails('${o.id}')" title="Xem chi tiết">
          <i class="fa-solid fa-eye"></i>
        </button>
      </td>
    `;
    ordersTableBody.appendChild(tr);
  });
}

function renderGalleryTable() {
  if (!galleryTableBody || !dbData) return;
  galleryTableBody.innerHTML = '';
  
  const gallery = dbData.gallery || [];
  if (gallery.length === 0) {
    galleryTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Thư viện trống.</td></tr>';
    return;
  }
  
  gallery.forEach(item => {
    const tr = document.createElement('tr');
    let previewHtml = '';
    if (item.type === 'video') {
      previewHtml = `<img src="${item.thumbnail || ''}" class="table-img" alt="video thumbnail">`;
    } else {
      previewHtml = `<img src="${item.url}" class="table-img" alt="${item.caption}">`;
    }
    
    tr.innerHTML = `
      <td>${previewHtml}</td>
      <td><span class="status-badge" style="background-color:#e2e8f0; color:#4a5568;">${item.type === 'video' ? 'Video' : 'Hình ảnh'}</span></td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.url}">${item.url}</td>
      <td style="max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.thumbnail || ''}">${item.thumbnail || '-'}</td>
      <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.caption}">${item.caption}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-edit" onclick="editGallery('${item.id}')" title="Chỉnh sửa"><i class="fa-solid fa-pencil"></i></button>
          <button class="btn-action btn-delete" onclick="deleteGallery('${item.id}')" title="Xóa"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    `;
    galleryTableBody.appendChild(tr);
  });
}

// --- CONFIGURATION FORM LOGIC ---
function fillConfigForm() {
  if (!dbData || !dbData.brand) return;
  const brand = dbData.brand;
  
  document.getElementById('cfg-name').value = brand.name || '';
  document.getElementById('cfg-tagline').value = brand.tagline || '';
  document.getElementById('cfg-hotline').value = brand.hotline || '';
  document.getElementById('cfg-email').value = brand.email || '';
  document.getElementById('cfg-address').value = brand.address || '';
  document.getElementById('cfg-zalo').value = brand.zaloUrl || '';
  document.getElementById('cfg-messenger').value = brand.messengerUrl || '';

  // Preview brand logo if configured
  if (brand.logoUrl) {
    const timestamp = Date.now();
    const previewImg = document.getElementById('cfg-logo-preview');
    const sidebarLogo = document.getElementById('admin-sidebar-logo');
    const loginLogo = document.getElementById('admin-login-logo');
    if (previewImg) {
      previewImg.src = brand.logoUrl + '?t=' + timestamp;
      previewImg.style.display = 'block';
    }
    if (sidebarLogo) sidebarLogo.src = brand.logoUrl + '?t=' + timestamp;
    if (loginLogo) loginLogo.src = brand.logoUrl + '?t=' + timestamp;
  }
}

async function saveConfiguration(e) {
  e.preventDefault();
  
  const name = document.getElementById('cfg-name').value;
  const tagline = document.getElementById('cfg-tagline').value;
  const hotline = document.getElementById('cfg-hotline').value;
  const email = document.getElementById('cfg-email').value;
  const address = document.getElementById('cfg-address').value;
  const zaloUrl = document.getElementById('cfg-zalo').value;
  const messengerUrl = document.getElementById('cfg-messenger').value;
  const logoFileInput = document.getElementById('cfg-logo-file');

  dbData.brand.name = name;
  dbData.brand.tagline = tagline;
  dbData.brand.hotline = hotline;
  dbData.brand.email = email;
  dbData.brand.address = address;
  dbData.brand.zaloUrl = zaloUrl;
  dbData.brand.messengerUrl = messengerUrl;

  // Handle Logo Upload first if file is selected
  if (logoFileInput && logoFileInput.files && logoFileInput.files[0]) {
    const file = logoFileInput.files[0];
    const reader = new FileReader();
    
    // Create a promise to handle file reading asynchronously
    const readAndUpload = new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result;
          const uploadRes = await fetch('/api/upload-logo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64Data })
          });
          
          if (!uploadRes.ok) throw new Error('Không thể tải ảnh lên server');
          
          const result = await uploadRes.json();
          dbData.brand.logoUrl = result.logoUrl;
          resolve(true);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Lỗi đọc file ảnh'));
      reader.readAsDataURL(file);
    });

    try {
      await readAndUpload;
    } catch (err) {
      console.error(err);
      alert('Lỗi tải hình ảnh logo: ' + err.message);
      return;
    }
  }

  const success = await saveDatabase();
  if (success) {
    alert('Lưu cấu hình thương hiệu thành công!');
    if (logoFileInput) logoFileInput.value = '';
    loadData();
  }
}

// --- CRUD PRODUCTS ---
window.editProduct = function(id) {
  const p = dbData.products.find(item => item.id === id);
  if (!p) return;
  
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-category').value = p.category;
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-image').value = p.image;
  document.getElementById('prod-tag').value = p.tag || '';
  document.getElementById('prod-description').value = p.description;
  
  // Reset file input & setup preview
  const fileInput = document.getElementById('prod-image-file');
  if (fileInput) fileInput.value = '';
  const previewImg = document.getElementById('prod-img-preview');
  if (previewImg) {
    previewImg.src = p.image;
    previewImg.style.display = 'block';
  }
  
  productModalTitle.textContent = 'Sửa Bánh Trung Thu';
  productModal.classList.add('open');
};

window.deleteProduct = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa loại bánh này khỏi danh sách?')) return;
  
  dbData.products = dbData.products.filter(p => p.id !== id);
  const success = await saveDatabase();
  if (success) {
    alert('Đã xóa sản phẩm thành công!');
    loadData();
  }
};

async function submitProductForm(e) {
  e.preventDefault();
  
  const id = document.getElementById('prod-id').value;
  const name = document.getElementById('prod-name').value;
  const category = document.getElementById('prod-category').value;
  const price = parseInt(document.getElementById('prod-price').value, 10);
  let image = document.getElementById('prod-image').value;
  const tag = document.getElementById('prod-tag').value;
  const description = document.getElementById('prod-description').value;
  
  // Upload image file if selected
  const fileInput = document.getElementById('prod-image-file');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      image = await uploadImageFile(fileInput.files[0]);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải ảnh sản phẩm lên server: ' + err.message);
      return;
    }
  }
  
  const productData = { id, name, category, price, image, tag, description };
  
  if (id) {
    // Edit flow
    const index = dbData.products.findIndex(p => p.id === id);
    if (index > -1) {
      dbData.products[index] = productData;
    }
  } else {
    // Add flow
    productData.id = 'p-' + Date.now();
    dbData.products.push(productData);
  }
  
  const success = await saveDatabase();
  if (success) {
    alert('Đã lưu thông tin sản phẩm thành công!');
    productModal.classList.remove('open');
    productForm.reset();
    loadData();
  }
}

// --- CRUD COMBOS ---
window.editCombo = function(id) {
  const c = dbData.combos.find(item => item.id === id);
  if (!c) return;
  
  document.getElementById('comb-id').value = c.id;
  document.getElementById('comb-name').value = c.name;
  document.getElementById('comb-price').value = c.price;
  document.getElementById('comb-image').value = c.image;
  document.getElementById('comb-tag').value = c.tag || '';
  document.getElementById('comb-description').value = c.description;
  
  // Reset file input & setup preview
  const fileInput = document.getElementById('comb-image-file');
  if (fileInput) fileInput.value = '';
  const previewImg = document.getElementById('comb-img-preview');
  if (previewImg) {
    previewImg.src = c.image;
    previewImg.style.display = 'block';
  }
  
  comboModalTitle.textContent = 'Sửa Hộp Quà Cao Cấp';
  comboModal.classList.add('open');
};

window.deleteCombo = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa hộp quà này khỏi danh sách?')) return;
  
  dbData.combos = dbData.combos.filter(c => c.id !== id);
  const success = await saveDatabase();
  if (success) {
    alert('Đã xóa hộp quà thành công!');
    loadData();
  }
};

async function submitComboForm(e) {
  e.preventDefault();
  
  const id = document.getElementById('comb-id').value;
  const name = document.getElementById('comb-name').value;
  const price = parseInt(document.getElementById('comb-price').value, 10);
  let image = document.getElementById('comb-image').value;
  const tag = document.getElementById('comb-tag').value;
  const description = document.getElementById('comb-description').value;
  
  // Upload image file if selected
  const fileInput = document.getElementById('comb-image-file');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      image = await uploadImageFile(fileInput.files[0]);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải ảnh hộp quà lên server: ' + err.message);
      return;
    }
  }
  
  const comboData = { id, name, price, image, tag, description };
  
  if (id) {
    // Edit flow
    const index = dbData.combos.findIndex(c => c.id === id);
    if (index > -1) {
      dbData.combos[index] = comboData;
    }
  } else {
    // Add flow
    comboData.id = 'c-' + Date.now();
    dbData.combos.push(comboData);
  }
  
  const success = await saveDatabase();
  if (success) {
    alert('Đã lưu thông tin hộp quà thành công!');
    comboModal.classList.remove('open');
    comboForm.reset();
    loadData();
  }
}

// --- CRUD GALLERY ---
window.editGallery = function(id) {
  const item = dbData.gallery.find(g => g.id === id);
  if (!item) return;
  
  document.getElementById('gal-id').value = item.id;
  document.getElementById('gal-type').value = item.type;
  document.getElementById('gal-url').value = item.url;
  document.getElementById('gal-thumbnail').value = item.thumbnail || '';
  document.getElementById('gal-caption').value = item.caption;
  
  // Reset file inputs & setup previews
  const fileInput = document.getElementById('gal-image-file');
  if (fileInput) fileInput.value = '';
  const thumbFileInput = document.getElementById('gal-thumbnail-file');
  if (thumbFileInput) thumbFileInput.value = '';
  
  const previewImg = document.getElementById('gal-img-preview');
  if (previewImg) {
    if (item.type === 'image') {
      previewImg.src = item.url;
      previewImg.style.display = 'block';
    } else {
      previewImg.style.display = 'none';
    }
  }
  
  const thumbPreviewImg = document.getElementById('gal-thumb-preview');
  if (thumbPreviewImg) {
    if (item.type === 'video' && item.thumbnail) {
      thumbPreviewImg.src = item.thumbnail;
      thumbPreviewImg.style.display = 'block';
    } else {
      thumbPreviewImg.style.display = 'none';
    }
  }
  
  const thumbnailGroup = document.getElementById('gal-thumbnail-group');
  if (item.type === 'video') {
    thumbnailGroup.style.display = 'block';
    document.getElementById('gal-thumbnail').required = true;
  } else {
    thumbnailGroup.style.display = 'none';
    document.getElementById('gal-thumbnail').required = false;
  }
  
  galleryModalTitle.textContent = 'Sửa Thư Viện';
  galleryModal.classList.add('open');
};

window.deleteGallery = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa mục này khỏi thư viện?')) return;
  
  dbData.gallery = dbData.gallery.filter(item => item.id !== id);
  const success = await saveDatabase();
  if (success) {
    alert('Đã xóa thành công!');
    loadData();
  }
};

async function submitGalleryForm(e) {
  e.preventDefault();
  
  const id = document.getElementById('gal-id').value;
  const type = document.getElementById('gal-type').value;
  let url = document.getElementById('gal-url').value;
  let thumbnail = document.getElementById('gal-thumbnail').value;
  const caption = document.getElementById('gal-caption').value;
  
  // Upload image file if selected
  const fileInput = document.getElementById('gal-image-file');
  if (fileInput && fileInput.files && fileInput.files[0] && type === 'image') {
    try {
      url = await uploadImageFile(fileInput.files[0]);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải hình ảnh thư viện lên server: ' + err.message);
      return;
    }
  }
  
  // Upload video thumbnail if selected
  const thumbFileInput = document.getElementById('gal-thumbnail-file');
  if (thumbFileInput && thumbFileInput.files && thumbFileInput.files[0] && type === 'video') {
    try {
      thumbnail = await uploadImageFile(thumbFileInput.files[0]);
    } catch (err) {
      console.error(err);
      alert('Lỗi tải ảnh đại diện video lên server: ' + err.message);
      return;
    }
  }
  
  const galleryData = { id, type, url, caption };
  if (type === 'video') {
    galleryData.thumbnail = thumbnail;
  }
  
  if (id) {
    const index = dbData.gallery.findIndex(g => g.id === id);
    if (index > -1) {
      dbData.gallery[index] = galleryData;
    }
  } else {
    galleryData.id = 'g-' + Date.now();
    dbData.gallery.push(galleryData);
  }
  
  const success = await saveDatabase();
  if (success) {
    alert('Đã lưu thông tin thư viện thành công!');
    galleryModal.classList.remove('open');
    galleryForm.reset();
    loadData();
  }
}

// --- ORDER PERSISTENCE & ACTIONS ---
window.viewOrderDetails = function(id) {
  const order = orders.find(o => o.id === id);
  if (!order) return;
  
  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <div class="order-item-line">
        <span>${item.name} <strong>x${item.quantity}</strong></span>
        <span>${formatPrice(item.price * item.quantity)}</span>
      </div>
    `;
  });
  
  orderDetailsContent.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Mã Đơn Hàng:</span>
      <span class="detail-value"><strong>${order.id}</strong></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Thời Gian:</span>
      <span class="detail-value">${formatDate(order.createdAt)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Khách Hàng:</span>
      <span class="detail-value">${order.fullname}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Điện Thoại:</span>
      <span class="detail-value"><a href="tel:${order.phone}">${order.phone}</a></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Địa Chỉ Nhận:</span>
      <span class="detail-value">${order.address}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Thanh Toán:</span>
      <span class="detail-value">${order.paymentMethod || 'COD'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Ghi Chú Khách:</span>
      <span class="detail-value">${order.note || 'Không có'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Trạng Thái Đơn:</span>
      <span class="detail-value">
        <span class="status-badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
      </span>
    </div>
    
    <div class="order-items-box">
      <h4 style="font-size:0.85rem; text-transform:uppercase; margin-bottom:10px; color:var(--primary-color);">Giỏ hàng đặt mua</h4>
      ${itemsHtml}
      <div class="order-item-line" style="border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 10px; font-weight:700;">
        <span>Tổng cộng:</span>
        <span style="color:var(--primary-color); font-size: 1rem;">${formatPrice(order.total)}</span>
      </div>
    </div>
    
    <div style="margin-top: 25px;">
      <h4 style="font-size:0.85rem; text-transform:uppercase; margin-bottom:10px; color:var(--primary-color);">Cập nhật trạng thái đơn hàng:</h4>
      <div style="display:flex; flex-wrap:wrap; gap:8px;">
        <button class="btn btn-filter" onclick="updateOrderStatus('${order.id}', 'Đang xử lý')">Đang xử lý</button>
        <button class="btn btn-filter" onclick="updateOrderStatus('${order.id}', 'Đã xác nhận')">Đã xác nhận</button>
        <button class="btn btn-filter" onclick="updateOrderStatus('${order.id}', 'Đã giao')">Đã giao</button>
        <button class="btn btn-filter" onclick="updateOrderStatus('${order.id}', 'Đã hủy')" style="color:#e53e3e;">Hủy đơn</button>
      </div>
    </div>
  `;
  
  orderModal.classList.add('open');
};

window.updateOrderStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!res.ok) throw new Error('Không thể cập nhật trạng thái đơn hàng');
    
    alert(`Đã chuyển trạng thái đơn hàng sang: ${newStatus}`);
    orderModal.classList.remove('open');
    loadData();
  } catch (error) {
    console.error(error);
    alert('Đã xảy ra lỗi khi cập nhật đơn hàng.');
  }
};

// --- EVENTS AND UTILS ---
function setupEventListeners() {
  // Config save
  configForm.addEventListener('submit', saveConfiguration);
  
  // Product dialog triggers
  btnAddProduct.addEventListener('click', () => {
    document.getElementById('prod-id').value = '';
    productForm.reset();
    const fileInput = document.getElementById('prod-image-file');
    if (fileInput) fileInput.value = '';
    const previewImg = document.getElementById('prod-img-preview');
    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    productModalTitle.textContent = 'Thêm Bánh Trung Thu Mới';
    productModal.classList.add('open');
  });
  productModalClose.addEventListener('click', () => productModal.classList.remove('open'));
  productForm.addEventListener('submit', submitProductForm);
  
  // Combo dialog triggers
  btnAddCombo.addEventListener('click', () => {
    document.getElementById('comb-id').value = '';
    comboForm.reset();
    const fileInput = document.getElementById('comb-image-file');
    if (fileInput) fileInput.value = '';
    const previewImg = document.getElementById('comb-img-preview');
    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    comboModalTitle.textContent = 'Thêm Hộp Quà Mới';
    comboModal.classList.add('open');
  });
  comboModalClose.addEventListener('click', () => comboModal.classList.remove('open'));
  comboForm.addEventListener('submit', submitComboForm);
  
  // Gallery dialog triggers
  const galTypeSelect = document.getElementById('gal-type');
  const galThumbnailGroup = document.getElementById('gal-thumbnail-group');
  const galThumbnailInput = document.getElementById('gal-thumbnail');
  
  galTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'video') {
      galThumbnailGroup.style.display = 'block';
      galThumbnailInput.required = true;
    } else {
      galThumbnailGroup.style.display = 'none';
      galThumbnailInput.required = false;
      galThumbnailInput.value = '';
      const thumbPreviewImg = document.getElementById('gal-thumb-preview');
      if (thumbPreviewImg) {
        thumbPreviewImg.src = '';
        thumbPreviewImg.style.display = 'none';
      }
    }
  });
  
  btnAddGallery.addEventListener('click', () => {
    document.getElementById('gal-id').value = '';
    galleryForm.reset();
    const fileInput = document.getElementById('gal-image-file');
    if (fileInput) fileInput.value = '';
    const thumbFileInput = document.getElementById('gal-thumbnail-file');
    if (thumbFileInput) thumbFileInput.value = '';
    const previewImg = document.getElementById('gal-img-preview');
    if (previewImg) {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
    const thumbPreviewImg = document.getElementById('gal-thumb-preview');
    if (thumbPreviewImg) {
      thumbPreviewImg.src = '';
      thumbPreviewImg.style.display = 'none';
    }
    galThumbnailGroup.style.display = 'none';
    galThumbnailInput.required = false;
    galleryModalTitle.textContent = 'Thêm Thư Viện Mới';
    galleryModal.classList.add('open');
  });
  galleryModalClose.addEventListener('click', () => galleryModal.classList.remove('open'));
  galleryForm.addEventListener('submit', submitGalleryForm);
  
  // Setup automatic file upload change/preview listeners
  setupImagePreviewListener('prod-image-file', 'prod-img-preview', 'prod-image');
  setupImagePreviewListener('comb-image-file', 'comb-img-preview', 'comb-image');
  setupImagePreviewListener('gal-image-file', 'gal-img-preview', 'gal-url');
  setupImagePreviewListener('gal-thumbnail-file', 'gal-thumb-preview', 'gal-thumbnail');
  
  // Order dialog close
  orderModalClose.addEventListener('click', () => orderModal.classList.remove('open'));
  btnCloseOrderModal.addEventListener('click', () => orderModal.classList.remove('open'));
  
  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === productModal) productModal.classList.remove('open');
    if (e.target === comboModal) comboModal.classList.remove('open');
    if (e.target === orderModal) orderModal.classList.remove('open');
    if (e.target === galleryModal) galleryModal.classList.remove('open');
  });
  
  // Order filter tabs
  document.querySelectorAll('.btn-filter[data-status]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-filter[data-status]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const status = e.target.getAttribute('data-status');
      renderOrdersTable(status);
    });
  });
}

// --- SAVE DATABASE HELPER ---
async function saveDatabase() {
  try {
    const res = await fetch('/api/save-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dbData)
    });
    if (!res.ok) throw new Error('Lỗi gửi request save-db');
    return true;
  } catch (error) {
    console.error(error);
    alert('Không thể lưu thông tin vào cơ sở dữ liệu. Vui lòng kiểm tra server backend.');
    return false;
  }
}

// --- HELPERS ---
function formatPrice(number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('vi-VN');
}

function getCategoryName(cat) {
  if (cat === 'traditional') return 'Truyền Thống';
  if (cat === 'modern') return 'Hiện Đại';
  if (cat === 'lava') return 'Lava Trứng Chảy';
  return cat;
}

function getStatusBadgeClass(status) {
  if (status === 'Đang xử lý') return 'status-pending';
  if (status === 'Đã xác nhận') return 'status-confirmed';
  if (status === 'Đã giao') return 'status-shipped';
  if (status === 'Đã hủy') return 'status-cancelled';
  return '';
}

// --- NEW FILE UPLOAD HELPERS ---
async function uploadImageFile(file) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      try {
        const base64Data = reader.result;
        const uploadRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: base64Data, filename: file.name })
        });
        
        if (!uploadRes.ok) throw new Error('Không thể tải ảnh lên server');
        
        const result = await uploadRes.json();
        resolve(result.imageUrl);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Lỗi đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

function setupImagePreviewListener(fileInputId, previewImgId, textInputId) {
  const fileInput = document.getElementById(fileInputId);
  const previewImg = document.getElementById(previewImgId);
  const textInput = document.getElementById(textInputId);
  
  if (fileInput && previewImg) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        previewImg.src = objectUrl;
        previewImg.style.display = 'block';
        if (textInput) {
          textInput.value = `assets/images/${file.name} (Sẽ tải lên khi bấm Lưu)`;
        }
      }
    });
  }
}
