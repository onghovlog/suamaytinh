// --- GLOBAL VARIABLES ---
let dbData = null;
let cart = [];

// --- ELEMENTS ---
const navbar = document.getElementById('header');
const navMenu = document.getElementById('nav-menu');
const hamburger = document.getElementById('hamburger');
const productsGrid = document.getElementById('products-grid');
const combosGrid = document.getElementById('combos-grid');
const galleryGrid = document.getElementById('gallery-grid');
const testimonialsContainer = document.getElementById('testimonials-container');

// Cart Elements
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const cartCloseBtn = document.getElementById('cart-close-btn');
const cartDrawer = document.getElementById('cart-drawer');
const cartBackdrop = document.getElementById('cart-backdrop');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalPrice = document.getElementById('cart-total-price');
const cartBadgeCount = document.getElementById('cart-badge-count');
const cartCheckoutBtn = document.getElementById('cart-checkout-btn');

// Checkout Form Elements
const orderForm = document.getElementById('order-form');
const summaryItemsList = document.getElementById('summary-items-list');
const summaryTotalPrice = document.getElementById('summary-total-price');
const submitZaloBtn = document.getElementById('submit-zalo-btn');

// Popups & Lightbox
const successPopup = document.getElementById('success-popup');
const popupCloseBtn = document.getElementById('popup-close-btn');
const lightbox = document.getElementById('lightbox');
const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
const lightboxMediaContainer = document.getElementById('lightbox-media-container');
const lightboxCaption = document.getElementById('lightbox-caption');

// Floating Widgets Contact Elements
const widgetMessenger = document.getElementById('widget-messenger');
const widgetZalo = document.getElementById('widget-zalo');
const widgetHotline = document.getElementById('widget-hotline');
const brandAddress = document.getElementById('brand-address');
const brandHotline = document.getElementById('brand-hotline');
const brandEmail = document.getElementById('brand-email');

// --- INIT APP ---
document.addEventListener('DOMContentLoaded', () => {
  loadCartFromStorage();
  initHeroSlider();
  fetchDatabase();
  setupEventListeners();
});

// --- FETCH DATABASE ---
async function fetchDatabase() {
  try {
    const response = await fetch('/api/db');
    if (!response.ok) {
      throw new Error('Không thể tải cơ sở dữ liệu.');
    }
    dbData = await response.json();

    // Render components
    renderBrandInfo();
    renderProducts(dbData.products);
    renderCombos(dbData.combos);
    renderGallery(dbData.gallery);
    renderTestimonials(dbData.testimonials);
    updateCartUI();
  } catch (error) {
    console.error('Lỗi khi fetch dữ liệu:', error);
  }
}

// --- RENDER BRAND INFO ---
function renderBrandInfo() {
  if (!dbData || !dbData.brand) return;
  const brand = dbData.brand;

  // Set logo if configured
  const brandLogo = document.getElementById('brand-logo');
  const footerLogo = document.getElementById('footer-logo');
  const logoUrl = brand.logoUrl || 'assets/images/logo_sua_may_tinh.png';
  
  if (brandLogo) {
    brandLogo.src = logoUrl;
    brandLogo.style.display = 'block';
  }
  if (footerLogo) {
    footerLogo.src = logoUrl;
    footerLogo.style.display = 'block';
  }

  // Set details in elements
  if (brandAddress) brandAddress.textContent = brand.address;
  if (brandHotline) {
    brandHotline.textContent = brand.hotline;
    brandHotline.href = `tel:${brand.hotline.replace(/\./g, '')}`;
  }
  if (brandEmail) {
    brandEmail.textContent = brand.email;
    brandEmail.href = `mailto:${brand.email}`;
  }

  // Set links in widgets
  if (widgetMessenger) widgetMessenger.href = brand.messengerUrl;
  if (widgetZalo) widgetZalo.href = brand.zaloUrl;
  if (widgetHotline) widgetHotline.href = `tel:${brand.hotline.replace(/\./g, '')}`;
}

// --- PRODUCTS PAGINATION CONSTANTS & STATE ---
const PRODUCTS_PER_PAGE = 6;
let currentProductsList = [];
let currentProductPage = 1;

