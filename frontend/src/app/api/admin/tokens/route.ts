import { NextRequest, NextResponse } from 'next/server';
import { adminGetAllTokens, createToken } from '@/lib/token-api';

// 从请求头获取 auth token
function getAuthToken(request: NextRequest): string | undefined {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return undefined;
}

// GET /api/admin/tokens - 获取所有代币（管理员）
export async function GET(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    const tokens = await adminGetAllTokens(authToken);

    return NextResponse.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('Failed to fetch tokens:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tokens - 创建代币
export async function POST(request: NextRequest) {
  try {
    const authToken = getAuthToken(request);
    const body = await request.json();
    const { name, symbol, description, logo, website, twitter, telegram } = body;

    // Validation
    if (!name || !symbol || !description || !logo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newToken = await createToken({
      name,
      symbol: symbol.toUpperCase(),
      description,
      logo,
      website: website || undefined,
      twitter: twitter || undefined,
      telegram: telegram || undefined,
      chain: '',
    }, authToken);

    if (!newToken) {
      return NextResponse.json(
        { success: false, error: 'Failed to create token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newToken,
    });
  } catch (error) {
    console.error('Failed to create token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
