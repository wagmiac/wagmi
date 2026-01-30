import { Wallet } from 'ethers';

// AIONUI 项目的私钥（从日志中获取）
const privateKey = '0x97241972847ec6d6f443a03d3cf24b2f5b969e2079f56e65976feeac9879f9c4';

const wallet = new Wallet(privateKey);

console.log('========================================');
console.log('BSC 钱包恢复');
console.log('========================================');
console.log('');
console.log('数据库中的错误地址: 0x3ee217671e09bc85e3a3f833fcdfac9061008b05');
console.log('');
console.log('私钥推导的正确地址:', wallet.address);
console.log('');
console.log('========================================');
console.log('');
console.log('操作步骤:');
console.log('1. 复制私钥: 97241972847ec6d6f443a03d3cf24b2f5b969e2079f56e65976feeac9879f9c4');
console.log('2. 打开 MetaMask -> 导入账户 -> 粘贴私钥');
console.log('3. 切换到 BSC 网络');
console.log('4. 在正确的地址中查看并转出 BNB');
