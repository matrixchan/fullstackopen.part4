const blog = require('../models/blog')

const dummy = (blogs) => {
  return 1
}

const totalLikes = (blogs) => {
  return blogs.reduce((sum, blog) => sum + (blog.likes || 0), 0)
}

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const favorite = blogs.reduce((max, blog) =>
    blog.likes > max.likes ? blog : max
  )

  return {
    title: favorite.title,
    author: favorite.author,
    likes: favorite.likes,
  }
}

const mostBlogs = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const countBlogs = blogs.reduce((count, blog) => {
    count[blog.author] = (count[blog.author] || 0) + 1
    return count
  }, {})

  let currentMaxBlogAuthor = ''
  let currntMaxCount = 0

  for (const [author, count] of Object.entries(countBlogs)) {
    console.log(author, count)
    if (count > currntMaxCount) {
      currntMaxCount = count
      currentMaxBlogAuthor = author
    }
  }

  return { author: currentMaxBlogAuthor, blogs: currntMaxCount }
}

const mostLikes = (blogs) => {
  if (blogs.length === 0) {
    return null
  }

  const mostLikes = blogs.reduce((likes, blog) => {
    likes[blog.author] = (likes[blog.author] || 0) + blog.likes
    return likes
  }, {})

  let maxLikes = 0
  let maxLikesAuthor = ''

  for (const [author, likes] of Object.entries(mostLikes)) {
    if (likes > maxLikes) {
      maxLikes = likes
      maxLikesAuthor = author
    }
  }

  return { author: maxLikesAuthor, likes: maxLikes }
}

module.exports = {
  dummy,
  totalLikes,
  favoriteBlog,
  mostBlogs,
  mostLikes,
}
