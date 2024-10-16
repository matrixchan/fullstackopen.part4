const { test, after, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const api = supertest(app)

const helper = require('./test_helper')
const Blog = require('../models/blog')

beforeEach(async () => {
  await Blog.deleteMany({})

  await Blog.insertMany(helper.initialBlogs)
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

test('A valid blog can be added', async () => {
  const newBlog = {
    title: 'Test Blog',
    author: 'Test Author',
    url: 'https://testblog.com',
    likes: 5,
  }

  await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length + 1)

  const titles = blogsAtEnd.map((b) => b.title)
  assert(titles.includes('Test Blog'))
})

test('If likes property is missing, it defaults to 0', async () => {
  const newBlog = {
    title: 'Test blog without likes',
    author: 'Test Author',
    url: 'https://testblog.com',
  }

  const response = await api
    .post('/api/blogs')
    .send(newBlog)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.likes, 0)

  const savedBlog = await Blog.findById(response.body.id)
  assert.strictEqual(savedBlog.likes, 0)
})

test('Blog without title is not added', async () => {
  const newBlog = {
    author: 'Test Author',
    url: 'https://testblog.com',
    likes: 0,
  }

  await api.post('/api/blogs').send(newBlog).expect(400)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('Blog without url is not added', async () => {
  const newBlog = {
    title: 'Test Blog without URL',
    author: 'Test Author',
    likes: 0,
  }

  await api.post('/api/blogs').send(newBlog).expect(400)

  const blogsAtEnd = await helper.blogsInDb()
  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length)
})

test('A blog can be deleted', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToDelete = blogsAtStart[0]

  await api.delete(`/api/blogs/${blogToDelete.id}`).expect(204)

  const blogsAtEnd = await helper.blogsInDb()

  assert.strictEqual(blogsAtEnd.length, helper.initialBlogs.length - 1)

  const titles = blogsAtEnd.map((r) => r.title)
  assert(!titles.includes(blogToDelete.title))
})

test('Trying to delete a non-existing blog returns 404', async () => {
  const nonExistingId = await helper.nonExistingId()

  await api.delete(`/api/blogs/${nonExistingId}`).expect(404)
})

test('A blog can be updated', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToUpdate = blogsAtStart[0]

  const updatedBlog = {
    ...blogToUpdate,
    likes: blogToUpdate.likes + 1,
  }

  await api
    .put(`/api/blogs/${blogToUpdate.id}`)
    .send(updatedBlog)
    .expect(200)
    .expect('Content-Type', /application\/json/)

  const blogsAtEnd = await helper.blogsInDb()
  const updated = blogsAtEnd.find((b) => b.id === blogToUpdate.id)
  assert.strictEqual(updated.likes, blogToUpdate.likes + 1)
})

test('Updating a non-existing blog returns 404', async () => {
  const nonExistingId = await helper.nonExistingId()
  const updatedBlog = {
    likes: 10,
  }

  await api.put(`/api/blogs/${nonExistingId}`).send(updatedBlog).expect(404)
})

test('Updating a blog with invalid id returns 400', async () => {
  const invalidId = 'invalidid'
  const updatedBlog = {
    likes: 10,
  }

  await api.put(`/api/blogs/${invalidId}`).send(updatedBlog).expect(400)
})

test('Updating a blog with invalid likes returns 400', async () => {
  const blogsAtStart = await helper.blogsInDb()
  const blogToUpdate = blogsAtStart[0]

  const updatedBlog = {
    likes: 'not a number',
  }

  await api.put(`/api/blogs/${blogToUpdate.id}`).send(updatedBlog).expect(400)

  const blogsAtEnd = await helper.blogsInDb()
  const notUpdated = blogsAtEnd.find((b) => b.id === blogToUpdate.id)
  assert.strictEqual(notUpdated.likes, blogToUpdate.likes)
})

after(async () => {
  await mongoose.connection.close()
})
