# vmarker 部署方案
> 后端 Docker (腾讯云 VPS) + 前端 Vercel + Supabase Auth

## 架构概览

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   用户浏览器  │────────▶│   Vercel     │         │  Supabase Auth  │
│  (Next.js)   │◀────────│  (前端托管)   │◀───────▶│   (身份认证)    │
└─────────────┘         └──────────────┘         └─────────────────┘
      │                                                    │
      │ HTTPS + JWT Token                                 │
      ▼                                                    │
┌─────────────────────────────────────────────────────────┼──┐
│  腾讯云 VPS (新加坡)                                        │  │
│  ┌──────────────┐      ┌─────────────────┐              │  │
│  │   Nginx      │─────▶│  Docker         │              │  │
│  │  反向代理/SSL │      │  (FastAPI App)  │              │  │
│  └──────────────┘      └─────────────────┘              │  │
│                              │                           │  │
│                              ▼                           │  │
│                        ┌──────────┐                      │  │
│                        │  FFmpeg  │                      │  │
│                        │  临时文件 │                      │  │
│                        └──────────┘                      │  │
└──────────────────────────────────────────────────────────┘  │
                                                               │
                         JWT 验证 ◀────────────────────────────┘
```

**数据流:**
1. 用户通过 Vercel 访问前端，Supabase 处理注册/登录
2. 登录成功后获取 JWT token
3. 前端调用后端 API 时携带 JWT token
4. VPS 上的 FastAPI 验证 token 合法性（通过 Supabase 公钥）
5. 验证通过后处理视频业务逻辑

---

## 一、后端部署 (腾讯云 VPS)

### 1.1 Dockerfile 配置

**核心要点:**
- 基于 Python 3.13 slim 镜像
- 安装 FFmpeg（视频处理依赖）
- 使用 UV 管理依赖（快速安装）
- 多阶段构建减小镜像体积

**建议 Dockerfile** (`backend/Dockerfile`):

```dockerfile
# Stage 1: Build dependencies
FROM python:3.13-slim AS builder

# 安装 UV 包管理器
RUN pip install --no-cache-dir uv

WORKDIR /app

# 复制依赖文件
COPY pyproject.toml .python-version ./

# 安装依赖到虚拟环境
RUN uv venv && \
    uv pip install --no-cache -r <(uv pip compile pyproject.toml)

# Stage 2: Runtime image
FROM python:3.13-slim

# 安装 FFmpeg（视频处理必需）
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        libgomp1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 从 builder 复制虚拟环境
COPY --from=builder /app/.venv /app/.venv

# 复制应用代码
COPY src/ /app/src/
COPY pyproject.toml .python-version ./

