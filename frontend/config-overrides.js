module.exports = {
  webpack: function(config, env) {
    // Force webpack to use polling to watch for file changes.
    // This is necessary for hot-reloading to work correctly in some Docker-on-Windows environments.
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300, // Delay before rebuilding
    };
    return config;
  },
  devServer: function(configFunction) {
    return function(proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);

      // The onAfterSetupMiddleware and onBeforeSetupMiddleware options are deprecated.
      delete config.onAfterSetupMiddleware;
      delete config.onBeforeSetupMiddleware;
      delete config.https;

      config.setupMiddlewares = (middlewares, devServer) => {
        return middlewares;
      };

      return config;
    };
  },
};
