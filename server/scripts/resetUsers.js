import mongoose from 'mongoose'
import User from '../models/User.js'
import SecuritySettings from '../models/SecuritySettings.js'
import dotenv from 'dotenv'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cybrany'

async function resetUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Delete all users
    const deleteResult = await User.deleteMany({})
    console.log(`✅ Deleted ${deleteResult.deletedCount} users`)

    // Also delete all security settings
    const deleteSettingsResult = await SecuritySettings.deleteMany({})
    console.log(`✅ Deleted ${deleteSettingsResult.deletedCount} security settings`)

    // Create new admin user
    const newUser = new User({
      name: 'Ahmed',
      email: 'ahmmed@gmail.com',
      password: 'password123', // Default password - user should change this
      role: 'admin'
    })

    await newUser.save()
    console.log(`✅ Created new admin user: ${newUser.email}`)
    console.log(`   User ID: ${newUser.userId}`)
    console.log(`   Name: ${newUser.name}`)
    console.log(`   Role: ${newUser.role}`)
    console.log(`   Default password: password123`)

    // Create security settings for the new user
    const securitySettings = new SecuritySettings({
      user: newUser._id,
      quantumProofMode: process.env.HIGH_SECURITY_MODE !== 'false'
    })
    await securitySettings.save()
    console.log('✅ Created security settings for new user')

    console.log('\n✅ Reset complete!')
    console.log('You can now login with:')
    console.log('   Email: ahmmed@gmail.com')
    console.log('   Password: password123')
    console.log('\n⚠️  Please change the password after first login!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

resetUsers()

