# Auto Course Player v3.0

智能自动化课程播放器 - 基于计算机视觉和机器学习的自动化教育工具

## 🌟 特性

### 🎯 核心功能
- **智能视觉识别**: 基于OpenCV和Tesseract的高精度元素识别
- **自动播放控制**: 智能识别播放按钮、进度条和视频控件
- **广告自动跳过**: 智能检测并跳过各类广告内容
- **弹窗自动关闭**: 自动识别和关闭干扰性弹窗
- **课程自动切换**: 完成当前课程后自动播放下一集
- **学习进度跟踪**: 记录学习进度和统计数据

### 🤖 智能学习
- **自适应算法**: 基于强化学习的自适应操作策略
- **模式识别**: 自动学习网站布局和按钮模式
- **用户行为分析**: 分析用户偏好并优化操作流程
- **持续优化**: 通过使用数据不断改进识别准确率

### 🎨 用户界面
- **现代化设计**: 基于Vue.js的响应式用户界面
- **实时监控**: 实时显示运行状态和操作日志
- **可视化配置**: 直观的设置界面和参数调整
- **多主题支持**: 支持明暗主题切换

### 🔧 高级功能
- **批量操作**: 支持批量课程处理
- **定时任务**: 支持定时启动和停止
- **数据导出**: 学习数据和日志导出功能
- **插件系统**: 可扩展的插件架构
- **多平台支持**: 支持主流在线教育平台

## 🚀 快速开始

### 系统要求
- **操作系统**: Windows 10/11, macOS 10.14+, Linux (Ubuntu 18.04+)
- **Node.js**: >= 14.0.0
- **内存**: 最低 4GB RAM，推荐 8GB+
- **存储**: 至少 500MB 可用空间
- **显示器**: 分辨率 1280x720 或更高
- **网络**: 稳定的互联网连接

### 安装步骤

#### 方式一：预编译版本（推荐）
1. 从 [Releases](https://github.com/joky1987/auto_course_player_v3/releases) 页面下载最新版本
2. 解压下载的文件
3. 运行 `AutoCoursePlayer.exe` (Windows) 或 `AutoCoursePlayer.app` (macOS)

#### 方式二：从源码构建（开发者）
```bash
# 克隆仓库
git clone https://github.com/joky1987/auto_course_player_v3.git
cd auto_course_player_v3

# 安装依赖
npm install

# 启动应用（推荐使用改进的启动脚本）
node start-improved.js

# 或使用传统方式
npm start
```

#### 方式三：开发模式
```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build
```

### 🔧 故障排除

如果遇到启动问题，请尝试以下解决方案：

1. **依赖问题**
   ```bash
   # 清理并重新安装依赖
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **权限问题**
   - Windows: 以管理员身份运行
   - macOS/Linux: 检查文件权限

3. **使用改进的启动脚本**
   ```bash
   node start-improved.js
   ```
   该脚本提供更好的错误诊断和自动修复功能。

4. **查看详细日志**
   ```bash
   # 启用调试模式
   NODE_ENV=development node start-improved.js
   ```

更多帮助请查看 [QUICK_START.md](./QUICK_START.md) 和 [ARCHITECTURE_REFACTOR.md](./ARCHITECTURE_REFACTOR.md)

### 首次使用
1. 启动应用程序
2. 完成初始设置向导
3. 配置目标网站和课程信息
4. 调整视觉识别参数
5. 开始自动播放

## 📖 使用指南

### 基本操作

#### 1. 配置目标网站
- 打开设置页面
- 选择或添加目标教育平台
- 配置登录信息（可选）
- 设置课程列表URL

#### 2. 调整识别参数
```json
{
  "vision": {
    "confidence": 0.8,
    "timeout": 5000,
    "retries": 3,
    "ocrLanguage": "chi_sim+eng"
  }
}
```

#### 3. 启动自动播放
- 点击"开始自动播放"按钮
- 监控运行状态和日志
- 根据需要暂停或停止

## 🤝 贡献指南

### 开发环境设置
```bash
# 克隆仓库
git clone https://github.com/joky1987/auto_course_player_v3.git
cd auto_course_player_v3

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 Airbnb JavaScript 风格指南
- 编写单元测试和集成测试
- 添加详细的代码注释

### 提交流程
1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 件了解详情

## 📞 联系我们

- **项目主页**: https://github.com/joky1987/auto_course_player_v3
- **问题反馈**: https://github.com/joky1987/auto_course_player_v3/issues
- **讨论区**: https://github.com/joky1987/auto_course_player_v3/discussions

---

**Auto Course Player v3.0** - 让学习更智能，让教育更高效！

如果这个项目对你有帮助，请给我们一个 ⭐ Star！