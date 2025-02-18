import { useState, useContext, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import type { SubmitHandler } from 'react-hook-form';
import { useForm, FormProvider } from 'react-hook-form';
import { useToast, Box, Input, HStack, Heading, Text, FormControl, FormLabel, Button } from '@chakra-ui/react';
import capitalize from '@utils/capitalize';
import type { ProfileFormValues, User } from '@api/user';
import { UserAPI } from '@api/user';
import { isErrorMessage } from '@utils/error';
import FormDegree from '@components/form-degree';
import FormDegreeYear from '@components/form-degree-year';
import LanguageContext from 'language-context';

interface ProfileState {
    infoState: 'idle' | 'edited' | 'saving' | 'saved' | 'error';
    errorMessage: string | null;
}

const ProfileInfo = ({ user }: { user: User }): JSX.Element => {
    const isNorwegian = useContext(LanguageContext);
    const methods = useForm<ProfileFormValues>();
    const { handleSubmit, register } = methods;
    const [profileState, setProfileState] = useState<ProfileState>({ infoState: 'idle', errorMessage: null });
    const toast = useToast();

    useEffect(() => {
        if (profileState.infoState === 'error') {
            toast({
                title: isNorwegian ? 'Det har skjedd en feil.' : 'An error has occurred.',
                description: profileState.errorMessage,
                status: 'error',
                duration: 8000,
                isClosable: true,
            });
        }
    }, [profileState, toast, isNorwegian]);

    const submitForm: SubmitHandler<ProfileFormValues> = async (data: ProfileFormValues) => {
        setProfileState({ infoState: 'saving', errorMessage: null });
        const res = await UserAPI.putUser({
            email: user.email,
            name: user.name,
            alternateEmail: data.alternateEmail,
            degree: data.degree,
            degreeYear: data.degreeYear,
            memberships: [],
        });

        if (isErrorMessage(res)) {
            setProfileState({ infoState: 'error', errorMessage: res.message });
            return;
        }

        if (res.status === 200) {
            setProfileState({ infoState: 'saved', errorMessage: null });
        } else {
            setProfileState({ infoState: 'error', errorMessage: res.response });
        }
    };

    return (
        <Box maxW="xl">
            <Heading size="md" my="0.5rem">
                {isNorwegian ? 'Navn' : 'Name'}
            </Heading>
            <Text data-cy="profile-name">{user.name}</Text>
            <Heading size="md" my="0.5rem">
                {isNorwegian ? 'E-post' : 'Email'}
            </Heading>
            <Text data-cy="profile-email" my="0.5rem">
                {user.email}
            </Text>
            <FormProvider {...methods}>
                {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
                <form data-cy="profile-form" id="profile-form" onSubmit={handleSubmit(submitForm)}>
                    <FormControl>
                        <FormLabel>
                            <Heading size="md" display="inline">
                                {isNorwegian ? 'Alternativ e-post' : 'Alternative email'}
                            </Heading>
                            <Text>
                                {isNorwegian
                                    ? 'Denne vil bli brukt i stedet for studentmailen din.'
                                    : 'This will be used instead of your student email.'}
                            </Text>
                        </FormLabel>
                        <Input
                            data-cy="profile-alt-email"
                            type="email"
                            placeholder={isNorwegian ? 'E-post' : 'Email'}
                            onInput={() => setProfileState({ infoState: 'edited', errorMessage: null })}
                            defaultValue={user.alternateEmail ?? undefined}
                            mb="1rem"
                            {...register('alternateEmail')}
                        />
                    </FormControl>
                    <FormDegree
                        isHeading
                        data-cy="profile-degree"
                        onInput={() => setProfileState({ infoState: 'edited', errorMessage: null })}
                        defaultValue={user.degree ?? undefined}
                        py="1rem"
                    />
                    <FormDegreeYear
                        isHeading
                        data-cy="profile-degree-year"
                        onInput={() => setProfileState({ infoState: 'edited', errorMessage: null })}
                        defaultValue={user.degreeYear ?? undefined}
                        py="1rem"
                    />
                    <Heading size="md" my="0.5rem">
                        {isNorwegian ? 'Studentgrupper' : 'Student groups'}
                    </Heading>
                    <Text data-cy="profile-email" my="0.5rem">
                        {user.memberships.length > 0 && user.memberships.map((m: string) => capitalize(m)).join(', ')}
                        {user.memberships.length === 0 && 'Ingen'}
                    </Text>
                    <HStack mt={4}>
                        <Button
                            disabled={profileState.infoState !== 'edited' && profileState.infoState !== 'error'}
                            isLoading={profileState.infoState === 'saving'}
                            type="submit"
                            form="profile-form"
                            mr={3}
                            colorScheme="teal"
                        >
                            {profileState.infoState === 'saved'
                                ? isNorwegian
                                    ? 'Endringer lagret!'
                                    : 'Changes saved!'
                                : isNorwegian
                                ? 'Lagre endringer'
                                : 'Save changes'}
                        </Button>
                        <Button onClick={() => void signOut()} colorScheme="red">
                            {isNorwegian ? 'Logg ut' : 'Sign out'}
                        </Button>
                    </HStack>
                </form>
            </FormProvider>
        </Box>
    );
};

export default ProfileInfo;
