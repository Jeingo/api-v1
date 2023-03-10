import jwt from 'jsonwebtoken'
import { settings } from '../settings/settings'
import { Token, TokenPayloadType } from '../models/token-models'
import { injectable } from 'inversify'
import { UserId } from '../models/users-models'

@injectable()
export class JwtService {
    createJWT(userId: string): Token {
        return jwt.sign({ userId: userId }, settings.JWT_SECRET, {
            expiresIn: settings.EXPIRE_JWT
        })
    }
    createRefreshJWT(userId: string, deviceId: string): Token {
        return jwt.sign({ userId: userId, deviceId: deviceId }, settings.JWT_REFRESH_SECRET, {
            expiresIn: settings.EXPIRE_REFRESH_JWT
        })
    }
    checkExpirationAndGetPayload(token: string): TokenPayloadType | null {
        try {
            return jwt.verify(token, settings.JWT_REFRESH_SECRET) as TokenPayloadType
        } catch (err) {
            return null
        }
    }
    getUserIdByToken(token: string): UserId | null {
        try {
            const result: any = jwt.verify(token, settings.JWT_SECRET)
            return result.userId
        } catch (err) {
            return null
        }
    }
}
