import { createCurvedLabelSvg } from '../src/ui/svg.js';

describe('Curved Label Sizing', () => {
  it('keeps long role names from truncating on curved tokens', () => {
    cy.visit('/');

    cy.document().then((doc) => {
      const svg = createCurvedLabelSvg(`test-arc-${Date.now()}`, "Devil's Advocate");
      svg.style.position = 'absolute';
      svg.style.left = '-9999px';
      svg.style.top = '-9999px';
      doc.body.appendChild(svg);

      const textPath = svg.querySelector('textPath');
      const textNode = svg.querySelector('.icon-reminder-text');

      expect(textPath.textContent).to.equal("Devil's Advocate");
      expect(textPath.getAttribute('textLength')).to.equal('118');
      expect(textPath.getAttribute('lengthAdjust')).to.equal('spacingAndGlyphs');
      expect(textNode.style.fontSize).to.equal('10.5px');

      svg.remove();
    });
  });
});
