const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const middleware = require('../utils/middleware')

const getUserFromToken = async (request) => {
  const decodedToken = jwt.verify(request.token, process.env.SECRET)
  if (!decodedToken.id) {
    throw new Error('token invalid')
  }
  return await User.findById(decodedToken.id)
}

blogsRouter.get('/', async (request, response) => {
  try {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
    response.json(blogs)
  } catch (error) {
    response.status(500).json({ error: 'Something went wrong' })
  }
})

blogsRouter.post('/', middleware.userExtractor, async (request, response) => {
  try {
    const body = request.body
    const user = request.user

    if (!user) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }

    if (!body.title || !body.url) {
      return response.status(400).json({ error: 'title or url missing' })
    }

    const blog = new Blog({
      title: body.title,
      author: body.author,
      url: body.url,
      likes: body.likes || 0,
      user: user._id,
    })

    const savedBlog = await blog.save()
    user.blogs = user.blogs.concat(savedBlog._id)
    await user.save()

    const populatedBlog = await Blog.findById(savedBlog._id).populate('user', {
      username: 1,
      name: 1,
    })
    response.status(201).json(populatedBlog)
  } catch (error) {
    response.status(500).json({ error: 'Something went wrong' })
  }
})

blogsRouter.delete(
  '/:id',
  middleware.userExtractor,
  async (request, response) => {
    try {
      const user = request.user
      if (!user) {
        return response.status(401).json({ error: 'token missing or invalid' })
      }

      const blog = await Blog.findById(request.params.id)
      if (!blog) {
        return response.status(404).end()
      }

      if (blog.user.toString() !== user.id.toString()) {
        return response
          .status(401)
          .json({ error: 'only the creator can delete blogs' })
      }

      user.blogs = user.blogs.filter((b) => b.toString() !== request.params.id)
      await user.save()

      await Blog.findByIdAndDelete(request.params.id)
      response.status(204).end()
    } catch (error) {
      response.status(400).json({ error: 'malformatted id' })
    }
  }
)

blogsRouter.put('/:id', async (request, response) => {
  const { likes } = request.body

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    { likes },
    { new: true, runValidators: true }
  ).populate('user', { username: 1, name: 1 })

  if (updatedBlog) {
    response.json(updatedBlog)
  } else {
    response.status(404).end()
  }
})

module.exports = blogsRouter
