import { LoggingService } from "./LoggingService";

export interface ShortenedURL {
  id: string;
  originalUrl: string;
  shortCode: string;
  shortUrl: string;
  validity: number;
  createdAt: Date;
  expiresAt: Date;
  clickCount: number;
  clickData: ClickData[];
}

export interface ClickData {
  timestamp: Date;
  source: string;
  location: string;
}

class URLServiceClass {
  private readonly STORAGE_KEY = "shortened_urls";
  private readonly BASE_URL = window.location.origin;

  generateShortCode(customCode?: string): string {
    if (customCode) {
      // Check if custom code is already in use
      const existingUrls = this.getAllUrls();
      if (existingUrls.some((url) => url.shortCode === customCode)) {
        throw new Error("Custom shortcode already exists");
      }
      return customCode;
    }

    // Generate random alphanumeric code
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    let attempts = 0;
    const maxAttempts = 100;

    do {
      result = "";
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.shortCodeExists(result) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error("Unable to generate unique short code");
    }

    return result;
  }

  private shortCodeExists(shortCode: string): boolean {
    const urls = this.getAllUrls();
    return urls.some((url) => url.shortCode === shortCode);
  }

  shortenUrl(
    originalUrl: string,
    validity: number,
    customShortcode?: string
  ): ShortenedURL {
    LoggingService.log("URL shortening request", {
      originalUrl,
      validity,
      hasCustomShortcode: !!customShortcode,
    });

    const shortCode = this.generateShortCode(customShortcode);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + validity * 60 * 1000);

    const shortenedUrl: ShortenedURL = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      originalUrl,
      shortCode,
      shortUrl: `${this.BASE_URL}/${shortCode}`,
      validity,
      createdAt,
      expiresAt,
      clickCount: 0,
      clickData: [],
    };

    this.saveUrl(shortenedUrl);

    LoggingService.log("URL shortened successfully", {
      shortCode,
      expiresAt: expiresAt.toISOString(),
    });

    return shortenedUrl;
  }

  private saveUrl(url: ShortenedURL): void {
    const urls = this.getAllUrls();
    urls.push(url);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(urls));
  }

  getAllUrls(): ShortenedURL[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const urls = JSON.parse(stored);
      return urls.map((url: any) => ({
        ...url,
        createdAt: new Date(url.createdAt),
        expiresAt: new Date(url.expiresAt),
        clickData:
          url.clickData?.map((click: any) => ({
            ...click,
            timestamp: new Date(click.timestamp),
          })) || [],
      }));
    } catch (error) {
      LoggingService.log("Error loading URLs from storage", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  }

  getUrlByShortCode(shortCode: string): ShortenedURL | null {
    const urls = this.getAllUrls();
    return urls.find((url) => url.shortCode === shortCode) || null;
  }

  recordClick(
    shortCode: string,
    source = "direct",
    location = "unknown"
  ): boolean {
    LoggingService.log("Click recorded", { shortCode, source, location });

    const urls = this.getAllUrls();
    const urlIndex = urls.findIndex((url) => url.shortCode === shortCode);

    if (urlIndex === -1) {
      LoggingService.log("Short code not found", { shortCode });
      return false;
    }

    const url = urls[urlIndex];

    // Check if URL has expired
    if (new Date() > url.expiresAt) {
      LoggingService.log("URL has expired", {
        shortCode,
        expiresAt: url.expiresAt,
      });
      return false;
    }

    // Record the click
    url.clickCount++;
    url.clickData.push({
      timestamp: new Date(),
      source,
      location,
    });

    // Update storage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(urls));

    return true;
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  cleanupExpiredUrls(): void {
    const urls = this.getAllUrls();
    const activeUrls = urls.filter((url) => new Date() <= url.expiresAt);

    if (activeUrls.length !== urls.length) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(activeUrls));
      LoggingService.log("Expired URLs cleaned up", {
        total: urls.length,
        active: activeUrls.length,
        removed: urls.length - activeUrls.length,
      });
    }
  }
}

export const URLService = new URLServiceClass();
