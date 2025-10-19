import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { SumsubAuthService } from './sumsub-auth.service';
import { Logger } from '../../common/utils/logger';

@Injectable()
export class SumsubClientService {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly logger = new Logger(SumsubClientService.name);

  constructor(
    private configService: ConfigService,
    private authService: SumsubAuthService,
  ) {
    this.baseUrl = this.configService.get<string>('sumsub.baseUrl') || 'https://api.sumsub.com';
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });

    // Add request interceptor for authentication
    this.axiosInstance.interceptors.request.use((config) => {
      const path = config.url || '';
      const method = config.method?.toUpperCase() || 'GET';
      const authHeaders = this.authService.getAuthHeaders(
        method,
        path,
        config.data,
      );

      Object.assign(config.headers, authHeaders);

      this.logger.debug(`Sumsub API Request: ${method} ${path}`);
      return config;
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      },
    );
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T>(
    method: string,
    path: string,
    data?: any,
    retries = 3,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: path,
      data,
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>(config);
        this.logger.debug(`Sumsub API Success: ${method} ${path}`);
        return response.data;
      } catch (error) {
        const isLastAttempt = attempt === retries;
        const shouldRetry = this.shouldRetry(error as AxiosError);

        if (!shouldRetry || isLastAttempt) {
          throw error;
        }

        const delay = this.getRetryDelay(attempt);
        this.logger.warn(
          `Sumsub API retry ${attempt}/${retries} after ${delay}ms: ${method} ${path}`,
        );
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * GET request
   */
  async get<T>(path: string, retries = 3): Promise<T> {
    return this.request<T>('GET', path, undefined, retries);
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: any, retries = 3): Promise<T> {
    return this.request<T>('POST', path, data, retries);
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, data?: any, retries = 3): Promise<T> {
    return this.request<T>('PATCH', path, data, retries);
  }

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) {
      // Network error, retry
      return true;
    }

    const status = error.response.status;
    // Retry on server errors (5xx) and rate limiting (429)
    return status >= 500 || status === 429;
  }

  /**
   * Calculate exponential backoff delay
   */
  private getRetryDelay(attempt: number): number {
    const baseDelay = 1000; // 1 second
    return baseDelay * Math.pow(2, attempt - 1);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle and transform Sumsub API errors
   */
  private handleError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      this.logger.error(
        `Sumsub API Error: ${status} - ${JSON.stringify(data)}`,
        error.stack,
      );

      // Transform to NestJS HttpException
      switch (status) {
        case 400:
          throw new HttpException(
            data?.description || 'Bad request to Sumsub API',
            HttpStatus.BAD_REQUEST,
          );
        case 401:
          throw new HttpException(
            'Unauthorized - check Sumsub credentials',
            HttpStatus.UNAUTHORIZED,
          );
        case 403:
          throw new HttpException(
            'Forbidden - insufficient permissions',
            HttpStatus.FORBIDDEN,
          );
        case 404:
          throw new HttpException(
            data?.description || 'Resource not found in Sumsub',
            HttpStatus.NOT_FOUND,
          );
        case 429:
          throw new HttpException(
            'Rate limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        default:
          throw new HttpException(
            data?.description || 'Sumsub API error',
            status,
          );
      }
    } else if (error.request) {
      this.logger.error(
        `Sumsub API Network Error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Unable to connect to Sumsub API',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      this.logger.error(
        `Sumsub API Unknown Error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Unknown error communicating with Sumsub',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
