import { NextResponse } from 'next/server';
import { getPublishedTokens } from '@/lib/token-api';

// GET /api/tokens - 获取已发布的代币列表
export async function GET() {
  try {
    const tokens = await getPublishedTokens();
    
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
