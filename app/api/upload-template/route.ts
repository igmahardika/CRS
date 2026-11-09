import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB max

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const targetType = formData.get('targetType') as string; // 'cover_mrtg' | 'cover_sla' | 'cover_bg' | 'page_bg'

    if (!file || !targetType) {
      return NextResponse.json({ error: 'File dan tipe template wajib disertakan.' }, { status: 400 });
    }

    const allowedTypes = ['cover_mrtg', 'cover_sla', 'cover_bg', 'page_bg'];
    if (!allowedTypes.includes(targetType)) {
      return NextResponse.json({ error: 'Tipe template tidak valid.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file melebihi batas maksimum 5MB. Silakan kompresi gambar terlebih dahulu.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verify image magic bytes (PNG: 0x89 0x50 0x4E 0x47, JPEG: 0xFF 0xD8)
    const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    if (!isPng && !isJpeg) {
      return NextResponse.json(
        { error: 'Format berkas tidak valid. Harap unggah gambar PNG atau JPEG yang valid.' },
        { status: 400 }
      );
    }

    const targetDir = path.join(process.cwd(), 'public', 'assets', 'templates');
    fs.mkdirSync(targetDir, { recursive: true });

    const targetFileName = `${targetType}.png`;
    const targetFilePath = path.join(targetDir, targetFileName);

    fs.writeFileSync(targetFilePath, buffer);

    return NextResponse.json({
      success: true,
      filePath: `/assets/templates/${targetFileName}?t=${Date.now()}`,
      message: `Template asset ${targetFileName} updated successfully.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
