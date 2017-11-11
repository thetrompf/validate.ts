module.exports = {
    collectCoverage: false,
    coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/.*\\.ts$'],
    globals: {
        'ts-jest': {
            tsConfigFile: 'tsconfig.test.json',
        },
    },
    mapCoverage: true,
    moduleFileExtensions: ['ts', 'js'],
    moduleDirectories: ['node_modules'],
    modulePaths: ['<rootDir>/src/'],
    modulePathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/dist/', '<rootDir>/lib/', '<rootDir>/lib2015/'],
    testEnvironment: 'node',
    testRegex: '/__tests__/.*\\.ts$',
    transform: {
        '.(ts|tsx)': '<rootDir>/node_modules/ts-jest/preprocessor.js',
    },
};
