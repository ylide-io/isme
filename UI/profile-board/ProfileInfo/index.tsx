import Avatar from '@mui/material/Avatar'
import { styled } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { Paragraph } from 'components/Typography'
import TwitterButton from 'components/btn/TwitterButton'
import { useNFT3Follow, useNFT3Profile, useNFT3, useUser, useNFT3Social } from 'domains/data'
import { useRouter } from 'next/router'
import { useMemo } from 'react'

const ROOT = styled(Card)``

const ProfileInfo: FC = () => {
  const router = useRouter()
  const { didname, selectDialog, identifier } = useUser()
  const { ready, profile, did } = useNFT3Profile()
  const NFT3Follow = useNFT3Follow()
  const { twitter } = useNFT3Social()
  const { format } = useNFT3()
  const { followed, count, follow, unfollow } = NFT3Follow
  const followContent = useMemo(
    () =>
      !followed ? (
        <Button
          size="small"
          onClick={() => {
            if (!didname) return selectDialog.open()
            follow()
          }}
        >
          Follow
        </Button>
      ) : (
        <Button size="small" onClick={() => unfollow()}>
          Unfollow
        </Button>
      ),
    [didname, follow, followed, selectDialog, unfollow]
  )
  if (!ready || !profile) return null
  return (
    <ROOT>
      <CardContent>
        <Stack spacing={2}>
          <Avatar alt={profile.name} src={format(profile.avatar)} />
          <Paragraph>{profile.name}</Paragraph>
          <Stack spacing={2} direction="row">
            <TwitterButton account={twitter.account?.account} />
          </Stack>
          <Stack spacing={2} direction="row">
            <Stack spacing={2}>
              <Paragraph>{count.following}</Paragraph>
              <Paragraph>Following</Paragraph>
            </Stack>
            <Stack spacing={2}>
              <Paragraph>{count.followers}</Paragraph>
              <Paragraph>Follows</Paragraph>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
      <CardActions>
        {identifier === did ? (
          <Button
            size="small"
            onClick={() => {
              router.push('/profile')
            }}
          >
            Edit Profile
          </Button>
        ) : (
          followContent
        )}
      </CardActions>
    </ROOT>
  )
}

export default ProfileInfo
