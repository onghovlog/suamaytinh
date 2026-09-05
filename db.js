require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/banhtrungthu';

// Connect to MongoDB with 5s timeout to prevent hanging on VPS if IP blocked
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
  .then(async () => {
    console.log('✅ Đã kết nối thành công đến MongoDB!');
    await seedDatabase();
  })
  .catch(err => {
    console.error('❌ LỖI KẾT NỐI MONGODB:');
    console.error('Chi tiết:', err.message);
    console.error('----------------------------------------------------');
    console.error('👉 KHẮC PHỤC TRÊN VPS:');
    console.error('1. Đảm bảo file .env đã có MONGODB_URI chính xác.');
    console.error('2. Trên MongoDB Atlas -> Vào Network Access -> Thêm IP: 0.0.0.0/0 (cho phép kết nối từ VPS).');
    console.error('----------------------------------------------------');
  });

// Schema for Config (Single Document holding the entire system config)
const configSchema = new mongoose.Schema({
  brand: { type: Object, default: {} },
  admin: { type: Object, default: {} },
  products: { type: Array, default: [] },
  combos: { type: Array, default: [] },
  gallery: { type: Array, default: [] },
  testimonials: { type: Array, default: [] }
}, { timestamps: true });

const Config = mongoose.model('Config', configSchema);

// Schema for Orders
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  note: { type: String },
  paymentMethod: { type: String, default: 'COD' },
  items: { type: Array, default: [] },
  total: { type: Number, required: true },
  status: { type: String, default: 'Đang xử lý' },
  createdAt: { type: String, required: true }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// Helper to get local seed data
function getLocalSeedData() {
  const possiblePaths = [
    path.join(__dirname, 'db.json'),
    path.join(__dirname, 'db.json.bak')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf8');
        return JSON.parse(content);
      } catch (e) {
        console.error(`Lỗi đọc file ${p}:`, e);
      }
    }
  }
  return null;
}

// Auto Migration/Seeding helper
async function seedDatabase(force = false) {
  try {
    let config = await Config.findOne();
    const needsSeed = force || !config || !config.products || config.products.length === 0;

    if (needsSeed) {
      console.log('🔄 Đang kiểm tra và nạp dữ liệu mặc định vào MongoDB...');
      const dbData = getLocalSeedData();
      
      if (dbData) {
        if (!config) {
          config = new Config({});
        }
        config.brand = dbData.brand || {};
        config.admin = dbData.admin || { username: "0344582293", password: "123" };
        config.products = dbData.products || [];
        config.combos = dbData.combos || [];
        config.gallery = dbData.gallery || [];
        config.testimonials = dbData.testimonials || [];
        
        config.markModified('brand');
        config.markModified('admin');
        config.markModified('products');
        config.markModified('combos');
        config.markModified('gallery');
        config.markModified('testimonials');

        await config.save();
        console.log(`✅ Đã nạp thành công ${config.products.length} sản phẩm, ${config.combos.length} combo dịch vụ vào MongoDB!`);
      } else {
        console.warn('⚠️ Không tìm thấy file db.json để nạp dữ liệu khởi tạo.');
      }
    }

    // 2. Seed Orders
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      let ordersJsonPath = path.join(__dirname, 'orders.json');
      if (!fs.existsSync(ordersJsonPath)) {
        ordersJsonPath = path.join(__dirname, 'orders.json.bak');
      }
      
      if (fs.existsSync(ordersJsonPath)) {
        const fileContent = fs.readFileSync(ordersJsonPath, 'utf8');
        const ordersData = JSON.parse(fileContent);
        if (Array.isArray(ordersData) && ordersData.length > 0) {
          const formattedOrders = ordersData.map(o => ({
            id: o.id || 'ord-' + Date.now(),
            fullname: o.fullname,
            phone: o.phone,
            address: o.address,
            note: o.note || '',
            paymentMethod: o.paymentMethod || 'COD',
            items: o.items || [],
            total: o.total || 0,
            status: o.status || 'Đang xử lý',
            createdAt: o.createdAt || new Date().toISOString()
          }));
          await Order.insertMany(formattedOrders);
          console.log(`✅ Đã nạp thành công ${formattedOrders.length} đơn hàng mẫu vào MongoDB.`);
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi nạp dữ liệu vào database:', error);
  }
}

module.exports = {
  Config,
  Order,
  mongoose,
  seedDatabase,
  getLocalSeedData
};
