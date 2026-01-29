/**
 * BondingCurveAccount - Pump.fun 绑定曲线账户数据结构
 * 移植自 pumpdotfun-repumped-sdk
 */

import { struct, bool, u64, Layout, publicKey } from '@coral-xyz/borsh';
import { PublicKey } from '@solana/web3.js';
import { GlobalAccount } from './GlobalAccount.js';

export class BondingCurveAccount {
  public discriminator: bigint;
  public virtualTokenReserves: bigint;
  public virtualSolReserves: bigint;
  public realTokenReserves: bigint;
  public realSolReserves: bigint;
  public tokenTotalSupply: bigint;
  public complete: boolean;
  public creator: PublicKey;

  constructor(
    discriminator: bigint,
    virtualTokenReserves: bigint,
    virtualSolReserves: bigint,
    realTokenReserves: bigint,
    realSolReserves: bigint,
    tokenTotalSupply: bigint,
    complete: boolean,
    creator: PublicKey
  ) {
    this.discriminator = discriminator;
    this.virtualTokenReserves = virtualTokenReserves;
    this.virtualSolReserves = virtualSolReserves;
    this.realTokenReserves = realTokenReserves;
    this.realSolReserves = realSolReserves;
    this.tokenTotalSupply = tokenTotalSupply;
    this.complete = complete;
    this.creator = creator;
  }

  /**
   * 计算买入价格
   */
  getBuyPrice(
    globalAccount: GlobalAccount,
    protocolFeeBps: bigint,
    creatorFeeBps: bigint,
    amount: bigint
  ): bigint {
    if (this.complete) {
      throw new Error('Curve is complete');
    }

    if (amount <= 0n) {
      return 0n;
    }
    if (this.virtualTokenReserves === 0n) {
      return 0n;
    }

    const totalFeeBasisPoints =
      protocolFeeBps +
      (!PublicKey.default.equals(this.creator) ? creatorFeeBps : 0n);

    const inputAmount = (amount * 10_000n) / (totalFeeBasisPoints + 10_000n);

    const tokensReceived = this.getBuyTokenAmountFromSolAmountQuote({
      inputAmount,
      virtualTokenReserves: this.virtualTokenReserves,
      virtualSolReserves: this.virtualSolReserves,
    });

    return tokensReceived < this.realTokenReserves
      ? tokensReceived
      : this.realTokenReserves;
  }

  /**
   * 计算买入时可获得的代币数量
   */
  getBuyTokenAmountFromSolAmountQuote({
    inputAmount,
    virtualTokenReserves,
    virtualSolReserves,
  }: {
    inputAmount: bigint;
    virtualTokenReserves: bigint;
    virtualSolReserves: bigint;
  }): bigint {
    if (virtualSolReserves === 0n || virtualTokenReserves === 0n) {
      return 0n;
    }
    const product = virtualSolReserves * virtualTokenReserves;
    const newSolReserves = virtualSolReserves + inputAmount;
    const newTokenReserves = product / newSolReserves + 1n;
    return virtualTokenReserves - newTokenReserves;
  }

  /**
   * 计算卖出价格
   */
  getSellPrice(
    protocolFeeBps: bigint,
    creatorFeeBps: bigint,
    amount: bigint
  ): bigint {
    if (this.complete) {
      throw new Error('Curve is complete');
    }

    if (amount <= 0n) {
      return 0n;
    }
    if (this.virtualTokenReserves === 0n) {
      return 0n;
    }

    const solCost = this.getSellSolAmountFromTokenAmountQuote({
      inputAmount: amount,
      virtualTokenReserves: this.virtualTokenReserves,
      virtualSolReserves: this.virtualSolReserves,
    });

    const totalFeeBps = protocolFeeBps +
      (!PublicKey.default.equals(this.creator) ? creatorFeeBps : 0n);
    
    const fee = (solCost * totalFeeBps) / 10_000n;
    return solCost - fee;
  }

  /**
   * 计算卖出时可获得的 SOL 数量
   */
  getSellSolAmountFromTokenAmountQuote({
    inputAmount,
    virtualTokenReserves,
    virtualSolReserves,
  }: {
    inputAmount: bigint;
    virtualTokenReserves: bigint;
    virtualSolReserves: bigint;
  }): bigint {
    if (virtualSolReserves === 0n || virtualTokenReserves === 0n) {
      return 0n;
    }
    const product = virtualSolReserves * virtualTokenReserves;
    const newTokenReserves = virtualTokenReserves + inputAmount;
    const newSolReserves = product / newTokenReserves + 1n;
    return virtualSolReserves - newSolReserves;
  }

  /**
   * 获取市值 (SOL)
   */
  getMarketCapSOL(): bigint {
    if (this.virtualTokenReserves === 0n) {
      return 0n;
    }
    return (
      (this.tokenTotalSupply * this.virtualSolReserves) /
      this.virtualTokenReserves
    );
  }

  /**
   * 从 Buffer 解析 BondingCurveAccount
   */
  public static fromBuffer(buffer: Buffer): BondingCurveAccount {
    const structure: Layout<BondingCurveAccount> = struct([
      u64('discriminator'),
      u64('virtualTokenReserves'),
      u64('virtualSolReserves'),
      u64('realTokenReserves'),
      u64('realSolReserves'),
      u64('tokenTotalSupply'),
      bool('complete'),
      publicKey('creator'),
    ]);

    const value = structure.decode(buffer);
    return new BondingCurveAccount(
      BigInt(value.discriminator),
      BigInt(value.virtualTokenReserves),
      BigInt(value.virtualSolReserves),
      BigInt(value.realTokenReserves),
      BigInt(value.realSolReserves),
      BigInt(value.tokenTotalSupply),
      value.complete,
      value.creator
    );
  }
}
