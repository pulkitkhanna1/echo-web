import {
    Box,
    Drawer,
    DrawerBody,
    DrawerCloseButton,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    Heading,
} from '@chakra-ui/react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import type { RefObject } from 'react';
import { useContext } from 'react';
import LanguageContext from 'language-context';
import NavLink, { NavLinkButton } from '@components/nav-link';
import ColorModeButton from '@components/color-mode-button';

const NavLinks = (): JSX.Element => {
    const isNorwegian = useContext(LanguageContext);
    const { status } = useSession();
    const router = useRouter();
    const onProfileClick = () => {
        if (status === 'authenticated') {
            void router.push('/profile');
        } else {
            void signIn('feide');
        }
    };

    return (
        <Flex
            flexDirection={['column', null, null, 'row']}
            w="100%"
            fontSize={['3xl', null, null, 'lg', '2xl']}
            justify="flex-end"
            alignItems="center"
        >
            <NavLink text={isNorwegian ? 'Hjem' : 'Home'} href="/" data-cy="hjem" />
            {/* <NavLink text="Jobb" href="/job" data-cy="jobb" /> */}
            <NavLink text={isNorwegian ? 'Om echo' : 'About echo'} href="/om-echo/om-oss" data-cy="om-oss" />
            <Flex data-cy="min-profil">
                {status === 'authenticated' && (
                    <NavLink text={isNorwegian ? 'Min profil' : 'My profile'} href="/profile" />
                )}
                {status === 'unauthenticated' && (
                    <NavLinkButton onClick={() => void onProfileClick()}>
                        {isNorwegian ? 'Logg inn' : 'Sign in'}
                    </NavLinkButton>
                )}
            </Flex>
            <ColorModeButton />
        </Flex>
    );
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    btnRef: RefObject<HTMLButtonElement>;
}

const NavBar = ({ isOpen, onClose, btnRef }: Props): JSX.Element => {
    const isNorwegian = useContext(LanguageContext);
    return (
        <>
            <Box flex="2 1 auto" data-cy="navbar-standard" pb="1rem" pl={['0.5rem', null, null, null, '3rem', '4rem']}>
                <Flex
                    display={['none', null, null, 'flex']}
                    align="center"
                    justify="space-between"
                    w="full"
                    direction="column"
                >
                    <NavLinks />
                </Flex>
            </Box>
            <Drawer isOpen={isOpen} placement="right" onClose={onClose} finalFocusRef={btnRef}>
                <DrawerOverlay>
                    <DrawerContent data-cy="navbar-drawer">
                        <DrawerCloseButton size="lg" />
                        <DrawerHeader fontSize="2xl" as={Heading}>
                            {isNorwegian ? 'Navigasjon' : 'Navigation'}
                        </DrawerHeader>
                        <DrawerBody>
                            <Box onClick={onClose} data-cy="nav-links">
                                <NavLinks />
                            </Box>
                        </DrawerBody>
                    </DrawerContent>
                </DrawerOverlay>
            </Drawer>
        </>
    );
};

export default NavBar;
