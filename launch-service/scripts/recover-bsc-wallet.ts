/**
 * BSC 钱包恢复工具
 * 用于从私钥推导正确的地址
 * 
 * 使用方法:
 * 1. 从管理后台导出私钥
 * 2. 运行: npx ts-node scripts/recover-bsc-wallet.ts <私钥>
 */

import { Wallet } from 'ethers';

async function main() {
  const privateKey = process.argv[2];
  
  if (!privateKey) {
    console.log('使用方法: npx ts-node scripts/recover-bsc-wallet.ts <私钥>');
    console.log('');
    console.log('示例: npx ts-node scripts/recover-bsc-wallet.ts 97241972847ec6d6f443a03d3cf24b2f5b969e2079f56e65976feeac9879f9c4');
    process.exit(1);
  }
  
  // 确保私钥格式正确
  const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  try {
    // 从私钥创建钱包
    const wallet = new Wallet(formattedKey);
    
    console.log('='.repeat(60));
    console.log('BSC 钱包恢复结果');
    console.log('='.repeat(60));
    console.log('');
    console.log('私钥:', privateKey);
    console.log('');
    console.log('正确的地址:', wallet.address);
    console.log('');
    console.log('='.repeat(60));
    console.log('');
    console.log('下一步操作:');
    console.log('1. 将私钥导入 MetaMask 或其他钱包');
    console.log('2. 切换到 BSC 网络');
    console.log('3. 你就可以看到并转出 BNB 了');
    console.log('');
    console.log('注意: 数据库中存储的旧地址是错误的随机地址，');
    console.log('      真正的 BNB 在上面显示的正确地址中。');
    
  } catch (error) {
    console.error('错误: 无效的私钥格式');
    console.error(error);
    process.exit(1);
  }
}

main();
