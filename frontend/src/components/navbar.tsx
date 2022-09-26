import {
    Box,
    Center,
    Text,
    Drawer,
    DrawerBody,
    DrawerContent,
    DrawerHeader,
    DrawerOverlay,
    Flex,
    Icon,
    IconButton,
    Accordion,
    AccordionItem,
    AccordionPanel,
    AccordionButton,
    AccordionIcon,
    useDisclosure,
    Spacer,
    LinkBox,
    DrawerFooter,
    Button,
} from '@chakra-ui/react';
import { useRef } from 'react';
import { AiOutlineUser } from 'react-icons/ai';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { IoIosMenu, IoMdClose } from 'react-icons/io';
import NextLink from 'next/link';
import ColorModeButton from '@components/color-mode-button';
import DesktopNavLink from '@components/nav-link';
import routes from 'routes';
import useLanguage from '@hooks/use-language';

const DesktopNavBar = () => {
    return (
        <Box data-cy="navbar-standard" display={['none', null, null, null, 'block']}>
            <Flex direction="row" gap="5" alignItems="center">
                {routes.map((route) => {
                    return <DesktopNavLink key={route.title.no} {...route} />;
                })}
                <ColorModeButton />
                <ProfileButton />
            </Flex>
        </Box>
    );
};

const MobileNavBar = () => {
    const { status } = useSession();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const { isNorwegian, toggleLanguage } = useLanguage();

    const router = useRouter();
    const btnRef = useRef<HTMLButtonElement>(null);

    const lang = isNorwegian ? 'no' : 'en';

    return (
        <>
            <IconButton
                variant="unstyled"
                ref={btnRef}
                onClick={onOpen}
                display={['block', null, null, null, 'none']}
                aria-label="show navbar"
                icon={
                    <Center>
                        <Icon as={IoIosMenu} boxSize={10} />
                    </Center>
                }
                data-cy="drawer-button"
            />

            <Drawer
                isOpen={isOpen}
                size={['xs', null, null, 'sm']}
                placement="right"
                onClose={onClose}
                finalFocusRef={btnRef}
            >
                <DrawerOverlay>
                    <DrawerContent data-cy="navbar-drawer">
                        <DrawerHeader>
                            <Flex direction="row" alignItems="center">
                                <ColorModeButton />
                                <Spacer />
                                <Spacer />
                                <IconButton
                                    as={IoMdClose}
                                    onClick={onClose}
                                    variant="unstyled"
                                    aria-label="Close menu"
                                    cursor="pointer"
                                    size="sm"
                                />
                            </Flex>
                        </DrawerHeader>
                        <DrawerBody p="0">
                            <Box data-cy="nav-links">
                                <Accordion w="100%" allowMultiple allowToggle>
                                    {routes.map((route) => {
                                        return (
                                            <AccordionItem key={route.title.no}>
                                                {!route.children ? (
                                                    <NextLink
                                                        href={route.path ?? ''}
                                                        data-cy={route.path === '/' ? 'hjem' : ''}
                                                    >
                                                        <AccordionButton onClick={onClose}>
                                                            <Text fontSize="2xl">{route.title[lang]}</Text>
                                                        </AccordionButton>
                                                    </NextLink>
                                                ) : (
                                                    <>
                                                        <AccordionButton>
                                                            <AccordionIcon mr="1" />
                                                            <Text fontSize="2xl">{route.title[lang]}</Text>
                                                        </AccordionButton>
                                                        <AccordionPanel>
                                                            <Flex direction="column">
                                                                {route.children.map((child) => {
                                                                    return (
                                                                        <NextLink
                                                                            key={child.title.no}
                                                                            href={child.path ?? ''}
                                                                            passHref
                                                                        >
                                                                            <LinkBox
                                                                                cursor="pointer"
                                                                                onClick={onClose}
                                                                                py="1"
                                                                            >
                                                                                <Text fontSize="xl">
                                                                                    {child.title[lang]}
                                                                                </Text>
                                                                            </LinkBox>
                                                                        </NextLink>
                                                                    );
                                                                })}
                                                            </Flex>
                                                        </AccordionPanel>
                                                    </>
                                                )}
                                            </AccordionItem>
                                        );
                                    })}
                                    <AccordionItem>
                                        <AccordionButton
                                            onClick={() => {
                                                if (status === 'authenticated') {
                                                    void router.push('/profile');
                                                } else {
                                                    void signIn('feide');
                                                }
                                            }}
                                        >
                                            <Text fontSize="2xl">
                                                {status === 'authenticated'
                                                    ? isNorwegian
                                                        ? 'Min profil'
                                                        : 'My profile'
                                                    : isNorwegian
                                                    ? 'Logg inn'
                                                    : 'Log in'}
                                            </Text>
                                        </AccordionButton>
                                    </AccordionItem>
                                </Accordion>
                            </Box>
                        </DrawerBody>
                        <DrawerFooter>
                            <Button variant="ghost" fontWeight="medium" fontSize="lg" w="100%" onClick={toggleLanguage}>
                                {isNorwegian ? 'In English' : 'På norsk'}
                            </Button>
                        </DrawerFooter>
                    </DrawerContent>
                </DrawerOverlay>
            </Drawer>
        </>
    );
};

const ProfileButton = () => {
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
        <IconButton
            data-cy="min-profil"
            aria-label={status === 'authenticated' ? 'Gå til profil' : 'Logg inn'}
            onClick={() => void onProfileClick()}
            variant="ghost"
            icon={
                <Center>
                    <Icon as={AiOutlineUser} boxSize={7} />
                </Center>
            }
        />
    );
};

const NavBar = () => {
    return (
        <>
            <DesktopNavBar />
            <MobileNavBar />
        </>
    );
};

export default NavBar;
