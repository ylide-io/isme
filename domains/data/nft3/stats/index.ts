import { useCallback, useEffect, useState } from 'react'
import type { NFT3Stats } from '@nft3sdk/client'
import { createContext } from 'app/utils/createContext'
import { useNFT3 } from 'domains/data'

const useStatsService = () => {
  const { queryer } = useNFT3()

  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<NFT3Stats>({} as any)

  const request = useCallback(
    () => {
      if (loading) return
      setLoading(true)
      return queryer
        .query({
          nft3Stats: {},
        })
        .then((data) => {
          setStats(data.nft3Stats)
        })
        .finally(() => {
          setLoading(false)
        })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryer]
  )

  useEffect(() => {
    request()
  }, [request])

  return {
    stats,
    loading,
  }
}
const { Provider: StatsProvider, createUseContext } = createContext(useStatsService)
export const createStatsContext = createUseContext

export default StatsProvider
