const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const winston = require('winston');

// 导入核心模块
const VisionDetector = require('../core/vision-detector');
const MouseController = require('../core/mouse-controller');
const AutoPlayer = require('../core/auto-player');
const ConfigManager = require('../utils/config-manager');

// 配置日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class MainApplication {
  constructor() {
    this.mainWindow = null;
    this.visionDetector = null;
    this.mouseController = null;
    this.autoPlayer = null;
    this.configManager = new ConfigManager();
    
    this.initializeApp();
  }

  async initializeApp() {
    // 等待 Electron 准备就绪
    await app.whenReady();
    
    // 创建主窗口
    this.createMainWindow();
    
    // 初始化核心模块
    await this.initializeCoreModules();
    
    // 设置 IPC 监听器
    this.setupIpcHandlers();
    
    logger.info('应用程序初始化完成');
  }

  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, '../ui/preload.js')
      },
      icon: path.join(__dirname, '../../assets/icon.svg'),
      title: '智能视觉识别自动网课播放器 v3.0'
    });

    // 加载主界面
    this.mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

    // 开发模式下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }

    // 窗口关闭事件
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  async initializeCoreModules() {
    try {
      // 初始化视觉检测器
      this.visionDetector = new VisionDetector({
        logger: logger,
        config: this.configManager.getVisionConfig()
      });
      await this.visionDetector.initialize();

      // 初始化鼠标控制器
      this.mouseController = new MouseController({
        logger: logger,
        config: this.configManager.getMouseConfig()
      });

      // 初始化自动播放器
      this.autoPlayer = new AutoPlayer({
        visionDetector: this.visionDetector,
        mouseController: this.mouseController,
        logger: logger,
        config: this.configManager.getPlayerConfig()
      });

      logger.info('核心模块初始化完成');
    } catch (error) {
      logger.error('核心模块初始化失败:', error);
      dialog.showErrorBox('初始化错误', `核心模块初始化失败: ${error.message}`);
    }
  }

  setupIpcHandlers() {
    // 应用控制
    ipcMain.handle('app:minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('app:maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('app:close', () => {
      this.mainWindow?.close();
    });

    ipcMain.handle('app:getVersion', () => {
      return require('../../package.json').version;
    });

    // 自动播放器控制
    ipcMain.handle('start-auto-play', async (event, options) => {
      try {
        const result = await this.autoPlayer.start(options);
        return { success: true, data: result };
      } catch (error) {
        logger.error('启动自动播放失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stop-auto-play', async () => {
      try {
        await this.autoPlayer.stop();
        return { success: true };
      } catch (error) {
        logger.error('停止自动播放失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('pause-auto-play', async () => {
      try {
        await this.autoPlayer.pause();
        return { success: true };
      } catch (error) {
        logger.error('暂停自动播放失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autoPlayer:resume', async () => {
      try {
        await this.autoPlayer.resume();
        return { success: true };
      } catch (error) {
        logger.error('恢复自动播放失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autoPlayer:getStatus', async () => {
      try {
        const status = await this.autoPlayer.getStatus();
        return { success: true, data: status };
      } catch (error) {
        logger.error('获取播放状态失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('autoPlayer:getStatistics', async () => {
      try {
        const statistics = await this.autoPlayer.getStatistics();
        return { success: true, data: statistics };
      } catch (error) {
        logger.error('获取统计数据失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 视觉检测
    ipcMain.handle('vision:takeScreenshot', async () => {
      try {
        const screenshot = await this.visionDetector.takeScreenshot();
        return { success: true, data: screenshot };
      } catch (error) {
        logger.error('截图失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('vision:detectElements', async (event, options) => {
      try {
        const elements = await this.visionDetector.detectElements(options);
        return { success: true, data: elements };
      } catch (error) {
        logger.error('视觉识别失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('vision:getDetectionHistory', async () => {
      try {
        const history = await this.visionDetector.getDetectionHistory();
        return { success: true, data: history };
      } catch (error) {
        logger.error('获取检测历史失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('vision:calibrate', async (event, area) => {
      try {
        const result = await this.visionDetector.calibrate(area);
        return { success: true, data: result };
      } catch (error) {
        logger.error('校准失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 配置管理
    ipcMain.handle('config:get', async (event, key) => {
      try {
        const config = this.configManager.get(key);
        return { success: true, data: config };
      } catch (error) {
        logger.error('获取配置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:set', async (event, key, value) => {
      try {
        await this.configManager.set(key, value);
        return { success: true };
      } catch (error) {
        logger.error('设置配置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:getAll', async () => {
      try {
        const config = this.configManager.getAll();
        return { success: true, data: config };
      } catch (error) {
        logger.error('获取所有配置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:reset', async () => {
      try {
        await this.configManager.reset();
        return { success: true };
      } catch (error) {
        logger.error('重置配置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:export', async () => {
      try {
        const result = await this.configManager.export();
        return { success: true, data: result };
      } catch (error) {
        logger.error('导出配置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('config:import', async (event, configData) => {
      try {
        await this.configManager.import(configData);
        return { success: true };
      } catch (error) {
        logger.error('导入配置失败:', error);
        return { success: false, error: error.message };
      }
    });
  }
}

// 应用程序事件处理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const mainApp = new MainApplication();
  }
});

// 启动应用程序
const mainApp = new MainApplication();

// 导出主应用实例
module.exports = mainApp;