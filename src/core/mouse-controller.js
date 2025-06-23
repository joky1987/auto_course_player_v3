const robot = require('robotjs');
const { promisify } = require('util');

/**
 * 鼠标控制器 - 负责系统级鼠标和键盘操作
 */
class MouseController {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.config = options.config || {};
    
    // 默认配置
    this.defaultConfig = {
      mouseSpeed: 3,
      clickDelay: 100,
      doubleClickDelay: 50,
      scrollSpeed: 3,
      keyDelay: 50,
      moveSmooth: true,
      safetyMargin: 10, // 安全边距，避免点击到屏幕边缘
      maxRetries: 3
    };
    
    this.config = { ...this.defaultConfig, ...this.config };
    
    // 设置robotjs配置
    robot.setMouseDelay(this.config.clickDelay);
    robot.setKeyboardDelay(this.config.keyDelay);
    
    // 获取屏幕尺寸
    this.screenSize = robot.getScreenSize();
    
    this.logger.info(`鼠标控制器初始化完成，屏幕尺寸: ${this.screenSize.width}x${this.screenSize.height}`);
  }

  /**
   * 执行鼠标操作
   */
  async performAction(action) {
    try {
      const { type, ...params } = action;
      
      switch (type) {
        case 'click':
          return await this.click(params);
        case 'doubleClick':
          return await this.doubleClick(params);
        case 'rightClick':
          return await this.rightClick(params);
        case 'move':
          return await this.moveTo(params);
        case 'drag':
          return await this.drag(params);
        case 'scroll':
          return await this.scroll(params);
        case 'key':
          return await this.pressKey(params);
        case 'type':
          return await this.typeText(params);
        case 'combo':
          return await this.keyCombo(params);
        default:
          throw new Error(`不支持的操作类型: ${type}`);
      }
    } catch (error) {
      this.logger.error(`鼠标操作失败 [${action.type}]:`, error);
      throw error;
    }
  }

  /**
   * 单击
   */
  async click(params) {
    const { x, y, button = 'left', smooth = this.config.moveSmooth } = params;
    
    // 验证坐标
    if (!this.isValidCoordinate(x, y)) {
      throw new Error(`无效的坐标: (${x}, ${y})`);
    }
    
    try {
      // 平滑移动到目标位置
      if (smooth) {
        await this.smoothMoveTo(x, y);
      } else {
        robot.moveMouse(x, y);
      }
      
      // 等待一小段时间确保鼠标到位
      await this.sleep(this.config.clickDelay);
      
      // 执行点击
      robot.mouseClick(button);
      
      this.logger.info(`点击完成: (${x}, ${y}) [${button}]`);
      
      return {
        success: true,
        action: 'click',
        coordinates: { x, y },
        button
      };
    } catch (error) {
      this.logger.error(`点击失败: (${x}, ${y})`, error);
      throw error;
    }
  }

  /**
   * 双击
   */
  async doubleClick(params) {
    const { x, y, button = 'left', smooth = this.config.moveSmooth } = params;
    
    if (!this.isValidCoordinate(x, y)) {
      throw new Error(`无效的坐标: (${x}, ${y})`);
    }
    
    try {
      if (smooth) {
        await this.smoothMoveTo(x, y);
      } else {
        robot.moveMouse(x, y);
      }
      
      await this.sleep(this.config.clickDelay);
      
      // 执行双击
      robot.mouseClick(button, true);
      
      this.logger.info(`双击完成: (${x}, ${y}) [${button}]`);
      
      return {
        success: true,
        action: 'doubleClick',
        coordinates: { x, y },
        button
      };
    } catch (error) {
      this.logger.error(`双击失败: (${x}, ${y})`, error);
      throw error;
    }
  }

  /**
   * 右键点击
   */
  async rightClick(params) {
    return await this.click({ ...params, button: 'right' });
  }

  /**
   * 移动鼠标
   */
  async moveTo(params) {
    const { x, y, smooth = this.config.moveSmooth } = params;
    
    if (!this.isValidCoordinate(x, y)) {
      throw new Error(`无效的坐标: (${x}, ${y})`);
    }
    
    try {
      if (smooth) {
        await this.smoothMoveTo(x, y);
      } else {
        robot.moveMouse(x, y);
      }
      
      this.logger.debug(`鼠标移动到: (${x}, ${y})`);
      
      return {
        success: true,
        action: 'move',
        coordinates: { x, y }
      };
    } catch (error) {
      this.logger.error(`鼠标移动失败: (${x}, ${y})`, error);
      throw error;
    }
  }

  /**
   * 拖拽
   */
  async drag(params) {
    const { fromX, fromY, toX, toY, button = 'left', smooth = true } = params;
    
    if (!this.isValidCoordinate(fromX, fromY) || !this.isValidCoordinate(toX, toY)) {
      throw new Error(`无效的坐标: from(${fromX}, ${fromY}) to(${toX}, ${toY})`);
    }
    
    try {
      // 移动到起始位置
      if (smooth) {
        await this.smoothMoveTo(fromX, fromY);
      } else {
        robot.moveMouse(fromX, fromY);
      }
      
      await this.sleep(this.config.clickDelay);
      
      // 按下鼠标
      robot.mouseToggle('down', button);
      
      await this.sleep(50);
      
      // 拖拽到目标位置
      if (smooth) {
        await this.smoothMoveTo(toX, toY);
      } else {
        robot.moveMouse(toX, toY);
      }
      
      await this.sleep(50);
      
      // 释放鼠标
      robot.mouseToggle('up', button);
      
      this.logger.info(`拖拽完成: from(${fromX}, ${fromY}) to(${toX}, ${toY})`);
      
      return {
        success: true,
        action: 'drag',
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
        button
      };
    } catch (error) {
      this.logger.error(`拖拽失败: from(${fromX}, ${fromY}) to(${toX}, ${toY})`, error);
      // 确保释放鼠标按钮
      try {
        robot.mouseToggle('up', button);
      } catch (e) {
        // 忽略释放时的错误
      }
      throw error;
    }
  }

  /**
   * 滚动
   */
  async scroll(params) {
    const { x, y, direction = 'down', clicks = 3 } = params;
    
    try {
      // 如果指定了坐标，先移动到该位置
      if (x !== undefined && y !== undefined) {
        if (!this.isValidCoordinate(x, y)) {
          throw new Error(`无效的坐标: (${x}, ${y})`);
        }
        robot.moveMouse(x, y);
        await this.sleep(100);
      }
      
      // 执行滚动
      const scrollDirection = direction === 'up' ? 'up' : 'down';
      robot.scrollMouse(clicks, scrollDirection);
      
      this.logger.debug(`滚动完成: ${direction} ${clicks}次`);
      
      return {
        success: true,
        action: 'scroll',
        direction,
        clicks,
        coordinates: x !== undefined ? { x, y } : null
      };
    } catch (error) {
      this.logger.error(`滚动失败:`, error);
      throw error;
    }
  }

  /**
   * 按键
   */
  async pressKey(params) {
    const { key, modifiers = [] } = params;
    
    try {
      // 按下修饰键
      for (const modifier of modifiers) {
        robot.keyToggle(modifier, 'down');
      }
      
      await this.sleep(10);
      
      // 按下主键
      robot.keyTap(key);
      
      await this.sleep(10);
      
      // 释放修饰键
      for (const modifier of modifiers.reverse()) {
        robot.keyToggle(modifier, 'up');
      }
      
      this.logger.debug(`按键完成: ${modifiers.join('+')}${modifiers.length ? '+' : ''}${key}`);
      
      return {
        success: true,
        action: 'key',
        key,
        modifiers
      };
    } catch (error) {
      this.logger.error(`按键失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 输入文本
   */
  async typeText(params) {
    const { text, speed = 50 } = params;
    
    try {
      // 逐字符输入，模拟真实打字
      for (const char of text) {
        robot.typeString(char);
        await this.sleep(speed);
      }
      
      this.logger.debug(`文本输入完成: "${text}"`);
      
      return {
        success: true,
        action: 'type',
        text,
        length: text.length
      };
    } catch (error) {
      this.logger.error(`文本输入失败: "${text}"`, error);
      throw error;
    }
  }

  /**
   * 组合键
   */
  async keyCombo(params) {
    const { keys } = params;
    
    try {
      // 同时按下所有键
      for (const key of keys) {
        robot.keyToggle(key, 'down');
      }
      
      await this.sleep(50);
      
      // 释放所有键
      for (const key of keys.reverse()) {
        robot.keyToggle(key, 'up');
      }
      
      this.logger.debug(`组合键完成: ${keys.join('+')}`);
      
      return {
        success: true,
        action: 'combo',
        keys
      };
    } catch (error) {
      this.logger.error(`组合键失败: ${keys.join('+')}`, error);
      throw error;
    }
  }

  /**
   * 平滑移动鼠标
   */
  async smoothMoveTo(targetX, targetY) {
    const currentPos = robot.getMousePos();
    const startX = currentPos.x;
    const startY = currentPos.y;
    
    const distance = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));
    const steps = Math.max(10, Math.min(50, Math.floor(distance / 10)));
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = Math.round(startX + (targetX - startX) * progress);
      const currentY = Math.round(startY + (targetY - startY) * progress);
      
      robot.moveMouse(currentX, currentY);
      await this.sleep(Math.max(1, Math.floor(20 / this.config.mouseSpeed)));
    }
  }

  /**
   * 验证坐标是否有效
   */
  isValidCoordinate(x, y) {
    const margin = this.config.safetyMargin;
    return x >= margin && 
           y >= margin && 
           x <= this.screenSize.width - margin && 
           y <= this.screenSize.height - margin;
  }

  /**
   * 获取当前鼠标位置
   */
  getCurrentPosition() {
    return robot.getMousePos();
  }

  /**
   * 获取屏幕尺寸
   */
  getScreenSize() {
    return this.screenSize;
  }

  /**
   * 获取像素颜色
   */
  getPixelColor(x, y) {
    if (!this.isValidCoordinate(x, y)) {
      throw new Error(`无效的坐标: (${x}, ${y})`);
    }
    
    return robot.getPixelColor(x, y);
  }

  /**
   * 等待指定时间
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量执行操作
   */
  async performBatch(actions) {
    const results = [];
    
    for (const action of actions) {
      try {
        const result = await this.performAction(action);
        results.push(result);
        
        // 操作间隔
        if (action.delay) {
          await this.sleep(action.delay);
        }
      } catch (error) {
        results.push({
          success: false,
          action: action.type,
          error: error.message
        });
        
        // 如果设置了停止错误，则中断执行
        if (action.stopOnError) {
          break;
        }
      }
    }
    
    return results;
  }

  /**
   * 智能点击 - 带重试机制
   */
  async smartClick(params) {
    const { x, y, retries = this.config.maxRetries, verifyClick = false } = params;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.click({ x, y });
        
        if (verifyClick) {
          // 验证点击是否成功（可以通过截图对比等方式）
          await this.sleep(200);
          // 这里可以添加验证逻辑
        }
        
        return result;
      } catch (error) {
        this.logger.warn(`智能点击第 ${attempt} 次尝试失败:`, error.message);
        
        if (attempt === retries) {
          throw error;
        }
        
        // 重试前等待
        await this.sleep(500 * attempt);
      }
    }
  }

  /**
   * 模拟人类操作模式
   */
  async humanLikeAction(action) {
    // 添加随机延迟，模拟人类反应时间
    const randomDelay = Math.random() * 200 + 100;
    await this.sleep(randomDelay);
    
    // 在坐标上添加小幅随机偏移
    if (action.x !== undefined && action.y !== undefined) {
      const offsetX = (Math.random() - 0.5) * 6; // ±3像素
      const offsetY = (Math.random() - 0.5) * 6;
      
      action.x = Math.round(action.x + offsetX);
      action.y = Math.round(action.y + offsetY);
    }
    
    return await this.performAction(action);
  }
}

module.exports = MouseController;