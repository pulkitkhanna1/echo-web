import { ChakraProvider } from '@chakra-ui/react';
import { SessionProvider, type SessionProviderProps } from 'next-auth/react';
import { getMonth } from 'date-fns';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import NextNProgress from 'nextjs-progressbar';
import { useEffect, useState } from 'react';
import Snowfall from 'react-snowfall';
import Fonts from '@styles/fonts';
import theme from '@styles/theme';
import Layout from '@components/layout';
import LanguageContext from 'language-context';

const App = ({ Component, pageProps: { session, ...pageProps } }: AppProps<SessionProviderProps>): JSX.Element => {
    const router = useRouter();
    const SSR = typeof window === 'undefined'; //Used to disable rendering of animated component SS
    const [isNorwegian, setIsNorwegian] = useState(true);
    useEffect(() => {
        const checkLanguageData = () => {
            const lang = localStorage.getItem('language');
            if (lang === 'en') {
                setIsNorwegian(false);
            } else {
                setIsNorwegian(true);
            }
        };
        checkLanguageData();
        window.addEventListener('storage', checkLanguageData);
        return () => {
            window.removeEventListener('storage', checkLanguageData);
        };
    }, []);

    return (
        <LanguageContext.Provider value={isNorwegian}>
            <SessionProvider session={session}>
                <ChakraProvider theme={theme}>
                    <NextNProgress
                        color="#29D"
                        startPosition={0.15}
                        stopDelayMs={200}
                        height={4}
                        options={{ showSpinner: false }}
                    />
                    {!SSR && getMonth(new Date()) === 11 && <Snowfall snowflakeCount={200} color="#ffffff" />}
                    <Fonts />
                    <Layout>
                        <Component {...pageProps} key={router} />
                    </Layout>
                </ChakraProvider>
            </SessionProvider>
        </LanguageContext.Provider>
    );
};

export default App;
