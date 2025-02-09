export default function WelcomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="text-center p-8 bg-white bg-opacity-10 backdrop-blur-md rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold mb-4">🚀 Welcome to Our App!</h1>
        <p className="text-lg mb-6">Start your journey with us today.</p>
        <a
          href="/dashboard"
          className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-md hover:bg-gray-200 transition"
        >
          Get Started
        </a>
      </div>
    </div>
  );
}
