// Reminder stacks stay open whenever their open layout fits, and only collapse when it does not.

const REMINDER_SELECTOR = '.reminders .icon-reminder, .reminders .text-reminder';

const collapseSidebar = () => {
  cy.get('body').then(($body) => {
    if (!$body.hasClass('sidebar-collapsed')) {
      cy.get('#sidebar-close-btn').click({ force: true });
    }
  });
  cy.get('body').should('have.class', 'sidebar-collapsed');
};

const addReminder = (playerIndex, title = 'Wrong') => {
  cy.get('#player-circle li .reminder-placeholder').eq(playerIndex).click({ force: true });
  cy.get('#reminder-token-modal').should('be.visible');
  cy.get(`#reminder-token-grid .token[title="${title}"]`).first().click({ force: true });
  cy.get('#reminder-token-modal').should('not.be.visible');
};

const addReminders = (playerIndex, count) => {
  for (let i = 0; i < count; i += 1) addReminder(playerIndex);
  cy.get('#player-circle li').eq(playerIndex).find(REMINDER_SELECTOR).should('have.length', count);
};

const startGame = (players) => {
  cy.viewport(1280, 900);
  cy.visit('/', { onBeforeLoad: (win) => { try { win.localStorage.clear(); } catch (_) { } } });
  cy.viewport(1280, 900);
  cy.setupGame({ players, loadScript: true });
  collapseSidebar();
};

const player = (index) => cy.get('#player-circle li').eq(index);

// Distance between the centres of the first two reminders, relative to their rendered width.
const expectSpread = ($li, expectSpreadOut) => {
  const reminders = [...$li[0].querySelectorAll(REMINDER_SELECTOR)];
  expect(reminders.length, 'reminder count').to.be.greaterThan(1);
  const [first, second] = reminders.map((el) => el.getBoundingClientRect());
  const distance = Math.hypot(
    (first.left + first.width / 2) - (second.left + second.width / 2),
    (first.top + first.height / 2) - (second.top + second.height / 2)
  );
  if (expectSpreadOut) {
    expect(distance, 'distance between open reminders').to.be.greaterThan(first.width * 0.6);
  } else {
    expect(distance, 'distance between stacked reminders').to.be.lessThan(first.width * 0.3);
  }
};

const circleOf = (el) => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, r: rect.width / 2 };
};

// No reminder or plus button of an open stack may overlap one that belongs to another player.
const expectNoOverlapBetweenStacks = ($items) => {
  const stacks = [...$items].map((li) => ({
    open: li.dataset.expanded === '1',
    circles: [...li.querySelectorAll(`${REMINDER_SELECTOR}, .reminder-placeholder`)].map(circleOf)
  }));
  stacks.forEach((a, i) => {
    stacks.forEach((b, j) => {
      if (j <= i || (!a.open && !b.open)) return;
      a.circles.forEach((ca) => {
        b.circles.forEach((cb) => {
          const gap = Math.hypot(ca.x - cb.x, ca.y - cb.y) - (ca.r + cb.r);
          expect(gap, `gap between player ${i + 1} and player ${j + 1}`).to.be.greaterThan(-1.5);
        });
      });
    });
  });
};

// An open stack never covers the script name and player counts shown in the middle of the circle.
const expectOpenStacksClearOfCentreInfo = ($items) => {
  const box = $items[0].ownerDocument.getElementById('setup-info').getBoundingClientRect();
  expect(box.width, 'centre info box width').to.be.greaterThan(0);
  [...$items].forEach((li, index) => {
    if (li.dataset.expanded !== '1') return;
    [...li.querySelectorAll(`${REMINDER_SELECTOR}, .reminder-placeholder`)].map(circleOf).forEach((circle) => {
      const dx = Math.max(box.left - circle.x, 0, circle.x - box.right);
      const dy = Math.max(box.top - circle.y, 0, circle.y - box.bottom);
      expect(Math.hypot(dx, dy) - circle.r, `gap between player ${index + 1} and the centre info box`).to.be.greaterThan(-1.5);
    });
  });
};

