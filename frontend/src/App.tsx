// Main App Component
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import zhTW from 'antd/locale/zh_TW'
import { useAppSelector } from './store/hooks'

// Pages (to be implemented)
import LoginPage from './pages/auth/LoginPage'
import OTPPage from './pages/auth/OTPPage'
import HomePage from './pages/HomePage'
import VideosPage from './pages/videos/VideosPage'
import VideoPlayerPage from './pages/videos/VideoPlayerPage'

// Layout
import MainLayout from './components/Layout/MainLayout'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth)

  if (loading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ConfigProvider
      locale={zhTW}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/otp" element={<OTPPage />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="videos" element={<VideosPage />} />
            <Route path="videos/:id" element={<VideoPlayerPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
