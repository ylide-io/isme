import type { EVMNetwork } from '@ylide/ethereum'
import { EVM_NAMES } from '@ylide/ethereum'
import type { Wallet } from '../Wallet'
import type { PublicKey, WalletAccount, Ylide, YlideKeysRegistry } from '@ylide/sdk'

export async function publishThroughFaucet({
  ylide,
  keysRegistry,
  wallet,
  account,
  publicKey,
  faucetType,
}: {
  ylide: Ylide
  keysRegistry: YlideKeysRegistry
  wallet: Wallet
  account: WalletAccount
  publicKey: PublicKey
  faucetType: EVMNetwork.GNOSIS | EVMNetwork.FANTOM | EVMNetwork.POLYGON
}) {
  try {
    const faucet = await wallet.controller.getFaucet({ faucetType })

    const registrar = 4 // NFT3 const
    const data = await faucet.authorizePublishing(account, publicKey, registrar)

    const result = await faucet.attachPublicKey(data)

    const key = await ylide.core.waitForPublicKey(EVM_NAMES[faucetType], account.address, publicKey.keyBytes)

    if (key) {
      await keysRegistry.addRemotePublicKey(key)
      return { result: true, hash: result.txHash }
    } else {
      return { result: false }
    }
  } catch (err: any) {
    console.error(`Something went wrong with key publishing`, err)
    return { result: false }
  }
}
