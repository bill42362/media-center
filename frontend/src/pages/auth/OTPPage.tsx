// OTP Verification Page
import { Form, Input, Button, Card, Typography, message } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

const { Title, Paragraph } = Typography

function OTPPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const email = location.state?.email

  if (!email) {
    navigate('/login')
    return null
  }

  const onFinish = async (values: { code: string }) => {
    setLoading(true)
    try {
      // TODO: Call GraphQL mutation verifyOTP
      console.log('Verify OTP:', email, values.code)

      message.success('登入成功')
      navigate('/')
    } catch (error) {
      message.error('驗證碼錯誤或已過期')
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
          <Title level={2}>驗證碼</Title>
          <Paragraph type="secondary">
            驗證碼已發送到 <strong>{email}</strong>
          </Paragraph>
        </div>

        <Form name="otp" onFinish={onFinish} layout="vertical">
          <Form.Item
            name="code"
            label="驗證碼"
            rules={[
              { required: true, message: '請輸入驗證碼' },
              { len: 6, message: '驗證碼為 6 位數字' },
            ]}
          >
            <Input
              prefix={<LockOutlined />}
              placeholder="123456"
              size="large"
              maxLength={6}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}>
              驗證並登入
            </Button>
          </Form.Item>

          <Button type="link" block onClick={() => navigate('/login')}>
            返回重新發送
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default OTPPage
