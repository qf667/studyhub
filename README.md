# StudyHub 学生管理系统

## 本地运行

```bash
# 安装依赖
cd client && npm install && cd ../server && npm install && cd ..

# 构建前端
cd client && npm run build && cd ..

# 启动服务
cd server && node index.js
```

访问 http://localhost:3000

默认管理员账号：`admin` / `admin123`

## 免费部署到 Vercel + Supabase

### 第一步：创建 Supabase 数据库

1. 打开 https://supabase.com 注册账号（可用 GitHub 登录）
2. 点击 **New Project** 创建项目
3. 记下 **Database Password**（创建时设置的密码）
4. 进入项目 → **Settings** → **Database** → **Connection string** → **URI**
5. 复制连接字符串，类似：`postgresql://postgres:xxx@xxx.supabase.co:5432/postgres`

### 第二步：初始化数据库

```bash
# 设置环境变量
export DATABASE_URL="你的Supabase连接字符串"

# 运行迁移
cd server && node migrate.js
```

### 第三步：推送到 GitHub

```bash
cd C:\Users\AHNT\Desktop\StudyHub
git init
git add .
git commit -m "init: studyhub student management system"
git branch -M main
git remote add origin https://github.com/你的用户名/studyhub.git
git push -u origin main
```

### 第四步：在 Vercel 部署

1. 打开 https://vercel.com 注册账号（可用 GitHub 登录）
2. 点击 **Add New** → **Project**
3. 导入你的 GitHub 仓库 `studyhub`
4. 配置环境变量：
   - `DATABASE_URL` = 你的 Supabase 连接字符串
   - `JWT_SECRET` = 任意随机字符串
   - `NODE_ENV` = `production`
5. 点击 **Deploy**
6. 等待部署完成（约1-2分钟）
7. 部署成功后会得到一个地址：`https://studyhub.vercel.app`

### 第五步：访问

用手机或任何电脑浏览器打开 `https://studyhub.vercel.app` 即可使用。

默认管理员账号：`admin` / `admin123`

## 功能说明

- **管理员端**：用户管理、课程审核、系统配置
- **教师端**：课程管理、教材上传、AI出题、作业批改
- **学生端**：课程学习、在线答题、错题本、AI问答、学习报告

## 技术栈

- **前端**：Vue 3 + TypeScript + Element Plus + ECharts
- **后端**：Node.js + Express + PostgreSQL (Supabase)
- **部署**：Vercel (Serverless) + Supabase (Database)

## 注意事项

- Vercel 免费套餐无冷启动延迟，访问体验流畅
- Supabase 免费套餐提供 500MB 数据库空间，足够日常使用
- 如需自定义域名，在 Vercel 的 Settings → Domains 中添加
