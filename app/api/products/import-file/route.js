import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { connectDB } from "@/lib/mongodb";
import { Category, Product } from "@/models";

const HEADER_ALIASES = {
  category: ["category", "category name", "type"],
  main: ["main product", "product", "product name", "main_product", "name"],
  sub: ["sub product", "sub-product", "variant", "size", "sub_product"],
  cost: ["cost price", "cost", "purchase price", "buy price", "cost_price"],
  selling: ["selling price", "selling", "sale price", "price", "selling_price"],
  bulkQty: ["bulk qty", "bulk quantity", "minimum bulk qty", "bulk_min_qty", "bulk_qty"],
  bulkPrice: ["bulk price", "bulk_price"],
  packSize: ["pack size", "pack_size", "units per pack"],
  unit: ["unit", "uom"],
  sku: ["sku", "code", "product code"],
};

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function num(value) {
  if (value === "" || value === undefined || value === null) return 0;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizedHeader(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function findColumn(headers, aliases) {
  return headers.findIndex((header) => aliases.includes(normalizedHeader(header)));
}

function looksLikeStructuredHeader(row) {
  const headers = row.map(normalizedHeader);
  return HEADER_ALIASES.main.some((alias) => headers.includes(alias));
}

function looksLikeSectionHeading(value) {
  const text = clean(value);
  if (!text || text.length > 60) return false;
  if (/\d/.test(text)) return false;
  return text === text.toUpperCase() && /[A-Z]/.test(text);
}

function splitMainAndSub(rawName) {
  const name = clean(rawName).replace(/\s+/g, " ");
  if (!name) return { main: "", sub: "" };

  const tokens = name.split(" ");
  const variant = [];
  const tokenPattern = /^(?:\d+(?:\.\d+)?%|\d+(?:\.\d+)?(?:ML|CL|L|G|KG)|\d+(?:BTLS?|BOTTLES?|PCS?|PACKS?|CTNS?|CARTONS?|UNITS?))$/i;

  while (tokens.length && tokenPattern.test(tokens[tokens.length - 1])) {
    variant.unshift(tokens.pop());
  }

  const main = tokens.join(" ").trim();
  if (!main || variant.length === 0) return { main: name, sub: "Standard" };
  return { main, sub: variant.join(" ") };
}

function derivePackSize(sub, rawName) {
  const text = `${sub || ""} ${rawName || ""}`;
  const match = text.match(/(\d+)\s*(?:BTLS?|BOTTLES?|PCS?|UNITS?)/i);
  return match ? Number(match[1]) : 1;
}

function parseStructured(rows, headerIndex) {
  const headers = rows[headerIndex].map(clean);
  const columns = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)])
  );

  const parsed = [];
  let carriedMain = "";
  let carriedCategory = "Uncategorised";

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const mainCell = columns.main >= 0 ? clean(row[columns.main]) : "";
    const subCell = columns.sub >= 0 ? clean(row[columns.sub]) : "";
    const categoryCell = columns.category >= 0 ? clean(row[columns.category]) : "";

    if (categoryCell) carriedCategory = categoryCell;
    if (mainCell) carriedMain = mainCell;
    if (!carriedMain && !subCell) continue;

    // Supports grouped templates where Main Product is written once and the
    // following rows only contain Sub Product values.
    const split = subCell
      ? { main: carriedMain || mainCell, sub: subCell }
      : splitMainAndSub(mainCell || carriedMain);

    if (!split.main) continue;

    const bulkQty = columns.bulkQty >= 0 ? num(row[columns.bulkQty]) : 0;
    const bulkPrice = columns.bulkPrice >= 0 ? num(row[columns.bulkPrice]) : 0;

    parsed.push({
      row: i + 1,
      category: categoryCell || carriedCategory || "Uncategorised",
      main: split.main,
      sub: split.sub || "Standard",
      sku: columns.sku >= 0 ? clean(row[columns.sku]) : "",
      cost_price: columns.cost >= 0 ? num(row[columns.cost]) : 0,
      selling_price: columns.selling >= 0 ? num(row[columns.selling]) : 0,
      bulk_qty: bulkQty || null,
      bulk_price: bulkPrice || null,
      pack_size: columns.packSize >= 0
        ? Math.max(1, num(row[columns.packSize]) || 1)
        : derivePackSize(split.sub, `${mainCell} ${subCell}`),
      unit: columns.unit >= 0 ? clean(row[columns.unit]).toUpperCase() || "BOTTLE" : "BOTTLE",
    });
  }
  return parsed;
}

