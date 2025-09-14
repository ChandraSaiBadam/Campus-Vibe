module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Production optimizations
    ...(process.env.NODE_ENV === "production" && {
      "postcss-preset-env": {
        stage: 3,
        features: {
          "nesting-rules": true,
          "custom-properties": true,
        },
      },
      cssnano: {
        preset: [
          "default",
          {
            discardComments: {
              removeAll: true,
            },
            normalizeWhitespace: true,
            minifySelectors: true,
            minifyParams: true,
            mergeRules: true,
            reduceIdents: false, // Keep for Tailwind compatibility
          },
        ],
      },
    }),
  },
};
