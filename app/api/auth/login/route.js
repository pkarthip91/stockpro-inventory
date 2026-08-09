import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models";
import { signToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findOne({ email });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = signToken({ id: String(user._id), name: user.name, email: user.email, role: user.role });

  const res = NextResponse.json({
    user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
    token,
  });

  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
