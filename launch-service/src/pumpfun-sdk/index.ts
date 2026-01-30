/**
 * Pump.fun SDK - 完整的内置实现
 * 移植自 pumpdotfun-repumped-sdk，移除了对外部 SDK 的依赖
 */

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  Commitment,
  Finality,
  TransactionInstruction,
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import anchorPkg from '@coral-xyz/anchor';
import type { Program as ProgramType, AnchorProvider as AnchorProviderType } from '@coral-xyz/anchor';
const { Program, AnchorProvider, BN } = anchorPkg;

import { 
  DEFAULT_COMMITMENT, 
  DEFAULT_FINALITY,
  PUMP_FUN_IPFS_API,
  PUMP_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  MPL_TOKEN_METADATA_PROGRAM_ID,
} from './consts.js';
import { 
  CreateTokenMetadata, 
  PriorityFee, 
  TransactionResult,
  IPFSResponse,
} from './types.js';
import { GlobalAccount } from './GlobalAccount.js';
import { BondingCurveAccount } from './BondingCurveAccount.js';
import { 
  getGlobalAccountPda,
  getBondingCurvePDA,
  getMintAuthorityPDA,
  getMetadataPDA,
  getEventAuthorityPda,
  getCreatorVaultPda,
  getGlobalVolumeAccumulatorPda,
  getUserVolumeAccumulatorPda,
  getPumpFeeConfigPda,
} from './pda.js';
import { calculateWithSlippageBuy, calculateWithSlippageSell } from './slippage.js';
import { sendTx } from './tx.js';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Pump.fun IDL (Anchor 0.30.x 格式)
const PUMP_IDL = {
  version: '0.1.0',
  name: 'pump',
  address: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  metadata: {
    name: 'pump',
    version: '0.1.0',
    spec: '0.1.0',
  },
  instructions: [
    {
      name: 'create',
      accounts: [
        { name: 'mint', writable: true, signer: true },
        { name: 'mintAuthority', writable: false, signer: false },
        { name: 'bondingCurve', writable: true, signer: false },
        { name: 'associatedBondingCurve', writable: true, signer: false },
        { name: 'global', writable: false, signer: false },
        { name: 'mplTokenMetadata', writable: false, signer: false },
        { name: 'metadata', writable: true, signer: false },
        { name: 'user', writable: true, signer: true },
        { name: 'systemProgram', writable: false, signer: false },
        { name: 'tokenProgram', writable: false, signer: false },
        { name: 'associatedTokenProgram', writable: false, signer: false },
        { name: 'rent', writable: false, signer: false },
        { name: 'eventAuthority', writable: false, signer: false },
        { name: 'program', writable: false, signer: false },
      ],
      args: [
        { name: 'name', type: 'string' },
        { name: 'symbol', type: 'string' },
        { name: 'uri', type: 'string' },
        { name: 'creator', type: { defined: 'Pubkey' } },
      ],
    },
    {
      name: 'buy',
      accounts: [
        { name: 'global', writable: false, signer: false },
        { name: 'feeRecipient', writable: true, signer: false },
        { name: 'mint', writable: false, signer: false },
        { name: 'bondingCurve', writable: true, signer: false },
        { name: 'associatedBondingCurve', writable: true, signer: false },
        { name: 'associatedUser', writable: true, signer: false },
        { name: 'user', writable: true, signer: true },
        { name: 'systemProgram', writable: false, signer: false },
        { name: 'tokenProgram', writable: false, signer: false },
        { name: 'creatorVault', writable: true, signer: false },
        { name: 'eventAuthority', writable: false, signer: false },
        { name: 'program', writable: false, signer: false },
        { name: 'globalVolumeAccumulator', writable: true, signer: false },
        { name: 'userVolumeAccumulator', writable: true, signer: false },
        { name: 'feeConfig', writable: false, signer: false },
        { name: 'feeProgram', writable: false, signer: false },
      ],
      args: [
        { name: 'amount', type: 'u64' },
        { name: 'maxSolCost', type: 'u64' },
      ],
    },
    {
      name: 'sell',
      accounts: [
        { name: 'global', writable: false, signer: false },
        { name: 'feeRecipient', writable: true, signer: false },
        { name: 'mint', writable: false, signer: false },
        { name: 'bondingCurve', writable: true, signer: false },
        { name: 'associatedBondingCurve', writable: true, signer: false },
        { name: 'associatedUser', writable: true, signer: false },
        { name: 'user', writable: true, signer: true },
        { name: 'systemProgram', writable: false, signer: false },
        { name: 'tokenProgram', writable: false, signer: false },
        { name: 'creatorVault', writable: true, signer: false },
        { name: 'eventAuthority', writable: false, signer: false },
        { name: 'program', writable: false, signer: false },
        { name: 'feeConfig', writable: false, signer: false },
      ],
      args: [
        { name: 'amount', type: 'u64' },
        { name: 'minSolOutput', type: 'u64' },
      ],
    },
  ],
  accounts: [],
  types: [
    {
      name: 'Pubkey',
      type: {
        kind: 'struct',
        fields: [
          { name: 'data', type: { array: ['u8', 32] } },
        ],
      },
    },
  ],
  events: [],
  errors: [],
} as const;

