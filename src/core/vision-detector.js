const Jimp = require('jimp');
const Tesseract = require('tesseract.js');
const fs = require('fs-extra');
const path = require('path');
const screenshot = require('screenshot-desktop');

/**
 * 视觉检测器 - 负责屏幕截图、图像识别和元素检测
 */
class VisionDetector {
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.config = options.config || {};
    this.isInitialized = false;
    
    // 默认配置
    this.defaultConfig = {
      screenshotPath: './screenshots',
      imageQuality: 90,
      ocrLanguage: 'chi_sim+eng',
      detectionThreshold: 0.8,
      templateMatchingThreshold: 0.7
    };
    
    this.config = { ...this.defaultConfig, ...this.config };
    
    // 预定义的UI元素模板
    this.uiTemplates = {
      playButton: {
        keywords: ['播放', '开始', 'play', '▶'],
        colors: ['#1890ff', '#409eff', '#007bff'],
        shapes: ['circle', 'rounded-rect']
      },
      pauseButton: {
        keywords: ['暂停', 'pause', '⏸'],
        colors: ['#f56c6c', '#ff4d4f'],
        shapes: ['circle', 'rounded-rect']
      },
      nextButton: {
        keywords: ['下一集', '下一个', '下一课', 'next', '→'],
        colors: ['#67c23a', '#52c41a'],
        shapes: ['rect', 'rounded-rect']
      },
      videoArea: {
        keywords: ['video', '视频'],
        colors: ['#000000', '#1a1a1a'],
        shapes: ['rect']
      },
      progressBar: {
        keywords: ['progress', '进度'],
        colors: ['#1890ff', '#409eff'],
        shapes: ['rect', 'line']
      }
    };
  }

  /**
   * 初始化视觉检测器
   */
  async initialize() {
    try {
      // 确保截图目录存在
      await fs.ensureDir(this.config.screenshotPath);
      
      // 初始化OCR引擎
      this.ocrWorker = await Tesseract.createWorker({
        logger: m => this.logger.debug('OCR:', m)
      });
      
      await this.ocrWorker.loadLanguage(this.config.ocrLanguage);
      await this.ocrWorker.initialize(this.config.ocrLanguage);
      
      this.isInitialized = true;
      this.logger.info('视觉检测器初始化完成');
    } catch (error) {
      this.logger.error('视觉检测器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 截取屏幕截图
   */
  async takeScreenshot(options = {}) {
    try {
      const timestamp = Date.now();
      const filename = options.filename || `screenshot_${timestamp}.png`;
      const filepath = path.join(this.config.screenshotPath, filename);
      
      // 获取屏幕截图
      const imgBuffer = await screenshot.getScreenshot();
      
      // 保存截图
      await fs.writeFile(filepath, imgBuffer);
      
      // 使用Jimp处理图像
      const image = await Jimp.read(imgBuffer);
      
      // 如果指定了区域，则裁剪
      if (options.region) {
        const { x, y, width, height } = options.region;
        image.crop(x, y, width, height);
      }
      
      // 调整图像质量
      if (options.quality) {
        image.quality(options.quality);
      }
      
      const processedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
      
      this.logger.info(`截图完成: ${filepath}`);
      
      return {
        filepath,
        buffer: processedBuffer,
        image,
        timestamp,
        size: {
          width: image.bitmap.width,
          height: image.bitmap.height
        }
      };
    } catch (error) {
      this.logger.error('截图失败:', error);
      throw error;
    }
  }

  /**
   * 检测屏幕上的UI元素
   */
  async detectElements(options = {}) {
    try {
      // 获取截图
      const screenshot = await this.takeScreenshot(options);
      
      const results = {
        timestamp: screenshot.timestamp,
        elements: [],
        textRegions: [],
        buttons: [],
        videos: []
      };
      
      // OCR文字识别
      if (options.detectText !== false) {
        const textResults = await this.performOCR(screenshot.buffer);
        results.textRegions = textResults;
      }
      
      // 按钮检测
      if (options.detectButtons !== false) {
        const buttons = await this.detectButtons(screenshot.image, results.textRegions);
        results.buttons = buttons;
      }
      
      // 视频区域检测
      if (options.detectVideos !== false) {
        const videos = await this.detectVideoAreas(screenshot.image);
        results.videos = videos;
      }
      
      // 自定义元素检测
      if (options.customElements) {
        for (const element of options.customElements) {
          const detected = await this.detectCustomElement(screenshot.image, element);
          if (detected) {
            results.elements.push(detected);
          }
        }
      }
      
      this.logger.info(`元素检测完成，发现 ${results.elements.length + results.buttons.length + results.videos.length} 个元素`);
      
      return results;
    } catch (error) {
      this.logger.error('元素检测失败:', error);
      throw error;
    }
  }

  /**
   * 执行OCR文字识别
   */
  async performOCR(imageBuffer) {
    try {
      const { data } = await this.ocrWorker.recognize(imageBuffer);
      
      const textRegions = data.words.map(word => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0
        }
      })).filter(word => word.confidence > 60); // 过滤低置信度文字
      
      return textRegions;
    } catch (error) {
      this.logger.error('OCR识别失败:', error);
      return [];
    }
  }

  /**
   * 检测按钮元素
   */
  async detectButtons(image, textRegions) {
    const buttons = [];
    
    // 基于文字识别结果查找按钮
    for (const textRegion of textRegions) {
      for (const [buttonType, template] of Object.entries(this.uiTemplates)) {
        if (buttonType.includes('Button')) {
          const isMatch = template.keywords.some(keyword => 
            textRegion.text.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isMatch) {
            buttons.push({
              type: buttonType,
              text: textRegion.text,
              confidence: textRegion.confidence,
              bbox: textRegion.bbox,
              center: {
                x: textRegion.bbox.x + textRegion.bbox.width / 2,
                y: textRegion.bbox.y + textRegion.bbox.height / 2
              }
            });
          }
        }
      }
    }
    
    return buttons;
  }

  /**
   * 检测视频播放区域
   */
  async detectVideoAreas(image) {
    const videos = [];
    
    try {
      // 检测黑色区域（可能是视频播放区域）
      const width = image.bitmap.width;
      const height = image.bitmap.height;
      
      // 简单的黑色区域检测算法
      const blockSize = 50;
      for (let y = 0; y < height - blockSize; y += blockSize) {
        for (let x = 0; x < width - blockSize; x += blockSize) {
          let blackPixels = 0;
          let totalPixels = 0;
          
          // 检查块内的像素
          for (let dy = 0; dy < blockSize; dy += 5) {
            for (let dx = 0; dx < blockSize; dx += 5) {
              const pixelColor = Jimp.intToRGBA(image.getPixelColor(x + dx, y + dy));
              const brightness = (pixelColor.r + pixelColor.g + pixelColor.b) / 3;
              
              if (brightness < 30) { // 很暗的像素
                blackPixels++;
              }
              totalPixels++;
            }
          }
          
          // 如果黑色像素比例超过阈值，认为是视频区域
          if (blackPixels / totalPixels > 0.7) {
            videos.push({
              type: 'videoArea',
              bbox: {
                x: x,
                y: y,
                width: blockSize * 4, // 扩大检测区域
                height: blockSize * 3
              },
              center: {
                x: x + blockSize * 2,
                y: y + blockSize * 1.5
              },
              confidence: blackPixels / totalPixels
            });
          }
        }
      }
      
      // 合并相邻的视频区域
      return this.mergeOverlappingRegions(videos);
    } catch (error) {
      this.logger.error('视频区域检测失败:', error);
      return [];
    }
  }

  /**
   * 检测自定义元素
   */
  async detectCustomElement(image, elementConfig) {
    try {
      // 这里可以实现更复杂的模板匹配算法
      // 目前简化为基于颜色和位置的检测
      
      if (elementConfig.template) {
        // 模板匹配
        const template = await Jimp.read(elementConfig.template);
        const matchResult = await this.templateMatch(image, template);
        
        if (matchResult.confidence > this.config.templateMatchingThreshold) {
          return {
            type: elementConfig.type,
            bbox: matchResult.bbox,
            center: matchResult.center,
            confidence: matchResult.confidence
          };
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('自定义元素检测失败:', error);
      return null;
    }
  }

  /**
   * 模板匹配
   */
  async templateMatch(image, template) {
    // 简化的模板匹配实现
    // 实际项目中可以使用更高级的计算机视觉库
    
    const imageWidth = image.bitmap.width;
    const imageHeight = image.bitmap.height;
    const templateWidth = template.bitmap.width;
    const templateHeight = template.bitmap.height;
    
    let bestMatch = {
      x: 0,
      y: 0,
      confidence: 0
    };
    
    // 滑动窗口匹配
    for (let y = 0; y <= imageHeight - templateHeight; y += 10) {
      for (let x = 0; x <= imageWidth - templateWidth; x += 10) {
        const similarity = this.calculateSimilarity(image, template, x, y);
        
        if (similarity > bestMatch.confidence) {
          bestMatch = {
            x: x,
            y: y,
            confidence: similarity
          };
        }
      }
    }
    
    return {
      bbox: {
        x: bestMatch.x,
        y: bestMatch.y,
        width: templateWidth,
        height: templateHeight
      },
      center: {
        x: bestMatch.x + templateWidth / 2,
        y: bestMatch.y + templateHeight / 2
      },
      confidence: bestMatch.confidence
    };
  }

  /**
   * 计算图像相似度
   */
  calculateSimilarity(image, template, offsetX, offsetY) {
    const templateWidth = template.bitmap.width;
    const templateHeight = template.bitmap.height;
    
    let totalDiff = 0;
    let pixelCount = 0;
    
    for (let y = 0; y < templateHeight; y += 2) {
      for (let x = 0; x < templateWidth; x += 2) {
        const imageColor = Jimp.intToRGBA(image.getPixelColor(offsetX + x, offsetY + y));
        const templateColor = Jimp.intToRGBA(template.getPixelColor(x, y));
        
        const diff = Math.abs(imageColor.r - templateColor.r) +
                    Math.abs(imageColor.g - templateColor.g) +
                    Math.abs(imageColor.b - templateColor.b);
        
        totalDiff += diff;
        pixelCount++;
      }
    }
    
    const avgDiff = totalDiff / pixelCount;
    const similarity = Math.max(0, 1 - avgDiff / (255 * 3));
    
    return similarity;
  }

  /**
   * 合并重叠区域
   */
  mergeOverlappingRegions(regions) {
    const merged = [];
    const used = new Set();
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      
      const current = regions[i];
      const group = [current];
      used.add(i);
      
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        
        const other = regions[j];
        if (this.isOverlapping(current.bbox, other.bbox)) {
          group.push(other);
          used.add(j);
        }
      }
      
      // 合并组内的区域
      if (group.length > 1) {
        const mergedRegion = this.mergeRegionGroup(group);
        merged.push(mergedRegion);
      } else {
        merged.push(current);
      }
    }
    
    return merged;
  }

  /**
   * 检查两个区域是否重叠
   */
  isOverlapping(rect1, rect2) {
    return !(rect1.x + rect1.width < rect2.x ||
             rect2.x + rect2.width < rect1.x ||
             rect1.y + rect1.height < rect2.y ||
             rect2.y + rect2.height < rect1.y);
  }

  /**
   * 合并区域组
   */
  mergeRegionGroup(group) {
    const minX = Math.min(...group.map(r => r.bbox.x));
    const minY = Math.min(...group.map(r => r.bbox.y));
    const maxX = Math.max(...group.map(r => r.bbox.x + r.bbox.width));
    const maxY = Math.max(...group.map(r => r.bbox.y + r.bbox.height));
    
    const avgConfidence = group.reduce((sum, r) => sum + r.confidence, 0) / group.length;
    
    return {
      type: group[0].type,
      bbox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      },
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
      },
      confidence: avgConfidence,
      mergedFrom: group.length
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.ocrWorker) {
        await this.ocrWorker.terminate();
      }
      this.logger.info('视觉检测器资源清理完成');
    } catch (error) {
      this.logger.error('资源清理失败:', error);
    }
  }
}

module.exports = VisionDetector;