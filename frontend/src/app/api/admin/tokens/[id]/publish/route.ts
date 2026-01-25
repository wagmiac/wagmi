import { NextRequest, NextResponse } from 'next/server';
import { publishToken } from '@/lib/token-api';

// 从请求头获取 auth token
function getAuthToken(request: NextRequest): string | undefined {
  const auth = request.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return undefined;
}

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

// POST /api/admin/tokens/:id/publish - 发布代币
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authToken = getAuthToken(request);
    const params = await Promise.resolve(context.params);
    const body = await request.json();
    const { contract_address, chain } = body;

    // Validation
    if (!contract_address || !chain) {
      return NextResponse.json(
        { success: false, error: 'Missing contract address or chain' },
        { status: 400 }
      );
    }

    const publishedToken = await publishToken(
      params.id,
      { contract_address, chain },
      authToken
    );

    if (!publishedToken) {
      return NextResponse.json(
        { success: false, error: 'Token not found or publish failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: publishedToken,
      message: 'Token published successfully',
    });
  } catch (error) {
    console.error('Failed to publish token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to publish token' },
      { status: 500 }
    );
  }
}
