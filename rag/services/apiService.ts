
import { User, ChatSession } from '../types';
import bcrypt from 'bcryptjs';
import { jwtDecode } from 'jwt-decode';

const AUTH_COOKIE_NAME = 'techcorp_session';
const USER_STORE_NAME = 'auth_user_data';
const USERS_DB = 'mock_users_registry';
const SESSIONS_DB = 'mock_global_sessions';

interface RegisteredUser extends User {
  passwordHash?: string;
}

interface GoogleTokenPayload {
  email: string;
  name: string;
  sub: string;
  picture?: string;
}

class ApiService {
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getStoredUsers(): RegisteredUser[] {
    const users = localStorage.getItem(USERS_DB);
    return users ? JSON.parse(users) : [];
  }

  private saveUsersToDB(users: RegisteredUser[]) {
    localStorage.setItem(USERS_DB, JSON.stringify(users));
  }

  private getStoredSessions(): ChatSession[] {
    const sessions = localStorage.getItem(SESSIONS_DB);
    return sessions ? JSON.parse(sessions) : [];
  }

  private setCookie(name: string, value: string, days: number = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }

  private getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let c of ca) {
      c = c.trim();
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  private deleteCookie(name: string) {
    document.cookie = name + '=; Max-Age=-99999999;path=/;';
  }

  // Auth Operations
  async login(email: string, password?: string): Promise<User> {
    await this.delay(800);
    const users = this.getStoredUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!existingUser) throw new Error("ACCOUNT_NOT_FOUND");
    if (existingUser.status === 'blocked') throw new Error("ACCOUNT_BLOCKED");
    
    if (existingUser.provider === 'email' && password) {
      const isValid = await bcrypt.compare(password, existingUser.passwordHash || '');
      if (!isValid) throw new Error("INVALID_CREDENTIALS");
    }

    this.saveSession(existingUser);
    return existingUser;
  }

  async register(username: string, email: string, password?: string): Promise<User> {
    await this.delay(1000);
    const users = this.getStoredUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("ACCOUNT_ALREADY_EXISTS");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = password ? await bcrypt.hash(password, salt) : undefined;

    const newUser: RegisteredUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      username,
      email: email.toLowerCase(),
      role: users.length === 0 ? 'admin' : 'user', // First user is admin
      status: 'active',
      provider: 'email',
      passwordHash,
      createdAt: Date.now()
    };

    const updatedUsers = [...users, newUser];
    this.saveUsersToDB(updatedUsers);
    this.saveSession(newUser);
    return newUser;
  }

  async googleLogin(credential: string): Promise<User> {
    await this.delay(800);
    let payload: GoogleTokenPayload;
    try {
      payload = jwtDecode<GoogleTokenPayload>(credential);
    } catch {
      throw new Error("INVALID_GOOGLE_TOKEN");
    }

    const email = payload.email.toLowerCase();
    const users = this.getStoredUsers();
    let user = users.find(u => u.email.toLowerCase() === email);

    if (!user) {
      user = {
        id: 'goog_' + payload.sub,
        username: payload.name,
        email: email,
        role: 'user',
        status: 'active',
        provider: 'google',
        avatar: payload.picture,
        createdAt: Date.now()
      };
      this.saveUsersToDB([...users, user]);
    }

    if (user.status === 'blocked') throw new Error("ACCOUNT_BLOCKED");

    this.saveSession(user);
    return user;
  }

  // Admin Management
  async getAllUsers(): Promise<User[]> {
    await this.delay(500);
    return this.getStoredUsers();
  }

  async deleteUser(userId: string): Promise<void> {
    await this.delay(500);
    const users = this.getStoredUsers().filter(u => u.id !== userId);
    this.saveUsersToDB(users);
  }

  async toggleUserStatus(userId: string): Promise<User> {
    await this.delay(500);
    const users = this.getStoredUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("USER_NOT_FOUND");
    
    users[index].status = users[index].status === 'active' ? 'blocked' : 'active';
    this.saveUsersToDB(users);
    return users[index];
  }

  async promoteUser(userId: string): Promise<User> {
    await this.delay(500);
    const users = this.getStoredUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("USER_NOT_FOUND");
    
    users[index].role = users[index].role === 'admin' ? 'user' : 'admin';
    this.saveUsersToDB(users);
    return users[index];
  }

  async getGlobalChatHistory(): Promise<ChatSession[]> {
    await this.delay(500);
    return this.getStoredSessions();
  }

  // Session Handling
  private saveSession(user: User) {
    const token = `jwt.${btoa(JSON.stringify({ id: user.id, email: user.email, role: user.role }))}.${btoa('signature')}`;
    this.setCookie(AUTH_COOKIE_NAME, token);
    localStorage.setItem(USER_STORE_NAME, JSON.stringify(user));
  }

  async logout() {
    await this.delay(300);
    this.deleteCookie(AUTH_COOKIE_NAME);
    localStorage.removeItem(USER_STORE_NAME);
  }

  async getCurrentUser(): Promise<User | null> {
    const token = this.getCookie(AUTH_COOKIE_NAME);
    const userJson = localStorage.getItem(USER_STORE_NAME);
    if (!token || !userJson) return null;
    return JSON.parse(userJson);
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<User> {
    await this.delay(1000);
    const users = this.getStoredUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("USER_NOT_FOUND");

    users[index] = { ...users[index], ...data };
    this.saveUsersToDB(users);
    
    const currentUser = await this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      localStorage.setItem(USER_STORE_NAME, JSON.stringify(users[index]));
    }
    
    return users[index];
  }
}

export const apiService = new ApiService();
