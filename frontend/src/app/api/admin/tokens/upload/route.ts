import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// POST /api/admin/tokens/upload - 上传代币图标（代理到 Go 后端）
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // 转发到 Go 后端
    const res = await fetch(`${API_BASE_URL}/admin/tokens/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // 修改返回的 URL，使用当前请求的域名构建完整 URL
    // 这样在生产环境会返回 https://wagmi.ac/uploads/tokens/xxx.jpg
    if (data.success && data.data?.url) {
      const host = request.headers.get('host') || 'localhost:3209';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      data.data.url = `${protocol}://${host}${data.data.url}`;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to upload file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