/**
 * Pump.fun SDK 主类
 */
export class PumpFunSDK {
  public program: ProgramType;
  public connection: Connection;
  
  // 默认费率 (从链上获取可能更准确，但这里使用默认值)
  private protocolFeeBps = 100n; // 1%
  private creatorFeeBps = 100n; // 1%

  constructor(provider: AnchorProviderType) {
    // Anchor 0.29.0: new Program(idl, programId, provider)
    this.program = new Program(PUMP_IDL as any, PUMP_PROGRAM_ID, provider);
    this.connection = provider.connection;
  }

  /**
   * 上传代币元数据到 IPFS
   */
  async createTokenMetadata(create: CreateTokenMetadata): Promise<IPFSResponse> {
    if (!(create.file instanceof Blob)) {
      throw new Error('File must be a Blob or File object');
    }

    const formData = new FormData();
    formData.append('file', create.file, 'image.png');
    formData.append('name', create.name);
    formData.append('symbol', create.symbol);
    formData.append('description', create.description);
    formData.append('twitter', create.twitter || '');
    formData.append('telegram', create.telegram || '');
    formData.append('website', create.website || '');
    formData.append('showName', 'true');

    try {
      const request = await fetch(PUMP_FUN_IPFS_API, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
        credentials: 'same-origin',
      });

      if (request.status === 500) {
        const errorText = await request.text();
        throw new Error(
          `Server error (500): ${errorText || 'No error details available'}`
        );
      }

      if (!request.ok) {
        throw new Error(`HTTP error! status: ${request.status}`);
      }

      const responseText = await request.text();
      if (!responseText) {
        throw new Error('Empty response received from server');
      }

      try {
        return JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
    } catch (error) {
      console.error('Error in createTokenMetadata:', error);
      throw error;
    }
  }

  /**
   * 获取全局账户
   */
  async getGlobalAccount(commitment: Commitment = DEFAULT_COMMITMENT): Promise<GlobalAccount> {
    const globalAccountPDA = getGlobalAccountPda();
    const tokenAccount = await this.connection.getAccountInfo(
      globalAccountPDA,
      commitment
    );

    if (!tokenAccount) {
      throw new Error('Global account not found');
    }

    return GlobalAccount.fromBuffer(tokenAccount.data);
  }

  /**
   * 获取绑定曲线账户
   */
  async getBondingCurveAccount(
    mint: PublicKey,
    commitment: Commitment = DEFAULT_COMMITMENT
  ): Promise<BondingCurveAccount | null> {
    const tokenAccount = await this.connection.getAccountInfo(
      getBondingCurvePDA(mint),
      commitment
    );
    if (!tokenAccount) {
      return null;
    }
    return BondingCurveAccount.fromBuffer(tokenAccount.data);
  }

  /**
   * 获取绑定曲线创建者
   */
  async getBondingCurveCreator(
    bondingCurvePDA: PublicKey,
    commitment: Commitment = DEFAULT_COMMITMENT
  ): Promise<PublicKey> {
    const bondingAccountInfo = await this.connection.getAccountInfo(
      bondingCurvePDA,
      commitment
    );
    if (!bondingAccountInfo) {
      throw new Error('Bonding curve account not found');
    }

    // Creator is at offset 49 (after 8 bytes discriminator, 5 u64 fields, and 1 byte boolean)
    const creatorBytes = bondingAccountInfo.data.subarray(49, 49 + 32);
    return new PublicKey(creatorBytes);
  }

  /**
   * 创建关联代币账户（如果需要）
   */
  async createAssociatedTokenAccountIfNeeded(
    payer: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
    transaction: Transaction,
    commitment: Commitment = DEFAULT_COMMITMENT
  ): Promise<PublicKey> {
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint,
      owner,
      false
    );

