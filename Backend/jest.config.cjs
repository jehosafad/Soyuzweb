module.exports = {
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    clearMocks: true,
    restoreMocks: true,
    verbose: true,
    testTimeout: 20000,
    globalTeardown: "<rootDir>/tests/globalTeardown.js",
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/server.js",
        "!src/scripts/**",
    ],
    coverageDirectory: "coverage",
};