import { store } from "../../src/lib/state/Store";
import { Provider } from "react-redux";
import React from "react";
import { mount } from 'cypress/react';
import * as nextNavigation from 'next/navigation';

// describe('Account View Page (COMP)', () => {
//     beforeEach(() => {
//         // Proper ESM-compatible mocking
//         cy.stub(nextNavigation, 'useRouter').returns({
//             push: cy.stub(),
//             replace: cy.stub(),
//             back: cy.stub(),
//             forward: cy.stub(),
//             refresh: cy.stub(),
//             prefetch: cy.stub(),
//         });
//
//         cy.mount(
//             <Provider store={store}>
//                 <AccountViewPage />
//             </Provider>
//         );
//     });
//
//     it('fills in username and password, clicks login, and sees snackbar', () => {
//         cy.get('[data-testid="username-input"]').should('be.visible').type('testuser');
//         cy.get('[data-testid="password-input"]').should('be.visible').type('password123');
//         cy.get('[data-testid="login-button"]').click();
//
//         cy.get('[data-testid="volume-snackbar"]')
//             .should('be.visible')
//             .and('contain', 'Alarms will trigger audible sound in client');
//     });
// });


describe('Account View Page (E2E)', () => {
    it('logs in and shows snackbar', () => {
        cy.visit('/');
        cy.get('[data-testid="username-input"]').type('testuser');
        cy.get('[data-testid="password-input"]').type('password123');
        cy.get('[data-testid="login-button"]').click();
        cy.get('[data-testid="volume-snackbar"]').should('be.visible');
    });
});