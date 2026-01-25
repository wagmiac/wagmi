import { NextRequest, NextResponse } from 'next/server';
import { getTokenById } from '@/lib/token-api';

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

// GET /api/tokens/:id - 获取代币详情（公开）
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await Promise.resolve(context.params);
    const { id } = params;
    const token = await getTokenById(id);

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
