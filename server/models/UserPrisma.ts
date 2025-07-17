import prisma from '../lib/prisma';
import type { User as PrismaUser } from '@prisma/client';
import { User, CreateUserData, UpdateUserSettings } from '../types/interfaces';
import { TimeZone } from '../types/enums';

export class UserPrismaModel {
  private static convertPrismaUserToUser(user: PrismaUser): User {
    return {
      id: user.id,
      google_id: user.google_id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      access_token: user.access_token,
      refresh_token: user.refresh_token,
      token_expiry: user.token_expiry,
      whatsapp_recipients: user.whatsapp_recipients as string[] || ['+17812967597'],
      automation_enabled: user.automation_enabled,
      daily_summary_time: user.daily_summary_time,
      timezone: user.timezone as TimeZone,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login
    };
  }
  static async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { google_id: googleId }
    });
    
    if (!user) return null;
    
    return this.convertPrismaUserToUser(user);
  }

  static async findById(id: number): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!user) return null;
    
    return this.convertPrismaUserToUser(user);
  }

  static async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) return null;
    
    return this.convertPrismaUserToUser(user);
  }

  static async create(userData: CreateUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        google_id: userData.googleId,
        email: userData.email,
        name: userData.name,
        picture: userData.picture || null,
        access_token: userData.accessToken,
        refresh_token: userData.refreshToken,
        token_expiry: userData.tokenExpiry,
        whatsapp_recipients: userData.whatsappRecipients || ['+17812967597'],
        automation_enabled: userData.automationEnabled || false,
        daily_summary_time: userData.dailySummaryTime || '08:00',
        timezone: userData.timezone || TimeZone.AMERICA_NEW_YORK
      }
    });
    
    return this.convertPrismaUserToUser(user);
  }

  static async updateTokens(id: number, accessToken: string, refreshToken: string, expiry: Date): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: expiry,
        last_login: new Date()
      }
    });
    
    return this.convertPrismaUserToUser(user);
  }

  static async updateSettings(id: number, settings: UpdateUserSettings): Promise<User> {
    const updateData: any = {};
    
    if (settings.whatsappRecipients !== undefined) {
      updateData.whatsapp_recipients = settings.whatsappRecipients;
    }
    if (settings.automationEnabled !== undefined) {
      updateData.automation_enabled = settings.automationEnabled;
    }
    if (settings.dailySummaryTime !== undefined) {
      updateData.daily_summary_time = settings.dailySummaryTime;
    }
    if (settings.timezone !== undefined) {
      updateData.timezone = settings.timezone;
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData
    });
    
    return this.convertPrismaUserToUser(user);
  }

  static async findAutomationEnabled(): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { automation_enabled: true }
    });
    
    return users.map(user => this.convertPrismaUserToUser(user));
  }

  static async deleteById(id: number): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  static async count(): Promise<number> {
    return await prisma.user.count();
  }

  static async findActiveUsers(): Promise<User[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const users = await prisma.user.findMany({
      where: {
        last_login: {
          gt: thirtyDaysAgo
        }
      }
    });
    
    return users.map(user => this.convertPrismaUserToUser(user));
  }

  // Utility methods
  static isTokenExpired(user: User): boolean {
    return user.token_expiry < new Date();
  }

  static shouldRefreshToken(user: User): boolean {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return user.token_expiry < fiveMinutesFromNow;
  }

  static getTimeUntilExpiry(user: User): number {
    return user.token_expiry.getTime() - new Date().getTime();
  }
} 