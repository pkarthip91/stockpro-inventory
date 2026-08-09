import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/models";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit")) || 20;

  const notifications = await Notification.find().sort({ created_at: -1 }).limit(limit).lean();
  const unread = await Notification.countDocuments({ is_read: false });

  const shaped = notifications.map((n) => ({
    id: String(n._id),
    type: n.type,
    message: n.message,
    is_read: n.is_read,
    created_at: n.created_at,
  }));

  return NextResponse.json({ notifications: shaped, unread });
}

export async function PUT(request) {
  await connectDB();
  const body = await request.json().catch(() => ({}));
  if (body.id) {
    await Notification.findByIdAndUpdate(body.id, { is_read: true });
  } else {
    await Notification.updateMany({ is_read: false }, { is_read: true });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    await Notification.findByIdAndDelete(id);
  } else {
    await Notification.deleteMany({ is_read: true });
  }
  return NextResponse.json({ ok: true });
}
