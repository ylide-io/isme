import type { EVMBlockchainController, EVMWalletController } from '@ylide/ethereum'
import { EVM_CHAINS, EVM_NAMES, evmBlockchainFactories, EVMNetwork, evmWalletFactories } from '@ylide/ethereum'
import type {
  BlockchainMap,
  IMessage,
  IMessageContent,
  MessageContentV4,
  RemotePublicKey,
  Uint256,
  WalletAccount,
  YlidePrivateKey,
  YMF,
} from '@ylide/sdk'
import { BrowserLocalStorage, ServiceCode, WalletEvent, Ylide, YlideKeysRegistry, YlideKeyVersion } from '@ylide/sdk'
import { toast } from 'lib/toastify'
import { createContext } from 'app/utils/createContext'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNFT3 } from '@nft3sdk/did-manager'
import { blockchainMeta, evmNameToNetwork } from './constants'
import { Wallet } from './Wallet'
import { publishThroughFaucet } from './utils/publish-helpers'
import { useDialog } from 'app/hooks/useDialog'

export enum AuthState {
  NOT_AUTHORIZED = 'NOT_AUTHORIZED', // no account connected in wallet
  LOADING = 'LOADING', // loading
  NO_REMOTE_KEY = 'NO_REMOTE_KEY', // no key found for this wallet
  HAS_REMOTE_BUT_NO_LOCAL_KEY = 'HAS_REMOTE_BUT_NO_LOCAL_KEY', // remote key found, but no local key
  LOCAL_REMOTE_MISMATCH = 'LOCAL_REMOTE_MISMATCH', // local key found, but remote key is different
  AUTHORIZED = 'AUTHORIZED', // alles gut
}

export interface YlideDecodedMessage {
  msgId: string
  decodedSubject: string
  decodedTextData: string | YMF
}

export type BlockchainBalances = Record<string, { original: string; numeric: number; e18: string }>

