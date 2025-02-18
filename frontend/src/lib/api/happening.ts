import axios from 'axios';
import type { decodeType } from 'typescript-json-decoder';
import { number, array, string, literal, union, nil, record } from 'typescript-json-decoder';
import type { ErrorMessage } from '@utils/error';
import { handleError } from '@utils/error';
import { emptyArrayOnNilDecoder } from '@utils/decoders';
import SanityAPI from '@api/sanity';

const happeningTypeDecoder = union(literal('BEDPRES'), literal('EVENT'));
type HappeningType = decodeType<typeof happeningTypeDecoder>;

const questionDecoder = record({
    questionText: string,
    inputType: union(literal('radio'), literal('textbox')),
    alternatives: union(nil, array(string)),
});
type Question = decodeType<typeof questionDecoder>;

const spotRangeCountDecoder = record({
    spots: number,
    minDegreeYear: number,
    maxDegreeYear: number,
    regCount: number,
    waitListCount: number,
});
type SpotRangeCount = decodeType<typeof spotRangeCountDecoder>;

const spotRangeDecoder = record({
    spots: number,
    minDegreeYear: number,
    maxDegreeYear: number,
});
type SpotRange = decodeType<typeof spotRangeDecoder>;

const happeningDecoder = record({
    _createdAt: string,
    studentGroupName: union(
        literal('hovedstyret'),
        literal('bedkom'),
        literal('webkom'),
        literal('gnist'),
        literal('tilde'),
    ),
    title: string,
    slug: string,
    date: string,
    registrationDate: union(string, nil),
    registrationDeadline: union(string, nil),
    body: (value) =>
        typeof value === 'string'
            ? { no: string(value), en: string(value) }
            : record({ no: string, en: union(string, nil) })(value),
    location: string,
    locationLink: union(string, nil),
    companyLink: union(string, nil),
    logoUrl: union(string, nil),
    contactEmail: union(string, nil),
    additionalQuestions: (value) => emptyArrayOnNilDecoder(questionDecoder, value),
    spotRanges: (value) => emptyArrayOnNilDecoder(spotRangeDecoder, value),
    happeningType: happeningTypeDecoder,
});
type Happening = decodeType<typeof happeningDecoder>;

const happeningInfoDecoder = record({
    spotRanges: array(spotRangeCountDecoder),
    regVerifyToken: (value) => (value === undefined ? null : string(value)),
});
type HappeningInfo = decodeType<typeof happeningInfoDecoder>;

const HappeningAPI = {
    /**
     * Get the n last happeninges.
     * @param n how many happeninges to retrieve
     */
    getHappeningsByType: async (n: number, type: HappeningType): Promise<Array<Happening> | ErrorMessage> => {
        try {
            const limit = n === 0 ? `` : `[0...${n}]`;
            const query = `
                *[_type == "happening" && happeningType == "${type}" && !(_id in path('drafts.**'))] | order(date asc) {
                    title,
                    "slug": slug.current,
                    date,
                    registrationDate,
                    registrationDeadline,
                    "body": select(
                        body.en != null => {"no": body.no, "en": body.en},
                        body.no != null => {"no": body.no, "en": null},
                        body
                      ),
                    location,
                    locationLink,
                    companyLink,
                    happeningType,
                    contactEmail,
                    additionalQuestions[] -> {
                        questionText,
                        inputType,
                        alternatives
                    },
                    "logoUrl": logo.asset -> url,
                    studentGroupName,
                    _createdAt,
                    spotRanges[] -> {
                        minDegreeYear,
                        maxDegreeYear,
                        spots
                    }
                }${limit}
            `;

            const result = await SanityAPI.fetch(query);

            return array(happeningDecoder)(result);
        } catch (error) {
            console.log(error); // eslint-disable-line
            return { message: handleError(axios.isAxiosError(error) ? error.response?.status ?? 500 : 500) };
        }
    },

    /**
     * Get a happening by its slug.
     * @param slug the slug of the desired happening.
     */
    getHappeningBySlug: async (slug: string): Promise<Happening | ErrorMessage> => {
        try {
            const query = `
                *[_type == "happening" && slug.current == "${slug}" && !(_id in path('drafts.**'))]{
                    title,
                    "slug": slug.current,
                    date,
                    registrationDate,
                    registrationDeadline,
                    "body": select(
                        body.en != null => {"no": body.no, "en": body.en},
                        body.no != null => {"no": body.no, "en": null},
                        body
                      ),
                    location,
                    locationLink,
                    companyLink,
                    happeningType,
                    contactEmail,
                    additionalQuestions[] -> {
                        questionText,
                        inputType,
                        alternatives
                    },
                    "logoUrl": logo.asset -> url,
                    studentGroupName,
                    _createdAt,
                    spotRanges[] -> {
                        minDegreeYear,
                        maxDegreeYear,
                        spots
                    }
                }
            `;

            const result = await SanityAPI.fetch(query);

            if (result.length === 0) {
                return {
                    message: '404',
                };
            }

            // Sanity returns a list with a single element,
            // therefore we need [0] to get the element out of the list.
            return array(happeningDecoder)(result)[0];
        } catch (error) {
            console.log(error); // eslint-disable-line
            if (axios.isAxiosError(error)) {
                return { message: !error.response ? '404' : error.message };
            }

            return {
                message: 'Fail @ getHappeningsBySlug',
            };
        }
    },

    getHappeningInfo: async (auth: string, slug: string, backendUrl: string): Promise<HappeningInfo | ErrorMessage> => {
        try {
            const { data } = await axios.get(`${backendUrl}/happening/${slug}`, {
                auth: {
                    username: 'admin',
                    password: auth,
                },
            });

            return happeningInfoDecoder(data);
        } catch (error) {
            console.log(error); // eslint-disable-line
            return { message: JSON.stringify(error) };
        }
    },
};

export {
    HappeningAPI,
    type SpotRange,
    type SpotRangeCount,
    type HappeningType,
    type Question,
    type Happening,
    type HappeningInfo,
};
