import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { HttpError } from '../errors.js';
import { AdminUser } from '../entities/admin-user.entity.js';

export type AdminJwtPayload = {
  sub: number;
  email: string;
  role: string;
};

export class AuthService {
  constructor(private readonly adminRepo: Repository<AdminUser>) {}

  async login(email: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      throw new HttpError(401, 'Invalid credentials');
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
    const accessToken = jwt.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
      } satisfies AdminJwtPayload,
      process.env.JWT_SECRET || 'change-me',
      { expiresIn },
    );

    return { accessToken };
  }

  verifyToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET || 'change-me') as unknown as AdminJwtPayload;
  }
}
