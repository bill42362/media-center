// Main Layout Component
import { Layout, Menu, Avatar, Dropdown, Typography } from 'antd'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  HomeOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useAppSelector } from '../../store/hooks'

const { Header, Sider, Content } = Layout
const { Text } = Typography

function MainLayout() {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首頁',
      onClick: () => navigate('/'),
    },
    {
      key: '/videos',
      icon: <VideoCameraOutlined />,
      label: '影片',
      onClick: () => navigate('/videos'),
    },
    {
      key: '/images',
      icon: <PictureOutlined />,
      label: '圖片',
      onClick: () => navigate('/images'),
      disabled: true, // Phase 2
    },
    {
      key: '/articles',
      icon: <FileTextOutlined />,
      label: '文章',
      onClick: () => navigate('/articles'),
      disabled: true, // Phase 2
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      label: '個人資料',
      icon: <UserOutlined />,
    },
    {
      key: 'logout',
      label: '登出',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        breakpoint="lg"
        collapsedWidth="0"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div style={{ padding: '16px', color: 'white', textAlign: 'center' }}>
          <h2>Media Center</h2>
        </div>
        <Menu theme="dark" mode="inline" items={menuItems} />
      </Sider>

      <Layout style={{ marginLeft: 200 }}>
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.displayName || user?.email}</Text>
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: '24px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