const useYlideService = () => {
  const { account, identifier } = useNFT3()
  const keysRegistry = useMemo(() => new YlideKeysRegistry(new BrowserLocalStorage()), [])
  const ylide = useMemo(() => {
    const ylide = new Ylide(keysRegistry, [
      'ETHEREUM',
      'AVALANCHE',
      'ARBITRUM',
      'BNBCHAIN',
      'OPTIMISM',
      'POLYGON',
      'FANTOM',
      'KLAYTN',
      'GNOSIS',
      'AURORA',
      'CELO',
      'CRONOS',
      'MOONBEAM',
      'MOONRIVER',
      'METIS',
    ])

    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.ETHEREUM])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.AVALANCHE])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.ARBITRUM])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.BNBCHAIN])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.OPTIMISM])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.POLYGON])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.FANTOM])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.KLAYTN])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.GNOSIS])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.AURORA])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.CELO])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.CRONOS])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.MOONBEAM])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.MOONRIVER])
    ylide.registerBlockchainFactory(evmBlockchainFactories[EVMNetwork.METIS])

    ylide.registerWalletFactory(evmWalletFactories.generic)

    return ylide
  }, [keysRegistry])

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [blockchainControllers, setBlockchainControllers] = useState<BlockchainMap<EVMBlockchainController>>({})
  const [walletAccount, setWalletAccount] = useState<null | WalletAccount>(null)
  const [localKeys, setLocalKeys] = useState<YlidePrivateKey[]>([])
  const [remoteKey, setRemoteKey] = useState<RemotePublicKey | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('Accounts changed, Ylide: ' + walletAccount?.address + ', NFT3: ' + account)
  }, [walletAccount, account])

  const reloadRemoteKeys = useCallback(async () => {
    if (!wallet || !walletAccount) return
    const { remoteKey } = await wallet.readRemoteKeys(walletAccount)
    setRemoteKey(remoteKey)
  }, [wallet, walletAccount])

  const switchEVMChain = useCallback(async (_walletController: EVMWalletController, needNetwork: EVMNetwork) => {
    try {
      const bData = blockchainMeta[EVM_NAMES[needNetwork]]

      await _walletController.providerObject.request({
        method: 'wallet_addEthereumChain',
        params: [bData.ethNetwork!],
      })
    } catch (error) {
      console.error('error: ', error)
    }

    try {
      await _walletController.providerObject.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + Number(EVM_CHAINS[needNetwork]).toString(16) }], // chainId must be in hexadecimal numbers
      })
    } catch (err) {
      throw err
    }

    setActiveNetwork(needNetwork)
  }, [])

  useEffect(() => {
    ;(async () => {
      if (initialized) return

      await keysRegistry.init()

      const availableWallets = await ylide.getAvailableWallets()

      const genericFactory = availableWallets.find((w) => w.wallet === 'generic')
      if (genericFactory && !wallet) {
        // noinspection JSUnusedGlobalSymbols
        const newWalletController = await ylide.controllers.addWallet(
          genericFactory.wallet,
          {
            dev: false, //document.location.hostname === 'localhost',
            faucet: {
              registrar: 4,
              apiKey: { type: 'client', key: 'cl75d3ca9c025bee7e' },
            },
            onSwitchAccountRequest: () => {},
            onNetworkSwitchRequest: async (
              _reason: string,
              currentNetwork: EVMNetwork | undefined,
              needNetwork: EVMNetwork
            ) => {
              try {
                await switchEVMChain(newWalletController as EVMWalletController, needNetwork)
              } catch (err) {
                alert(
                  'Wrong network (' +
                    (currentNetwork ? EVM_NAMES[currentNetwork] : 'undefined') +
                    '), switch to ' +
                    EVM_NAMES[needNetwork]
                )
              }
            },
            walletConnectProvider: null,
          },
          genericFactory.blockchainGroup
        )
        const newWallet = new Wallet(ylide, keysRegistry, genericFactory, newWalletController)
        setWallet(newWallet)
      }

      setInitialized(true)
    })()
  }, [initialized, ylide, wallet, keysRegistry, switchEVMChain])

  useEffect(() => {
    ;(async () => {
      const registeredBlockchains = ylide.blockchainsList.map((b) => b.factory)

      const controllers: Record<string, EVMBlockchainController> = Object.assign({}, blockchainControllers)
      let changed = false
      for (const factory of registeredBlockchains) {
        if (!controllers[factory.blockchain]) {
          controllers[factory.blockchain] = (await ylide.controllers.addBlockchain(factory.blockchain, {
            dev: false, //document.location.hostname === 'localhost',
          })) as EVMBlockchainController
          changed = true
        }
      }

      if (changed) {
        setBlockchainControllers((prev) => ({ ...prev, ...controllers }))
      }
    })()
  }, [blockchainControllers, ylide])

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      let lastWalletAccount: WalletAccount | null = null
      wallet.on('accountUpdate', async (newWalletAccount) => {
        console.log('Account update: ', newWalletAccount)
        if (newWalletAccount !== lastWalletAccount) {
          lastWalletAccount = newWalletAccount
          if (newWalletAccount) {
            const { remoteKey } = await wallet.readRemoteKeys(newWalletAccount)
            setWalletAccount(newWalletAccount)
            setRemoteKey(remoteKey)
          } else {
            setWalletAccount(null)
            setRemoteKey(null)
          }
        }
      })
      await wallet.init()
      lastWalletAccount = wallet.currentWalletAccount
      if (lastWalletAccount) {
        const { remoteKey } = await wallet.readRemoteKeys(lastWalletAccount)
        setWalletAccount(lastWalletAccount)
        setLocalKeys(keysRegistry.getLocalPrivateKeys(lastWalletAccount.address))
        setRemoteKey(remoteKey)
        setIsLoading(false)
      } else {
        setWalletAccount(null)
        setLocalKeys([])
        setRemoteKey(null)
        setIsLoading(false)
      }
    })()
  }, [keysRegistry, wallet])

  // okay, so:
  // 1. walletAccount - current wallet account
  // 2. keys - all available local keys
  // 3. remoteKeys - remote keys for the current account
  const authState = useMemo(() => {
    const newState = (() => {
      if (!initialized || isLoading) {
        return AuthState.LOADING
      }

      if (!walletAccount || !account) {
        return AuthState.NOT_AUTHORIZED
      }

      if (!remoteKey) {
        return AuthState.NO_REMOTE_KEY
      }

      const localKey = localKeys.find((k) => k.address === remoteKey.address)
      if (!localKey) {
        return AuthState.HAS_REMOTE_BUT_NO_LOCAL_KEY
      }

      if (!localKey.publicKey.equals(remoteKey.publicKey)) {
        return AuthState.LOCAL_REMOTE_MISMATCH
      }

      return AuthState.AUTHORIZED
    })()

    console.log(`authState`, newState)
    return newState
  }, [account, initialized, isLoading, localKeys, remoteKey, walletAccount])

  const saveLocalKey = useCallback(
    async (key: YlidePrivateKey) => {
      await keysRegistry.addLocalPrivateKey(key)
      setLocalKeys(keysRegistry.getLocalPrivateKeys(key.address))
    },
    [keysRegistry]
  )

  const isPasswordNeeded = useMemo(() => {
    const keyVersion = remoteKey?.publicKey.keyVersion
    return keyVersion === 1 || keyVersion === 2
  }, [remoteKey])

  const createLocalKey = useCallback(
    async (password: string, forceNew?: boolean) => {
      try {
        if (forceNew) {
          return await wallet.constructLocalKeyV2(walletAccount, password)
        } else if (remoteKey?.publicKey.keyVersion === YlideKeyVersion.INSECURE_KEY_V1) {
          // strange... I'm not sure Qamon keys work here
          return await wallet.constructLocalKeyV1(walletAccount, password) //wallet.constructLocalKeyV1(walletAccount, password);
        } else if (remoteKey?.publicKey.keyVersion === YlideKeyVersion.KEY_V2) {
          // if user already using password - we should use it too
          return await wallet.constructLocalKeyV2(walletAccount, password)
        } else if (remoteKey?.publicKey.keyVersion === YlideKeyVersion.KEY_V3) {
          // if user is not using password - we should not use it too
          return await wallet.constructLocalKeyV3(walletAccount)
        } else {
          // user have no key at all - use passwordless version
          return await wallet.constructLocalKeyV3(walletAccount)
        }
      } catch (err) {
        console.error('createLocalKey error', err)
        return null
      }
    },
    [wallet, walletAccount, remoteKey]
  )

  const publishLocalKey = useCallback(
    async (
      faucetType: EVMNetwork.GNOSIS | EVMNetwork.FANTOM | EVMNetwork.POLYGON,
      key: YlidePrivateKey,
      account: WalletAccount
    ) => {
      await publishThroughFaucet({
        ylide,
        keysRegistry,
        wallet,
        account,
        publicKey: key.publicKey,
        faucetType,
      })
    },
    [keysRegistry, wallet, ylide]
  )

  const getBalancesOf = useCallback(
    async (address: string): Promise<BlockchainBalances> => {
      const chains = ylide.blockchainsList.map((b) => b.factory)
      const balances = await Promise.all(
        chains.map((chain) => blockchainControllers[chain.blockchain]!.getBalance(address))
      )

      return chains.reduce(
        (p, c, i) => ({
          ...p,
          [c.blockchain]: balances[i]!,
        }),
        {} as BlockchainBalances
      )
    },
    [blockchainControllers, ylide]
  )

  useEffect(() => {
    if (account && identifier) {
      console.log('Triggered: ', {
        account,
        identifier,
        authState,
        isPasswordNeeded,
        walletAccount,
      })
      ;(async () => {
        if (authState === AuthState.AUTHORIZED) {
          // do nothing, user already authorized
        } else if (authState === AuthState.NO_REMOTE_KEY) {
          const key = await createLocalKey('')
          if (!key) {
            // so sad :( wait for user to try to read some message
            return
          }
          await saveLocalKey(key)
          await publishLocalKey(EVMNetwork.GNOSIS, key, walletAccount)
          await new Promise((r) => setTimeout(r, 3000))
          const { remoteKey } = await wallet.readRemoteKeys(walletAccount)
          setRemoteKey(remoteKey)
          toast.success('Ylide is authorized')
        } else if (authState === AuthState.HAS_REMOTE_BUT_NO_LOCAL_KEY) {
          if (isPasswordNeeded) {
            // do nothing, wait for user to try to read some message
          } else {
            const key = await createLocalKey('')
            if (!key) {
              // so sad :( weird case, wait for user to try to read some message
              return
            }
            await saveLocalKey(key)
            await publishLocalKey(EVMNetwork.GNOSIS, key, walletAccount)
            await new Promise((r) => setTimeout(r, 3000))
            const { remoteKey } = await wallet.readRemoteKeys(walletAccount)
            setRemoteKey(remoteKey)
            toast.success('Ylide is authorized')
          }
        } else {
          // no account, do nothing
        }
      })()
    }
  }, [
    account,
    identifier,
    authState,
    isPasswordNeeded,
    createLocalKey,
    saveLocalKey,
    publishLocalKey,
    walletAccount,
    wallet,
  ])

  const enterPasswordDialogRef = useRef<ReturnType<typeof useDialog>>()
  const enterPasswordCallbackRef = useRef<(result: boolean) => void>()
  const enterPasswordDialogParams = useMemo(
    () => ({
      onOpen: (callback?: () => boolean) => {
        enterPasswordCallbackRef.current = callback
      },
      onClose: async (_e: any, password: string | null) => {
        if (!password) {
          return enterPasswordCallbackRef.current?.(false)
        }
        if (authState === AuthState.HAS_REMOTE_BUT_NO_LOCAL_KEY) {
          const key = await createLocalKey(password)
          if (!key) {
            // so sad :( weird case, wait for user to try to read some message
            return enterPasswordCallbackRef.current?.(false)
          }
          if (key.publicKey.equals(remoteKey.publicKey)) {
            await saveLocalKey(key)
            toast.success('Ylide is authorized')
            enterPasswordCallbackRef.current?.(true)
          } else {
            toast.error('Wrong password, please, try again')
            enterPasswordDialogRef.current?.open(enterPasswordCallbackRef.current)
          }
        }
      },
    }),
    [authState, createLocalKey, enterPasswordDialogRef, remoteKey, saveLocalKey]
  )
  const enterPasswordDialog = useDialog(enterPasswordDialogParams)
  useEffect(() => {
    enterPasswordDialogRef.current = enterPasswordDialog
  }, [enterPasswordDialog])

  const forceAuth = useCallback(async () => {
    if (authState === AuthState.AUTHORIZED) {
      return true
    } else if (authState === AuthState.NO_REMOTE_KEY || authState === AuthState.HAS_REMOTE_BUT_NO_LOCAL_KEY) {
      if (isPasswordNeeded) {
        return await new Promise<boolean>(enterPasswordDialog.open)
      } else {
        const key = await createLocalKey('')
        if (!key) {
          // so sad :( wait for user to try to read some message
          return false
        }
        await saveLocalKey(key)
        await publishLocalKey(EVMNetwork.GNOSIS, key, walletAccount)
        await new Promise((r) => setTimeout(r, 3000))
        const { remoteKey } = await wallet.readRemoteKeys(walletAccount)
        setRemoteKey(remoteKey)
        toast.success('Ylide is authorized')
        return true
      }
    } else {
      return false
    }
  }, [
    authState,
    enterPasswordDialog.open,
    isPasswordNeeded,
    createLocalKey,
    saveLocalKey,
    publishLocalKey,
    walletAccount,
    wallet,
  ])

  const decodeMessage = useCallback(
    async (msgId: string, msg: IMessage, recepient: WalletAccount) => {
      const content = await ylide.core.getMessageContent(msg)
      if (!content || content.corrupted) {
        toast.error('Content is not available or corrupted')
        return
      }

      const result = msg.isBroadcast
        ? ylide.core.decryptBroadcastContent(msg, content as IMessageContent)
        : await ylide.core.decryptMessageContent(recepient, msg, content as IMessageContent)

      return {
        msgId,
        decodedSubject: result.content.subject,
        decodedTextData: result.content.content,
      } as YlideDecodedMessage
    },
    [ylide.core]
  )

  const [activeNetwork, setActiveNetwork] = useState<EVMNetwork>()

  useEffect(() => {
    if (wallet) {
      const handlerBlockchain = (chainNameOrId: string) => {
        console.log('BLOCKCHAIN_CHANGED', chainNameOrId)
        setActiveNetwork(evmNameToNetwork(chainNameOrId))
      }
      wallet.controller.on(WalletEvent.BLOCKCHAIN_CHANGED, handlerBlockchain)
      return () => {
        wallet.controller.off(WalletEvent.BLOCKCHAIN_CHANGED, handlerBlockchain)
      }
    }
  }, [wallet])

  useEffect(() => {
    let isCancelled = false

    wallet?.controller.getCurrentBlockchain().then((blockchain) => {
      if (isCancelled) return
      setActiveNetwork(evmNameToNetwork(blockchain))
    })

    return () => {
      isCancelled = true
    }
  }, [wallet])

  const evmNetworkCallbackRef = useRef<(network?: EVMNetwork) => void>()
  const chooseEvmNetworkDialog = useDialog({
    onOpen: (callback?: (network?: EVMNetwork) => void) => {
      evmNetworkCallbackRef.current = callback
    },
    onClose: async (network?: EVMNetwork) => {
      if (network != null && activeNetwork != network) {
        await switchEVMChain(wallet!.controller as EVMWalletController, network)
      }

      evmNetworkCallbackRef.current?.(network)
    },
  })

  const mailingFeedId = '0000000000000000000000000000000000000000000000000000000000000002' as Uint256 // ISME const
  const uniqueFeedId = '0000000000000000000000000000000000000000000000000000000000000117' as Uint256 // ISME const

  const sendMessage = useCallback(
    async ({ recipients, content }: { recipients: string[]; content: MessageContentV4 }) => {
      if (!wallet || !walletAccount || activeNetwork == null) {
        throw new Error('No account')
      }

      return await ylide.core.sendMessage(
        {
          wallet: wallet.controller,
          sender: walletAccount,
          content,
          recipients,
          serviceCode: ServiceCode.MAIL,
          feedId: mailingFeedId,
        },
        {
          network: activeNetwork,
        }
      )
    },
    [activeNetwork, wallet, walletAccount, ylide.core]
  )

  const broadcastMessage = useCallback(
    async ({ content }: { content: MessageContentV4 }) => {
      if (!wallet || !walletAccount) {
        throw new Error('No account')
      }

      const network = await new Promise((resolve) => chooseEvmNetworkDialog.open(resolve))

      if (network == null) {
        throw new Error('Network not selected')
      }

      return await ylide.core.broadcastMessage(
        {
          wallet: wallet.controller,
          sender: walletAccount,
          content,
          serviceCode: 5, // ISME const
          feedId: uniqueFeedId,
        },
        {
          network,
          isPersonal: true,
        }
      )
    },
    [chooseEvmNetworkDialog, wallet, walletAccount, ylide.core]
  )

  return {
    enterPasswordDialog,

    isLoading,
    authState,
    walletAccount,

    remoteKey,

    forceAuth,

    createLocalKey,
    saveLocalKey,
    reloadRemoteKeys,
    publishLocalKey,
    getBalancesOf,

    decodeMessage,

    broadcastMessage,
    chooseEvmNetworkDialog,
    activeNetwork,
    setActiveNetwork,
    sendMessage,
  }
}
const { Provider: YlideProvider, createUseContext } = createContext(useYlideService)
export const createYlideContext = createUseContext

export default YlideProvider
