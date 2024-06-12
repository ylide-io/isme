import type {
  AbstractWalletController,
  WalletAccount,
  WalletControllerFactory,
  Ylide,
  YlideKeysRegistry,
} from '@ylide/sdk'
import { PrivateKeyAvailabilityState, WalletEvent, YlideKeyVersion } from '@ylide/sdk'
import EventEmitter from 'eventemitter3'

export class Wallet extends EventEmitter {
  wallet: string
  factory: WalletControllerFactory
  controller: AbstractWalletController

  private _isAvailable = false

  currentWalletAccount: WalletAccount | null = null
  currentBlockchain = 'unknown'

  constructor(
    private readonly ylide: Ylide,
    private readonly keysRegistry: YlideKeysRegistry,
    factory: WalletControllerFactory,
    controller: AbstractWalletController
  ) {
    super()

    this.wallet = factory.wallet
    this.factory = factory
    this.controller = controller
  }

  async init() {
    await this.checkAvailability()

    try {
      this.currentBlockchain = await this.controller.getCurrentBlockchain()
    } catch (err) {
      this.currentBlockchain = 'unknown'
    }
    this.currentWalletAccount = await this.controller.getAuthenticatedAccount()

    this.controller.on(WalletEvent.ACCOUNT_CHANGED, this.handleAccountChanged)
    this.controller.on(WalletEvent.LOGIN, this.handleAccountLogin)
    this.controller.on(WalletEvent.LOGOUT, this.handleAccountLogout)

    this.controller.on(WalletEvent.BLOCKCHAIN_CHANGED, this.handleBlockchainChanged)
  }

  destroy() {
    this.controller.off(WalletEvent.ACCOUNT_CHANGED, this.handleAccountChanged)
    this.controller.off(WalletEvent.LOGIN, this.handleAccountLogin)
    this.controller.off(WalletEvent.LOGOUT, this.handleAccountLogout)

    this.controller.off(WalletEvent.BLOCKCHAIN_CHANGED, this.handleBlockchainChanged)
  }

  handleAccountChanged = (newAccount: WalletAccount) => {
    this.currentWalletAccount = newAccount
    this.emit('accountUpdate', this.currentWalletAccount)
  }

  handleAccountLogin = (newAccount: WalletAccount) => {
    this.currentWalletAccount = newAccount
    this.emit('accountUpdate', this.currentWalletAccount)
  }

  handleAccountLogout = () => {
    this.currentWalletAccount = null
    this.emit('accountUpdate', this.currentWalletAccount)
  }

  handleBlockchainChanged = (newBlockchain: string) => {
    this.currentBlockchain = newBlockchain
  }

  async checkAvailability() {
    this._isAvailable = await this.factory.isWalletAvailable()
  }

  get isAvailable() {
    return this._isAvailable
  }

  async constructLocalKeyV3(account: WalletAccount) {
    return await this.keysRegistry.instantiateNewPrivateKey(
      this.factory.blockchainGroup,
      account.address,
      YlideKeyVersion.KEY_V3,
      PrivateKeyAvailabilityState.AVAILABLE,
      {
        onPrivateKeyRequest: async (address, magicString) =>
          await this.controller.signMagicString(account, magicString),
      }
    )
  }

  async constructLocalKeyV2(account: WalletAccount, password: string) {
    return await this.keysRegistry.instantiateNewPrivateKey(
      this.factory.blockchainGroup,
      account.address,
      YlideKeyVersion.KEY_V2,
      PrivateKeyAvailabilityState.AVAILABLE,
      {
        onPrivateKeyRequest: async (address, magicString) =>
          await this.controller.signMagicString(account, magicString),
        onYlidePasswordRequest: async (address) => password,
      }
    )
  }

  async constructLocalKeyV1(account: WalletAccount, password: string) {
    return await this.keysRegistry.instantiateNewPrivateKey(
      this.factory.blockchainGroup,
      account.address,
      YlideKeyVersion.INSECURE_KEY_V1,
      PrivateKeyAvailabilityState.AVAILABLE,
      {
        onPrivateKeyRequest: async (address, magicString) =>
          await this.controller.signMagicString(account, magicString),
        onYlidePasswordRequest: async (address) => password,
      }
    )
  }

  async readRemoteKeys(account: WalletAccount) {
    const result = await this.ylide.core.getAddressKeys(account.address)

    return {
      remoteKey: result.freshestKey,
      remoteKeys: result.remoteKeys,
    }
  }

  async getCurrentAccount(): Promise<WalletAccount | null> {
    return this.controller.getAuthenticatedAccount()
  }

  async disconnectAccount(account: WalletAccount) {
    await this.controller.disconnectAccount(account)
  }

  async connectAccount() {
    let acc = await this.getCurrentAccount()
    if (!acc) {
      acc = await this.controller.requestAuthentication()
    }
    return acc
  }
}
