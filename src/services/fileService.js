const fs = require('fs-extra');
const path = require('path');

class FileService {
  /**
   * Create a new file with content
   */
  // In src/services/fileService.js, update the createFile method:

async createFile(filePath, content = '') {
  try {
    // Handle different parameter formats
    if (typeof filePath === 'object' && filePath.filename) {
      content = filePath.content || '';
      filePath = filePath.filename;
    }
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.ensureDir(dir);
    
    // Create file with content
    await fs.writeFile(filePath, content);
    
    console.log(`File created successfully: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Error creating file:', error);
    return { success: false, error: error.message };
  }
}

  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return { success: true, content };
    } catch (error) {
      console.error('Error reading file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update existing file content
   */
  async updateFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      console.error('Error updating file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a file or directory
   */
  async deleteFile(filePath) {
    try {
      await fs.remove(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List files in directory
   */
  async listFiles(directoryPath = '.') {
    try {
      const files = await fs.readdir(directoryPath);
      console.log(`Files in ${directoryPath}:`, files);
      return { success: true, files };
    } catch (error) {
      console.error('Error listing files:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search for files matching criteria
   */
  async searchFiles(directoryPath, options = {}) {
    try {
      const { pattern, recursive = true } = options;
      const allFiles = [];
      
      const scanDirectory = async (dirPath) => {
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory() && recursive) {
            await scanDirectory(itemPath);
          } else if (pattern && item.match(new RegExp(pattern, 'i'))) {
            allFiles.push({
              name: item,
              path: itemPath,
              size: stats.size,
              modified: stats.mtime
            });
          } else if (!pattern) {
            allFiles.push({
              name: item,
              path: itemPath,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
      };
      
      await scanDirectory(directoryPath);
      return { success: true, files: allFiles };
    } catch (error) {
      console.error('Error searching files:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FileService();