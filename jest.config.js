module.exports = {
    globals: {
        'ts-jest': {
            tsConfig: 'tsconfig.test.json',
        },
    },
    moduleDirectories: ['node_modules'],
    modulePathIgnorePatterns: [
        '<rootDir>/build',
        '<rootDir>/dist',
        '<rootDir>/examples',
        '<rootDir>/lib',
        '<rootDir>/lib2015',
        '<rootDir>/types',
    ],
    moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/__helpers__/'],
};
