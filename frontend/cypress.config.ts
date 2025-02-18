import { defineConfig } from 'cypress';

export default defineConfig({
    defaultCommandTimeout: 5000,

    e2e: {
        baseUrl: 'http://localhost:3000',
        supportFile: false,
        specPattern: '**/*.spec.ts',
        excludeSpecPattern: '**/{feide-signin.spec.ts,registration-deletion.spec.ts}',
        experimentalSessionAndOrigin: true,
    },

    component: {
        devServer: {
            framework: 'next',
            bundler: 'webpack',
        },
    },
});
