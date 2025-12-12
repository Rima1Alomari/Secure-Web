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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 text-xl">Joining channel...</div>
        </div>
      </div>
    )
  }

  const totalUsers = remoteUsers.length + (localVideoTrack ? 1 : 0)
  const gridCols = totalUsers === 1 ? 'grid-cols-1' : totalUsers === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      <div className="bg-white border-b border-blue-200 p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
            <FaVideo className="text-white text-lg" />
          </div>
          <div>
            <h2 className="text-gray-800 text-xl font-bold">Channel: {channelName}</h2>
            <p className="text-gray-600 text-sm">{remoteUsers.length + 1} participants</p>
          </div>
        </div>
        <button
          onClick={handleLeave}
          className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <FaSignOutAlt /> Leave
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className={`grid ${gridCols} gap-4 h-full`}>
          {localVideoTrack && (
            <div
              ref={localVideoRef}
              className="bg-white rounded-2xl overflow-hidden relative min-h-[200px] border-4 border-blue-500 shadow-2xl hover:border-green-500 transition-all"
            >
              <div className="absolute bottom-3 left-3 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm z-10 font-semibold shadow-lg">
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
              className="bg-white rounded-2xl overflow-hidden relative min-h-[200px] border-4 border-green-500 shadow-2xl hover:border-blue-500 transition-all"
            >
              <div className="absolute bottom-3 left-3 bg-green-500 text-white px-4 py-2 rounded-lg text-sm z-10 font-semibold shadow-lg">
                User {user.uid}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border-t border-blue-200 p-6 shadow-xl">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={toggleMute}
            className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:scale-105 ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-500' 
                : 'bg-green-500 hover:bg-green-600 text-white border-2 border-green-500'
            }`}
          >
            {isMuted ? <FaMicrophoneSlash className="text-xl" /> : <FaMicrophone className="text-xl" />}
            {isMuted ? 'Unmute' : 'Mute'}
          </button>

          <button
            onClick={toggleVideo}
            className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:scale-105 ${
              isVideoEnabled 
                ? 'bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500' 
                : 'bg-gray-400 hover:bg-gray-500 text-white border-2 border-gray-400'
            }`}
          >
            {isVideoEnabled ? <FaVideo className="text-xl" /> : <FaVideoSlash className="text-xl" />}
            {isVideoEnabled ? 'Camera On' : 'Camera Off'}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center gap-3 shadow-lg hover:scale-105 ${
              isScreenSharing 
                ? 'bg-green-500 hover:bg-green-600 text-white border-2 border-green-500' 
                : 'bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-500'
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
