const login = () => {
  cy.visit('http://localhost:3000/');
  cy.getByTestId('cypress-email').type('test@gmail.com');
  cy.getByTestId('cypress-password').type('password');
  cy.get('form').contains('Login').click();
  cy.get('main').should('exist');
};

const collectOverflow = (win) => {
  const root = win.document.querySelector('main') || win.document.body;
  const candidates = Array.from(root.querySelectorAll('*')).filter((element) => {
    const text = (element.textContent || '').trim();
    if(!text){
      return false;
    }

    const style = win.getComputedStyle(element);
    if(style.display === 'none' || style.visibility === 'hidden'){
      return false;
    }

    const rect = element.getBoundingClientRect();
    if(rect.width < 24 || rect.height < 12){
      return false;
    }

    return /[$%]|days|alerts|No plan|Budget pending|Stable/.test(text);
  });

  return candidates
    .map((element) => ({
      text: (element.textContent || '').trim().replace(/\s+/g, ' '),
      clientWidth: Math.round(element.clientWidth),
      scrollWidth: Math.round(element.scrollWidth),
      clientHeight: Math.round(element.clientHeight),
      scrollHeight: Math.round(element.scrollHeight),
      section: element.closest('section, article')?.id || element.closest('section, article')?.className || 'unknown',
      tag: element.tagName,
    }))
    .filter((item) => item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1);
};

describe('number overflow audit', () => {
  [
    { name: 'desktop', width: 1440, height: 1100 },
    { name: 'mobile', width: 390, height: 844 },
  ].forEach((viewport) => {
    it(`checks numeric overflow on ${viewport.name}`, () => {
      cy.viewport(viewport.width, viewport.height);
      login();
      cy.wait(1500);
      cy.screenshot(`overflow-${viewport.name}`, { capture: 'viewport' });
      cy.window().then((win) => {
        const overflows = collectOverflow(win);
        expect(
          overflows,
          overflows.length ? `Overflow detected:\n${JSON.stringify(overflows.slice(0, 12), null, 2)}` : 'No overflow detected'
        ).to.have.length(0);
      });
    });
  });
});
