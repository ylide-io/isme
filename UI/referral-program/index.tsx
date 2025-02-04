import { useState } from 'react'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'
import OutlinedInput from '@mui/material/OutlinedInput'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded'
import TwitterIcon from '@mui/icons-material/Twitter'
import Box from '@mui/material/Box'

import { toast } from 'lib/toastify'
import { useUser } from 'domains/data'
import { writeText } from 'app/utils/dom/clipboard'
import { H2, H4, Paragraph } from 'components/Typography'
import Link from '@mui/material/Link'

import ReferralCard from './ReferralCard'
import Invitees from './Invitees'
import Links, { RightLinks } from './Links'
import useMediaQuery from '@mui/material/useMediaQuery'

const ReferralProgram: FC = () => {
  const theme = useTheme()
  const { didname } = useUser()
  const [copied, setCopied] = useState(false)

  const referralLink = 'https://isme.is?inviter=' + (didname?.replace(/\.isme$/, '') || '')
  const matches = useMediaQuery(theme.breakpoints.up('md'))

  return (
    <Box position='relative'>
      <Card
        sx={{
          marginTop: '30px',
          padding: { xs: theme.spacing(2), sm: theme.spacing(4) },
        }}
      >
        <CardContent>
          <Stack spacing={4}>
            <Stack spacing={2} textAlign="center">
              <H2>Refer Friends and Earn Rewards</H2>
              <Paragraph color="text.secondary">
                Invite your friends to register for an ISME DID via the referral link of your account, and get rewarded
                with $ISME.{' '}
                <Link href="https://medium.com/nft3/announcing-the-isme-referral-program-3c55c4d6ae2b" target="_blank">
                  Referral program rules.
                </Link>
              </Paragraph>
              <H4>Check if you are eligible for your claimable $ISME</H4>
              <Box>
                <Button variant='contained' href='https://gleam.io/vDR5a/nft3-eligibility-checker' target='_blank'>Check Eligibility</Button>
              </Box>
            </Stack>

            <ReferralCard />

            <Stack spacing={2}>
              <H4>Referral link</H4>
              <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                <OutlinedInput
                  fullWidth
                  id="referral-link"
                  type="text"
                  value={referralLink}
                  disabled
                  endAdornment={
                    <InputAdornment position="end">
                      <Button
                        variant="text"
                        sx={{
                          color: 'text.disabled',
                          ':hover': { backgroundColor: 'transparent', color: 'text.secondary' },
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setCopied(true)
                          writeText(referralLink)
                          toast.success('Referral link copied successfully', {
                            position: toast.POSITION.BOTTOM_RIGHT,
                          })
                        }}
                      >
                        {copied ? (
                          <Stack spacing={1} direction="row">
                            <InventoryRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            <span>Copied</span>
                          </Stack>
                        ) : (
                          <Stack spacing={1} direction="row">
                            <ContentCopyRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            <span>Copy</span>
                          </Stack>
                        )}
                      </Button>
                    </InputAdornment>
                  }
                  label="Password"
                />
                <Button
                  variant="twitter"
                  startIcon={<TwitterIcon />}
                  disabled={!didname}
                  onClick={() => {
                    const text = `Get your #ISME domain now to earn your $ISME tokens by using the official @NFT3com referral link!

  Your true digital self starts right here and now ⬇️`

                    window.open(
                      `https://twitter.com/share?text=${encodeURIComponent(text)}&url=${referralLink}`,
                      `_blank`
                    )
                  }}
                  sx={{
                    borderRadius: '100px',
                    width: { xs: '100%', sm: '150px' },
                  }}
                >
                  Share
                </Button>
              </Stack>
            </Stack>
            {!matches && <Stack spacing={2}>
              <H4>Get real-time updates on $ISME</H4>
              <Links />
            </Stack>}
            <Invitees />
          </Stack>
        </CardContent>
      </Card>
      {matches && <RightLinks />}
    </Box>

  )
}

export default ReferralProgram