const expectNoOverlaps = () => {
  cy.get('#player-circle li').should(($items) => {
    expectNoOverlapBetweenStacks($items);
    expectOpenStacksClearOfCentreInfo($items);
  });
};

describe('Reminder stacks open by default', () => {
  it('keeps stacks open without any interaction when they fit', () => {
    startGame(15);
    addReminders(0, 2);
    addReminders(3, 1);

    player(0).should('have.attr', 'data-expanded', '1').and('not.have.attr', 'data-user-expanded');
    player(3).should('have.attr', 'data-expanded', '1');
    player(0).should(($li) => expectSpread($li, true));
    // Open reminders are shown at full size
    player(0).find(REMINDER_SELECTOR).first().should(($el) => {
      expect($el[0].style.transform).to.not.include('scale(0.8)');
    });
    expectNoOverlaps();
  });

  it('collapses a stack that would cross the middle of the circle, leaving others open', () => {
    startGame(10);
    addReminders(0, 4);
    addReminders(5, 1);

    player(0).should('have.attr', 'data-expanded', '0');
    player(0).should(($li) => expectSpread($li, false));
    player(5).should('have.attr', 'data-expanded', '1');
    expectNoOverlaps();
  });

  it('collapses a stack rather than cover the script name and counts in the middle', () => {
    startGame(10);
    // Two reminders stay on the top player's own half, but would reach the info box in the middle
    addReminders(0, 2);
    player(0).should('have.attr', 'data-expanded', '0');
    player(0).should(($li) => expectSpread($li, false));

    // A single reminder stops short of the box and stays open
    addReminders(5, 1);
    player(5).should('have.attr', 'data-expanded', '1');
    expectNoOverlaps();
  });

  it('collapses a side stack whose reminder would touch the info box', () => {
    startGame(8);
    // Player 3 sits level with the info box, where the gap to it is smallest
    addReminders(2, 1);
    addReminders(0, 1);

    player(2).should('have.attr', 'data-expanded', '0');
    player(0).should('have.attr', 'data-expanded', '1');
    expectNoOverlaps();
  });

  it('collapses only as many neighbouring stacks as needed to avoid an overlap', () => {
    startGame(15);
    addReminders(0, 3);
    addReminders(1, 3);
    addReminders(7, 3);

    // Players 1 and 2 cannot both be open; the first keeps its place and the second collapses
    player(0).should('have.attr', 'data-expanded', '1');
    player(1).should('have.attr', 'data-expanded', '0');
    player(7).should('have.attr', 'data-expanded', '1');
    expectNoOverlaps();
  });

  it('keeps the stack that hides the most reminders open when two collide', () => {
    startGame(20);
    addReminders(0, 2);
    addReminders(1, 3);

    player(0).should('have.attr', 'data-expanded', '0');
    player(1).should('have.attr', 'data-expanded', '1');
    expectNoOverlaps();
  });

  it('lets a collapsed stack be opened by tapping it and closes it again on an outside tap', () => {
    startGame(10);
    addReminders(0, 4);
    player(0).should('have.attr', 'data-expanded', '0');

    player(0).find(REMINDER_SELECTOR).first().click({ force: true });
    player(0).should('have.attr', 'data-expanded', '1').and('have.attr', 'data-user-expanded', '1');
    player(0).should(($li) => expectSpread($li, true));

    cy.get('body').click('topLeft');
    player(0).should('have.attr', 'data-expanded', '0').and('not.have.attr', 'data-user-expanded');
    player(0).should(($li) => expectSpread($li, false));
  });

  it('reopens a stack automatically once it fits again', () => {
    startGame(15);
    addReminders(0, 4);
    player(0).should('have.attr', 'data-expanded', '0');

    player(0).find(REMINDER_SELECTOR).first().trigger('contextmenu', { force: true });
    cy.get('#reminder-context-menu').should('be.visible');
    cy.get('#reminder-menu-delete').click({ force: true });

    player(0).find(REMINDER_SELECTOR).should('have.length', 3);
    player(0).should('have.attr', 'data-expanded', '1').and('not.have.attr', 'data-user-expanded');
    expectNoOverlaps();
  });

  it('re-evaluates the available space when the viewport changes', () => {
    startGame(10);
    addReminders(0, 1);
    player(0).should('have.attr', 'data-expanded', '1');

    cy.viewport(320, 568);
    player(0).should('have.attr', 'data-expanded', '0');

    cy.viewport(1280, 900);
    player(0).should('have.attr', 'data-expanded', '1');
  });

  it('re-evaluates the available space when the info box in the middle grows', () => {
    startGame(5);
    addReminders(0, 1);
    player(0).should('have.attr', 'data-expanded', '1');

    // Grow the info box (as a winner line or a longer script name would) until it reaches the top player's reminder
    cy.window().then((win) => {
      const info = win.document.getElementById('setup-info');
      const extra = win.document.createElement('div');
      extra.style.height = '80px';
      info.appendChild(extra);
    });
    player(0).should('have.attr', 'data-expanded', '0');
  });

  it('acts on the first tap when the stack is already open', () => {
    startGame(5);
    player(0).find('.reminder-placeholder').click({ altKey: true, force: true });
    cy.get('#text-reminder-modal').should('be.visible');
    cy.get('#reminder-text-input').type('Open note');
    cy.get('#save-reminder-btn').click();
    player(0).find('.text-reminder').should('have.length', 1);
    player(0).should('have.attr', 'data-expanded', '1');

    player(0).find('.text-reminder').click({ force: true });
    cy.get('#custom-reminder-edit-modal').should('be.visible');
    cy.get('#custom-reminder-text-input').should('contain', 'Open note');
  });
});

describe('Ability info icon', () => {
  const alphaOf = (color) => {
    const match = /rgba?\(([^)]+)\)/.exec(color);
    if (!match) return 1;
    const parts = match[1].split(/[,/]/).map((part) => part.trim());
    return parts.length > 3 ? parseFloat(parts[3]) : 1;
  };

  it('is small and see-through so a player name underneath stays readable', () => {
    startGame(8);
    cy.get('#player-circle li .player-token').eq(0).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');

    player(0).find('.ability-info-icon').should(($icon) => {
      const win = $icon[0].ownerDocument.defaultView;
      const style = win.getComputedStyle($icon[0]);
      const tokenWidth = $icon[0].parentElement.querySelector('.player-token').getBoundingClientRect().width;
      const iconWidth = $icon[0].getBoundingClientRect().width;
      expect(iconWidth, 'icon width').to.be.lessThan(tokenWidth * 0.17);
      expect(iconWidth, 'icon width').to.be.at.least(12);
      const fillAlpha = alphaOf(style.backgroundColor) * parseFloat(style.opacity);
      expect(fillAlpha, 'fill opacity').to.be.within(0.2, 0.6);
    });
    // Still opens the ability popup
    player(0).find('.ability-info-icon').click({ force: true });
    cy.get('#touch-ability-popup').should('have.class', 'show');
  });

  it('shrinks the bluff token info icon the same way', () => {
    startGame(8);
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');

    cy.get('#bluff-tokens-container .bluff-token').first().find('.ability-info-icon').should(($icon) => {
      const win = $icon[0].ownerDocument.defaultView;
      const style = win.getComputedStyle($icon[0]);
      const tokenWidth = $icon[0].closest('.bluff-token').getBoundingClientRect().width;
      expect($icon[0].getBoundingClientRect().width, 'icon width').to.be.lessThan(tokenWidth * 0.17);
      expect(alphaOf(style.backgroundColor) * parseFloat(style.opacity), 'fill opacity').to.be.within(0.2, 0.6);
    });
  });
});
