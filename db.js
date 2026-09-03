require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/banhtrungthu';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  createdAt: { type: String, required: true } // Keep ISO String formatting as client expects it
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// Auto Migration/Seeding helper
async function seedDatabase() {
  try {
    // 1. Seed System Configuration
    const configCount = await Config.countDocuments();
    if (configCount === 0) {
      console.log('Config collection is empty. Checking db.json / db.json.bak for seeding...');
      let dbJsonPath = path.join(__dirname, 'db.json');
      if (!fs.existsSync(dbJsonPath)) {
        dbJsonPath = path.join(__dirname, 'db.json.bak');
      }
      
      if (fs.existsSync(dbJsonPath)) {
        const fileContent = fs.readFileSync(dbJsonPath, 'utf8');
        const dbData = JSON.parse(fileContent);
        
        await Config.create({
          brand: dbData.brand || {},
          admin: dbData.admin || {},
          products: dbData.products || [],
          combos: dbData.combos || [],
          gallery: dbData.gallery || [],
          testimonials: dbData.testimonials || []
        });
        console.log(`Successfully seeded Config from ${path.basename(dbJsonPath)}`);
      } else {
        console.log('No db.json or db.json.bak found. Creating a default config...');
        await Config.create({});
      }
    }

    // 2. Seed Orders
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      console.log('Order collection is empty. Checking orders.json / orders.json.bak for seeding...');
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
          console.log(`Successfully seeded ${formattedOrders.length} orders from ${path.basename(ordersJsonPath)}`);
        }
      } else {
        console.log('No orders.json or orders.json.bak found. No seeding for orders.');
      }
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run seeding
seedDatabase();

module.exports = {
  Config,
  Order,
  mongoose
};