// --- RENDER PRODUCTS WITH PAGINATION ---
function renderProducts(productsList, resetPage = true) {
  if (!productsGrid) return;
  if (resetPage) currentProductPage = 1;
  currentProductsList = productsList || [];

  productsGrid.innerHTML = '';

  if (currentProductsList.length === 0) {
    productsGrid.innerHTML = '<p class="cart-empty-message">Không có sản phẩm nào thuộc danh mục này.</p>';
    const paginationContainer = document.getElementById('products-pagination');
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }

  // Calculate pages
  const totalPages = Math.ceil(currentProductsList.length / PRODUCTS_PER_PAGE);
  if (currentProductPage > totalPages) currentProductPage = totalPages;
  if (currentProductPage < 1) currentProductPage = 1;

  // Slice items for current page (6 items per page)
  const startIndex = (currentProductPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = Math.min(startIndex + PRODUCTS_PER_PAGE, currentProductsList.length);
  const pageItems = currentProductsList.slice(startIndex, endIndex);

  pageItems.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
      <div class="product-image-container">
        <span class="product-tag">${product.tag}</span>
        <img src="${product.image}" alt="${product.name}" class="product-img" loading="lazy" onerror="this.src='assets/images/hero_slide_2.jpg'">
      </div>
      <div class="product-details">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-footer">
          <span class="product-price">${formatPrice(product.price)}</span>
          <button class="add-to-cart-btn" onclick="addToCart('${product.id}', 'product')" aria-label="Thêm vào giỏ">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;
    productsGrid.appendChild(productCard);
  });

  // Render pagination controls (3 dots and 2 arrows)
  renderProductsPagination(totalPages);
}

// --- RENDER PRODUCTS PAGINATION (3 DOTS + 2 ARROWS) ---
function renderProductsPagination(totalPages) {
  const paginationContainer = document.getElementById('products-pagination');
  const dotsContainer = document.getElementById('pagination-dots');
  const prevBtn = document.getElementById('pagination-prev');
  const nextBtn = document.getElementById('pagination-next');

  if (!paginationContainer || !dotsContainer) return;

  // If 6 or fewer products, hide pagination
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'flex';
  dotsContainer.innerHTML = '';

  // Render dots (up to 3 dots)
  let dotsCount = Math.min(totalPages, 3);
  let startDotPage = 1;
  if (totalPages > 3) {
    if (currentProductPage === 1) {
      startDotPage = 1;
    } else if (currentProductPage === totalPages) {
      startDotPage = totalPages - 2;
    } else {
      startDotPage = currentProductPage - 1;
    }
  }

  for (let i = 0; i < dotsCount; i++) {
    const pageNum = totalPages <= 3 ? (i + 1) : (startDotPage + i);
    const dot = document.createElement('button');
    dot.className = 'pagination-dot' + (pageNum === currentProductPage ? ' active' : '');
    dot.setAttribute('data-page', pageNum);
    dot.setAttribute('aria-label', `Trang ${pageNum}`);
    dot.addEventListener('click', () => {
      if (currentProductPage !== pageNum) {
        currentProductPage = pageNum;
        renderProducts(currentProductsList, false);
        scrollToProducts();
      }
    });
    dotsContainer.appendChild(dot);
  }

  // Update arrow states
  if (prevBtn) {
    prevBtn.disabled = currentProductPage <= 1;
    if (currentProductPage <= 1) {
      prevBtn.classList.add('disabled');
    } else {
      prevBtn.classList.remove('disabled');
    }
  }

  if (nextBtn) {
    nextBtn.disabled = currentProductPage >= totalPages;
    if (currentProductPage >= totalPages) {
      nextBtn.classList.add('disabled');
    } else {
      nextBtn.classList.remove('disabled');
    }
  }
}