    try {
      await getAccount(this.connection, associatedTokenAccount, commitment);
    } catch {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          associatedTokenAccount,
          owner,
          mint
        )
      );
    }

    return associatedTokenAccount;
  }

  /**
   * 获取创建代币的指令
   */
  async getCreateInstructions(
    creator: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    mint: Keypair
  ): Promise<Transaction> {
    const mintAuthority = getMintAuthorityPDA();
    const bondingCurve = getBondingCurvePDA(mint.publicKey);
    const associatedBonding = await getAssociatedTokenAddress(
      mint.publicKey,
      bondingCurve,
      true
    );
    const global = getGlobalAccountPda();
    const metadata = getMetadataPDA(mint.publicKey);
    const eventAuthority = getEventAuthorityPda();
    const mplTokenMetadata = new PublicKey(MPL_TOKEN_METADATA_PROGRAM_ID);

    // 手动编码指令数据，绕过 Anchor 的签名者验证
    const coder = this.program.coder;
    const ixData = coder.instruction.encode('create', {
      name,
      symbol,
      uri,
      creator: { data: Array.from(creator.toBytes()) },
    });

    // 按 IDL 顺序构建账户
    const keys = [
      { pubkey: mint.publicKey, isSigner: true, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBonding, isSigner: false, isWritable: true },
      { pubkey: global, isSigner: false, isWritable: false },
      { pubkey: mplTokenMetadata, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const ix = new TransactionInstruction({
      programId: PUMP_PROGRAM_ID,
      keys,
      data: ixData,
    });

    return new Transaction().add(ix);
  }

  /**
   * 构建买入指令
   */
  async buildBuyIx(
    buyer: PublicKey,
    mint: PublicKey,
    amount: bigint,
    maxSolCost: bigint,
    tx: Transaction,
    commitment: Commitment,
    shouldUseBuyerAsBonding: boolean
  ): Promise<void> {
    const bondingCurve = getBondingCurvePDA(mint);
    const associatedBonding = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true
    );

    const associatedUser = await this.createAssociatedTokenAccountIfNeeded(
      buyer,
      buyer,
      mint,
      tx,
      commitment
    );

    const globalAccount = await this.getGlobalAccount(commitment);
    const globalAccountPDA = getGlobalAccountPda();
    const bondingCreator = shouldUseBuyerAsBonding
      ? getCreatorVaultPda(buyer)
      : await this.getBondingCurveCreator(bondingCurve, commitment);

    const creatorVault = shouldUseBuyerAsBonding
      ? bondingCreator
      : getCreatorVaultPda(bondingCreator);

    const eventAuthority = getEventAuthorityPda();

    // 手动编码 buy 指令数据
    const coder = this.program.coder;
    const ixData = coder.instruction.encode('buy', {
      amount: new BN(amount.toString()),
      maxSolCost: new BN(maxSolCost.toString()),
    });

    // 按 IDL 顺序构建账户
    const keys = [
      { pubkey: globalAccountPDA, isSigner: false, isWritable: false },
      { pubkey: globalAccount.feeRecipient, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBonding, isSigner: false, isWritable: true },
      { pubkey: associatedUser, isSigner: false, isWritable: true },
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: getGlobalVolumeAccumulatorPda(), isSigner: false, isWritable: true },
      { pubkey: getUserVolumeAccumulatorPda(buyer), isSigner: false, isWritable: true },
      { pubkey: getPumpFeeConfigPda(), isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    const ix = new TransactionInstruction({
      programId: PUMP_PROGRAM_ID,
      keys,
      data: ixData,
    });

    tx.add(ix);
  }

  /**
   * 构建卖出指令
   */
  async buildSellIx(
    seller: PublicKey,
    mint: PublicKey,
    tokenAmount: bigint,
    minSolOutput: bigint,
    tx: Transaction,
    commitment: Commitment
  ): Promise<void> {
    const bondingCurve = getBondingCurvePDA(mint);
    const associatedBonding = await getAssociatedTokenAddress(
      mint,
      bondingCurve,
      true
    );

    const associatedUser = await this.createAssociatedTokenAccountIfNeeded(
      seller,
      seller,
      mint,
      tx,
      commitment
    );

    const globalPda = getGlobalAccountPda();
    const globalBuf = await this.connection.getAccountInfo(globalPda, commitment);
    const feeRecipient = GlobalAccount.fromBuffer(globalBuf!.data).feeRecipient;

    const bondingCreator = await this.getBondingCurveCreator(bondingCurve, commitment);
    const creatorVault = getCreatorVaultPda(bondingCreator);
    const eventAuthority = getEventAuthorityPda();

    const ix = await this.program.methods
      .sell(new BN(tokenAmount.toString()), new BN(minSolOutput.toString()))
      .accounts({
        global: globalPda,
        feeRecipient,
        mint,
        bondingCurve,
        associatedBondingCurve: associatedBonding,
        associatedUser,
        user: seller,
        creatorVault,
        eventAuthority,
        feeConfig: getPumpFeeConfigPda(),
      })
      .instruction();

    tx.add(ix);
  }

  /**
   * 创建代币并初始买入
   */
  async createAndBuy(
    creator: Keypair,
    mint: Keypair,
    metadata: CreateTokenMetadata,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<TransactionResult> {
    const tokenMetadata = await this.createTokenMetadata(metadata);

    const createTx = await this.getCreateInstructions(
      creator.publicKey,
      metadata.name,
      metadata.symbol,
      tokenMetadata.metadataUri,
      mint
    );

    // 使用返回的 Transaction
    const transaction = createTx;

    if (buyAmountSol > 0n) {
      const globalAccount = await this.getGlobalAccount(commitment);
      const buyAmount = globalAccount.getInitialBuyPrice(buyAmountSol);
      const buyAmountWithSlippage = calculateWithSlippageBuy(
        buyAmountSol,
        slippageBasisPoints
      );

      await this.buildBuyIx(
        creator.publicKey,
        mint.publicKey,
        buyAmount,
        buyAmountWithSlippage,
        transaction,
        commitment,
        true
      );
    }

    return await sendTx(
      this.connection,
      transaction,
      creator.publicKey,
      [creator, mint],
      priorityFees,
      commitment,
      finality
    );
  }

  /**
   * 买入代币
   */
  async buy(
    buyer: Keypair,
    mint: PublicKey,
    buyAmountSol: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<TransactionResult> {
    const bondingAccount = await this.getBondingCurveAccount(mint, commitment);
    if (!bondingAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    const buyAmount = bondingAccount.getBuyPrice(
      await this.getGlobalAccount(commitment),
      this.protocolFeeBps,
      this.creatorFeeBps,
      buyAmountSol
    );
    const buyAmountWithSlippage = calculateWithSlippageBuy(
      buyAmountSol,
      slippageBasisPoints
    );

    const transaction = new Transaction();
    await this.buildBuyIx(
      buyer.publicKey,
      mint,
      buyAmount,
      buyAmountWithSlippage,
      transaction,
      commitment,
      false
    );

    return await sendTx(
      this.connection,
      transaction,
      buyer.publicKey,
      [buyer],
      priorityFees,
      commitment,
      finality
    );
  }

  /**
   * 卖出代币
   */
  async sell(
    seller: Keypair,
    mint: PublicKey,
    sellTokenAmount: bigint,
    slippageBasisPoints: bigint = 500n,
    priorityFees?: PriorityFee,
    commitment: Commitment = DEFAULT_COMMITMENT,
    finality: Finality = DEFAULT_FINALITY
  ): Promise<TransactionResult> {
    const bondingAccount = await this.getBondingCurveAccount(mint, commitment);
    if (!bondingAccount) {
      throw new Error(`Bonding curve account not found: ${mint.toBase58()}`);
    }

    const minSolOutput = bondingAccount.getSellPrice(
      this.protocolFeeBps,
      this.creatorFeeBps,
      sellTokenAmount
    );
    let sellAmountWithSlippage = calculateWithSlippageSell(
      minSolOutput,
      slippageBasisPoints
    );
    if (sellAmountWithSlippage < 1n) sellAmountWithSlippage = 1n;

    const transaction = new Transaction();
    await this.buildSellIx(
      seller.publicKey,
      mint,
      sellTokenAmount,
      sellAmountWithSlippage,
      transaction,
      commitment
    );

    return await sendTx(
      this.connection,
      transaction,
      seller.publicKey,
      [seller],
      priorityFees,
      commitment,
      finality
    );
  }
}

// 导出所有
export * from './consts.js';
export * from './types.js';
export * from './slippage.js';
export * from './pda.js';
export * from './tx.js';
export { GlobalAccount } from './GlobalAccount.js';
export { BondingCurveAccount } from './BondingCurveAccount.js';
