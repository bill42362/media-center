// Videos List Page
import { Typography, Empty } from 'antd'

const { Title } = Typography

function VideosPage() {
  return (
    <div>
      <Title level={2}>影片列表</Title>
      <Empty description="影片功能開發中..." style={{ marginTop: 48 }} />
    </div>
  )
}

export default VideosPage
