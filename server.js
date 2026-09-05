require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Config, Order, mongoose, seedDatabase, getLocalSeedData } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(__dirname));

// Health check endpoint for VPS diagnostic
app.get('/api/health', (req, res) => {
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = mongoStates[mongoose.connection.readyState] || 'unknown';
  res.json({
    status: 'ok',
    mongodb: state,
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Manual reseed endpoint
app.post('/api/reseed', async (req, res) => {
  try {
    await seedDatabase(true);
    res.json({ message: 'Nạp lại dữ liệu mẫu thành công!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- DATABASE API ---
app.get('/api/db', async (req, res) => {
  try {
    let config = await Config.findOne();
    
    // Nếu chưa có hoặc mảng sản phẩm rỗng, tự động nạp từ db.json
    if (!config || !config.products || config.products.length === 0) {
      await seedDatabase(true);
      config = await Config.findOne();
    }
    
    if (config) {
      return res.json(config);
    }
    
    // Fallback nếu DB vẫn null
    const localData = getLocalSeedData();
    if (localData) {
      return res.json(localData);
    }
    
    res.status(404).json({ error: 'Chưa có dữ liệu.' });
  } catch (error) {
    console.error('Error fetching config from MongoDB, using local fallback:', error.message);
    // Cứu cánh khi VPS không kết nối được MongoDB Atlas: dùng file db.json cục bộ
    const localData = getLocalSeedData();
    if (localData) {
      return res.json(localData);
    }
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy cấu hình.' });
  }
});

app.post('/api/save-db', async (req, res) => {
  const newDbData = req.body;
  if (!newDbData || typeof newDbData !== 'object') {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
  }
  
  // 1. Đồng bộ lưu file db.json cục bộ làm backup
  try {
    const dbJsonPath = path.join(__dirname, 'db.json');
    fs.writeFileSync(dbJsonPath, JSON.stringify(newDbData, null, 2), 'utf8');
  } catch (e) {
    console.warn('Không thể ghi file db.json cục bộ:', e.message);
  }

  // 2. Lưu vào MongoDB
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config(newDbData);
    } else {
      config.brand = newDbData.brand || {};
      config.admin = newDbData.admin || {};
      config.products = newDbData.products || [];
      config.combos = newDbData.combos || [];
      config.gallery = newDbData.gallery || [];
      config.testimonials = newDbData.testimonials || [];
      config.markModified('brand');
      config.markModified('admin');
      config.markModified('products');
      config.markModified('combos');
      config.markModified('gallery');
      config.markModified('testimonials');
    }
    await config.save();
    res.json({ message: 'Lưu cơ sở dữ liệu thành công!' });
  } catch (error) {
    console.error('Error saving config to MongoDB:', error);
    // Dù MongoDB lỗi, file cục bộ đã được lưu
    res.json({ message: 'Đã lưu cục bộ (Lưu ý: MongoDB đang ngắt kết nối).' });
  }
});

// --- AUTHENTICATION API ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng cung cấp số điện thoại và mật khẩu.' });
  }
  
  try {
    const config = await Config.findOne();
    const adminConfig = (config && config.admin) ? config.admin : { username: "0344582293", password: "123" };
    
    if (username === adminConfig.username && password === adminConfig.password) {
      res.json({ success: true, message: 'Đăng nhập thành công!' });
    } else {
      res.status(401).json({ error: 'Số điện thoại hoặc mật khẩu không chính xác.' });
    }
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Lỗi hệ thống khi đăng nhập.' });
  }
});

// --- LOGO UPLOAD API ---
app.post('/api/upload-logo', (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Không tìm thấy dữ liệu hình ảnh logo.' });
  }
  
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  const logoPath = path.join(__dirname, 'assets', 'images', 'logo.png');
  
  // Ensure folder exists
  const dir = path.dirname(logoPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFile(logoPath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Error writing logo file:', err);
      return res.status(500).json({ error: 'Lỗi ghi file hình ảnh logo.' });
    }
    res.json({ success: true, logoUrl: 'assets/images/logo.png' });
  });
});

// --- GENERIC IMAGE UPLOAD API ---
app.post('/api/upload-image', (req, res) => {
  const { image, filename } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'Không tìm thấy dữ liệu hình ảnh.' });
  }
  
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
  // Generate safe filename with timestamp
  const timestamp = Date.now();
  let safeFilename = `img_${timestamp}.png`;
  if (filename) {
    const ext = path.extname(filename) || '.png';
    const base = path.basename(filename, ext).replace(/[^a-zA-Z0-9.\-_]/g, '_');
    safeFilename = `${base}_${timestamp}${ext}`;
  }
  
  const uploadPath = path.join(__dirname, 'assets', 'images', safeFilename);
  
  // Ensure folder exists
  const dir = path.dirname(uploadPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFile(uploadPath, base64Data, 'base64', (err) => {
    if (err) {
      console.error('Error writing uploaded image file:', err);
      return res.status(500).json({ error: 'Lỗi ghi file hình ảnh tải lên.' });
    }
    res.json({ success: true, imageUrl: `assets/images/${safeFilename}` });
  });
});


// --- ORDERS API ---
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders from MongoDB, checking local fallback:', error.message);
    const ordersPath = fs.existsSync(path.join(__dirname, 'orders.json'))
      ? path.join(__dirname, 'orders.json')
      : (fs.existsSync(path.join(__dirname, 'orders.json.bak')) ? path.join(__dirname, 'orders.json.bak') : null);
    if (ordersPath) {
      try {
        const ordersData = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
        return res.json(ordersData);
      } catch (e) {
        console.error('Error reading local orders:', e);
      }
    }
    res.status(500).json({ error: 'Lỗi máy chủ khi lấy danh sách đơn hàng.' });
  }
});

app.post('/api/orders', async (req, res) => {
  const orderData = req.body;
  if (!orderData || !orderData.fullname || !orderData.phone) {
    return res.status(400).json({ error: 'Thông tin đơn hàng không đầy đủ.' });
  }
  
  try {
    // Set meta details
    orderData.id = 'ord-' + Date.now();
    orderData.createdAt = new Date().toISOString();
    orderData.status = 'Đang xử lý'; // Default status
    
    const newOrder = await Order.create(orderData);
    res.status(201).json({ message: 'Đặt hàng thành công!', order: newOrder });
  } catch (error) {
    console.error('Error saving order:', error);
    res.status(500).json({ error: 'Không thể lưu thông tin đơn hàng.' });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ.' });
  }
  
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { id: id },
      { status: status },
      { new: true }
    );
    
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
    }
    
    res.json({ message: 'Cập nhật trạng thái đơn hàng thành công!', order: updatedOrder });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Không thể cập nhật trạng thái đơn hàng.' });
  }
});

// Fallback to serve index.html for undefined routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`myMoon Server is running on http://localhost:${PORT}`);
});

