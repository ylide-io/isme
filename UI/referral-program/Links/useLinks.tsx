import TelegramIcon from '@mui/icons-material/Telegram'
import TwitterIcon from '@mui/icons-material/Twitter'

const DiscordIcon = () => {
  return (
    <svg className="MuiSvgIcon-root" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.6031 4.42375C18.1815 3.75862 16.6615 3.27524 15.0724 3C14.8772 3.35285 14.6492 3.82744 14.492 4.20498C12.8027 3.95093 11.1289 3.95093 9.47071 4.20498C9.31354 3.82744 9.08035 3.35285 8.88344 3C7.29258 3.27524 5.77082 3.7604 4.34924 4.42727C1.4819 8.76019 0.704613 12.9855 1.09326 17.1508C2.99503 18.571 4.83807 19.4337 6.65001 19.9983C7.09739 19.3825 7.49639 18.728 7.84012 18.0382C7.18547 17.7895 6.55846 17.4825 5.96601 17.1261C6.12319 17.0097 6.27693 16.8879 6.42546 16.7627C10.039 18.4528 13.9652 18.4528 17.5355 16.7627C17.6858 16.8879 17.8395 17.0097 17.995 17.1261C17.4008 17.4842 16.7721 17.7912 16.1174 18.04C16.4611 18.728 16.8584 19.3843 17.3075 20C19.1212 19.4355 20.966 18.5728 22.8677 17.1508C23.3237 12.3221 22.0887 8.13565 19.6031 4.42375ZM8.33241 14.5892C7.24767 14.5892 6.35809 13.5765 6.35809 12.3433C6.35809 11.1101 7.22867 10.0957 8.33241 10.0957C9.43618 10.0957 10.3257 11.1083 10.3067 12.3433C10.3084 13.5765 9.43618 14.5892 8.33241 14.5892ZM15.6286 14.5892C14.5438 14.5892 13.6543 13.5765 13.6543 12.3433C13.6543 11.1101 14.5248 10.0957 15.6286 10.0957C16.7323 10.0957 17.6219 11.1083 17.6029 12.3433C17.6029 13.5765 16.7323 14.5892 15.6286 14.5892Z" />
    </svg>
  )
}

const links = [
  { label: 'Twitter', linkTo: 'https://twitter.com/_ISMEIS', icon: <TwitterIcon /> },
  { label: 'Telegram', linkTo: 'https://t.me/nft3com', icon: <TelegramIcon /> },
  {
    label: 'Discord',
    linkTo: 'https://discord.com/invite/HgHuuS9wzx',
    icon: <DiscordIcon />,
  },
]

export const useLinks = () => {
  return {
    links,
  }
}
