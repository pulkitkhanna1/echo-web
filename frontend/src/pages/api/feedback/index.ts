import type { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import axios from 'axios';
import type { Feedback } from '@api/feedback';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getToken({ req });

    if (session) {
        const JWT_TOKEN = session.idToken as string;
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080';

        if (!session.email || !session.name) {
            res.status(401).end();
            return;
        }

        if (req.method === 'GET') {
            try {
                const { data, status } = await axios.get(`${BACKEND_URL}/feedback`, {
                    headers: {
                        Authorization: `Bearer ${JWT_TOKEN}`,
                    },
                    validateStatus: (statusCode: number) => statusCode < 500,
                });

                if (status === 200) {
                    const feedbacks: Array<Feedback> = data;

                    res.status(200).json(feedbacks);
                    return;
                }

                res.status(401).json({ message: 'Du har ikke tilgang til denne siden.' });
                return;
            } catch {
                res.status(500).json({ message: 'Noe gikk galt. Prøv igjen senere.' });
                return;
            }
        }

        if (req.method === 'DELETE') {
            try {
                const id = req.body as number;
                const { data, status } = await axios.delete(`${BACKEND_URL}/feedback`, {
                    headers: {
                        Authorization: `Bearer ${JWT_TOKEN}`,
                    },
                    data: {
                        id,
                    },
                    validateStatus: (statusCode: number) => statusCode < 500,
                });

                if (status === 200) {
                    const result = data as string;

                    res.status(200).json(result);
                    return;
                }

                res.status(401).json({ message: 'Du har ikke tilgang til denne siden.' });
                return;
            } catch {
                res.status(500).json({ message: 'Noe gikk galt. Prøv igjen senere.' });
                return;
            }
        }

        if (req.method === 'PUT') {
            try {
                const id = req.body as number;

                const { data, status } = await axios({
                    method: 'put',
                    url: `${BACKEND_URL}/feedback`,
                    headers: {
                        Authorization: `Bearer ${JWT_TOKEN}`,
                    },
                    data: {
                        id,
                    },
                    validateStatus: (statusCode: number) => statusCode < 500,
                });

                if (status === 200) {
                    const result = data as string;

                    res.status(200).json(result);
                    return;
                }

                res.status(401).json({ message: 'Du har ikke tilgang til denne siden.' });
                return;
            } catch {
                res.status(500).json({ message: 'Noe gikk galt. Prøv igjen senere.' });
                return;
            }
        }
    }

    res.status(401).end();
};

export default handler;
