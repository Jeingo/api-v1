import request from 'supertest'
import {app} from '../../src/app'
import {HTTP_STATUSES} from '../../src/constats/status'
import {PostsTypeInput, PostsTypeOutput} from "../../src/models/posts-models"
import {BlogsTypeInput} from "../../src/models/blogs-models"
import {PaginatedType} from "../../src/models/main-models";
import {CommentsTypeInput} from "../../src/models/comments-models";
import mongoose from "mongoose";
import {settings} from "../../src/settings/settings";

const correctBlog: BlogsTypeInput = {
    name: 'Name',
    description: 'Description',
    websiteUrl: 'https://testurl.com'
}


const correctPost: PostsTypeInput = {
    title: 'Title',
    shortDescription: 'Short Description',
    content: 'Content',
    blogId: '1'
}

const correctNewPost: PostsTypeInput = {
    title: 'TitleNew',
    shortDescription: 'Short Description New',
    content: 'ContentNew',
    blogId: '1'
}

const incorrectPost: PostsTypeInput = {
    title: '',
    shortDescription: '',
    content: '',
    blogId: ''
}

const correctUser1 = {
    login: 'login1',
    password: 'password',
    email: 'email@gmail.com'
}

const correctLogin = {
    loginOrEmail: 'login1',
    password: 'password'
}

const correctComment: CommentsTypeInput = {
    content: "content content content content more 20"
}

const inCorrectComment: CommentsTypeInput = {
    content: "incorrect content"
}

const badLikeStatus = {
    likeStatus: ''
}

const correctLikeStatus = {
    likeStatus: 'Like'
}

const emptyPosts: PaginatedType<PostsTypeOutput> =
    {
        "pagesCount": 0,
        "page": 1,
        "pageSize": 10,
        "totalCount": 0,
        "items": []
    }

const errorsMessage = {
    "errorsMessages": [
        {
            "message": "Shouldn't be empty",
            "field": "title"
        },
        {
            "message": "Shouldn't be empty",
            "field": "shortDescription"
        },
        {
            "message": "Shouldn't be empty",
            "field": "content"
        },
        {
            "message": "Shouldn't be empty",
            "field": "blogId"
        }
    ]
}

let createdBlog: any = null
let createdUser: any = null
let createdToken: any = null

