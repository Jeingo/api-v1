import { usersRepository } from '../repositories/users-repository'
import { UsersTypeOutput, UsersTypeToDB } from '../models/users-models'
import bcrypt from 'bcrypt'
import { ObjectId } from 'mongodb'
import { LoginTypeForAuth } from '../models/auth-models'
import { v4 } from 'uuid'
import add from 'date-fns/add'

class UsersService {
    async getUserById(_id: ObjectId): Promise<LoginTypeForAuth | null> {
        return await usersRepository.findUserById(_id)
    }
    async createUser(login: string, password: string, email: string): Promise<UsersTypeOutput> {
        const passwordSalt = await bcrypt.genSalt(10)
        const passwordHash = await bcrypt.hash(password, passwordSalt)
        const createdUser = new UsersTypeToDB(
            login,
            passwordHash,
            email,
            new Date().toISOString(),
            {
                passwordRecoveryCode: v4(),
                expirationDate: add(new Date(), {
                    hours: 1
                }),
                isConfirmed: true
            },
            {
                confirmationCode: v4(),
                expirationDate: add(new Date(), {
                    hours: 1
                }),
                isConfirmed: true
            }
        )
        return await usersRepository.createUser(createdUser)
    }
    async deleteUser(id: string): Promise<boolean> {
        return await usersRepository.deleteUser(id)
    }
}

export const usersService = new UsersService()