function scrollToProducts() {
  const productsSection = document.getElementById('products');
  if (productsSection) {
    productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// --- RENDER SERVICES / DỊCH VỤ ---
function renderCombos(combosList) {
  if (!combosGrid) return;
  combosGrid.innerHTML = '';

  combosList.forEach(combo => {
    const comboCard = document.createElement('div');
    comboCard.className = 'combo-card';
    comboCard.innerHTML = `
      <div class="combo-image-container">
        <span class="combo-tag">${combo.tag}</span>
        <img src="${combo.image}" alt="${combo.name}" class="combo-img" loading="lazy" onerror="this.src='assets/images/hero_slide_1.jpg'">
      </div>
      <div class="combo-details">
        <h3 class="combo-name">${combo.name}</h3>
        <p class="combo-desc">${combo.description}</p>
        <div class="combo-footer">
          <span class="combo-price">Từ ${formatPrice(combo.price)}</span>
          <button class="btn btn-primary combo-btn" onclick="addToCart('${combo.id}', 'combo')">Đặt Dịch Vụ</button>
        </div>
      </div>
    `;
    combosGrid.appendChild(comboCard);
  });
}

// --- GALLERY PAGINATION CONSTANTS & STATE ---
const GALLERY_PER_PAGE = 6;
let currentGalleryList = [];
let currentGalleryPage = 1;

// --- RENDER GALLERY (GÓC VỌC VIDEOS WITH 6-BOX PAGINATION) ---
function renderGallery(galleryList, resetPage = true) {
  if (!galleryGrid) return;
  if (resetPage) currentGalleryPage = 1;
  currentGalleryList = galleryList || [];

  galleryGrid.innerHTML = '';

  if (currentGalleryList.length === 0) {
    galleryGrid.innerHTML = '<p class="cart-empty-message">Chưa có video nào trong thư viện.</p>';
    const paginationContainer = document.getElementById('gallery-pagination');
    if (paginationContainer) paginationContainer.style.display = 'none';
    return;
  }

  // Calculate pages
  const totalPages = Math.ceil(currentGalleryList.length / GALLERY_PER_PAGE);
  if (currentGalleryPage > totalPages) currentGalleryPage = totalPages;
  if (currentGalleryPage < 1) currentGalleryPage = 1;

  // Slice 6 items for the current slide
  const startIndex = (currentGalleryPage - 1) * GALLERY_PER_PAGE;
  const endIndex = Math.min(startIndex + GALLERY_PER_PAGE, currentGalleryList.length);
  const pageItems = currentGalleryList.slice(startIndex, endIndex);

  pageItems.forEach(item => {
    const galleryItem = document.createElement('div');
    galleryItem.className = 'gallery-item';
    
    const tagText = item.tag || (item.url && item.url.includes('/shorts/') ? 'Shorts 60s' : 'Video Hướng Dẫn');
    const thumbUrl = item.thumbnail || item.url || 'assets/images/hero_slide_1.jpg';

    galleryItem.innerHTML = `
      <div class="gallery-thumbnail-wrap">
        <span class="gallery-tag">${tagText}</span>
        <img src="${thumbUrl}" alt="${item.caption}" class="gallery-media" loading="lazy" onerror="this.src='assets/images/hero_slide_1.jpg'">
        <div class="video-play-btn"><i class="fa-solid fa-play"></i></div>
      </div>
      <div class="gallery-info">
        <h4 class="gallery-caption">${item.caption}</h4>
      </div>
    `;

    // Add open modal trigger
    galleryItem.addEventListener('click', () => openLightbox(item));
    galleryGrid.appendChild(galleryItem);
  });

  // Render gallery pagination (3 dots and 2 arrows)
  renderGalleryPagination(totalPages);
}

// --- RENDER GALLERY PAGINATION ---
function renderGalleryPagination(totalPages) {
  const paginationContainer = document.getElementById('gallery-pagination');
  const dotsContainer = document.getElementById('gallery-dots');
  const prevBtn = document.getElementById('gallery-prev');
  const nextBtn = document.getElementById('gallery-next');

  if (!paginationContainer || !dotsContainer) return;

  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'flex';
  dotsContainer.innerHTML = '';

  let dotsCount = Math.min(totalPages, 3);
  let startDotPage = 1;
  if (totalPages > 3) {
    if (currentGalleryPage === 1) {
      startDotPage = 1;
    } else if (currentGalleryPage === totalPages) {
      startDotPage = totalPages - 2;
    } else {
      startDotPage = currentGalleryPage - 1;
    }
  }

  for (let i = 0; i < dotsCount; i++) {
    const pageNum = totalPages <= 3 ? (i + 1) : (startDotPage + i);
    const dot = document.createElement('button');
    dot.className = 'pagination-dot' + (pageNum === currentGalleryPage ? ' active' : '');
    dot.setAttribute('data-page', pageNum);
    dot.setAttribute('aria-label', `Slide ${pageNum}`);
    dot.addEventListener('click', () => {
      if (currentGalleryPage !== pageNum) {
        currentGalleryPage = pageNum;
        renderGallery(currentGalleryList, false);
        scrollToGallery();
      }
    });
    dotsContainer.appendChild(dot);
  }

  // Update arrow states
  if (prevBtn) {
    prevBtn.disabled = currentGalleryPage <= 1;
    if (currentGalleryPage <= 1) {
      prevBtn.classList.add('disabled');
    } else {
      prevBtn.classList.remove('disabled');
    }
  }

  if (nextBtn) {
    nextBtn.disabled = currentGalleryPage >= totalPages;
    if (currentGalleryPage >= totalPages) {
      nextBtn.classList.add('disabled');
    } else {
      nextBtn.classList.remove('disabled');
    }
  }
}

function scrollToGallery() {
  const gallerySection = document.getElementById('gallery');
  if (gallerySection) {
    gallerySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// --- RENDER TESTIMONIALS ---
function renderTestimonials(testimonialsList) {
  if (!testimonialsContainer) return;
  testimonialsContainer.innerHTML = '';

  testimonialsList.forEach(testi => {
    const testiCard = document.createElement('div');
    testiCard.className = 'testimonial-card';
    testiCard.innerHTML = `
      <span class="testimonial-quote-icon">“</span>
      <p class="testimonial-text">"${testi.comment}"</p>
      <div class="testimonial-author">
        <span class="author-name">${testi.name}</span>
        <span class="author-role">${testi.role}</span>
      </div>
    `;
    testimonialsContainer.appendChild(testiCard);
  });
}

// --- EVENT LISTENERS setup ---
function setupEventListeners() {
  // Sticky Navbar logic
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile Menu Toggle
  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    hamburger.classList.toggle('active');

    // Hamburger animation
    const spans = hamburger.querySelectorAll('span');
    if (hamburger.classList.contains('active')) {
      spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  });

  // Close Mobile Menu on Click on links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.querySelectorAll('span').forEach(span => span.style.transform = 'none');
      hamburger.querySelectorAll('span')[1].style.opacity = '1';
    });
  });

  // Cart Drawer open/close
  cartToggleBtn.addEventListener('click', toggleCart);
  cartCloseBtn.addEventListener('click', toggleCart);
  cartBackdrop.addEventListener('click', toggleCart);
  
  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener('click', () => {
      cartDrawer.classList.remove('open');
      cartBackdrop.classList.remove('open');
    });
  }

  // Product Filter Action
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const category = e.target.getAttribute('data-category');
      if (category === 'all') {
        renderProducts(dbData.products, true);
      } else {
        const filtered = dbData.products.filter(p => p.category === category);
        renderProducts(filtered, true);
      }
    });
  });

  // Product Pagination Arrows
  const prevPageBtn = document.getElementById('pagination-prev');
  const nextPageBtn = document.getElementById('pagination-next');
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentProductPage > 1) {
        currentProductPage--;
        renderProducts(currentProductsList, false);
        scrollToProducts();
      }
    });
  }
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(currentProductsList.length / PRODUCTS_PER_PAGE);
      if (currentProductPage < totalPages) {
        currentProductPage++;
        renderProducts(currentProductsList, false);
        scrollToProducts();
      }
    });
  }

  // Gallery Pagination Arrows
  const prevGalleryBtn = document.getElementById('gallery-prev');
  const nextGalleryBtn = document.getElementById('gallery-next');
  if (prevGalleryBtn) {
    prevGalleryBtn.addEventListener('click', () => {
      if (currentGalleryPage > 1) {
        currentGalleryPage--;
        renderGallery(currentGalleryList, false);
        scrollToGallery();
      }
    });
  }
  if (nextGalleryBtn) {
    nextGalleryBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(currentGalleryList.length / GALLERY_PER_PAGE);
      if (currentGalleryPage < totalPages) {
        currentGalleryPage++;
        renderGallery(currentGalleryList, false);
        scrollToGallery();
      }
    });
  }

  // Lightbox Close
  lightboxCloseBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Checkout Form Submission (COD / Bank Transfer)
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Giỏ hàng của bạn đang trống. Vui lòng thêm sản phẩm trước khi thanh toán.');
      return;
    }

    // Normal Checkout flow
    processCheckout();
  });

  // Send via Zalo Button Action
  submitZaloBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Giỏ hàng của bạn đang trống. Vui lòng thêm sản phẩm trước khi gửi Zalo.');
      return;
    }

    // Verify form validity manually before processing
    if (!orderForm.checkValidity()) {
      orderForm.reportValidity();
      return;
    }

    sendOrderToZalo();
  });

  // Success Popup Close
  popupCloseBtn.addEventListener('click', () => {
    successPopup.classList.remove('open');
  });

  // Price Modal Elements & Slider Logic
  const priceModal = document.getElementById('price-modal');
  const viewPriceBtn = document.getElementById('view-price-btn');
  const priceModalClose = document.getElementById('price-modal-close');
  const pricePrevBtn = document.getElementById('price-prev-btn');
  const priceNextBtn = document.getElementById('price-next-btn');
  const priceSlides = document.querySelectorAll('.price-slide');
  const priceDots = document.querySelectorAll('.price-dot');
  let currentPriceSlideIndex = 0;

  function showPriceSlide(index) {
    if (index < 0) index = priceSlides.length - 1;
    if (index >= priceSlides.length) index = 0;

    priceSlides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    priceDots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    currentPriceSlideIndex = index;
  }

  if (priceModal) {
    document.querySelectorAll('#view-price-btn, .view-price-btn-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        priceModal.classList.add('open');
        showPriceSlide(0);
      });
    });

    if (priceModalClose) {
      priceModalClose.addEventListener('click', () => {
        priceModal.classList.remove('open');
      });
    }

    priceModal.addEventListener('click', (e) => {
      if (e.target === priceModal) {
        priceModal.classList.remove('open');
      }
    });

    pricePrevBtn.addEventListener('click', () => {
      showPriceSlide(currentPriceSlideIndex - 1);
    });

    priceNextBtn.addEventListener('click', () => {
      showPriceSlide(currentPriceSlideIndex + 1);
    });

    priceDots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        showPriceSlide(i);
      });
    });

    // Keyboard support for price modal
    document.addEventListener('keydown', (e) => {
      if (priceModal.classList.contains('open')) {
        if (e.key === 'ArrowLeft') {
          showPriceSlide(currentPriceSlideIndex - 1);
        } else if (e.key === 'ArrowRight') {
          showPriceSlide(currentPriceSlideIndex + 1);
        } else if (e.key === 'Escape') {
          priceModal.classList.remove('open');
        }
      }
    });
  }
}

