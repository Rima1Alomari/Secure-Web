import { useNavigate } from 'react-router-dom'
import { 
  FaShieldAlt, 
  FaVideo, 
  FaFile, 
  FaUsers, 
  FaLock, 
  FaRobot,
  FaCloud,
  FaCheckCircle,
  FaArrowRight,
  FaLightbulb,
  FaChartLine,
  FaGlobe
} from 'react-icons/fa'

const AboutUs = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: FaShieldAlt,
      title: 'Quantum-Resistant Encryption',
      description: 'Advanced post-quantum cryptography ensures your data remains secure even against future quantum computing threats.',
      color: 'from-blue-600 to-blue-500'
    },
    {
      icon: FaRobot,
      title: 'AI-Powered Threat Detection',
      description: 'Real-time scanning for phishing, malware, and suspicious activities using machine learning algorithms.',
      color: 'from-green-600 to-green-500'
    },
    {
      icon: FaLock,
      title: 'Zero-Trust Architecture',
      description: 'Every access request is verified. Multi-factor authentication and granular access controls protect your workspace.',
      color: 'from-purple-600 to-purple-500'
    },
    {
      icon: FaFile,
      title: 'Data Loss Prevention',
      description: 'Automatic detection and redaction of sensitive information like PII, credentials, and financial data.',
      color: 'from-orange-600 to-orange-500'
    },
    {
      icon: FaCloud,
      title: 'Secure Cloud Storage',
      description: 'All files are encrypted before upload and stored securely in the cloud with end-to-end encryption.',
      color: 'from-cyan-600 to-cyan-500'
    },
    {
      icon: FaChartLine,
      title: 'Compliance & Audit',
      description: 'Full compliance with GDPR, KSA regulations, and comprehensive audit logging for transparency.',
      color: 'from-indigo-600 to-indigo-500'
    }
  ]

  const howToUse = [
    {
      step: 1,
      title: 'Get Started',
      description: 'Register for an account or log in to access your secure workspace. Enable multi-factor authentication for enhanced security.',
      icon: FaCheckCircle,
      action: 'Go to Login',
      path: '/login'
    },
    {
      step: 2,
      title: 'Explore Dashboard',
      description: 'Navigate to the Dashboard to see an overview of your workspace, recent activities, and quick access to key features.',
      icon: FaLightbulb,
      action: 'View Dashboard',
      path: '/dashboard'
    },
    {
      step: 3,
      title: 'Join Video Meetings',
      description: 'Create or join video rooms for secure video conferencing. Share your screen, collaborate in real-time, and record meetings.',
      icon: FaVideo,
      action: 'Start Meeting',
      path: '/rooms'
    },
    {
      step: 4,
      title: 'Manage Files',
      description: 'Upload, organize, and share files securely. All files are automatically scanned for threats and encrypted before storage.',
      icon: FaFile,
      action: 'Open Files',
      path: '/files'
    },
    {
      step: 5,
      title: 'Collaborate',
      description: 'Use the Chat feature for real-time messaging, Calendar for scheduling, and Rooms for team collaboration spaces.',
      icon: FaUsers,
      action: 'Explore Features',
      path: '/chat'
    },
    {
      step: 6,
      title: 'Monitor Security',
      description: 'Visit the Security Center to monitor your risk score, view threat alerts, and manage security settings.',
      icon: FaShieldAlt,
      action: 'Security Center',
      path: '/security'
    }
  ]

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10">
            <FaShieldAlt className="text-white text-4xl" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
            About Secure Web
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium mb-4">
            Advanced secure collaboration platform designed for the quantum age
          </p>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Secure Web is a unified platform that combines enterprise-grade security with seamless collaboration tools. 
            Built with zero-trust principles and AI-powered threat detection, it ensures your data remains protected 
            while enabling productive teamwork.
          </p>
        </div>

        {/* Mission Section */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 dark:from-blue-700 dark:via-blue-600 dark:to-green-700 rounded-2xl p-8 md:p-12 mb-12 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10 text-white">
          <div className="max-w-4xl mx-auto text-center">
            <FaGlobe className="text-5xl mb-6 mx-auto opacity-90" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
            <p className="text-lg md:text-xl leading-relaxed opacity-95">
              To provide organizations and individuals with a secure, compliant, and user-friendly collaboration platform 
              that protects sensitive data while enabling seamless communication and productivity. We believe security 
              should never come at the cost of usability.
            </p>
          </div>
        </div>

        {/* Key Features Section */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
            Key Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1"
                >
                  <div className={`flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-xl mb-4 transition-transform duration-300 group-hover:scale-110 shadow-lg`}>
                    <Icon className="text-white text-2xl" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* How to Use Section */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent">
            How to Use Secure Web
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            Follow these simple steps to get started and make the most of Secure Web's powerful features
          </p>
          <div className="space-y-6">
            {howToUse.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={index}
                  className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 md:p-8 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl shadow-lg">
                        <span className="text-2xl font-bold text-white">{item.step}</span>
                      </div>
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Icon className="text-white text-xl" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">{item.description}</p>
                      <button
                        onClick={() => navigate(item.path)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 dark:from-blue-500 dark:to-green-500 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md"
                      >
                        {item.action} <FaArrowRight className="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Security & Compliance Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl mb-6 shadow-lg">
              <FaLock className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Security First</h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>End-to-end encryption for all communications</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>Client-side encryption before file upload</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>Zero-knowledge architecture for file shares</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>Regular security audits and penetration testing</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-green-500 rounded-xl mb-6 shadow-lg">
              <FaShieldAlt className="text-white text-2xl" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Compliance Ready</h3>
            <ul className="space-y-3 text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>GDPR compliant data handling</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>KSA SDAIA PDPL compliance</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>SAMA CSCC framework alignment</span>
              </li>
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                <span>Comprehensive audit logging</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 dark:from-blue-700 dark:via-blue-600 dark:to-green-700 rounded-2xl p-8 md:p-12 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10 text-white text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg md:text-xl mb-8 opacity-95 max-w-2xl mx-auto">
            Join thousands of users who trust Secure Web for their collaboration needs. 
            Experience enterprise-grade security with intuitive design.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-white text-blue-600 font-bold rounded-lg hover:bg-gray-100 transition-colors duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              Go to Dashboard <FaArrowRight />
            </button>
            <button
              onClick={() => navigate('/security')}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              Explore Security Features <FaShieldAlt />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutUs


