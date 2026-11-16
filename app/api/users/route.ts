import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';
import { DEPARTMENTS, isValidDepartment } from '@/lib/permissions';

// Middleware helper: Require ADMIN role
async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { error: 'Anda harus login terlebih dahulu.', status: 401 };
  }
  if (session.role !== 'ADMIN') {
    return { error: 'Akses ditolak: Hanya akun berwenang Administrator yang dapat mengelola pengguna dan hak akses.', status: 403 };
  }
  return { session };
}

// GET /api/users - List all users
export async function GET() {
  const authCheck = await requireAdmin();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ department: 'asc' }, { role: 'asc' }, { createdAt: 'desc' }],
  });

  return NextResponse.json({ users });
}

// POST /api/users - Create new user
export async function POST(req: NextRequest) {
  const authCheck = await requireAdmin();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await req.json();
    const { username, name, email, password, role, department, isActive } = body;

    if (!username || !name || !password) {
      return NextResponse.json(
        { error: 'Username, Nama Lengkap, dan Password wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username minimal harus 3 karakter.' },
        { status: 400 }
      );
    }

    if (String(password).length < 6) {
      return NextResponse.json(
        { error: 'Password minimal harus 6 karakter demi keamanan akun.' },
        { status: 400 }
      );
    }

    // Check unique username
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain.` },
        { status: 400 }
      );
    }

    // Check unique email
    const cleanEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : null;
    if (cleanEmail) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: cleanEmail },
      });
      if (existingEmail) {
        return NextResponse.json(
          { error: `Email "${cleanEmail}" sudah digunakan oleh pengguna lain.` },
          { status: 400 }
        );
      }
    }

    const validRoles = ['ADMIN', 'SUPERVISOR', 'STAFF', 'OPERATOR', 'VIEWER', 'REQUESTER'];
    const assignedRole = validRoles.includes(role) ? role : 'STAFF';
    const assignedDept = isValidDepartment(department) ? department : 'Network Operation';

    const { hash, salt } = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: String(name).trim(),
        email: cleanEmail,
        passwordHash: hash,
        passwordSalt: salt,
        role: assignedRole,
        department: assignedDept,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User "${newUser.name}" (@${newUser.username}) [${newUser.department} - ${newUser.role}] created successfully.`,
      user: newUser,
    });
  } catch (err: unknown) {
    if ((err as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email atau username sudah terdaftar. Harap gunakan email/username lain.' },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Users POST]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PUT /api/users - Update user details or change password
export async function PUT(req: NextRequest) {
  const authCheck = await requireAdmin();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await req.json();
    const { id, name, email, role, department, isActive, newPassword } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID wajib disertakan.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    // Safety: Prevent self-deactivation or demotion of the logged in user if they are the only admin
    if (authCheck.session.id === id) {
      if (isActive === false) {
        return NextResponse.json(
          { error: 'Anda tidak dapat menonaktifkan akun Anda sendiri saat sedang mengelola sistem.' },
          { status: 400 }
        );
      }
      if (role && role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Anda tidak dapat mengubah role akun Anda sendiri dari Administrator.' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = String(name).trim();
    if (email !== undefined) {
      const cleanEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : null;
      if (cleanEmail) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: cleanEmail,
            NOT: { id },
          },
        });
        if (existingEmail) {
          return NextResponse.json(
            { error: `Email "${cleanEmail}" sudah digunakan oleh pengguna lain.` },
            { status: 400 }
          );
        }
      }
      updateData.email = cleanEmail;
    }
    if (role && ['ADMIN', 'SUPERVISOR', 'STAFF', 'OPERATOR', 'VIEWER', 'REQUESTER'].includes(role)) updateData.role = role;
    if (department && isValidDepartment(department)) updateData.department = department;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (newPassword && String(newPassword).trim()) {
      if (String(newPassword).length < 6) {
        return NextResponse.json(
          { error: 'Password baru minimal harus 6 karakter.' },
          { status: 400 }
        );
      }
      const { hash, salt } = hashPassword(String(newPassword));
      updateData.passwordHash = hash;
      updateData.passwordSalt = salt;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        department: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User "${updated.name}" updated successfully.`,
      user: updated,
    });
  } catch (err: unknown) {
    if ((err as any)?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email atau username sudah terdaftar. Harap gunakan email/username lain.' },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Users PUT]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE /api/users?id=... - Delete user
export async function DELETE(req: NextRequest) {
  const authCheck = await requireAdmin();
  if ('error' in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (authCheck.session.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account while currently logged in.' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    // Safety: check if this is the last admin
    if (targetUser.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last Administrator account in the system.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `User "${targetUser.name}" (@${targetUser.username}) deleted successfully.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Users DELETE]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