// --- CART LOGIC ---
function toggleCart() {
  cartDrawer.classList.toggle('open');
  cartBackdrop.classList.toggle('open');
}

window.addToCart = function (id, type) {
  let item = null;
  if (type === 'product') {
    item = dbData.products.find(p => p.id === id);
  } else if (type === 'combo') {
    item = dbData.combos.find(c => c.id === id);
  }

  if (!item) return;

  // Check if already in cart
  const cartItemIndex = cart.findIndex(c => c.id === id);

  if (cartItemIndex > -1) {
    cart[cartItemIndex].quantity += 1;
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1
    });
  }

  saveCartToStorage();
  updateCartUI();

  // Open cart drawer so user sees it added
  toggleCart();
};

function updateCartQuantity(id, change) {
  const itemIndex = cart.findIndex(c => c.id === id);
  if (itemIndex > -1) {
    cart[itemIndex].quantity += change;

    if (cart[itemIndex].quantity <= 0) {
      cart.splice(itemIndex, 1);
    }

    saveCartToStorage();
    updateCartUI();
  }
}

function removeCartItem(id) {
  cart = cart.filter(c => c.id !== id);
  saveCartToStorage();
  updateCartUI();
}

function updateCartUI() {
  // Update badge count
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadgeCount.textContent = totalQty;

  // Render cart items
  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="cart-empty-message">
        <i class="fa-solid fa-shopping-basket"></i>
        <span>Giỏ hàng đang trống</span>
      </div>
    `;
    cartTotalPrice.textContent = '0đ';
    summaryTotalPrice.textContent = '0đ';
    summaryItemsList.innerHTML = '<div style="font-size:0.9rem; color:var(--text-muted);">Không có sản phẩm nào.</div>';
    return;
  }

  cartItemsContainer.innerHTML = '';
  summaryItemsList.innerHTML = '';

  let totalPrice = 0;

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;

    // Render item in Drawer
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <span class="cart-item-price">${formatPrice(item.price)}</span>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
          <span class="qty-val">${item.quantity}</span>
          <button class="qty-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeCartItem('${item.id}')" aria-label="Xóa">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    `;
    cartItemsContainer.appendChild(itemEl);

    // Render item in Checkout Summary Form
    const summaryEl = document.createElement('div');
    summaryEl.className = 'summary-row';
    summaryEl.innerHTML = `
      <span>${item.name} x${item.quantity}</span>
      <span>${formatPrice(itemTotal)}</span>
    `;
    summaryItemsList.appendChild(summaryEl);
  });

  cartTotalPrice.textContent = formatPrice(totalPrice);
  summaryTotalPrice.textContent = formatPrice(totalPrice);
}

