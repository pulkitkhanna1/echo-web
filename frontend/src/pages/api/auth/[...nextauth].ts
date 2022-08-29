import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
    session: {
        maxAge: 3600,
    },
    jwt: {
        maxAge: 3600,
    },
    callbacks: {
        // eslint-disable-next-line @typescript-eslint/require-await
        async jwt({ token, account }) {
            if (account) {
                token.idToken = account.id_token;
            }
            return token;
        },
    },
    providers: [
        {
            id: 'feide',
            name: 'Feide',
            type: 'oauth',
            checks: process.env.SANITY_DATASET === 'testing' ? 'none' : undefined,
            wellKnown: 'https://auth.dataporten.no/.well-known/openid-configuration',
            authorization: {
                params: {
                    scope: 'email userinfo-name profile userid openid',
                },
            },
            clientId: process.env.FEIDE_CLIENT_ID,
            clientSecret: process.env.FEIDE_CLIENT_SECRET,
            idToken: true,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                };
            },
        },
    ],
};

export default NextAuth(authOptions);
