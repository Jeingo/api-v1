import { SessionInputType, SessionOutputType, SessionTypeToDB } from '../models/session-models'
import { injectable } from 'inversify'
import {SessionsModel} from "../domain/sessions-entity";

@injectable()
export class SessionsRepository {
    async findAllActiveSession(userId: string): Promise<SessionOutputType[] | null> {
        const currentDate = new Date().toISOString()
        const result = await SessionsModel.find({ userId: userId, expireAt: { $gt: currentDate } })
        if (!result) return null
        return result.map(this._getOutputSession)
    }
    async findSession(iat: string): Promise<SessionOutputType | null> {
        const result = await SessionsModel.findOne({ issueAt: iat })
        if (!result) return null
        return this._getOutputSession(result)
    }
    async findSessionByDeviceId(deviceId: string): Promise<SessionInputType | null> {
        const result = await SessionsModel.findOne({ deviceId: deviceId })
        if (!result) return null
        return this._getFullSession(result)
    }
    async saveSession(session: SessionTypeToDB): Promise<void> {
        await SessionsModel.create(session)
    }
    async updateSession(issueAt: string, expireAt: string, deviceId: string): Promise<boolean> {
        const result = await SessionsModel.findOneAndUpdate(
            { deviceId: deviceId },
            { issueAt: issueAt, expireAt: expireAt }
        )
        return !!result
    }
    async deleteSession(issueAt: string): Promise<boolean> {
        const result = await SessionsModel.findOneAndDelete({ issueAt: issueAt })
        return !!result
    }
    async deleteSessionByDeviceId(deviceId: string): Promise<boolean> {
        const result = await SessionsModel.findOneAndDelete({ deviceId: deviceId })
        return !!result
    }
    async deleteSessionsWithoutCurrent(userId: string, issueAt: string): Promise<boolean> {
        const result = await SessionsModel.deleteMany({ userId: userId }).where('issueAt').ne(issueAt)
        return !!result
    }
    private _getOutputSession(session: any) {
        return {
            ip: session.ip,
            title: session.deviceName,
            lastActiveDate: session.issueAt,
            deviceId: session.deviceId
        }
    }
    private _getFullSession(session: any) {
        return {
            issueAt: session.issueAt,
            deviceId: session.deviceId,
            deviceName: session.deviceName,
            ip: session.ip,
            userId: session.userId,
            expireAt: session.expireAt
        }
    }
}