// --- CHECKOUT LOGIC ---
function processCheckout() {
  const fullname = document.getElementById('fullname').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const note = document.getElementById('note').value;
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

  const orderDetails = {
    fullname,
    phone,
    address,
    note,
    paymentMethod,
    items: cart,
    total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  };

  console.log('Đặt hàng thành công với thông tin:', orderDetails);

  // Send order to backend API
  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderDetails)
  })
  .then(res => res.json())
  .then(data => console.log('Đã lưu đơn hàng vào hệ thống admin:', data))
  .catch(err => console.error('Lỗi lưu đơn hàng:', err));

  // Clear cart
  cart = [];
  saveCartToStorage();
  updateCartUI();
  orderForm.reset();

  // Close Cart Drawer if open
  cartDrawer.classList.remove('open');
  cartBackdrop.classList.remove('open');

  // Show Success Popup
  successPopup.classList.add('open');
}

// --- SEND ORDER TO ZALO ---
function sendOrderToZalo() {
  const fullname = document.getElementById('fullname').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const note = document.getElementById('note').value;
  const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;

  let totalPrice = 0;
  let itemsText = '';

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    totalPrice += itemTotal;
    itemsText += `${index + 1}. ${item.name} - SL: ${item.quantity} - Giá: ${formatPrice(itemTotal)}\n`;
  });

  const orderDetails = {
    fullname,
    phone,
    address,
    note,
    paymentMethod,
    items: cart,
    total: totalPrice
  };

  // Send order to backend API
  fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderDetails)
  })
  .then(res => res.json())
  .then(data => console.log('Đã lưu đơn hàng Zalo vào hệ thống admin:', data))
  .catch(err => console.error('Lỗi lưu đơn hàng Zalo:', err));

  // Create beautiful message text
  const messageText = `🔔 ĐƠN HÀNG MỚI TỪ MYMOON 🔔\n\n` +
    `👤 Khách hàng: ${fullname}\n` +
    `📞 Số điện thoại: ${phone}\n` +
    `📍 Địa chỉ giao nhận: ${address}\n` +
    `💳 Thanh toán: ${paymentMethod}\n` +
    `📝 Ghi chú: ${note || 'Không có'}\n\n` +
    `📦 Danh sách bánh đặt mua:\n${itemsText}\n` +
    `💰 Tổng đơn hàng: ${formatPrice(totalPrice)}\n\n` +
    `Cảm ơn shop, vui lòng xác nhận đơn hàng giúp mình nhé!`;

  // Copy to clipboard
  navigator.clipboard.writeText(messageText).then(() => {
    alert('Thông tin đơn hàng đã được tự động sao chép vào bộ nhớ tạm!\n\nSau khi bấm OK, bạn sẽ được chuyển hướng sang Zalo để nhắn gửi thông tin đơn hàng này cho shop.');

    // Redirect to Zalo
    const zaloUrl = dbData && dbData.brand ? dbData.brand.zaloUrl : 'https://zalo.me/0344582293';
    window.open(zaloUrl, '_blank');

    // Clear cart and reset form after redirect
    cart = [];
    saveCartToStorage();
    updateCartUI();
    orderForm.reset();
  }).catch(err => {
    console.error('Không thể sao chép đơn hàng:', err);
    // Fallback if copy fails, just redirect
    const zaloUrl = dbData && dbData.brand ? dbData.brand.zaloUrl : 'https://zalo.me/0344582293';
    window.open(zaloUrl, '_blank');
  });
}

