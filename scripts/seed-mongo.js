// Run this once after setting MONGODB_URI in .env.local:
//   node scripts/seed-mongo.js
//
// It's safe to run multiple times — it skips anything that already exists.

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Add it to .env.local first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const { Schema, models, model } = mongoose;

  const User = models.User || model("User", new Schema({ name: String, email: String, password: String, role: String }, { timestamps: { createdAt: "created_at" } }));
  const Category = models.Category || model("Category", new Schema({ name: String }, { timestamps: { createdAt: "created_at" } }));
  const Supplier = models.Supplier || model("Supplier", new Schema({ name: String, contact_person: String, phone: String, email: String, address: String }, { timestamps: { createdAt: "created_at" } }));
  const Customer = models.Customer || model("Customer", new Schema({ name: String, phone: String, email: String, address: String }, { timestamps: { createdAt: "created_at" } }));
  const Product = models.Product || model("Product", new Schema({ sku: String, name: String, category_id: Schema.Types.ObjectId, supplier_id: Schema.Types.ObjectId, unit: String, cost_price: Number, selling_price: Number, stock_qty: Number, reorder_level: Number }, { timestamps: { createdAt: "created_at" } }));
  const Invoice = models.Invoice || model("Invoice", new Schema({ invoice_no: String, customer_id: Schema.Types.ObjectId, invoice_date: String, status: String, subtotal: Number, total: Number, paid: Number, balance: Number, payment_method: String, items: Array }, { timestamps: { createdAt: "created_at" } }));

  // Users
  if ((await User.countDocuments()) === 0) {
    await User.create({
      name: "Arjun Dass",
      email: "admin@84liquorland.com",
      password: bcrypt.hashSync("admin123", 8),
      role: "admin",
    });
    console.log("Seeded admin user.");
  }

  // Categories
  const categoryNames = ["Tequila", "Blended Whisky", "Malt Whisky", "Vodka", "Rum", "Wine"];
  const categoryDocs = {};
  for (const name of categoryNames) {
    let cat = await Category.findOne({ name });
    if (!cat) cat = await Category.create({ name });
    categoryDocs[name] = cat;
  }
  console.log("Categories ready.");

  // Supplier
  let supplier = await Supplier.findOne();
  if (!supplier) {
    supplier = await Supplier.create({
      name: "Global Spirits Distribution Sdn Bhd",
      contact_person: "Michael Tan",
      phone: "+60 12-345 6789",
      email: "sales@globalspirits.my",
      address: "Jalan Kilang, Petaling Jaya, Selangor",
    });
  }

  // Customer
  let customer = await Customer.findOne({ name: "Arun" });
  if (!customer) {
    customer = await Customer.create({ name: "Arun", phone: "+60 17-903 3541", address: "Damansara" });
  }

  // Products
  const productCount = await Product.countDocuments();
  let products = [];
  if (productCount === 0) {
    const data = [
      ["TEQ-JCG-12100", "Jose Cuervo Especial Gold 12x100cl", "Tequila", 780, 990, 14, 5],
      ["WHK-DWL-12114", "Dewar's White Label 12x114cl", "Blended Whisky", 590, 730, 22, 8],
      ["WHK-DMP-12100", "Dimple 15YO 12x100cl", "Malt Whisky", 1300, 1645, 9, 4],
      ["WHK-GLT-12100", "Glenlivet Triple Cask Matured Distiller's Reserve 12x100cl", "Malt Whisky", 1550, 1930, 11, 4],
      ["WHK-GTW-12112", "Grant's Triple Wood 12x112.5cl", "Blended Whisky", 560, 720, 18, 6],
      ["WHK-RBK-6100", "Royal Brackla 12YO 6x100cl", "Malt Whisky", 1290, 1620, 3, 5],
    ];
    for (const [sku, name, catName, cost, sell, qty, reorder] of data) {
      const p = await Product.create({
        sku, name,
        category_id: categoryDocs[catName]._id,
        supplier_id: supplier._id,
        unit: "CARTON",
        pack_size: 12,
        cost_price: cost,
        selling_price: sell,
        stock_qty: qty,
        reorder_level: reorder,
      });
      products.push(p);
    }
    console.log("Seeded 6 products.");
  } else {
    products = await Product.find();
  }

  // Sample invoice (INV899, matching the original paper invoice)
  const invoiceCount = await Invoice.countDocuments();
  if (invoiceCount === 0 && products.length >= 6) {
    const qty = [1, 3, 1, 1, 1, 5];
    const items = products.slice(0, 6).map((p, i) => ({
      product_id: p._id,
      quantity: qty[i],
      rate: p.selling_price,
      amount: p.selling_price * qty[i],
    }));
    const total = items.reduce((s, it) => s + it.amount, 0);
    await Invoice.create({
      invoice_no: "INV899",
      customer_id: customer._id,
      invoice_date: "2026-07-18",
      status: "unpaid",
      subtotal: total,
      total,
      paid: 0,
      balance: total,
      payment_method: "CASH",
      items,
    });
    console.log("Seeded sample invoice INV899.");
  }

  console.log("Seed complete.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
