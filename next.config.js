module.exports = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/welcome",
        permanent: true, // Set to false if it's temporary
      },
    ];
  },
};
