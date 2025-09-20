# 马来西亚独中视频学习平台

## 项目概述

这是一个专为马来西亚独立中学（独中）初中学生（初中1-3年级）设计的综合视频学习平台，支持数学、科学、英文三个核心科目的在线视频学习，具备完整的学习管理功能。

## 🎯 核心功能

### ✅ 已实现功能

#### 🔐 用户认证系统
- 用户注册和登录
- 角色管理（学生/管理员）
- 年级选择（初中1-3）
- 安全的JWT令牌认证

#### 📱 现代化用户界面
- 响应式设计，支持桌面和移动设备
- 优雅的中文界面设计
- 直观的导航和用户体验
- Tailwind CSS样式系统

#### 🎥 视频学习功能
- YouTube视频集成播放
- 按学科分类（数学/科学/英文）
- 按年级筛选（初中1-3）
- 视频搜索和过滤
- 难度级别标识

#### 📝 学习笔记系统
- 视频时间戳笔记
- 富文本笔记编辑
- 笔记搜索和管理
- PDF导出功能（后端支持）

#### 📊 学习进度跟踪
- 视频观看进度记录
- 学习统计数据
- 个人学习仪表板
- 完成状态跟踪

#### 🗄️ 本地数据库存储
- SQLite3本地数据库
- 完整的数据模型设计
- 用户数据安全存储

### 📚 预装学习内容

#### 初中二年级数学 - 不等式专题（10个视频）
1. 不等式基础概念
2. 不等式的性质  
3. 一元一次不等式
4. 一元一次不等式组
5. 不等式的图形表示
6. 绝对值不等式
7. 分式不等式
8. 不等式的应用
9. 不等式综合练习
10. 不等式复习总结

## 🏗️ 技术架构

### 后端技术栈
- **Node.js + Express** - Web服务器框架
- **SQLite3** - 轻量级本地数据库
- **JWT** - 用户认证
- **Puppeteer** - PDF生成
- **bcryptjs** - 密码加密
- **CORS** - 跨域支持

### 前端技术栈
- **React 18** - 现代前端框架
- **TypeScript** - 类型安全
- **Vite** - 快速构建工具
- **Tailwind CSS** - 实用优先的CSS框架
- **React Query** - 数据获取和缓存
- **React Router** - 客户端路由
- **React Hot Toast** - 通知系统

### 数据库设计
- **user_profiles** - 用户信息和统计
- **subjects** - 学科分类管理
- **videos** - 视频资源和元数据
- **video_progress** - 学习进度跟踪
- **user_notes** - 个人学习笔记

## 🚀 部署信息

### 前端部署
- **状态**: ✅ 已部署
- **URL**: https://bs9p35yqg2ww.space.minimax.io
- **技术**: 静态文件托管

### 后端服务
- **状态**: 🔄 本地运行
- **端口**: 5000
- **API地址**: http://localhost:5000/api

### 默认管理员账户
- **邮箱**: admin@example.com
- **密码**: admin123
- **角色**: 管理员

## 📁 项目结构

```
video-learning-platform/
├── backend/                    # 后端服务
│   ├── database/              # 数据库相关
│   │   ├── init.js           # 数据库初始化
│   │   └── connection.js     # 数据库连接
│   ├── routes/               # API路由
│   │   ├── auth.js          # 认证路由
│   │   ├── videos.js        # 视频管理
│   │   ├── subjects.js      # 学科管理
│   │   ├── progress.js      # 进度跟踪
│   │   └── notes.js         # 笔记管理
│   ├── middleware/          # 中间件
│   ├── scripts/            # 脚本工具
│   ├── server.js           # 服务器入口
│   └── learning_platform.db # SQLite数据库
└── frontend/                # 前端应用
    └── chinese-learning-platform/
        ├── src/
        │   ├── components/     # React组件
        │   ├── contexts/      # React上下文
        │   ├── services/      # API服务
        │   ├── types/         # TypeScript类型
        │   └── lib/          # 工具函数
        └── dist/             # 构建输出
```