function parseSectionList(rows) {
  const parsed = [];
  let currentMain = "";
  let currentCategory = "Uncategorised";

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const first = clean(row[0]);
    if (!first) continue;

    const second = clean(row[1]);
    const third = clean(row[2]);

    const heading = looksLikeSectionHeading(first) && (
      (!second && !third) ||
      /order|qty|quantity|discount|note/i.test(`${second} ${third}`)
    );

    if (heading) {
      // In simple list files, a section heading becomes the Main Product.
      // Every following row until the next heading becomes a Sub Product.
      // Example: VERMOUTH -> MARTINI BIANCO..., MARTINI EXTRA DRY..., MARTINI ROSSO...
      currentMain = first;
      currentCategory = first;
      continue;
    }

    if (!currentMain) {
      const split = splitMainAndSub(first);
      parsed.push({
        row: i + 1,
        category: currentCategory,
        main: split.main,
        sub: split.sub || "Standard",
        sku: "",
        cost_price: 0,
        selling_price: 0,
        bulk_qty: null,
        bulk_price: null,
        pack_size: derivePackSize(split.sub, first),
        unit: "BOTTLE",
      });
      continue;
    }

    parsed.push({
      row: i + 1,
      category: currentCategory,
      main: currentMain,
      sub: first,
      sku: "",
      cost_price: 0,
      selling_price: 0,
      bulk_qty: null,
      bulk_price: null,
      pack_size: derivePackSize(first, first),
      unit: "BOTTLE",
    });
  }

  return parsed;
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("The workbook does not contain a worksheet.");

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });

  const headerIndex = rows.findIndex(looksLikeStructuredHeader);
  const items = headerIndex >= 0 ? parseStructured(rows, headerIndex) : parseSectionList(rows);

  const cleaned = items.filter((item) => item.main && item.sub && item.main.length > 1);
  if (!cleaned.length) {
    throw new Error("No products were found. Use the template columns or a grouped product list format.");
  }

  return { sheetName, items: cleaned };
}

async function preparePreview(items) {
  const categories = [...new Set(items.map((item) => item.category || "Uncategorised"))];
  const mainGroups = [...new Set(items.map((item) => item.main))];
  const conditions = items.slice(0, 800).map((item) => ({ name: item.main, sub_product: item.sub }));
  const existingProducts = conditions.length
    ? await Product.find({ $or: conditions }).select("name sub_product").lean()
    : [];

  const existingKeys = new Set(existingProducts.map((p) => `${p.name}||${p.sub_product || "Standard"}`.toLowerCase()));
  const seen = new Set();
  let duplicatesInFile = 0;

  const preview = items.map((item) => {
    const key = `${item.main}||${item.sub || "Standard"}`.toLowerCase();
    if (seen.has(key)) duplicatesInFile += 1;
    seen.add(key);
    return { ...item, exists: existingKeys.has(key) };
  });

  return {
    total: items.length,
    categories: categories.length,
    mainGroups: mainGroups.length,
    existing: preview.filter((item) => item.exists).length,
    new: preview.filter((item) => !item.exists).length,
    duplicatesInFile,
    preview: preview.slice(0, 30),
  };
}

async function importItems(items, sourceName) {
  const categoryMap = new Map();
  const categoryNames = [...new Set(items.map((item) => item.category || "Uncategorised"))];

  for (const name of categoryNames) {
    const category = await Category.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, new: true }
    );
    categoryMap.set(name, category._id);
  }

  const batchId = randomUUID();
  const importedAt = new Date();
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];
  const seen = new Set();

  for (const item of items) {
    try {
      const key = `${item.main}||${item.sub || "Standard"}`.toLowerCase();
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);

      const exists = await Product.exists({ name: item.main, sub_product: item.sub || "Standard" });
      if (exists) {
        skipped += 1;
        continue;
      }

      const pricing_tiers = item.bulk_qty && item.bulk_price
        ? [{ min_qty: Number(item.bulk_qty), price: Number(item.bulk_price) }]
        : [];

      await Product.create({
        sku: item.sku || undefined,
        name: item.main,
        sub_product: item.sub || "Standard",
        category_id: categoryMap.get(item.category || "Uncategorised"),
        unit: item.unit || "BOTTLE",
        cost_price: Number(item.cost_price) || 0,
        selling_price: Number(item.selling_price) || 0,
        pricing_tiers,
        pack_size: Math.max(1, Number(item.pack_size) || 1),
        stock_qty: 0,
        reorder_level: 5,
        import_batch_id: batchId,
        import_source: sourceName,
        imported_at: importedAt,
      });
      created += 1;
    } catch (error) {
      failed += 1;
      errors.push(`Row ${item.row}: ${error.message}`);
    }
  }

  return { created, skipped, failed, errors: errors.slice(0, 10), batchId, importedAt };
}

export async function GET() {
  try {
    await connectDB();
    const latest = await Product.findOne({ import_batch_id: { $exists: true, $ne: null } })
      .sort({ imported_at: -1, created_at: -1 })
      .select("import_batch_id import_source imported_at")
      .lean();

    if (!latest) return NextResponse.json({ latestImport: null });

    const count = await Product.countDocuments({ import_batch_id: latest.import_batch_id });
    return NextResponse.json({
      latestImport: {
        batchId: latest.import_batch_id,
        source: latest.import_source || "Imported file",
        importedAt: latest.imported_at || null,
        count,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load latest import." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const form = await request.formData();
    const file = form.get("file");
    const mode = clean(form.get("mode")) || "preview";

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Choose an Excel or CSV file." }, { status: 400 });
    }

    const name = clean(file.name).toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(name)) {
      return NextResponse.json({ error: "Only .xlsx, .xls and .csv files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "File is too large. Maximum size is 8 MB." }, { status: 400 });
    }

    const parsed = parseWorkbook(buffer);
    const summary = await preparePreview(parsed.items);

    if (mode === "preview") {
      return NextResponse.json({ ok: true, sheet: parsed.sheetName, ...summary });
    }

    const result = await importItems(parsed.items, file.name);
    return NextResponse.json({
      ok: true,
      sheet: parsed.sheetName,
      total: parsed.items.length,
      ...result,
      message: `${result.created} sub-products created in grouped products. ${result.skipped} duplicates skipped.`,
    });
  } catch (error) {
    console.error("PRODUCT FILE IMPORT ERROR", error);
    return NextResponse.json({ error: error.message || "Unable to import product file." }, { status: 500 });
  }
}
