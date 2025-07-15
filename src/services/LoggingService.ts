interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  data?: any;
  sessionId: string;
}

class LoggingServiceClass {
  private readonly STORAGE_KEY = 'app_logs';
  private readonly MAX_LOGS = 1000;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.log('Logging service initialized');
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  log(message: string, data?: any, level: 'info' | 'warning' | 'error' = 'info'): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      sessionId: this.sessionId
    };

    // Always log to console for development
    const consoleMethod = level === 'error' ? console.error : 
                         level === 'warning' ? console.warn : console.log;
    
    if (data) {
      consoleMethod(`[${level.toUpperCase()}] ${message}`, data);
    } else {
      consoleMethod(`[${level.toUpperCase()}] ${message}`);
    }

    // Store in localStorage
    this.saveLog(logEntry);
  }

  private saveLog(logEntry: LogEntry): void {
    try {
      const logs = this.getLogs();
      logs.push(logEntry);

      // Keep only the latest MAX_LOGS entries
      if (logs.length > this.MAX_LOGS) {
        logs.splice(0, logs.length - this.MAX_LOGS);
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log entry:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];
      
      const logs = JSON.parse(stored);
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.error('Failed to load logs:', error);
      return [];
    }
  }

  getLogsByLevel(level: 'info' | 'warning' | 'error'): LogEntry[] {
    return this.getLogs().filter(log => log.level === level);
  }

  getLogsBySession(sessionId?: string): LogEntry[] {
    const targetSessionId = sessionId || this.sessionId;
    return this.getLogs().filter(log => log.sessionId === targetSessionId);
  }

  clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.log('Logs cleared');
  }

  exportLogs(): string {
    const logs = this.getLogs();
    return JSON.stringify(logs, null, 2);
  }

  // Convenience methods
  info(message: string, data?: any): void {
    this.log(message, data, 'info');
  }

  warning(message: string, data?: any): void {
    this.log(message, data, 'warning');
  }

  error(message: string, data?: any): void {
    this.log(message, data, 'error');
  }
}

export const LoggingService = new LoggingServiceClass();
