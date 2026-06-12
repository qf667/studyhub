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

## 免费部署到 Render

### 第一步：推送到 GitHub

1. 在 GitHub 上创建一个新仓库（如 `studyhub`）
2. 执行以下命令：

```bash
cd C:\Users\AHNT\Desktop\StudyHub
git add .
git commit -m "init: studyhub student management system"
git branch -M main
git remote add origin https://github.com/你的用户名/studyhub.git
git push -u origin main
```

### 第二步：在 Render 部署

1. 打开 https://render.com 注册账号（可用 GitHub 登录）
2. 点击 **New** → **Web Service**
3. 连接你的 GitHub 仓库 `studyhub`
4. 配置如下：
   - **Name**: `studyhub`
   - **Runtime**: `Node`
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command**: `cd server && node index.js`
   - **Instance Type**: `Free`
5. 点击 **Create Web Service**
6. 等待部署完成（约3-5分钟）
7. 部署成功后会得到一个地址：`https://studyhub.onrender.com`

### 第三步：访问

用手机或任何电脑浏览器打开 `https://studyhub.onrender.com` 即可使用。

默认管理员账号：`admin` / `admin123`

## 注意事项

- Render 免费套餐在无请求 15 分钟后会休眠，首次访问需等待约 30 秒
- SQLite 数据库文件存储在服务器上，重启不丢失
- 如需自定义域名，在 Render 的 Settings → Custom Domains 中添加
