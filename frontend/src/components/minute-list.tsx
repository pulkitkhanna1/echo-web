import { useContext } from 'react';
import { Flex, Heading, Icon, Link, List, ListItem, Text, useColorModeValue } from '@chakra-ui/react';
import { format } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import NextLink from 'next/link';
import { FaExternalLinkAlt } from 'react-icons/fa';
import type { Minute } from '@api/minute';
import LanguageContext from 'language-context';

interface Props {
    minutes: Array<Minute>;
}

const MinuteList = ({ minutes }: Props): JSX.Element => {
    const color = useColorModeValue('blue', 'blue.400');
    const isNorwegian = useContext(LanguageContext);

    return (
        <>
            <Heading mb="5">Møtereferater</Heading>
            {minutes.length === 0 && <Text>Ingen møtereferater</Text>}
            <List>
                {minutes.map((minute: Minute) => (
                    <ListItem key={minute.date}>
                        <Flex align="center">
                            <NextLink href={minute.document} passHref>
                                <Link href={minute.document} color={color} isExternal mr=".5em">
                                    {format(new Date(minute.date), 'dd. MMM yyyy', { locale: isNorwegian ? nb : enUS })}
                                </Link>
                            </NextLink>
                            <Icon as={FaExternalLinkAlt} />
                        </Flex>
                    </ListItem>
                ))}
            </List>
        </>
    );
};

export default MinuteList;
