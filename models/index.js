import mongoose from "mongoose";
const { Schema, models, model } = mongoose;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const SupplierSchema = new Schema({
  name: { type: String, required: true },
  contact_person: String,
  phone: String,
  email: String,
  address: String,
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const ProductSchema = new Schema({
  sku: String,
  sub_product: String,
  name: { type: String, required: true },
  category_id: { type: Schema.Types.ObjectId, ref: "Category" },
  supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier" },
  unit: { type: String, default: "CARTON" },
  cost_price: { type: Number, default: 0 },
  selling_price: { type: Number, default: 0 },
  // Optional pricing tiers for quantity-based pricing. Each tier can be an object
  // like { min_qty: 10, max_qty: 49, discount_percent: 5 } or { min_qty: 50, price: 9.5 }
  pricing_tiers: { type: Array, default: [] },
  pack_size: { type: Number, default: 1 },
  stock_qty: { type: Number, default: 0 },
  reorder_level: { type: Number, default: 5 },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const StockInSchema = new Schema({
  reference: String,
  product_id: { type: Schema.Types.ObjectId, ref: "Product" },
  supplier_id: { type: Schema.Types.ObjectId, ref: "Supplier" },
  quantity: { type: Number, required: true },
  cost_price: { type: Number, default: 0 },
  note: String,
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const StockOutSchema = new Schema({
  reference: String,
  product_id: { type: Schema.Types.ObjectId, ref: "Product" },
  customer_id: { type: Schema.Types.ObjectId, ref: "Customer" },
  customer_name: String, // snapshot of buyer name at time of sale, even if customer record changes later
  quantity: { type: Number, required: true },
  rate: { type: Number, default: 0 }, // fixed selling price used for this sale
  sale_value: { type: Number, default: 0 }, // quantity * rate
  balance_after: { type: Number, default: 0 }, // product stock remaining right after this transaction
  invoice_no: String, // auto-generated invoice linked to this sale
  invoice_item_index: Number, // line index when invoice contains multiple products
  reason: { type: String, default: "sale" },
  note: String,
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const InvoiceItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "Product" },
  quantity: Number,
  rate: Number,
  amount: Number,
});

const InvoiceSchema = new Schema({
  invoice_no: { type: String, required: true, unique: true },
  customer_id: { type: Schema.Types.ObjectId, ref: "Customer" },
  customer_name: String, // buyer snapshot for walk-in/manual entry
  invoice_date: String,
  status: { type: String, default: "unpaid" },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  payment_method: { type: String, default: "CASH" },
  note: String,
  items: [InvoiceItemSchema],
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

const NotificationSchema = new Schema({
  type: String,
  message: String,
  is_read: { type: Boolean, default: false },
}, { timestamps: { createdAt: "created_at", updatedAt: false } });

export const User = models.User || model("User", UserSchema);
export const Category = models.Category || model("Category", CategorySchema);
export const Supplier = models.Supplier || model("Supplier", SupplierSchema);
export const Customer = models.Customer || model("Customer", CustomerSchema);
export const Product = models.Product || model("Product", ProductSchema);
export const StockIn = models.StockIn || model("StockIn", StockInSchema);
export const StockOut = models.StockOut || model("StockOut", StockOutSchema);
export const Invoice = models.Invoice || model("Invoice", InvoiceSchema);
export const Notification = models.Notification || model("Notification", NotificationSchema);
