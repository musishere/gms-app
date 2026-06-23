import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { GRAVE_COLS } from "@/lib/supabase";
import { selectBookingById, updateBooking } from "@/lib/booking-db";
import { errorResponse } from "@/lib/error-handler";
import { randomUUID } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const admin = getSupabaseAdmin();

    const booking = await selectBookingById(admin, id);
    if (!booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const b = booking as Record<string, unknown>;
    if (auth.role === "family" && b.bookedBy !== auth.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: grave } = await admin
      .from("graves")
      .select(GRAVE_COLS)
      .eq("id", b.graveId)
      .single();
    return NextResponse.json({ booking, grave });
  } catch (e) {
    return errorResponse("Failed to fetch booking", e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { status, notes } = await req.json();
    const admin = getSupabaseAdmin();

    const booking = await selectBookingById(admin, id);
    if (!booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const b = booking as Record<string, unknown>;

    if (auth.role === "family") {
      if (b.bookedBy !== auth.id)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (status !== "cancelled")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (b.status !== "pending")
        return NextResponse.json(
          { error: "Only pending bookings can be cancelled" },
          { status: 409 },
        );
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status };
    if (notes !== undefined) updates.notes = notes;

    if (status === "approved" && ["admin", "staff"].includes(auth.role)) {
      updates.approved_by = auth.id;
      updates.approved_at = now;

      await admin
        .from("graves")
        .update({ status: "reserved" })
        .eq("id", b.graveId);

      await admin.from("notifications").insert({
        id: randomUUID(),
        user_id: b.bookedBy,
        title: "Grave Booking Approved",
        message: `Your grave booking for ${b.deceasedName} has been approved.`,
        type: "success",
        read: false,
        created_at: now,
      });
    }

    if (status === "cancelled") {
      const { data: grave } = await admin
        .from("graves")
        .select(GRAVE_COLS)
        .eq("id", b.graveId)
        .single();
      if (grave && String(grave.status) === "reserved") {
        await admin
          .from("graves")
          .update({ status: "available" })
          .eq("id", b.graveId);
      }

      if (b.bookedBy !== auth.id) {
        await admin.from("notifications").insert({
          id: randomUUID(),
          user_id: b.bookedBy,
          title: "Grave Booking Cancelled",
          message: `Your grave booking for ${b.deceasedName} has been cancelled.`,
          type: "warning",
          read: false,
          created_at: now,
        });
      }
    }

    const updated = await updateBooking(admin, id, updates);
    return NextResponse.json({ booking: updated });
  } catch (e) {
    return errorResponse("Failed to update booking", e);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const admin = getSupabaseAdmin();

    const booking = await selectBookingById(admin, id);
    if (!booking)
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const b = booking as Record<string, unknown>;
    if (auth.role === "family" && b.bookedBy !== auth.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!["pending", "cancelled"].includes(String(b.status)))
      return NextResponse.json(
        { error: "Cannot delete an approved or converted booking" },
        { status: 409 },
      );

    await admin.from("grave_bookings").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return errorResponse("Failed to delete booking", e);
  }
}