## 🎨 设计特色

### 视觉设计
- **现代简约**: 简洁优雅的界面设计
- **教育专属**: 专为学习场景优化的配色方案
- **中文友好**: 完全支持中文字体和排版
- **响应式**: 适配各种屏幕尺寸

### 用户体验
- **直观导航**: 清晰的菜单结构
- **快速搜索**: 高效的内容查找
- **进度可视**: 直观的学习进度显示
- **即时反馈**: 实时的操作响应

## 🔧 开发指南

### 环境要求
- Node.js 18+
- pnpm 或 npm
- 现代浏览器

### 统一安装依赖（推荐）
从项目根目录运行：
```bash
npm run install-deps
```
这将安装根目录、后端和前端的所有依赖。

### 统一开发启动（推荐）
从项目根目录运行：
```bash
npm run dev
```
这将同时启动后端（端口5000）和前端（端口5173）开发服务器。

### 后端启动（独立）
```bash
cd backend
npm install
npm run dev
```

### 前端开发（独立）
```bash
cd frontend/chinese-learning-platform
pnpm install
pnpm run dev
```

### 前端构建
```bash
cd frontend/chinese-learning-platform
pnpm run build
```

## 📋 API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/profile` - 获取用户信息

### 视频接口
- `GET /api/videos` - 获取视频列表
- `GET /api/videos/:id` - 获取单个视频
- `POST /api/videos` - 添加视频（管理员）
- `PUT /api/videos/:id` - 更新视频（管理员）
- `DELETE /api/videos/:id` - 删除视频（管理员）

### 学科接口
- `GET /api/subjects` - 获取学科列表
- `POST /api/subjects` - 添加学科（管理员）

### 进度接口
- `GET /api/progress` - 获取学习进度
- `POST /api/progress/update` - 更新学习进度
- `GET /api/progress/stats` - 获取学习统计

### 笔记接口
- `GET /api/notes` - 获取笔记列表
- `POST /api/notes` - 创建笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记
- `POST /api/notes/export/pdf` - 导出PDF

## 🎯 待完善功能

### 高优先级
1. **YouTube Player API集成** - 完整的播放控制和进度跟踪
2. **PDF笔记导出** - 前端触发的笔记导出功能
3. **学习分析** - 详细的学习数据分析和可视化
4. **视频管理界面** - 管理员的可视化视频管理

### 中优先级
1. **用户设置** - 个人偏好和账户设置
2. **学习提醒** - 学习计划和提醒功能
3. **社交功能** - 学生互动和讨论
4. **移动端优化** - 更好的移动端体验

### 扩展功能
1. **离线学习** - 视频缓存和离线笔记
2. **AI助手** - 智能学习建议
3. **多媒体支持** - 音频、文档等其他学习资源
4. **班级管理** - 教师端功能

## 🛡️ 安全性

- ✅ JWT令牌认证
- ✅ 密码哈希加密
- ✅ CORS配置
- ✅ 输入验证
- ✅ SQL注入防护
- ✅ 角色权限控制

## 📈 性能优化

- ✅ React Query数据缓存
- ✅ 代码分割和懒加载
- ✅ 图片优化
- ✅ 压缩构建输出
- ✅ 服务端缓存策略

## 🎓 教育价值

这个平台专门为马来西亚独中学生设计，充分考虑了华文教育的特殊需求：

1. **本土化内容**: 适合马来西亚独中课程体系
2. **中英双语**: 支持华文和英文学习资源
3. **渐进式学习**: 按年级和难度分层设计
4. **个性化体验**: 根据学生需求定制学习路径
5. **数据驱动**: 通过学习数据优化教学效果

## 📞 技术支持

如需技术支持或功能建议，请联系开发团队。

---

**开发者**: MiniMax Agent  
**版本**: 1.0.0  
**更新时间**: 2025年9月  
**许可证**: MIT