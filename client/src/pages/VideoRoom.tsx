import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AgoraRTC, { ILocalVideoTrack, ILocalAudioTrack, IRemoteVideoTrack, IRemoteAudioTrack } from 'agora-rtc-sdk-ng'
import axios from 'axios'
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaSignOutAlt } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface RemoteUser {
  uid: number
  videoTrack?: IRemoteVideoTrack
  audioTrack?: IRemoteAudioTrack
}

const VideoRoom = () => {
  const { channelName } = useParams<{ channelName: string }>()
  const navigate = useNavigate()
  const [client, setClient] = useState<any>(null)
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null)
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null)
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [loading, setLoading] = useState(true)
  const localVideoRef = useRef<HTMLDivElement>(null)
  const remoteVideoRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  useEffect(() => {
    if (!channelName) {
      navigate('/dashboard')
      return
    }

    joinChannel()

    return () => {
      leaveChannel()
    }
  }, [channelName])

  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.play(localVideoRef.current)
    }
    return () => {
      if (localVideoTrack) {
        localVideoTrack.stop()
      }
    }
  }, [localVideoTrack])

  useEffect(() => {
    remoteUsers.forEach((user) => {
      if (user.videoTrack && remoteVideoRefs.current[user.uid]) {
        user.videoTrack.play(remoteVideoRefs.current[user.uid]!)
      }
    })
    return () => {
      remoteUsers.forEach((user) => {
        if (user.videoTrack) {
          user.videoTrack.stop()
        }
      })
    }
  }, [remoteUsers])

  const joinChannel = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/agora/token`, {
        params: { channelName }
      })

      const { token, uid, appId } = response.data

      const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })
      setClient(agoraClient)

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack()
      const videoTrack = await AgoraRTC.createCameraVideoTrack()

      setLocalAudioTrack(audioTrack)
      setLocalVideoTrack(videoTrack)

      await agoraClient.join(appId, channelName, token, uid)
      await agoraClient.publish([audioTrack, videoTrack])

      agoraClient.on('user-published', async (user, mediaType) => {
        await agoraClient.subscribe(user, mediaType)

        if (mediaType === 'video') {
          setRemoteUsers((prev) => {
            const existing = prev.find((u) => u.uid === user.uid)
            if (existing) {
              return prev.map((u) => (u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u))
            }
            return [...prev, { uid: user.uid, videoTrack: user.videoTrack }]
          })
        }

        if (mediaType === 'audio') {
          user.audioTrack?.play()
          setRemoteUsers((prev) => {
            const existing = prev.find((u) => u.uid === user.uid)
            if (existing) {
              return prev.map((u) => (u.uid === user.uid ? { ...u, audioTrack: user.audioTrack } : u))
            }
            return [...prev, { uid: user.uid, audioTrack: user.audioTrack }]
          })
        }
      })

      agoraClient.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video') {
          setRemoteUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, videoTrack: undefined } : u)))
        }
        if (mediaType === 'audio') {
          setRemoteUsers((prev) => prev.map((u) => (u.uid === user.uid ? { ...u, audioTrack: undefined } : u)))
        }
      })

      agoraClient.on('user-left', (user) => {
        setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      })

      setLoading(false)
    } catch (error) {
      console.error('Error joining channel:', error)
      setLoading(false)
    }
  }

  const leaveChannel = async () => {
    try {
      if (localVideoTrack) {
        localVideoTrack.stop()
        localVideoTrack.close()
      }
      if (localAudioTrack) {
        localAudioTrack.stop()
        localAudioTrack.close()
      }
      if (client) {
        await client.leave()
      }
      setLocalVideoTrack(null)
      setLocalAudioTrack(null)
      setRemoteUsers([])
      setClient(null)
    } catch (error) {
      console.error('Error leaving channel:', error)
    }
  }

  const toggleMute = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(!isMuted)
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoEnabled)
      setIsVideoEnabled(!isVideoEnabled)
    }
  }

  const toggleScreenShare = async () => {
    if (!client || !localVideoTrack) return

    try {
      if (isScreenSharing) {
        const cameraTrack = await AgoraRTC.createCameraVideoTrack()
        await client.unpublish(localVideoTrack)
        await client.publish(cameraTrack)
        setLocalVideoTrack(cameraTrack)
        setIsScreenSharing(false)
      } else {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: '1080p_1' })
        await client.unpublish(localVideoTrack)
        await client.publish(screenTrack)
        setLocalVideoTrack(screenTrack)
        setIsScreenSharing(true)
      }
    } catch (error) {
      console.error('Error toggling screen share:', error)
    }
  }

  const handleLeave = () => {
    leaveChannel()
    navigate('/dashboard')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-xl">Joining channel...</div>
        </div>
      </div>
    )
  }

  const totalUsers = remoteUsers.length + (localVideoTrack ? 1 : 0)
  const gridCols = totalUsers === 1 ? 'grid-cols-1' : totalUsers === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-b-2 border-blue-200/50 dark:border-blue-800/50 p-5 flex justify-between items-center shadow-xl shadow-blue-500/10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/30 ring-2 ring-blue-500/20">
            <FaVideo className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-gray-900 dark:text-white text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">Channel: {channelName}</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{remoteUsers.length + 1} participants</p>
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-500 dark:to-red-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center gap-2 shadow-xl shadow-red-500/30 hover:shadow-2xl hover:scale-105 transform"
        >
          <FaSignOutAlt /> Leave
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className={`grid ${gridCols} gap-4 h-full`}>
          {localVideoTrack && (
            <div
              ref={localVideoRef}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl overflow-hidden relative min-h-[200px] border-3 border-blue-500 dark:border-blue-400 shadow-2xl shadow-blue-500/30 hover:border-green-500 dark:hover:border-green-400 transition-all ring-4 ring-blue-500/10"
            >
              <div className="absolute bottom-4 left-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm z-10 font-bold shadow-xl">
                You
              </div>
            </div>
          )}

          {remoteUsers.map((user) => (
            <div
              key={user.uid}
              ref={(el) => {
                remoteVideoRefs.current[user.uid] = el
              }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl overflow-hidden relative min-h-[200px] border-3 border-green-500 dark:border-green-400 shadow-2xl shadow-green-500/30 hover:border-blue-500 dark:hover:border-blue-400 transition-all ring-4 ring-green-500/10"
            >
              <div className="absolute bottom-4 left-4 bg-gradient-to-r from-green-600 to-green-500 text-white px-5 py-2.5 rounded-xl text-sm z-10 font-bold shadow-xl">
                User {user.uid}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg border-t-2 border-blue-200/50 dark:border-blue-800/50 p-6 shadow-xl shadow-blue-500/10">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={toggleMute}
            className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 shadow-xl hover:scale-110 transform ${
              isMuted 
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-500/30' 
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/30'
            }`}
          >
            {isMuted ? <FaMicrophoneSlash className="text-xl" /> : <FaMicrophone className="text-xl" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={toggleVideo}
            className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 shadow-xl hover:scale-110 transform ${
              isVideoEnabled 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-500/30' 
                : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-gray-500/30'
            }`}
          >
            {isVideoEnabled ? <FaVideo className="text-xl" /> : <FaVideoSlash className="text-xl" />}
            {isVideoEnabled ? 'Camera On' : 'Camera Off'}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 shadow-xl hover:scale-110 transform ${
              isScreenSharing 
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-green-500/30' 
                : 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-blue-500/30'
            }`}
          >
            <FaDesktop className="text-xl" />
            {isScreenSharing ? 'Stop Share' : 'Share Screen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VideoRoom
