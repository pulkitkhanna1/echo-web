/* eslint-disable @typescript-eslint/no-unsafe-call */

import users from '../fixtures/users.json';
import { happenings } from '../fixtures/happening.json';

const checkSubmitRegistration = (degree: string, degreeYear: number, email?: string, waitListSpot?: number) => {
    cy.get('[data-cy=reg-btn]').click();
    cy.get('[data-cy=reg-form]').should('be.visible');

    if (email) {
        cy.get('input[name=email]').type(email);
    } else {
        cy.get('input[name=email]').type(`${degree}${degreeYear}@test.com`);
    }
    cy.get('input[name=firstName]').type('Test');
    cy.get('input[name=lastName]').type('McTest');
    cy.get('select[name=degree]').select(degree);
    cy.get('select[name=degreeYear]').select(degreeYear);
    cy.get('input[id=terms1]').check({ force: true });
    cy.get('input[id=terms2]').check({ force: true });
    cy.get('input[id=terms3]').check({ force: true });

    cy.get('button[type=submit]').click();

    if (!email || !waitListSpot) {
        cy.get('li[class=chakra-toast]').contains('Påmeldingen din er registrert!');
    } else {
        cy.get('li[class=chakra-toast]').contains(
            `Du er på plass nr. ${waitListSpot} på ventelisten, og vil bli kontaktet om det åpner seg en ledig plass.`,
        );
    }
};

describe('Happening registration', () => {
    describe('720p res', () => {
        beforeEach(() => {
            cy.viewport(1280, 720);
        });

        for (const { slug, type } of happenings) {
            context('Happening form registration', () => {
                beforeEach(() => {
                    cy.visit(`/event/${slug}`);
                });

                it('Popup form appears correctly', () => {
                    cy.get('[data-cy=reg-btn]').click();
                    cy.get('[data-cy=reg-form]').should('be.visible');

                    cy.get('input[name=email]').should('be.visible');
                    cy.get('input[name=firstName]').should('be.visible');
                    cy.get('input[name=lastName]').should('be.visible');
                    cy.get('select[name=degree]').should('be.visible');

                    /*

                    TODO: fix this.

                    Chakra hides radio and checkbox input beneath another element,
                    therefore it will never be visible.

                    cy.get('input[name=degreeYear]').should('be.visible');
                    cy.get('input[id=terms1]').should('be.visible');
                    cy.get('input[id=terms2]').should('be.visible');
                    cy.get('input[id=terms3]').should('be.visible');

                   */
                });

                for (const b of users.bachelorDegrees) {
                    for (const y of [1, 2, 3]) {
                        it(`User can sign up with valid input (degree = ${b}, degreeYear = ${y}, type = ${type})`, () => {
                            checkSubmitRegistration(b, y);
                        });
                    }
                }

                for (const m of users.masterDegrees) {
                    for (const y of [4, 5]) {
                        it(`User can sign up with valid input (degree = ${m}, degreeYear = ${y}, type = ${type})`, () => {
                            checkSubmitRegistration(m, y);
                        });
                    }
                }

                it(`User can sign up with valid input (degree = ${users.validArmninfUser.degree}, degreeYear = ${users.validArmninfUser.degreeYear}, type = ${type})`, () => {
                    checkSubmitRegistration(users.validArmninfUser.degree, users.validArmninfUser.degreeYear);
                });

                for (const { e, spot } of users.waitListEmails) {
                    it('User is put on wait list', () => {
                        checkSubmitRegistration('DTEK', 2, e, spot);
                    });
                }
            });
        }
    });
});
