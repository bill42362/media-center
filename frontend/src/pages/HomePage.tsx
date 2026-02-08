// Home Page
import { Card, Row, Col, Typography, Statistic } from 'antd'
import { VideoCameraOutlined, PictureOutlined, FileTextOutlined } from '@ant-design/icons'

const { Title } = Typography

function HomePage() {
  return (
    <div>
      <Title level={2}>歡迎使用 Media Center</Title>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="影片"
              value={0}
              prefix={<VideoCameraOutlined />}
              suffix="部"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="圖片"
              value={0}
              prefix={<PictureOutlined />}
              suffix="張"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="文章"
              value={0}
              prefix={<FileTextOutlined />}
              suffix="篇"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default HomePage
