import { QueryComments } from '../models/query-models'
import { PaginatedType } from '../models/main-models'
import { CommentsTypeOutput } from '../models/comments-models'
import { getPaginatedType, makeDirectionToNumber } from './helper'
import { ObjectId } from 'mongodb'
import { CommentsLikesRepository } from '../repositories/comments-likes-repository'
import { inject, injectable } from 'inversify'
import { CommentsLikesQueryRepository } from './comments-likes-query-repository'
import {PostsModel} from "../domain/posts-entity";
import {CommentsModel} from "../domain/comments-entity";

@injectable()
export class CommentsQueryRepository {
    constructor(
        @inject(CommentsLikesRepository) protected commentsLikesRepository: CommentsLikesRepository,
        @inject(CommentsLikesQueryRepository) protected commentsLikesQueryRepository: CommentsLikesQueryRepository
    ) {}

    async getCommentsById(
        id: string,
        query: QueryComments,
        userId?: string
    ): Promise<PaginatedType<CommentsTypeOutput> | null> {
        const foundPosts = await PostsModel.findById(new ObjectId(id))
        if (!foundPosts) return null
        const countAllDocuments = await CommentsModel.countDocuments({
            postId: id
        })
        const { sortBy = 'createdAt', sortDirection = 'desc', pageNumber = 1, pageSize = 10 } = query
        const sortDirectionNumber = makeDirectionToNumber(sortDirection)
        const skipNumber = (+pageNumber - 1) * +pageSize
        const res = await CommentsModel.find({ postId: id })
            .sort({ [sortBy]: sortDirectionNumber })
            .skip(skipNumber)
            .limit(+pageSize)

        const mappedComments = res.map(this._getOutputComment)
        const mappedCommentsWithStatusLike = await this._setStatusLike(mappedComments, userId!)
        return getPaginatedType(mappedCommentsWithStatusLike, +pageSize, +pageNumber, countAllDocuments)
    }
    async getCommentById(id: string, userId?: string): Promise<CommentsTypeOutput | null> {
        const result = await CommentsModel.findById(new ObjectId(id))
        if (!result) return null
        const mappedResult = this._getOutputComment(result)
        if (userId && mappedResult) {
            const like = await this.commentsLikesQueryRepository.getLike(userId, mappedResult.id)
            if (like) {
                mappedResult.likesInfo.myStatus = like.myStatus
            }
        }
        return mappedResult
    }
    private _getOutputComment(comment: any): CommentsTypeOutput {
        return {
            id: comment._id.toString(),
            content: comment.content,
            userId: comment.userId,
            userLogin: comment.userLogin,
            createdAt: comment.createdAt,
            likesInfo: {
                likesCount: comment.likesInfo.likesCount,
                dislikesCount: comment.likesInfo.dislikesCount,
                myStatus: 'None'
            }
        }
    }
    private async _setStatusLike(comments: Array<CommentsTypeOutput>, userId: string) {
        if (!userId) return comments
        for (let i = 0; i < comments.length; i++) {
            const like = await this.commentsLikesQueryRepository.getLike(userId, comments[i].id)
            if (like) {
                comments[i].likesInfo.myStatus = like.myStatus
            }
        }
        return comments
    }
}
