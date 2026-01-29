/**
 * 滑点计算函数
 * 移植自 pumpdotfun-repumped-sdk
 */

/**
 * 计算买入时的滑点
 * @param amount 金额
 * @param basisPoints 基点 (500 = 5%)
 */
export const calculateWithSlippageBuy = (
  amount: bigint,
  basisPoints: bigint
): bigint => {
  return amount + (amount * basisPoints) / 10000n;
};

/**
 * 计算卖出时的滑点
 * @param amount 金额
 * @param slippageBasisPoints 基点 (500 = 5%)
 */
export function calculateWithSlippageSell(
  amount: bigint,
  slippageBasisPoints: bigint = 500n
): bigint {
  const reduction = Math.max(
    1,
    Number((amount * slippageBasisPoints) / 10000n)
  );
  return amount - BigInt(reduction);
}
