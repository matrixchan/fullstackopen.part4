const { test, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const helper = require('./test_helper')
const app = require('../app')
const api = supertest(app)
const Blog = require('../models/blog')
const User = require('../models/user')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

let token = null

beforeEach(async () => {
  try {
    await Blog.deleteMany({})
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({
      username: 'testuser',
      name: 'Test User',
      passwordHash,
    })
    const savedUser = await user.save()

    const userForToken = {
      username: savedUser.username,
      id: savedUser._id,
    }
    token = jwt.sign(userForToken, process.env.SECRET)

    console.log('Generated token:', token)

    const blogObjects = helper.initialBlogs.map(
      (blog) =>
        new Blog({
          ...blog,
          user: savedUser._id,
        })
    )
    await Promise.all(blogObjects.map((blog) => blog.save()))
  } catch (error) {
    console.error('beforeEach error:', error)
  }
})

test('Blog are returned as json', async () => {
  await api
    .get('/api/blogs')
    .expect(200)
    .expect('Content-Type', /application\/json/)
})

test(`There ${helper.initialBlogs.length} blogs`, async () => {
  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, helper.initialBlogs.length)
})

test('Blog posts have id property as unique identifier', async () => {
  const response = await api.get('/api/blogs')

  assert(response.body.length > 0)

  response.body.forEach((blog) => {
    assert(blog.id)
    assert(!blog._id)
  })
})

test('A valid blog can be added with valid token', async () => {
  const newBlog = {
    title: 'Test Blog',
    author: 'Test Author',
    url: 'https://testblog.com',
    likes: 5,
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

  const titles = blogsAtEnd.map((b) => b.title)
  assert(titles.includes('Test Blog'))
})

test('Adding a blog fails with status code 401 if token is not provided', async () => {
  const newBlog = {
    title: 'Test Blog Without Token',
    author: 'Test Author',
    url: 'https://testblog.com',
    likes: 5,
  }

  const result = await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(401)
    .expect('Content-Type', /application\/json/)

  assert(result.body.error.includes('invalid token'))

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('If likes property is missing, it defaults to 0', async () => {
  const newBlog = {
    title: 'Test blog without likes',
    author: 'Test Author',
    url: 'https://testblog.com',
  }

  const response = await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.likes, 0)
})

test('Blog without title is not added', async () => {
  const newBlog = {
    author: 'Test Author',
    url: 'https://testblog.com',
    likes: 0,
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send(newBlog)
    .expect(400)
})

test('A blog can be deleted by its creator', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToDelete = blogsAtStart[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .set('Authorization', `Bearer ${token}`)
    .expect(204)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)
})

test('Deleting a blog fails with status 401 if token is not provided', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToDelete = blogsAtStart[0]

  await api.delete(`/api/blogs/${blogToDelete.id}`).expect(401)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length)
})

after(async () => {
  await mongoose.connection.close()
})