describe('/posts', () => {
    beforeAll(async () => {
        mongoose.set('strictQuery', false)
        await mongoose.connect(settings.MONGO_URL, {dbName: settings.DB_NAME})
        await request(app).delete('/testing/all-data')
        const createdResponse = await request(app)
            .post('/blogs')
            .auth('admin', 'qwerty')
            .send(correctBlog)
            .expect(HTTP_STATUSES.CREATED_201)
        createdBlog = createdResponse.body
        correctPost.blogId = createdBlog.id
        correctNewPost.blogId = createdBlog.id
        const createdResponseUser = await request(app)
            .post('/users')
            .auth('admin', 'qwerty')
            .send(correctUser1)
            .expect(HTTP_STATUSES.CREATED_201)
        createdUser = createdResponseUser.body
        const createdResponseToken = await request(app)
            .post('/auth/login')
            .send(correctLogin)
            .expect(HTTP_STATUSES.OK_200)
        createdToken = createdResponseToken.body
    })
    afterAll(async () => {
        await mongoose.connection.close()
    })
    it('GET /posts: should return 200 and empty array', async () => {
        await request(app)
            .get('/posts')
            .expect(HTTP_STATUSES.OK_200, emptyPosts)
    })
    it('GET /posts/bad-id: should return 404 for not existing posts', async () => {
        await request(app)
            .get('/posts/999')
            .expect(HTTP_STATUSES.NOT_FOUND_404)
    })
    it(`POST /posts: shouldn't create posts without authorization`, async () => {
        await request(app)
            .post('/posts')
            .send(correctPost)
            .expect(HTTP_STATUSES.UNAUTHORIZED_401)
        await request(app)
            .get('/posts')
            .expect(HTTP_STATUSES.OK_200, emptyPosts)
    })
    it(`POST /posts: shouldn't create posts with incorrect data`, async () => {
        const errMes = await request(app)
            .post('/posts')
            .auth('admin', 'qwerty')
            .send(incorrectPost)
            .expect(HTTP_STATUSES.BAD_REQUEST_400)
        await request(app)
            .get('/posts')
            .expect(HTTP_STATUSES.OK_200, emptyPosts)
        expect(errMes.body).toEqual(errorsMessage)
    })
    let createdPost: any = null
    it(`POST /posts: should create posts with correct data`, async () => {
        const createdResponse = await request(app)
            .post('/posts')
            .auth('admin', 'qwerty')
            .send(correctPost)
            .expect(HTTP_STATUSES.CREATED_201)
        createdPost = createdResponse.body
        expect(createdPost).toEqual({
            id: expect.any(String),
            ...correctPost,
            blogName: createdBlog.name,
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 0,
                dislikesCount: 0,
                myStatus: 'None',
                newestLikes:[]
            }
        })
    })
    it(`GET /posts/id: should return post by id`, async () => {
        const response = await request(app)
            .get('/posts' + '/' + createdPost.id)
            .expect(HTTP_STATUSES.OK_200)
        expect(response.body).toEqual({
            id: expect.any(String),
            ...createdPost,
            blogName: createdBlog.name,
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 0,
                dislikesCount: 0,
                myStatus: 'None',
                newestLikes:[]
            }
        })
    })
    it(`PUT /posts/id: shouldn't update post without authorization`, async () => {
        await request(app)
            .put('/posts' + '/' + createdPost.id)
            .send(correctNewPost)
            .expect(HTTP_STATUSES.UNAUTHORIZED_401)
    })
    it(`PUT /posts/id: shouldn't update post with incorrect data`, async () => {
        const errMes = await request(app)
            .put('/posts' + '/' + createdPost.id)
            .auth('admin', 'qwerty')
            .send(incorrectPost)
            .expect(HTTP_STATUSES.BAD_REQUEST_400)
        expect(errMes.body).toEqual(errorsMessage)
    })
    it(`PUT /posts/id: should update post with correct data`, async () => {
        await request(app)
            .put('/posts' + '/' + createdPost.id)
            .auth('admin', 'qwerty')
            .send(correctNewPost)
            .expect(HTTP_STATUSES.NO_CONTENT_204)
        const response = await request(app)
            .get('/posts' + '/' + createdPost.id)
            .expect(HTTP_STATUSES.OK_200)
        expect(response.body).toEqual({
            id: expect.any(String),
            ...correctNewPost,
            blogName: createdBlog.name,
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 0,
                dislikesCount: 0,
                myStatus: 'None',
                newestLikes:[]
            }
        })
    })
    it('PUT /posts/bad-id: should return 404 for not existing post', async () => {
        await request(app)
            .put('/posts/999')
            .auth('admin', 'qwerty')
            .send(correctNewPost)
            .expect(HTTP_STATUSES.NOT_FOUND_404)
    })
    it(`DELETE /posts/id: shouldn't delete post without authorization`, async () => {
        await request(app)
            .delete('/posts' + '/' + createdPost.id)
            .expect(HTTP_STATUSES.UNAUTHORIZED_401)
    })
    it(`DELETE /posts/bad-id: should return 404 for not existing post`, async () => {
        await request(app)
            .delete('/posts/999')
            .auth('admin', 'qwerty')
            .expect(HTTP_STATUSES.NOT_FOUND_404)
    })
    it(`DELETE /posts/id: should delete post`, async () => {
        await request(app)
            .delete('/posts' + '/' + createdPost.id)
            .auth('admin', 'qwerty')
            .expect(HTTP_STATUSES.NO_CONTENT_204)
        await request(app)
            .get('/posts')
            .expect(HTTP_STATUSES.OK_200, emptyPosts)
    })
    it(`POST /posts/id/comments: shouldn't create comment without authorization`, async () => {
        await request(app)
            .post('/posts' + '/' + createdPost.id + '/comments')
            .send(correctComment)
            .expect(HTTP_STATUSES.UNAUTHORIZED_401)
    })
    it(`POST /posts/id/comments: shouldn't update comment with incorrect data`, async () => {
        await request(app)
            .post('/posts' + '/' + createdPost.id + '/comments')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .send(inCorrectComment)
            .expect(HTTP_STATUSES.BAD_REQUEST_400)
    })
    it(`POST /posts/bad-id/comments: should return 404 for not existing comment`, async () => {
        await request(app)
            .post('/posts/999/comments')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .send(correctComment)
            .expect(HTTP_STATUSES.NOT_FOUND_404)
    })
    let createdComment: any = null
    let createdPost2: any = null
    it(`POST /posts/id/comments:  should create comment with correct data`, async () => {
        const createdResponse = await request(app)
            .post('/posts')
            .auth('admin', 'qwerty')
            .send(correctPost)
            .expect(HTTP_STATUSES.CREATED_201)
        createdPost2 = createdResponse.body
        const createdResponseComment = await request(app)
            .post('/posts' + '/' + createdPost2.id + '/comments')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .send(correctComment)
            .expect(HTTP_STATUSES.CREATED_201)
        createdComment = createdResponseComment.body
        expect(createdComment).toEqual({
            id: expect.any(String),
            ...correctComment,
            userId: createdUser.id,
            userLogin: createdUser.login,
            createdAt: expect.any(String),
            likesInfo: {
                likesCount: 0,
                dislikesCount: 0,
                myStatus: 'None'
            }
        })
    })
    it(`GET /posts/bad-id/comments: should return 404 for not existing comment`, async () => {
        await request(app)
            .get('/posts/999/comments')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .expect(HTTP_STATUSES.NOT_FOUND_404)
    })
    it(`GET /posts/id/comments:  should return comments by post's id`, async () => {
        const result = await request(app)
            .get('/posts' + '/' + createdPost2.id + '/comments')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .expect(HTTP_STATUSES.OK_200)
        expect(result.body).toEqual(
            {
                pagesCount: 1,
                page: 1,
                pageSize: 10,
                totalCount: 1,
                items: [{
                    id: expect.any(String),
                    ...correctComment,
                    userId: createdUser.id,
                    userLogin: createdUser.login,
                    createdAt: expect.any(String),
                    likesInfo: {
                        likesCount: 0,
                        dislikesCount: 0,
                        myStatus: 'None'
                    }
                }]
            }
        )
    })
    it(`PUT /posts/id/like-status: should return 401 without authorization`, async () => {
        await request(app)
            .put('/posts' + '/' + createdPost2.id + '/' + 'like-status')
            .expect(HTTP_STATUSES.UNAUTHORIZED_401)
    })
    it(`PUT /posts/id/like-status: should return 400 with bad body`, async () => {
        await request(app)
            .put('/posts' + '/' + createdPost2.id + '/' + 'like-status')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .send(badLikeStatus)
            .expect(HTTP_STATUSES.BAD_REQUEST_400)
    })
    it(`PUT /posts/bad-id/like-status: should return 404 if post not exist`, async () => {
        await request(app)
            .put('/posts' + '/' + 999 + '/' + 'like-status')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .send(correctLikeStatus)
            .expect(HTTP_STATUSES.NOT_FOUND_404)
    })
    it(`PUT /posts/id/like-status: should return 204 if all ok`, async () => {
        await request(app)
            .put('/posts' + '/' + createdPost2.id + '/' + 'like-status')
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .send(correctLikeStatus)
            .expect(HTTP_STATUSES.NO_CONTENT_204)
        const response = await request(app)
            .get('/posts' + '/' + createdPost2.id)
            .set('Authorization', 'Bearer ' + createdToken.accessToken)
            .expect(HTTP_STATUSES.OK_200)
        expect(response.body).toEqual({
            id: expect.any(String),
            ...correctPost,
            blogName: createdBlog.name,
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 1,
                dislikesCount: 0,
                myStatus: 'Like',
                newestLikes:[{
                    addedAt: expect.any(String),
                    userId: createdUser.id,
                    login: createdUser.login
                }]
            }
        })
        const response2 = await request(app)
            .get('/posts' + '/' + createdPost2.id)
            .expect(HTTP_STATUSES.OK_200)
        expect(response2.body).toEqual({
            id: expect.any(String),
            ...correctPost,
            blogName: createdBlog.name,
            createdAt: expect.any(String),
            extendedLikesInfo: {
                likesCount: 1,
                dislikesCount: 0,
                myStatus: 'None',
                newestLikes:[{
                    addedAt: expect.any(String),
                    userId: createdUser.id,
                    login: createdUser.login
                }]
            }
        })
    })
})