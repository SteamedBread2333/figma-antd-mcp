import React from 'react';
import { Typography, Input, Button } from 'antd';

const { Title } = Typography;

interface LoginFormProps {}

const LoginForm: React.FC<LoginFormProps> = (props: LoginFormProps) => {
  return (
    <div>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 8,
          width: 320,
          height: 400,
          padding: 20,
        }}
      >
        <Title level={2} style={{ textAlign: 'center', color: '#1a1a1a' }}>
          Login
        </Title>
        <Input
          placeholder="Enter username"
          style={{
            marginBottom: 20,
            backgroundColor: '#fafafa',
            borderColor: '#cccccc',
            borderRadius: 6,
          }}
        />
        <Input.Password
          placeholder="Enter password"
          style={{
            marginBottom: 20,
            backgroundColor: '#fafafa',
            borderColor: '#cccccc',
            borderRadius: 6,
          }}
        />
        <Button
          type="primary"
          block
          size="large"
          style={{
            backgroundColor: '#3d82ff',
            borderRadius: 6,
            boxShadow: '0 2px 4px rgba(61, 130, 255, 0.3)',
          }}
        >
          Login
        </Button>
      </div>
    </div>
  );
};

export default LoginForm;