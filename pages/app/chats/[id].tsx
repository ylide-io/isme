import { Fragment, useEffect, useMemo, useRef } from 'react'
import Container from '@mui/material/Container'
import Header from 'components/Header'
import { H2, H6, NlToBr, Span, Tiny } from '../../../components/Typography'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Avatar from '@mui/material/Avatar'
import { format as formatDate } from 'date-fns'
import { useRouter } from 'next/router'
import backSvg from '../../../public/back.svg'
import attachmentSvg from '../../../public/attachment.svg'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { useTheme } from '@mui/material/styles'
import { ImageButton } from '../../../components/btn/IconButton'
import type { ChatMessage } from '../../../domains/data/ylide/chats'
import { ChatState, useChat } from '../../../domains/data/ylide/chats'

const Message = ({ message }: { message: ChatMessage }) => {
  const theme = useTheme()

  const renderBody = () => (
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <H6>{message.isIncoming ? `${message.recipientName}.isme` : 'You'}</H6>

        <Span fontSize={12}>{formatDate(message.msg.createdAt * 1000, 'MMM d, yyyy')}</Span>
      </Stack>

      <Span
        sx={{
          padding: 1.5,
          color: message.isIncoming ? undefined : theme.palette.card.background,
          backgroundColor: message.isIncoming ? theme.palette.grey[200] : theme.palette.secondary.main,
          borderRadius: 2,
          borderTopLeftRadius: message.isIncoming ? 0 : undefined,
          borderTopRightRadius: message.isIncoming ? undefined : 0,
        }}
      >
        <NlToBr text={message.decoded.decodedTextData.toString()} />
      </Span>
    </Stack>
  )

  return (
    <>
      {message.isIncoming ? (
        <Stack direction="row" spacing={1}>
          <Avatar sx={{ width: 40, height: 40 }} />

          {renderBody()}
        </Stack>
      ) : (
        <Stack direction="row-reverse">{renderBody()}</Stack>
      )}
    </>
  )
}

const ChatPage = () => {
  const router = useRouter()
  const recipientName = router.query.id?.toString()
  const chat = useChat({ recipientName })

  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = Number.MAX_SAFE_INTEGER
    }
  }, [chat.list])

  const fileInput = useMemo(() => {
    if (typeof window === 'undefined') return

    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = () => {
      console.log(input.files?.[0])
    }
    return input
  }, [])

  return (
    <Fragment>
      <Header title={`ISME | Chat with ${recipientName}.isme`} />
      <Container sx={{ width: { sm: 1, md: 0.6 }, padding: 0 }}>
        <Stack paddingTop={4} spacing={2}>
          <H2>
            <ImageButton src={backSvg} href="/app/chats" /> {recipientName}.isme
          </H2>

          <Stack spacing={1}>
            <Card ref={mainRef} sx={{ padding: 2, paddingY: 4, height: '55vh', minHeight: '500px', overflowY: 'auto' }}>
              {chat.list.length ? (
                <Stack minHeight="100%" justifyContent="end" spacing={4}>
                  {chat.list.map((message, i) => (
                    <Message key={i} message={message} />
                  ))}
                </Stack>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Tiny color={chat.state === ChatState.ERROR ? 'error.main' : undefined}>
                    {chat.state === ChatState.ERROR
                      ? "Couldn't load messages 😒"
                      : chat.state === ChatState.LOADING
                      ? 'Loading ...'
                      : 'No messages yet ...'}
                  </Tiny>
                </Box>
              )}
            </Card>

            <Paper sx={{ padding: 2 }}>
              <Stack direction="row" alignItems="end" spacing={2}>
                <TextField
                  multiline
                  variant="standard"
                  minRows={3}
                  maxRows={10}
                  placeholder="Type your message here"
                  sx={{ flexGrow: 1 }}
                />

                <Stack direction="row" alignItems="center" spacing={1}>
                  <ImageButton src={attachmentSvg} title="Attachment" onClick={() => fileInput?.click()} />

                  <Button variant="gradient" size="large" sx={{ flexShrink: 0 }}>
                    Send
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Stack>
        </Stack>
      </Container>
    </Fragment>
  )
}

export default ChatPage
