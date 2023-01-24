import { PostsTypeOutput } from '../models/posts-models'
import { BlogsModel, PostsModel } from '../repositories/db'
import { ObjectId } from 'mongodb'
import { QueryPosts } from '../models/query-models'
import { PaginatedType } from '../models/main-models'
import { getPaginatedType, makeDirectionToNumber } from './helper'
import { inject, injectable } from 'inversify'
import { PostsLikesRepository } from '../repositories/posts-likes-repository'

@injectable()
export class PostsQueryRepository {
    constructor(@inject(PostsLikesRepository) protected postsLikesRepository: PostsLikesRepository) {}

    async getAllPost(query: QueryPosts, userId?: string): Promise<PaginatedType<PostsTypeOutput>> {
        const countAllDocuments = await PostsModel.countDocuments()
        const { sortBy = 'createdAt', sortDirection = 'desc', pageNumber = 1, pageSize = 10 } = query
        const sortDirectionNumber = makeDirectionToNumber(sortDirection)
        const skipNumber = (+pageNumber - 1) * +pageSize
        const res = await PostsModel.find()
            .sort({ [sortBy]: sortDirectionNumber })
            .skip(skipNumber)
            .limit(+pageSize)

        const mappedPost = res.map(this._getOutputPost)
        const mappedPostWithStatusLike = await this._setStatusLike(mappedPost, userId!)
        const mappedFinishPost = await this._setThreeLastUser(mappedPostWithStatusLike)
        return getPaginatedType(mappedFinishPost, +pageSize, +pageNumber, countAllDocuments)
    }
    async getPostsById(id: string, query: QueryPosts, userId?: string): Promise<PaginatedType<PostsTypeOutput> | null> {
        const foundBlogs = await BlogsModel.findById(new ObjectId(id))
        if (!foundBlogs) return null
        const countAllDocuments = await PostsModel.countDocuments({
            blogId: id
        })
        const { sortBy = 'createdAt', sortDirection = 'desc', pageNumber = 1, pageSize = 10 } = query
        const sortDirectionNumber = makeDirectionToNumber(sortDirection)
        const skipNumber = (+pageNumber - 1) * +pageSize
        const res = await PostsModel.find({ blogId: id })
            .sort({ [sortBy]: sortDirectionNumber })
            .skip(skipNumber)
            .limit(+pageSize)

        const mappedPost = res.map(this._getOutputPost)
        const mappedPostWithStatusLike = await this._setStatusLike(mappedPost, userId!)
        const mappedFinishPost = await this._setThreeLastUser(mappedPostWithStatusLike)
        return getPaginatedType(mappedFinishPost, +pageSize, +pageNumber, countAllDocuments)
    }
    private _getOutputPost(post: any): PostsTypeOutput {
        return {
            id: post._id.toString(),
            title: post.title,
            shortDescription: post.shortDescription,
            content: post.content,
            blogId: post.blogId,
            blogName: post.blogName,
            createdAt: post.createdAt,
            extendedLikesInfo: {
                likesCount: post.extendedLikesInfo.likesCount,
                dislikesCount: post.extendedLikesInfo.dislikesCount,
                myStatus: 'None',
                newestLikes: []
            }
        }
    }
    private async _setStatusLike(posts: Array<PostsTypeOutput>, userId: string) {
        if (!userId) return posts
        for (let i = 0; i < posts.length; i++) {
            const like = await this.postsLikesRepository.getLike(userId, posts[i].id)
            if (like) {
                posts[i].extendedLikesInfo.myStatus = like.myStatus
            }
        }
        return posts
    }
    private async _setThreeLastUser(posts: Array<PostsTypeOutput>) {
        for (let i = 0; i < posts.length; i++) {
            const lastThreeLikes = await this.postsLikesRepository.getLastThreeLikes(posts[i].id)
            if(lastThreeLikes) {
                posts[i].extendedLikesInfo.newestLikes = lastThreeLikes
            }
        }
        return posts
    }
}
