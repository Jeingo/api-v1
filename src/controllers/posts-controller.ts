import {
    RequestWithBody,
    RequestWithParams,
    RequestWithParamsAndBody,
    RequestWithParamsAndQuery,
    RequestWithQuery
} from '../models/types'
import { QueryBlogs, QueryPosts } from '../models/query-models'
import { Response } from 'express'
import { PaginatedType } from '../models/main-models'
import { PostsIdParams, PostsTypeInput, PostsTypeInputInBlog, PostsTypeOutput } from '../models/posts-models'
import { PostsQueryRepository } from '../query-reositories/posts-query-repository'
import { HTTP_STATUSES } from '../constats/status'
import { inject, injectable } from 'inversify'
import { LikesType } from '../models/likes-models'
import { PostsService } from '../services/posts-service'

@injectable()
export class PostsController {
    constructor(
        @inject(PostsService) protected postsService: PostsService,
        @inject(PostsQueryRepository) protected postsQueryRepository: PostsQueryRepository
    ) {}

    async getAllPosts(req: RequestWithQuery<QueryPosts>, res: Response<PaginatedType<PostsTypeOutput>>) {
        const allPosts = await this.postsQueryRepository.getAllPost(req.query, req.user?.userId)
        res.status(HTTP_STATUSES.OK_200).json(allPosts)
    }
    async getPostById(req: RequestWithParams<PostsIdParams>, res: Response<PostsTypeOutput>) {
        const foundPost = await this.postsQueryRepository.getPostById(req.params.id, req.user?.userId)

        if (!foundPost) {
            res.sendStatus(HTTP_STATUSES.NOT_FOUND_404)
            return
        }
        res.json(foundPost)
    }
    async getPostsByBlogId(
        req: RequestWithParamsAndQuery<PostsIdParams, QueryBlogs>,
        res: Response<PaginatedType<PostsTypeOutput> | null>
    ) {
        const foundPosts = await this.postsQueryRepository.getPostsById(req.params.id, req.query, req.user?.userId)

        if (!foundPosts) {
            res.sendStatus(HTTP_STATUSES.NOT_FOUND_404)
            return
        }

        res.json(foundPosts)
    }
    async createPost(req: RequestWithBody<PostsTypeInput>, res: Response<PostsTypeOutput | null>) {
        const createdPostId = await this.postsService.createPost(
            req.body.title,
            req.body.shortDescription,
            req.body.content,
            req.body.blogId
        )
        const createdPost = await this.postsQueryRepository.getPostById(createdPostId!)
        res.status(HTTP_STATUSES.CREATED_201).json(createdPost)
    }
    async createPostByBlogId(
        req: RequestWithParamsAndBody<PostsIdParams, PostsTypeInputInBlog>,
        res: Response<PostsTypeOutput | null>
    ) {
        const createdPostId = await this.postsService.createPost(
            req.body.title,
            req.body.shortDescription,
            req.body.content,
            req.params.id
        )

        if (!createdPostId) {
            res.sendStatus(HTTP_STATUSES.NOT_FOUND_404)
            return
        }

        const createdPost = await this.postsQueryRepository.getPostById(createdPostId!)
        res.status(HTTP_STATUSES.CREATED_201).json(createdPost)
    }
    async updatePost(req: RequestWithParamsAndBody<PostsIdParams, PostsTypeInput>, res: Response) {
        const updatedPost = await this.postsService.updatePost(
            req.params.id,
            req.body.title,
            req.body.shortDescription,
            req.body.content,
            req.body.blogId
        )

        if (!updatedPost) {
            res.sendStatus(HTTP_STATUSES.NOT_FOUND_404)
            return
        }

        res.sendStatus(HTTP_STATUSES.NO_CONTENT_204)
    }
    async deletePost(req: RequestWithParams<PostsIdParams>, res: Response) {
        const deletedPost = await this.postsService.deletePost(req.params.id)

        if (!deletedPost) {
            res.sendStatus(HTTP_STATUSES.NOT_FOUND_404)
            return
        }

        res.sendStatus(HTTP_STATUSES.NO_CONTENT_204)
    }
    async updateStatusLike(req: RequestWithParamsAndBody<PostsIdParams, LikesType>, res: Response) {
        const updatedPostLike = await this.postsService.updateStatusLike(
            req.user!.userId,
            req.user!.login,
            req.params.id,
            req.body.likeStatus
        )
        if (!updatedPostLike) {
            res.sendStatus(HTTP_STATUSES.NOT_FOUND_404)
            return
        }
        res.sendStatus(HTTP_STATUSES.NO_CONTENT_204)
    }
}
