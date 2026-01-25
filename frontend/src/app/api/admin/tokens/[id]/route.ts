import { NextRequest, NextResponse } from 'next/server';
import { adminGetTokenById, updateToken, deleteToken } from '@/lib/token-api';

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

// GET /api/admin/tokens/:id - 获取代币详情（管理员）
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authToken = getAuthToken(request);
    const params = await Promise.resolve(context.params);
    console.log('[API] Fetching token with ID:', params.id);
    const token = await adminGetTokenById(params.id, authToken);
    console.log('[API] Token found:', token ? 'Yes' : 'No');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: token,
    });
  } catch (error) {
    console.error('Failed to fetch token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tokens/:id - 更新代币
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authToken = getAuthToken(request);
    const params = await Promise.resolve(context.params);
    const body = await request.json();
    const updatedToken = await updateToken(params.id, body, authToken);

    if (!updatedToken) {
      return NextResponse.json(
        { success: false, error: 'Token not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedToken,
    });
  } catch (error) {
    console.error('Failed to update token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update token' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tokens/:id - 删除代币
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const authToken = getAuthToken(request);
    const params = await Promise.resolve(context.params);
    const success = await deleteToken(params.id, authToken);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Token not found or delete failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete token:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete token' },
      { status: 500 }
    );
  }
}
