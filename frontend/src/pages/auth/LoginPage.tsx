// Login Page
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

const { Title, Paragraph } = Typography

function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string }) => {
    setLoading(true)
    try {
      // TODO: Call GraphQL mutation requestOTP
      console.log('Request OTP for:', values.email)

      message.success('驗證碼已發送到您的信箱')
      navigate('/otp', { state: { email: values.email } })
    } catch (error) {
      message.error('發送驗證碼失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, maxWidth: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2}>Media Center</Title>
          <Paragraph type="secondary">使用 Email 登入</Paragraph>
        </div>

        <Form name="login" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: '請輸入 Email' },
              { type: 'email', message: '請輸入有效的 Email' },
            ]}
          >
            <Input
              type="email"
              autoComplete="email"
              prefix={<MailOutlined />}
              placeholder="your-email@example.com"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              發送驗證碼
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage
