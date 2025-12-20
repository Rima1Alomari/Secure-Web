/**
 * Script to add userIds to existing users in the database
 * Run this script to assign unique IDs to users who don't have them yet
 * 
 * Usage: node server/scripts/addUserIds.js
 */

import mongoose from 'mongoose'
import User from '../models/User.js'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cybrany'

async function addUserIds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find all users without userId
    const usersWithoutId = await User.find({ $or: [{ userId: { $exists: false } }, { userId: null }] })
    console.log(`Found ${usersWithoutId.length} users without userId`)

    // Process each user
    for (const user of usersWithoutId) {
      const rolePrefix = {
        'admin': 'AD',
        'user': 'US'
      }[user.role] || 'US'

      // Find the highest number for this role
      const lastUser = await User.findOne(
        { userId: new RegExp(`^#${rolePrefix}`) },
        { userId: 1 }
      ).sort({ userId: -1 }).exec()

      let nextNumber = 1
      if (lastUser && lastUser.userId) {
        const match = lastUser.userId.match(/#\w{2}(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1
        }
      }

      const newUserId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
      
      // Update user with new userId
      user.userId = newUserId
      await user.save()
      
      console.log(`✅ Assigned ${newUserId} to ${user.name} (${user.email})`)
    }

    // Also update specific users if they exist (Ahmed & Mohammed)
    const ahmed = await User.findOne({ $or: [{ name: /Ahmed/i }, { email: /ahmed/i }] })
    if (ahmed && !ahmed.userId) {
      const rolePrefix = ahmed.role === 'admin' ? 'AD' : 'US'
      const lastUser = await User.findOne(
        { userId: new RegExp(`^#${rolePrefix}`) },
        { userId: 1 }
      ).sort({ userId: -1 }).exec()
      
      let nextNumber = 1
      if (lastUser && lastUser.userId) {
        const match = lastUser.userId.match(/#\w{2}(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1
        }
      }
      
      ahmed.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
      await ahmed.save()
      console.log(`✅ Assigned ${ahmed.userId} to Ahmed`)
    }

    const mohammed = await User.findOne({ $or: [{ name: /Mohammed/i }, { email: /mohammed/i }] })
    if (mohammed && !mohammed.userId) {
      const rolePrefix = mohammed.role === 'admin' ? 'AD' : 'US'
      const lastUser = await User.findOne(
        { userId: new RegExp(`^#${rolePrefix}`) },
        { userId: 1 }
      ).sort({ userId: -1 }).exec()
      
      let nextNumber = 1
      if (lastUser && lastUser.userId) {
        const match = lastUser.userId.match(/#\w{2}(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1
        }
      }
      
      mohammed.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
      await mohammed.save()
      console.log(`✅ Assigned ${mohammed.userId} to Mohammed`)
    }

    console.log('✅ All users have been assigned userIds')
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

addUserIds()