# 设置环境变量
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# 启动应用
CMD ["uvicorn", "vmarker.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 1.2 Docker Compose 配置

**简化部署管理** (`backend/docker-compose.yml`):

```yaml
version: '3.8'

services:
  vmarker-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: vmarker-api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      # AI 服务配置
      - API_BASE=${API_BASE}
      - API_KEY=${API_KEY}
      - API_MODEL=${API_MODEL}
      - ASR_API_BASE=${ASR_API_BASE}
      - ASR_MODEL=${ASR_MODEL}

      # Supabase 配置
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}

      # 可选配置
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-https://yourdomain.vercel.app}
    volumes:
      # 持久化临时文件（可选，建议定期清理）
      - vmarker-temp:/tmp/vmarker
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - vmarker-net

volumes:
  vmarker-temp:

networks:
  vmarker-net:
    driver: bridge
```

### 1.3 环境变量配置

**在 VPS 上创建 `.env` 文件** (`backend/.env`):

```bash
# AI 服务配置
API_BASE=https://api.deepseek.com/v1
API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx  # 从 DeepSeek 获取
API_MODEL=deepseek-chat
ASR_API_BASE=  # 留空使用默认
ASR_MODEL=whisper-1

# Supabase 配置
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret  # 从 Supabase Dashboard → Settings → API

# CORS 配置（Vercel 域名）
ALLOWED_ORIGINS=https://vmarker.vercel.app,https://your-custom-domain.com
```

**安全建议:**
- `.env` 文件不要提交到 Git
- 使用 `chmod 600 .env` 限制文件权限
- 生产环境使用更强的密钥管理（如 Docker secrets）

### 1.4 Nginx 反向代理 + SSL

**配置文件** (`/etc/nginx/sites-available/vmarker`):

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 证书（使用 Let's Encrypt certbot）
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL 优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 请求大小限制（视频上传需要）
    client_max_body_size 500M;
    client_body_timeout 300s;

    # 反向代理到 Docker 容器
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;

        # 保留原始请求信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置（视频处理可能很慢）
        proxy_read_timeout 600s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
```

**启用配置:**

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/vmarker /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 配置 SSL 证书（使用 certbot）
sudo certbot --nginx -d api.yourdomain.com
```

### 1.5 VPS 部署步骤

```bash
# 1. SSH 登录到 VPS
ssh root@your-vps-ip

# 2. 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo apt install docker-compose -y

# 3. 克隆代码仓库（或上传代码）
git clone https://github.com/yourname/vmarker.git
cd vmarker/backend

# 4. 创建 .env 文件并配置环境变量
nano .env  # 填入上面的环境变量

# 5. 构建并启动容器
docker-compose up -d

# 6. 查看日志确认启动成功
docker-compose logs -f

# 7. 测试健康检查
curl http://localhost:8000/health
```

---

## 二、前端部署 (Vercel)

### 2.1 环境变量配置

在 Vercel Dashboard → Settings → Environment Variables 添加:

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | 后端 API 地址 |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Supabase 匿名密钥 |

### 2.2 Vercel 部署步骤

**方式 1: 通过 Vercel CLI**

```bash
cd web

# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署到生产环境
vercel --prod

# Vercel 会自动检测 Next.js 项目并配置构建
```

**方式 2: 通过 GitHub 集成（推荐）**

1. 在 Vercel Dashboard 点击 "New Project"
2. 导入你的 GitHub 仓库
3. 配置:
   - **Framework Preset:** Next.js
   - **Root Directory:** `web`
   - **Build Command:** `npm run build`（自动检测）
   - **Output Directory:** `.next`（自动检测）
4. 添加环境变量（见上表）
5. 点击 Deploy

**部署后自动配置:**
- 每次推送到 `master` 分支自动部署
- Pull Request 自动创建预览环境
- 自动 HTTPS + CDN

### 2.3 域名配置（可选）

如果要使用自定义域名:

1. Vercel Dashboard → Settings → Domains
2. 添加域名: `vmarker.yourdomain.com`
3. 配置 DNS（Vercel 会提供 CNAME 记录）
4. 等待 SSL 证书自动签发（几分钟内完成）

---

## 三、Supabase 认证集成

### 3.1 Supabase 项目设置

1. **创建项目**
   - 访问 https://supabase.com/dashboard
   - 点击 "New Project"
   - 选择新加坡区域（靠近你的 VPS）
   - 记录 Project URL 和 API Keys

2. **配置认证提供商**
   - Dashboard → Authentication → Providers
   - 启用 Email/Password 认证
   - （可选）启用 Google/GitHub OAuth

3. **获取关键信息**
   - `SUPABASE_URL`: Project Settings → API → Project URL
   - `SUPABASE_ANON_KEY`: Project Settings → API → anon public (前端用)
   - `SUPABASE_JWT_SECRET`: Project Settings → API → JWT Secret (后端验证用)

### 3.2 前端集成方案

**1. 安装依赖**

```bash
cd web
npm install @supabase/supabase-js @supabase/ssr
```

**2. 创建 Supabase 客户端** (`web/src/lib/supabase.ts`):

```typescript
/**
 * [INPUT]: 依赖 @supabase/supabase-js, process.env
 * [OUTPUT]: 对外提供 supabase 客户端实例
 * [POS]: lib/ 的认证服务客户端，被所有需要认证的组件消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**3. 修改 API 客户端添加认证** (`web/src/lib/api.ts`):

```typescript
// 在现有代码基础上添加
import { supabase } from './supabase'

// 修改 request 函数，自动附加 JWT token
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // 获取当前用户的 session
  const { data: { session } } = await supabase.auth.getSession()

  const headers: HeadersInit = {
    ...(options?.headers || {}),
  }

  // 如果已登录，添加 Authorization header
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  // 如果是 JSON 请求，添加 Content-Type
  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  return handleResponse<T>(response)
}
```

**4. 创建认证组件** (`web/src/components/auth/AuthProvider.tsx`):

```typescript
/**
 * [INPUT]: 依赖 @supabase/supabase-js, react
 * [OUTPUT]: 对外提供 AuthProvider, useAuth hook
 * [POS]: components/auth 的全局认证状态管理，被 app/layout.tsx 包裹
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取初始 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

**5. 添加登录/注册页面** (`web/src/app/auth/page.tsx`):

```typescript
/**
 * [INPUT]: 依赖 @/components/auth/AuthProvider, @/components/ui/*, react-hook-form
 * [OUTPUT]: 对外提供登录/注册页面
 * [POS]: app/auth 的认证入口，被未登录用户访问
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignIn) {
        await signIn(email, password)
        toast.success('登录成功')
        router.push('/app')
      } else {
        await signUp(email, password)
        toast.success('注册成功，请查收邮件验证')
      }
    } catch (error: any) {
      toast.error(error.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isSignIn ? '登录' : '注册'} vmarker
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-2">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '处理中...' : isSignIn ? '登录' : '注册'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setIsSignIn(!isSignIn)}
          className="w-full mt-4 text-sm text-muted-foreground hover:underline"
        >
          {isSignIn ? '没有账号？立即注册' : '已有账号？立即登录'}
        </button>
      </Card>
    </div>
  )
}
```

**6. 添加认证保护中间件** (`web/src/middleware.ts`):

```typescript
/**
 * [INPUT]: 依赖 next/server, @supabase/ssr
 * [OUTPUT]: 对外提供路由保护中间件
 * [POS]: 根目录中间件，保护 /app 路由需要登录
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 保护 /app 路由
  if (request.nextUrl.pathname.startsWith('/app') && !user) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // 已登录用户访问 /auth 重定向到 /app
  if (request.nextUrl.pathname === '/auth' && user) {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  return response
}

export const config = {
  matcher: ['/app/:path*', '/auth'],
}
```

### 3.3 后端 JWT 验证方案

**1. 安装依赖**

```bash
cd backend
uv add pyjwt cryptography python-jose[cryptography]
```

**2. 创建认证中间件** (`backend/src/vmarker/auth.py`):

```python
"""
[INPUT]: 依赖 fastapi, pyjwt, httpx, os
[OUTPUT]: 对外提供 require_auth 依赖注入函数
[POS]: vmarker/ 的认证验证模块，被所有需要保护的路由使用
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import os
import jwt
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# 从环境变量获取 Supabase JWT secret
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

if not SUPABASE_JWT_SECRET:
    raise RuntimeError("SUPABASE_JWT_SECRET environment variable not set")


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    验证 Supabase JWT token

    返回解码后的 payload，包含用户信息:
    - sub: 用户 ID
    - email: 用户邮箱
    - role: 用户角色
    """
    token = credentials.credentials

    try:
        # 验证并解码 JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",  # Supabase 默认 audience
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# 类型注解，便于在路由中使用
AuthUser = Annotated[dict, Depends(verify_token)]
```

**3. 修改路由添加认证保护** (示例 `backend/src/vmarker/api/routes/video.py`):

```python
# 在文件头部导入
from vmarker.auth import AuthUser

# 修改需要保护的路由，添加 user 参数
@router.post("/upload")
async def upload_video(
    file: UploadFile,
    user: AuthUser,  # ← 添加这个参数，FastAPI 会自动验证 token
):
    """上传视频并创建处理会话（需要认证）"""
    # user['sub'] 是用户 ID，可用于记录或限流
    # user['email'] 是用户邮箱

    # 原有业务逻辑...
    pass
```

**4. 修改 CORS 配置** (`backend/src/vmarker/api/main.py`):

```python
# 从环境变量读取允许的来源
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ← 改为从环境变量读取
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 四、环境变量完整清单

### 4.1 后端环境变量 (.env)

```bash
# ============ AI 服务配置 ============
API_BASE=https://api.deepseek.com/v1
API_KEY=sk-xxxxxxxxxxxxxxxx
API_MODEL=deepseek-chat
ASR_API_BASE=
ASR_MODEL=whisper-1

# ============ Supabase 配置 ============
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase

# ============ CORS 配置 ============
ALLOWED_ORIGINS=https://vmarker.vercel.app,https://your-domain.com
```

### 4.2 前端环境变量 (Vercel)

```bash
# ============ 后端 API ============
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# ============ Supabase 配置 ============
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**注意:**
- 前端变量必须以 `NEXT_PUBLIC_` 开头才能在浏览器中访问
- `SUPABASE_ANON_KEY` 是公开的，用于前端调用
- 后端的 `SUPABASE_JWT_SECRET` 是私密的，用于验证 token

---

## 五、完整部署流程

### 5.1 准备工作

```bash
# 1. 创建 Supabase 项目并获取密钥
# 访问 https://supabase.com/dashboard

# 2. 准备域名（可选）
# - 前端: vmarker.yourdomain.com (Vercel 配置)
# - 后端: api.yourdomain.com (VPS 配置)
```

### 5.2 后端部署

```bash
# SSH 登录 VPS
ssh root@your-vps-ip

# 安装 Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose -y

# 克隆代码
git clone https://github.com/yourname/vmarker.git
cd vmarker/backend

# 配置环境变量
nano .env  # 填入上面的环境变量

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 配置 Nginx + SSL（可选，但推荐）
# 参考 1.4 节配置
```

### 5.3 前端部署

```bash
# 方式 1: Vercel CLI
cd web
vercel --prod

# 方式 2: GitHub 集成（推荐）
# 1. 推送代码到 GitHub
# 2. 在 Vercel Dashboard 导入仓库
# 3. 配置环境变量
# 4. 点击 Deploy
```

### 5.4 验证部署

```bash
# 测试后端健康检查
curl https://api.yourdomain.com/health

# 测试前端访问
curl https://vmarker.yourdomain.com

# 测试认证流程
# 1. 访问前端注册账号
# 2. 查收邮件验证
# 3. 登录后尝试使用功能
# 4. 查看后端日志确认 token 验证成功
```

---

## 六、后续优化建议

### 6.1 性能优化

| 优化项 | 方案 | 优先级 |
|--------|------|--------|
| Session 持久化 | 使用 Redis 存储 session | 高 |
| CDN 加速 | Cloudflare / 腾讯云 CDN | 中 |
| 视频处理队列 | Celery + RabbitMQ | 中 |
| 数据库存储 | Supabase Database 存储任务记录 | 低 |

### 6.2 安全加固

| 优化项 | 方案 | 优先级 |
|--------|------|--------|
| 速率限制 | FastAPI limiter | 高 |
| 文件类型检查 | Magic number 验证 | 高 |
| 视频大小硬限制 | Nginx + FastAPI 双重验证 | 高 |
| HTTPS 强制 | Nginx 301 重定向 | 高 |
| API 监控 | Sentry / Prometheus | 中 |

### 6.3 可观测性

```bash
# 添加日志收集
docker-compose logs -f > /var/log/vmarker/api.log

# 配置日志轮转
logrotate /etc/logrotate.d/vmarker

# 监控磁盘使用（临时文件清理）
crontab -e
# 每天凌晨 3 点清理超过 24 小时的临时文件
0 3 * * * find /tmp/vmarker -type d -mtime +1 -exec rm -rf {} +
```

### 6.4 备份策略

```bash
# 定期备份环境变量
cp backend/.env backend/.env.backup

# 备份 Docker volumes
docker run --rm -v vmarker-temp:/data -v $(pwd):/backup \
  alpine tar czf /backup/vmarker-temp-backup.tar.gz /data
```

---

## 七、故障排查

### 7.1 后端问题

```bash
# 容器无法启动
docker-compose logs vmarker-api

# FFmpeg 缺失
docker exec -it vmarker-api which ffmpeg

# 端口占用
sudo lsof -i :8000

# 健康检查失败
curl http://localhost:8000/health
```

### 7.2 认证问题

```bash
# JWT 验证失败
# 检查 SUPABASE_JWT_SECRET 是否正确
echo $SUPABASE_JWT_SECRET

# Token 过期
# Supabase token 默认 1 小时过期，前端会自动刷新

# CORS 错误
# 检查 ALLOWED_ORIGINS 是否包含前端域名
```

### 7.3 前端问题

```bash
# Vercel 构建失败
# 检查 package.json 依赖是否正确
# 查看 Vercel Dashboard 构建日志

# API 连接失败
# 检查 NEXT_PUBLIC_API_URL 环境变量
# 使用浏览器 Network 面板查看请求详情
```

---

## 八、成本估算

| 服务 | 配置 | 月费用 | 说明 |
|------|------|--------|------|
| 腾讯云 VPS | 2C4G, 新加坡 | ¥100-200 | 按量计费可更便宜 |
| Vercel | Hobby Plan | $0 | 免费额度足够个人使用 |
| Supabase | Free Plan | $0 | 5万 MAU 免费 |
| 域名 | .com | ¥60/年 | 可选 |
| **总计** | - | **¥100-200/月** | 核心成本在 VPS |

**节省成本建议:**
- VPS 可选择腾讯云的学生机或首购优惠（低至 ¥50/月）
- 前端可用 Vercel 免费 plan（每月 100GB 流量）
- Supabase 免费 plan 每月 5 万活跃用户足够

---

## 九、文档维护

**架构变更时需要同步更新:**
- `DEPLOYMENT.md` - 本文档
- `CLAUDE.md` - 项目技术栈
- `backend/CLAUDE.md` - 后端模块文档
- `web/CLAUDE.md` - 前端模块文档

**[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md**
