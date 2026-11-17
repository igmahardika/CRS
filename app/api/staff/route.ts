import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth, requireSupervisorOrAdmin } from '@/lib/auth';
import { DEPARTMENTS, isValidDepartment } from '@/lib/permissions';

// GET /api/staff - List all staff or filter by department/active
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const activeOnly = searchParams.get('active') !== 'false';
    const search = searchParams.get('search');

    const where: Prisma.StaffMemberWhereInput = {};
    if (activeOnly) {
      where.isActive = true;
    }
    if (department && department !== 'ALL' && isValidDepartment(department)) {
      where.department = department;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
        { roleTitle: { contains: q } },
      ];
    }

    const staff = await prisma.staffMember.findMany({
      where,
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ staff });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/staff - Create new staff PIC
export async function POST(req: NextRequest) {
  const auth = await requireSupervisorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, email, phone, department, roleTitle, isActive } = body;

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Nama staf wajib diisi.' }, { status: 400 });
    }
    if (!email || !String(email).trim()) {
      return NextResponse.json({ error: 'Alamat email staf wajib diisi.' }, { status: 400 });
    }
    if (!department || !isValidDepartment(department)) {
      return NextResponse.json({ error: 'Departemen staf tidak valid.' }, { status: 400 });
    }

    const created = await prisma.staffMember.create({
      data: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: phone ? String(phone).trim() : null,
        department,
        roleTitle: roleTitle ? String(roleTitle).trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Staff member "${created.name}" created successfully.`,
      staff: created,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/staff - Update existing staff PIC
export async function PUT(req: NextRequest) {
  const auth = await requireSupervisorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id, name, email, phone, department, roleTitle, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone ? String(phone).trim() : null;
    if (department !== undefined && isValidDepartment(department)) updateData.department = department;
    if (roleTitle !== undefined) updateData.roleTitle = roleTitle ? String(roleTitle).trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.staffMember.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Staff member "${updated.name}" updated successfully.`,
      staff: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/staff - Delete or deactivate staff PIC
export async function DELETE(req: NextRequest) {
  const auth = await requireSupervisorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required.' }, { status: 400 });
    }

    await prisma.staffMember.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

