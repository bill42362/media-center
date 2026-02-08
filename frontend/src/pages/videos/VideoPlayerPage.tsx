// Video Player Page
import { Typography, Empty } from 'antd'
import { useParams } from 'react-router-dom'

const { Title } = Typography

function VideoPlayerPage() {
  const { id } = useParams()

  return (
    <div>
      <Title level={2}>影片播放 - {id}</Title>
      <Empty description="影片播放功能開發中..." style={{ marginTop: 48 }} />
    </div>
  )
}

export default VideoPlayerPage
