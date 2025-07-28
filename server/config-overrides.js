module.exports = function override(config) {
    config.ignoreWarnings = [
      {
        module: /react-datepicker/,
        message: /Failed to parse source map/,
      },
    ];
    return config;
  };