// --- LIGHTBOX MODAL LOGIC ---
function getYoutubeEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('/embed/')) return url;
  
  let videoId = '';
  if (url.includes('/shorts/')) {
    const parts = url.split('/shorts/');
    if (parts[1]) videoId = parts[1].split(/[?#]/)[0];
  } else if (url.includes('watch?v=')) {
    const parts = url.split('watch?v=');
    if (parts[1]) videoId = parts[1].split(/[&?#]/)[0];
  } else if (url.includes('youtu.be/')) {
    const parts = url.split('youtu.be/');
    if (parts[1]) videoId = parts[1].split(/[?#]/)[0];
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  return url;
}

function openLightbox(item) {
  if (!lightboxMediaContainer) return;
  lightboxMediaContainer.innerHTML = '';

  const lightboxContent = document.querySelector('.lightbox-content');

  if (item.type === 'video') {
    // Generate iframe for YouTube video
    const iframe = document.createElement('iframe');
    const embedUrl = getYoutubeEmbedUrl(item.url);
    iframe.src = `${embedUrl}?autoplay=1`;
    iframe.className = 'lightbox-iframe';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    
    // Check if it's a YouTube Short
    const isShort = item.url.includes('/shorts/');
    if (isShort) {
      iframe.classList.add('lightbox-short');
      if (lightboxContent) lightboxContent.classList.add('is-short');
    } else {
      if (lightboxContent) lightboxContent.classList.remove('is-short');
    }

    lightboxMediaContainer.appendChild(iframe);
  } else {
    if (lightboxContent) lightboxContent.classList.remove('is-short');
    // Generate image
    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.caption;
    img.className = 'lightbox-media';
    lightboxMediaContainer.appendChild(img);
  }

  lightboxCaption.textContent = item.caption;
  lightbox.classList.add('open');
}

function closeLightbox() {
  lightbox.classList.remove('open');
  const lightboxContent = document.querySelector('.lightbox-content');
  if (lightboxContent) lightboxContent.classList.remove('is-short');
  
  // Clear container to stop videos or audio playing in background when closed
  setTimeout(() => {
    if (lightboxMediaContainer) {
      lightboxMediaContainer.innerHTML = '';
    }
  }, 400);
}

// --- LOCAL STORAGE HELPERS ---
function saveCartToStorage() {
  localStorage.setItem('mymoon_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
  const storedCart = localStorage.getItem('mymoon_cart');
  if (storedCart) {
    try {
      cart = JSON.parse(storedCart);
    } catch (e) {
      cart = [];
    }
  }
}

// --- FORMAT PRICE ---
function formatPrice(number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
}

// --- HERO SLIDER (AUTO 5S & CONTROLS) ---
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  const prevBtn = document.getElementById('hero-prev-btn');
  const nextBtn = document.getElementById('hero-next-btn');
  const heroSection = document.getElementById('hero');

  if (!slides || slides.length === 0) return;

  let currentSlide = 0;
  let autoSlideTimer = null;
  const SLIDE_INTERVAL = 5000; // 5 seconds

  function showSlide(index) {
    if (index < 0) {
      index = slides.length - 1;
    } else if (index >= slides.length) {
      index = 0;
    }

    slides.forEach((slide, i) => {
      if (i === index) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });

    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    currentSlide = index;
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function prevSlide() {
    showSlide(currentSlide - 1);
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(nextSlide, SLIDE_INTERVAL);
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  // Arrow Event Listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      prevSlide();
      startAutoSlide(); // Reset 5s countdown
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      nextSlide();
      startAutoSlide(); // Reset 5s countdown
    });
  }

  // Dots Event Listeners
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const targetIndex = parseInt(e.currentTarget.getAttribute('data-slide'), 10);
      if (!isNaN(targetIndex)) {
        showSlide(targetIndex);
        startAutoSlide();
      }
    });
  });

  // Pause on hover
  if (heroSection) {
    heroSection.addEventListener('mouseenter', stopAutoSlide);
    heroSection.addEventListener('mouseleave', startAutoSlide);
  }

  // Start auto-slide on page load
  startAutoSlide();
}

